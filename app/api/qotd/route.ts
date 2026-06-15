// Quote of the Day — proxies the ZenQuotes API server-side (it sends no CORS
// headers and is IP-rate-limited, so we can't call it from the browser). Cached
// for a day; falls back to a fixed quote if the upstream is unavailable.

const FALLBACK = {
  text: 'Being deeply loved by someone gives you strength, while loving someone deeply gives you courage.',
  author: 'Lao Tzu',
};

export const revalidate = 86400; // refresh once a day

export async function GET() {
  try {
    const res = await fetch('https://zenquotes.io/api/today', {
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error(`zenquotes ${res.status}`);
    const data = (await res.json()) as { q?: string; a?: string }[];
    const q = Array.isArray(data) ? data[0] : null;
    if (q?.q) {
      return Response.json({ text: q.q, author: q.a ?? 'Unknown' });
    }
    throw new Error('unexpected shape');
  } catch {
    return Response.json(FALLBACK);
  }
}
