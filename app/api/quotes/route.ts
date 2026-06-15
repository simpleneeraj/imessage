// Aggregated quotes endpoint. Guarded by a server-only secret header so it
// can't be called publicly (protects the limited free-tier API quota). The page
// itself renders via SSR calling getQuotes() directly; this route exists for
// any server-to-server / authorized use. Cached for a day.

import { getQuotes } from '@/lib/quotes/sources';

export const revalidate = 86400;

export async function GET(request: Request) {
  const key = request.headers.get('x-quotes-key');
  if (!key || key !== process.env.QUOTES_ROUTE_SECRET) {
    return new Response('forbidden', { status: 401 });
  }
  return Response.json(await getQuotes());
}
