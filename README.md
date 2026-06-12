# iMessage Clone — Next.js 16 + Supabase

A pixel-perfect, end-to-end encrypted iMessage clone. Realtime 1:1 and group chat,
installable PWA with offline support, responsive desktop split-view, light/dark mode.

**Features:** E2E encryption (history restores on login from any device) · reactions
(tapbacks) · encrypted file sharing with view-once · vanish mode · typing indicators ·
read receipts · unsend & edit · message search · offline outbox.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 · coss/Base UI ·
`motion` · Supabase (Postgres, Realtime, Storage, cookie-based auth via `@supabase/ssr`).

## Setup

1. **Create a Supabase project** at [database.new](https://database.new).
2. **Auth:** Dashboard → Authentication → Providers → enable **Email**, disable **Confirm email**.
3. **Schema:** apply the migrations in `supabase/migrations/` with `npx supabase db push`
   (after `supabase login` + `supabase link`).
4. **Env:** copy `.env.example` to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   Use the publishable key only — never the secret/service_role key.
5. **Run:** `npm install && npm run dev`.

## Trying it out

Open two browser profiles (or normal + incognito), create an account in each, then
start a chat by username from the compose button. Two or more recipients make a group.

## How it works

- **E2EE:** password → PBKDF2/HKDF splits into a Supabase auth secret and a device-only
  key that encrypts your private-key backup, so signing in on any device restores full
  history. Messages and files are encrypted client-side; the server only stores ciphertext.
- **Auth:** cookie-based sessions via `@supabase/ssr`; `proxy.ts` refreshes tokens per request.
  Browser code imports `@/lib/supabase`, server code `@/lib/supabase/server`.
- **Offline:** a service worker caches the app shell (production builds), and conversations/
  messages mirror to IndexedDB. Messages composed offline queue in an outbox and send on
  reconnect (idempotent via a `client_id` key).
- **Realtime:** Postgres Changes with RLS — subscribers only receive rows from their own
  conversations.

> Note: there is no password reset — the password is the only key to your encrypted
> messages.
