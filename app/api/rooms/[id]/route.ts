import prisma from "@/lib/prisma";
import {
  internalError,
  isNonEmptyString,
  isPrismaError,
  jsonError,
  parseId,
  readJson,
} from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) return jsonError("Invalid room id", 400);

  try {
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return jsonError("Room not found", 404);
    return Response.json(room);
  } catch (error) {
    return internalError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) return jsonError("Invalid room id", 400);

  const body = await readJson(request);
  if ("error" in body) return body.error;

  const { roomCode, roomName, capacity, location } = body.value;
  const data: {
    roomCode?: string;
    roomName?: string;
    capacity?: number;
    location?: string;
  } = {};

  if ("roomCode" in body.value) {
    if (!isNonEmptyString(roomCode)) {
      return jsonError("roomCode must be a non-empty string", 400);
    }
    data.roomCode = roomCode.trim();
  }
  if ("roomName" in body.value) {
    if (!isNonEmptyString(roomName)) {
      return jsonError("roomName must be a non-empty string", 400);
    }
    data.roomName = roomName.trim();
  }
  if ("location" in body.value) {
    if (!isNonEmptyString(location)) {
      return jsonError("location must be a non-empty string", 400);
    }
    data.location = location.trim();
  }
  if ("capacity" in body.value) {
    if (!Number.isSafeInteger(capacity) || Number(capacity) <= 0) {
      return jsonError("capacity must be a positive integer", 400);
    }
    data.capacity = Number(capacity);
  }
  if (Object.keys(data).length === 0) {
    return jsonError("At least one room field must be provided", 400);
  }

  try {
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return jsonError("Room not found", 404);

    if (data.capacity !== undefined && data.capacity < room.capacity) {
      const activeBooking = await prisma.booking.findFirst({
        where: { roomId: id, endTime: { gt: new Date() } },
        select: { attendeeCount: true },
        orderBy: { attendeeCount: "desc" },
      });
      if (activeBooking && data.capacity < activeBooking.attendeeCount) {
        return jsonError(
          "capacity cannot be lower than attendeeCount of an unfinished booking",
          409,
        );
      }
    }

    const updated = await prisma.room.update({ where: { id }, data });
    return Response.json(updated);
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return jsonError("roomCode already exists", 409);
    }
    return internalError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) return jsonError("Invalid room id", 400);

  try {
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) return jsonError("Room not found", 404);

    const bookingCount = await prisma.booking.count({ where: { roomId: id } });
    if (bookingCount > 0) {
      return jsonError("Room cannot be deleted because it has bookings", 409);
    }

    await prisma.room.delete({ where: { id } });
    return Response.json({ message: "Room deleted" });
  } catch (error) {
    return internalError(error);
  }
}