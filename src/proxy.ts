import { NextResponse, type NextRequest } from "next/server";
import { handleAccess } from "@/lib/access-handler";

/**
 * Cloudflare Access enforcement (Node runtime, the Next 16 default). There is no `matcher` on
 * purpose: the proxy runs on every request and `isPublicPath` decides what is public, so a
 * future route is private by default.
 */
export async function proxy(request: NextRequest) {
  const outcome = await handleAccess(request, {
    CF_ACCESS_TEAM_DOMAIN: process.env.CF_ACCESS_TEAM_DOMAIN,
    CF_ACCESS_AUD: process.env.CF_ACCESS_AUD,
    CF_ACCESS_ENFORCE: process.env.CF_ACCESS_ENFORCE,
    NODE_ENV: process.env.NODE_ENV,
  });
  if (outcome.type === "deny") return outcome.response;
  return NextResponse.next({ request: { headers: outcome.headers } });
}
