import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 renamed middleware → proxy. This keeps the Supabase auth session
// fresh by refreshing tokens and writing the rotated cookies on each request.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on everything except static assets and images, so token refresh covers
  // all real navigations and data routes.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-.*\\.png|.*\\.svg).*)",
  ],
};
