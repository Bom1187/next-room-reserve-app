import prisma from "@/lib/prisma";
import { internalError, jsonError, parseDate, parseId } from "@/lib/api";

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawRoomId = searchParams.get("roomId");
  const before = parseDate(searchParams.get("before"));
  const roomId = rawRoomId === null ? null : parseId(rawRoomId);

  if (roomId === null) return jsonError("roomId must be a positive integer", 400);
  if (!before) return jsonError("A valid before date is required", 400);
  if (before > new Date()) return jsonError("before cannot be in the future", 400);

  try {
    const result = await prisma.booking.deleteMany({
      where: {
        roomId,
        endTime: { lt: before },
      },
    });
    return Response.json({ deletedCount: result.count });
  } catch (error) {
    return internalError(error);
  }
}
