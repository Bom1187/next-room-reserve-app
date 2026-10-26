This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database

The application uses MariaDB through Prisma. Create a local `.env` file from
`.env.example` and set `DATABASE_URL` to a MariaDB connection string for
`room_reserve_db`.

The Prisma schema is in `prisma/schema.prisma`. To apply its migrations, run:

```bash
npx prisma migrate dev
```

The initial migration creates the `Room` and `Booking` tables, enforces unique
room codes and positive capacity/attendee counts, and requires each booking to
reference one room.

## API

Room endpoints:

- `GET /api/rooms` supports `search` (room name or location) and `minCapacity`.
- `POST /api/rooms` creates a room with `roomCode`, `roomName`, `capacity`, and
  `location`.
- `GET`, `PATCH`, and `DELETE /api/rooms/[id]` retrieve, update, or remove a
  room. A room with any booking cannot be deleted.
- `GET /api/rooms/[id]/bookings` lists a room's bookings; optional `from` and
  `to` must be supplied together and filter overlapping bookings.
- `GET /api/rooms/available` requires `startTime` and `endTime`, and optionally
  accepts `attendeeCount`.

Booking endpoints:

- `GET /api/bookings` supports `search`, `roomId`, `from`, `to`, `page`, and
  `limit`. Search covers booker, purpose, and room fields. Date filters apply
  to booking start times. Pagination defaults to page 1 and 10 items per page,
  with a maximum limit of 100; the response contains `data` and `pagination`.
- `POST /api/bookings` creates a booking.
- `GET`, `PATCH`, and `DELETE /api/bookings/[id]` retrieve, update, or cancel a
  booking. Updates and cancellations are only allowed before the booking starts.
- `GET /api/bookings/upcoming` accepts `days` (default 7, range 1-30) and
  optional `roomId`.
- `GET /api/bookings/stats` requires `from` and `to` and optionally accepts
  `roomId`; it groups booking counts and full booking durations by room.
- `DELETE /api/bookings/expired` requires `roomId` and `before` query
  parameters and deletes bookings in that room whose end time is earlier.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
