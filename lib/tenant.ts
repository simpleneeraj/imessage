// Subdomain → tenant ("space") resolution.
//
// Production hosts look like `<slug>.<ROOT_HOST>`; the bare apex `<ROOT_HOST>`
// is the root/onboarding domain (no tenant). Local dev uses `<slug>.localhost`
// (Chromium/Safari resolve any *.localhost to 127.0.0.1).
//
// The apex domain is environment-specific, so it comes from
// NEXT_PUBLIC_ROOT_HOST (inlined at build for both client and server) rather
// than being hardcoded here.
export const ROOT_HOST = process.env.NEXT_PUBLIC_ROOT_HOST ?? '';

// Subdomains that are infrastructure, not spaces.
const RESERVED = new Set([
  'www',
  'app',
  'api',
  'admin',
  'root',
  'chat',
  'mail',
  'static',
  'assets',
]);

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$/;

/** Derive the tenant slug from a Host header / hostname; null = root domain. */
export function slugFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const h = host.split(':')[0].toLowerCase().trim();

  let sub: string | null = null;
  if (h === ROOT_HOST || h === 'localhost' || h === '127.0.0.1') {
    return null;
  } else if (h.endsWith(`.${ROOT_HOST}`)) {
    sub = h.slice(0, -(`.${ROOT_HOST}`.length));
  } else if (h.endsWith('.localhost')) {
    sub = h.slice(0, -'.localhost'.length);
  } else {
    return null; // unknown host (e.g. a Vercel preview URL) → treat as root
  }

  // only the left-most label is the slug; ignore deeper nesting
  sub = sub.split('.')[0];
  if (!sub || RESERVED.has(sub) || !SLUG_RE.test(sub)) return null;
  return sub;
}

/** Client-side: the slug for the page currently being viewed. */
export function clientTenantSlug(): string | null {
  if (typeof window === 'undefined') return null;
  return slugFromHost(window.location.hostname);
}

/** Absolute URL for a space's subdomain (root domain uses https in prod). */
export function tenantUrl(slug: string): string {
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('localhost')) {
    return `${window.location.protocol}//${slug}.localhost:${window.location.port || '3000'}`;
  }
  return `https://${slug}.${ROOT_HOST}`;
}

/** Shareable invite link for the 2nd member of a space. */
export function inviteUrl(slug: string, token: string): string {
  return `${tenantUrl(slug)}/join/${token}`;
}
