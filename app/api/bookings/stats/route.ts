import prisma from "@/lib/prisma";
import {
  internalError,
  jsonError,
  parseDate,
  parseId,
} from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawFrom = searchParams.get("from");
  const rawTo = searchParams.get("to");
  const from = parseDate(rawFrom);
  const to = parseDate(rawTo);
  if (!from || !to || from >= to) {
    return jsonError("Valid from and to are required, and from must be before to", 400);
  }

  const rawRoomId = searchParams.get("roomId");
  const roomId = rawRoomId === null ? null : parseId(rawRoomId);
  if (rawRoomId !== null && roomId === null) {
    return jsonError("roomId must be a positive integer", 400);
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        startTime: { gte: from, lt: to },
        ...(roomId === null ? {} : { roomId }),
      },
      include: {
        room: { select: { id: true, roomCode: true, roomName: true } },
      },
    });

    const byRoom = new Map<
      number,
      {
        roomId: number;
        roomCode: string;
        roomName: string;
        bookingCount: number;
        totalHours: number;
      }
    >();

    for (const booking of bookings) {
      const summary = byRoom.get(booking.roomId) ?? {
        roomId: booking.roomId,
        roomCode: booking.room.roomCode,
        roomName: booking.room.roomName,
        bookingCount: 0,
        totalHours: 0,
      };
      summary.bookingCount += 1;
      summary.totalHours +=
        (booking.endTime.getTime() - booking.startTime.getTime()) / 3_600_000;
      byRoom.set(booking.roomId, summary);
    }

    return Response.json({
      from,
      to,
      totalBookings: bookings.length,
      totalHours: [...byRoom.values()].reduce(
        (total, room) => total + room.totalHours,
        0,
      ),
      rooms: [...byRoom.values()].sort((a, b) => a.roomId - b.roomId),
    });
  } catch (error) {
    return internalError(error);
  }
}
