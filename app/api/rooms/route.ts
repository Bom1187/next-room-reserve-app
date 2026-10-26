import prisma from "@/lib/prisma";
import {
  internalError,
  isNonEmptyString,
  isPrismaError,
  jsonError,
  parsePositiveInteger,
  readJson,
} from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const rawMinCapacity = searchParams.get("minCapacity");
  const minCapacity =
    rawMinCapacity === null ? null : parsePositiveInteger(rawMinCapacity);

  if (rawMinCapacity !== null && minCapacity === null) {
    return jsonError("minCapacity must be a positive integer", 400);
  }

  try {
    const rooms = await prisma.room.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { roomName: { contains: search } },
                { location: { contains: search } },
              ],
            }
          : {}),
        ...(minCapacity === null ? {} : { capacity: { gte: minCapacity } }),
      },
      orderBy: { id: "asc" },
    });
    return Response.json(rooms);
  } catch (error) {
    return internalError(error);
  }
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if ("error" in body) return body.error;

  const { roomCode, roomName, capacity, location } = body.value;
  if (
    !isNonEmptyString(roomCode) ||
    !isNonEmptyString(roomName) ||
    !isNonEmptyString(location)
  ) {
    return jsonError("roomCode, roomName, and location must be non-empty strings", 400);
  }
  if (!Number.isSafeInteger(capacity) || Number(capacity) <= 0) {
    return jsonError("capacity must be a positive integer", 400);
  }

  try {
    const room = await prisma.room.create({
      data: {
        roomCode: roomCode.trim(),
        roomName: roomName.trim(),
        location: location.trim(),
        capacity: Number(capacity),
      },
    });
    return Response.json(room, { status: 201 });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return jsonError("roomCode already exists", 409);
    }
    return internalError(error);
  }
}
