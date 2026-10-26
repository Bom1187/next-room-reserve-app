import prisma from "@/lib/prisma";
import {
  getPagination,
  internalError,
  isNonEmptyString,
  jsonError,
  parseDate,
  parseId,
  readJson,
} from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pagination = getPagination(searchParams);
  if (!pagination) return jsonError("page and limit must be positive integers; limit cannot exceed 100", 400);

  const search = searchParams.get("search")?.trim();
  const rawRoomId = searchParams.get("roomId");
  const roomId = rawRoomId === null ? null : parseId(rawRoomId);
  if (rawRoomId !== null && roomId === null) {
    return jsonError("roomId must be a positive integer", 400);
  }

  const rawFrom = searchParams.get("from");
  const rawTo = searchParams.get("to");
  const from = rawFrom === null ? null : parseDate(rawFrom);
  const to = rawTo === null ? null : parseDate(rawTo);
  if ((rawFrom !== null && !from) || (rawTo !== null && !to)) {
    return jsonError("from and to must be valid dates", 400);
  }
  if (from && to && from >= to) {
    return jsonError("from must be before to", 400);
  }

  const where = {
    ...(roomId === null ? {} : { roomId }),
    ...(from || to
      ? {
          startTime: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lt: to } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { bookerName: { contains: search } },
            { purpose: { contains: search } },
            { room: { is: { roomName: { contains: search } } } },
            { room: { is: { roomCode: { contains: search } } } },
            { room: { is: { location: { contains: search } } } },
          ],
        }
      : {}),
  };

  try {
    const [data, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        include: { room: true },
        orderBy: { startTime: "asc" },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      prisma.booking.count({ where }),
    ]);
    return Response.json({
      data,
      pagination: {
        ...pagination,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    });
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if ("error" in body) return body.error;

  const { roomId: rawRoomId, bookerName, purpose, startTime: rawStart, endTime: rawEnd, attendeeCount } =
    body.value;
  const roomId = Number.isSafeInteger(rawRoomId) && Number(rawRoomId) > 0
    ? Number(rawRoomId)
    : null;
  const startTime = parseDate(rawStart);
  const endTime = parseDate(rawEnd);

  if (roomId === null) return jsonError("roomId must be a positive integer", 400);
  if (!isNonEmptyString(bookerName) || !isNonEmptyString(purpose)) {
    return jsonError("bookerName and purpose must be non-empty strings", 400);
  }
  if (!startTime || !endTime) {
    return jsonError("Valid startTime and endTime are required", 400);
  }
  if (startTime <= new Date()) {
    return jsonError("startTime must be in the future", 400);
  }
  if (startTime >= endTime) {
    return jsonError("startTime must be before endTime", 400);
  }
  if (!Number.isSafeInteger(attendeeCount) || Number(attendeeCount) <= 0) {
    return jsonError("attendeeCount must be a positive integer", 400);
  }

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return jsonError("Room not found", 404);
    if (Number(attendeeCount) > room.capacity) {
      return jsonError("attendeeCount cannot exceed room capacity", 400);
    }

    const overlapping = await prisma.booking.findFirst({
      where: {
        roomId,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    });
    if (overlapping) return jsonError("Booking time overlaps an existing booking", 409);

    const booking = await prisma.booking.create({
      data: {
        roomId,
        bookerName: bookerName.trim(),
        purpose: purpose.trim(),
        startTime,
        endTime,
        attendeeCount: Number(attendeeCount),
      },
      include: { room: true },
    });
    return Response.json(booking, { status: 201 });
  } catch (error) {
    return internalError(error);
  }
}
