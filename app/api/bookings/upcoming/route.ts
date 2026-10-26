import prisma from "@/lib/prisma";
import { internalError, jsonError, parseId, parsePositiveInteger } from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawDays = searchParams.get("days");
  const days = rawDays === null ? 7 : parsePositiveInteger(rawDays);
  if (days === null || days > 30) {
    return jsonError("days must be an integer from 1 to 30", 400);
  }

  const rawRoomId = searchParams.get("roomId");
  const roomId = rawRoomId === null ? null : parseId(rawRoomId);
  if (rawRoomId !== null && roomId === null) {
    return jsonError("roomId must be a positive integer", 400);
  }

  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        startTime: { gte: now, lte: until },
        ...(roomId === null ? {} : { roomId }),
      },
      include: { room: true },
      orderBy: { startTime: "asc" },
    });
    return Response.json(bookings);
  } catch (error) {
    return internalError(error);
  }
}
