import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const experiment = await db.experiment.findUnique({ where: { slug } })
  if (!experiment) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  return NextResponse.json({ experiment })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const experiment = await db.experiment.findUnique({ where: { slug } })
  if (!experiment) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  // Note: this only removes the local record. The published file in
  // GitHub/GitLab is intentionally left untouched so production embeds
  // don't suddenly break. A future "unpublish" action can delete the file
  // via the same Contents/Repository Files API.
  await db.experiment.delete({ where: { slug } })
  return NextResponse.json({ ok: true })
}
