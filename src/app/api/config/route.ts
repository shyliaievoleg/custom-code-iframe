import { NextResponse } from "next/server"
import { getPublishConfig } from "@/lib/publishers"

export const dynamic = "force-dynamic"

/** Returns a sanitized view of the publish configuration for the UI. */
export async function GET() {
  return NextResponse.json(getPublishConfig())
}
