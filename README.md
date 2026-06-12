# iMessage Clone — Next.js 16 + Supabase Realtime PWA

A pixel-perfect iMessage clone: realtime 1:1 and group chat, installable PWA with
offline message viewing and an offline outbox that sends queued messages on reconnect.

## Setup (one time)

1. **Create a Supabase project** at [database.new](https://database.new) (or use an existing one).

2. **Enable anonymous sign-ins**
   Dashboard → Authentication → Sign In / Up → enable **"Allow anonymous sign-ins"**.
   (Sign-in is a frictionless username picker; identity is an anonymous Supabase user.)

3. **Run the schema**
   Dashboard → SQL Editor → paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql) → Run.

4. **Environment variables**
   Copy `.env.example` to `.env.local` and fill in your project URL and publishable/anon key
   (Dashboard → Project Settings → API Keys). Never use the service_role key here.

5. **Install & run**
   ```bash
   npm install
   npm run dev
   ```

## Trying it out

Open the app in two different browser profiles (or one normal + one incognito window),
pick a username in each, then start a chat from the compose button using the other
profile's username. Add two or more usernames to create a group.

## Offline support

- The app shell is cached by a service worker (production builds only).
- Conversations and messages are mirrored to IndexedDB, so previously viewed chats
  render while offline.
- Messages composed offline are queued in an outbox and sent automatically on
  reconnect (idempotent via a `client_id` unique key, so nothing sends twice).

To test: `npm run build && npm start`, open the app, then DevTools → Network → Offline.

## Notes

- Anonymous sessions live in this browser profile only — clearing site data creates a
  new identity (old username stays taken).
- Realtime uses Postgres Changes with RLS, so subscribers only ever receive rows from
  conversations they participate in.
