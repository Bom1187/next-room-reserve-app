import prisma from "@/lib/prisma";
import { internalError, jsonError, parseDate, parsePositiveInteger } from "@/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startTime = parseDate(searchParams.get("startTime"));
  const endTime = parseDate(searchParams.get("endTime"));
  const rawAttendeeCount = searchParams.get("attendeeCount");
  const attendeeCount =
    rawAttendeeCount === null
      ? null
      : parsePositiveInteger(rawAttendeeCount);

  if (!startTime || !endTime || startTime >= endTime) {
    return jsonError("Valid startTime and endTime are required, and startTime must be before endTime", 400);
  }
  if (rawAttendeeCount !== null && attendeeCount === null) {
    return jsonError("attendeeCount must be a positive integer", 400);
  }

  try {
    const rooms = await prisma.room.findMany({
      where: {
        ...(attendeeCount === null ? {} : { capacity: { gte: attendeeCount } }),
        bookings: {
          none: {
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        },
      },
      orderBy: { id: "asc" },
    });
    return Response.json(rooms);
  } catch (error) {
    return internalError(error);
  }
}
