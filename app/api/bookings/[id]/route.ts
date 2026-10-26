import prisma from "@/lib/prisma";
import {
  internalError,
  isNonEmptyString,
  jsonError,
  parseDate,
  parseId,
  readJson,
} from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) return jsonError("Invalid booking id", 400);

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { room: true },
    });
    if (!booking) return jsonError("Booking not found", 404);
    return Response.json(booking);
  } catch (error) {
    return internalError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) return jsonError("Invalid booking id", 400);

  const body = await readJson(request);
  if ("error" in body) return body.error;

  const fields = body.value;
  const allowedFields = [
    "roomId",
    "bookerName",
    "purpose",
    "startTime",
    "endTime",
    "attendeeCount",
  ];
  if (!allowedFields.some((field) => field in fields)) {
    return jsonError("At least one booking field must be provided", 400);
  }

  try {
    const current = await prisma.booking.findUnique({ where: { id } });
    if (!current) return jsonError("Booking not found", 404);
    if (current.startTime <= new Date()) {
      return jsonError("Only bookings that have not started can be edited", 409);
    }

    const roomId = "roomId" in fields ? fields.roomId : current.roomId;
    const bookerName = "bookerName" in fields ? fields.bookerName : current.bookerName;
    const purpose = "purpose" in fields ? fields.purpose : current.purpose;
    const attendeeCount =
      "attendeeCount" in fields ? fields.attendeeCount : current.attendeeCount;
    const startTime =
      "startTime" in fields ? parseDate(fields.startTime) : current.startTime;
    const endTime = "endTime" in fields ? parseDate(fields.endTime) : current.endTime;

    if (!Number.isSafeInteger(roomId) || Number(roomId) <= 0) {
      return jsonError("roomId must be a positive integer", 400);
    }
    if (!isNonEmptyString(bookerName) || !isNonEmptyString(purpose)) {
      return jsonError("bookerName and purpose must be non-empty strings", 400);
    }
    if (!Number.isSafeInteger(attendeeCount) || Number(attendeeCount) <= 0) {
      return jsonError("attendeeCount must be a positive integer", 400);
    }
    if (!startTime || !endTime || startTime <= new Date() || startTime >= endTime) {
      return jsonError("Booking must have a future startTime before endTime", 400);
    }

    const room = await prisma.room.findUnique({ where: { id: Number(roomId) } });
    if (!room) return jsonError("Room not found", 404);
    if (Number(attendeeCount) > room.capacity) {
      return jsonError("attendeeCount cannot exceed room capacity", 400);
    }

    const overlapping = await prisma.booking.findFirst({
      where: {
        id: { not: id },
        roomId: Number(roomId),
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    });
    if (overlapping) return jsonError("Booking time overlaps an existing booking", 409);

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        roomId: Number(roomId),
        bookerName: bookerName.trim(),
        purpose: purpose.trim(),
        attendeeCount: Number(attendeeCount),
        startTime,
        endTime,
      },
      include: { room: true },
    });
    return Response.json(updated);
  } catch (error) {
    return internalError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) return jsonError("Invalid booking id", 400);

  try {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return jsonError("Booking not found", 404);
    if (booking.startTime <= new Date()) {
      return jsonError("Only bookings that have not started can be deleted", 409);
    }

    await prisma.booking.delete({ where: { id } });
    return Response.json({ message: "Booking deleted" });
  } catch (error) {
    return internalError(error);
  }
}
