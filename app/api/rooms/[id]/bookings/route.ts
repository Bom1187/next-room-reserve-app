import prisma from "@/lib/prisma";
import { internalError, jsonError, parseDate, parseId } from "@/lib/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) return jsonError("Invalid room id", 400);

  const { searchParams } = new URL(request.url);
  const rawFrom = searchParams.get("from");
  const rawTo = searchParams.get("to");
  if ((rawFrom === null) !== (rawTo === null)) {
    return jsonError("from and to must be provided together", 400);
  }

  let from: Date | null = null;
  let to: Date | null = null;
  if (rawFrom !== null && rawTo !== null) {
    from = parseDate(rawFrom);
    to = parseDate(rawTo);
    if (!from || !to || from >= to) {
      return jsonError("from and to must be valid dates and from must be before to", 400);
    }
  }

  try {
    const room = await prisma.room.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!room) return jsonError("Room not found", 404);

    const bookings = await prisma.booking.findMany({
      where: {
        roomId: id,
        ...(from && to
          ? { startTime: { lt: to }, endTime: { gt: from } }
          : {}),
      },
      orderBy: { startTime: "asc" },
    });
    return Response.json(bookings);
  } catch (error) {
    return internalError(error);
  }
}
