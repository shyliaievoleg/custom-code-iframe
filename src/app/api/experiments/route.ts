import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getPublisher, getDefaultProvider, getPublishConfig } from "@/lib/publishers"
import type { ProviderName } from "@/lib/publishers/types"

export const dynamic = "force-dynamic"

function absolutize(req: NextRequest, url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http"
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host") ||
    "localhost"
  return `${proto}://${host}${url.startsWith("/") ? "" : "/"}${url}`
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/

export async function GET() {
  const experiments = await db.experiment.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json({ experiments })
}

export async function POST(req: NextRequest) {
  let body: {
    title?: string
    slug?: string
    html?: string
    provider?: ProviderName
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { title, slug, html, provider } = body
  if (!title || !slug || !html) {
    return NextResponse.json(
      { error: "Fields `title`, `slug`, `html` are required" },
      { status: 400 },
    )
  }
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      {
        error:
          "`slug` must be 1-64 chars, lowercase letters/digits/hyphens, no leading/trailing hyphen",
      },
      { status: 400 },
    )
  }

  const config = getPublishConfig()
  const chosenProvider: ProviderName =
    provider && ["local", "github", "gitlab"].includes(provider)
      ? provider
      : getDefaultProvider()

  const sizeBytes = Buffer.byteLength(html, "utf-8")
  const existing = await db.experiment.findUnique({ where: { slug } })

  // Upsert into a "publishing" state first so the UI can reflect it immediately.
  const experiment = await db.experiment.upsert({
    where: { slug },
    create: {
      slug,
      title,
      html,
      provider: chosenProvider,
      sizeBytes,
      status: "publishing",
      errorMessage: null,
    },
    update: {
      title,
      html,
      provider: chosenProvider,
      sizeBytes,
      status: "publishing",
      errorMessage: null,
    },
  })

  try {
    const publisher = getPublisher(chosenProvider)
    const result = await publisher.publish({ slug, title, html })
    const publicUrl = absolutize(req, result.publicUrl)

    const updated = await db.experiment.update({
      where: { id: experiment.id },
      data: {
        status: "published",
        publicUrl,
        commitSha: result.commitSha ?? null,
        publishedAt: new Date(),
        errorMessage: null,
      },
    })

    return NextResponse.json({
      experiment: updated,
      config: { defaultProvider: config.defaultProvider, providers: config.providers },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const updated = await db.experiment.update({
      where: { id: experiment.id },
      data: { status: "failed", errorMessage: message },
    })
    return NextResponse.json(
      { error: message, experiment: updated },
      { status: 502 },
    )
  }
}
