import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * Serves the raw stored HTML for an experiment. This endpoint is the public
 * URL used by the `local` provider and is what designers paste into DatoCMS
 * when running in local/demo mode. It is intentionally permissive about
 * framing so the sandboxed iframe on the site (and the live preview inside
 * Drop itself) can render it.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const experiment = await db.experiment.findUnique({ where: { slug } })
  if (!experiment) {
    return new NextResponse("experiment not found", { status: 404 })
  }
  return new NextResponse(experiment.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, must-revalidate",
      // Allow embedding from any origin — the consumer is expected to wrap
      // this in a sandboxed iframe on the DatoCMS-driven site.
      "Access-Control-Allow-Origin": "*",
    },
  })
}
