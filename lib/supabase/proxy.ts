import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { slugFromHost } from "@/lib/tenant";

// Refreshes the Supabase auth session on every matched request, forwards the
// refreshed cookies to both the browser and downstream Server Components, and
// stamps the resolved tenant slug onto an `x-tenant` request header so Server
// Components can read the active space via next/headers.
export async function updateSession(request: NextRequest) {
  const slug = slugFromHost(request.headers.get("host"));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant", slug ?? "");

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() validates the JWT signature against the project's published
  // public keys — safe to trust on the server (unlike getSession()).
  await supabase.auth.getClaims();

  return response;
}
