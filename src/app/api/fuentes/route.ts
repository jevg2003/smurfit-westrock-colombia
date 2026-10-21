import { buildFuentesStatus } from "./status";

export const dynamic = "force-dynamic";

/** Read-only state of the server flags and of the AI configuration. Never returns keys or env values. */
export function GET() {
  return Response.json(buildFuentesStatus(process.env), { headers: { "Cache-Control": "no-store" } });
}
