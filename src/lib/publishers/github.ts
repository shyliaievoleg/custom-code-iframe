import type { Publisher, PublishInput, PublishResult } from "./types"

const GITHUB_API = "https://api.github.com"

function toBase64(input: string): string {
  // UTF-8 safe base64 (Buffer is available in Node/Next runtime)
  return Buffer.from(input, "utf-8").toString("base64")
}

function buildFilePath(slug: string): string {
  const prefix = process.env.GITHUB_PATH_PREFIX?.replace(/^\/+|\/+$/g, "")
  const base = `${slug}/index.html`
  return prefix ? `${prefix}/${base}` : base
}

function buildPublicUrl(filePath: string): string {
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const explicit = process.env.GITHUB_PAGES_BASE?.replace(/\/+$/, "")
  if (explicit) {
    return `${explicit}/${filePath.replace(/\/index\.html$/, "/")}`
  }
  return `https://${owner}.github.io/${repo}/${filePath.replace(/\/index\.html$/, "/")}`
}

/**
 * Publishes the experiment as `{pathPrefix}/{slug}/index.html` in the
 * configured GitHub repository. Uses the Contents API, which both creates
 * and updates a file (the `sha` of an existing file is fetched first so
 * the PUT overwrites it instead of failing with 422).
 *
 * Required env:
 *   GITHUB_TOKEN   — fine-grained PAT with `contents: write` on the repo
 *   GITHUB_OWNER   — user/org owning the repo
 *   GITHUB_REPO    — repository name (must have GitHub Pages enabled)
 * Optional env:
 *   GITHUB_BRANCH        — default "main"
 *   GITHUB_PATH_PREFIX   — subfolder inside the repo, e.g. "experiments"
 *   GITHUB_PAGES_BASE    — override the default https://{owner}.github.io/{repo} URL
 */
export const githubPublisher: Publisher = {
  name: "github",
  isConfigured() {
    return Boolean(
      process.env.GITHUB_TOKEN &&
        process.env.GITHUB_OWNER &&
        process.env.GITHUB_REPO,
    )
  },
  async publish({ slug, title, html }: PublishInput): Promise<PublishResult> {
    const token = process.env.GITHUB_TOKEN
    const owner = process.env.GITHUB_OWNER
    const repo = process.env.GITHUB_REPO
    const branch = process.env.GITHUB_BRANCH || "main"
    if (!token || !owner || !repo) {
      throw new Error("GitHub publisher is not configured (GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO)")
    }

    const filePath = buildFilePath(slug)
    const endpoint = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`

    // 1. Probe for an existing file to pick up its `sha` (required to update).
    let existingSha: string | undefined
    const probe = await fetch(`${endpoint}?ref=${encodeURIComponent(branch)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
    if (probe.ok) {
      const data = (await probe.json()) as { sha?: string }
      existingSha = data.sha
    } else if (probe.status !== 404) {
      const text = await probe.text()
      throw new Error(`GitHub probe failed (${probe.status}): ${text}`)
    }

    // 2. Create or update the file.
    const body: Record<string, unknown> = {
      message: `chore(experiments): ${existingSha ? "update" : "publish"} ${slug} — ${title}`,
      content: toBase64(html),
      branch,
    }
    if (existingSha) body.sha = existingSha

    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GitHub publish failed (${res.status}): ${text}`)
    }

    const data = (await res.json()) as { commit?: { sha?: string } }
    return {
      provider: "github",
      publicUrl: buildPublicUrl(filePath),
      commitSha: data.commit?.sha,
      raw: data,
    }
  },
}
