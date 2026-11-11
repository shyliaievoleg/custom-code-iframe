import type { Publisher, PublishInput, PublishResult } from "./types"

const GITLAB_API = process.env.GITLAB_API_BASE?.replace(/\/+$/, "") || "https://gitlab.com/api/v4"

function buildFilePath(slug: string): string {
  const prefix = process.env.GITLAB_PATH_PREFIX?.replace(/^\/+|\/+$/g, "")
  const base = `${slug}/index.html`
  return prefix ? `${prefix}/${base}` : base
}

function buildPublicUrl(filePath: string): string {
  const explicit = process.env.GITLAB_PAGES_BASE?.replace(/\/+$/, "")
  if (explicit) {
    return `${explicit}/${filePath.replace(/\/index\.html$/, "/")}`
  }
  // Fallback pattern: https://{namespace}.gitlab.io/{project}/...
  const namespace = process.env.GITLAB_NAMESPACE
  const project = process.env.GITLAB_PROJECT_NAME
  if (namespace && project) {
    return `https://${namespace}.gitlab.io/${project}/${filePath.replace(/\/index\.html$/, "/")}`
  }
  // Last resort — point at the GitLab raw blob (works for preview, not pretty)
  return `${GITLAB_API}/projects/${encodeURIComponent(
    process.env.GITLAB_PROJECT_ID || "",
  )}/repository/${filePath.replace(/\/index\.html$/, "/")}raw`
}

/**
 * Publishes the experiment as `{pathPrefix}/{slug}/index.html` inside the
 * configured GitLab project. Uses the Repository Files API: POST creates,
 * PUT updates.
 *
 * Required env:
 *   GITLAB_TOKEN      — access token with `api` scope on the project
 *   GITLAB_PROJECT_ID — numeric id or "namespace/project"
 * Optional env:
 *   GITLAB_BRANCH        — default "main"
 *   GITLAB_PATH_PREFIX   — subfolder, e.g. "experiments"
 *   GITLAB_PAGES_BASE    — override the pages URL, e.g. "https://ns.gitlab.io/proj"
 *   GITLAB_NAMESPACE     — used to construct the default pages URL
 *   GITLAB_PROJECT_NAME  — used to construct the default pages URL
 *   GITLAB_API_BASE      — self-hosted GitLab base, default https://gitlab.com/api/v4
 */
export const gitlabPublisher: Publisher = {
  name: "gitlab",
  isConfigured() {
    return Boolean(process.env.GITLAB_TOKEN && process.env.GITLAB_PROJECT_ID)
  },
  async publish({ slug, title, html }: PublishInput): Promise<PublishResult> {
    const token = process.env.GITLAB_TOKEN
    const projectId = process.env.GITLAB_PROJECT_ID
    const branch = process.env.GITLAB_BRANCH || "main"
    if (!token || !projectId) {
      throw new Error("GitLab publisher is not configured (GITLAB_TOKEN / GITLAB_PROJECT_ID)")
    }

    const filePath = buildFilePath(slug)
    const encodedPath = encodeURIComponent(filePath)
    const projectScope = encodeURIComponent(projectId)

    // 1. Probe to decide POST (create) vs PUT (update).
    const probeUrl = `${GITLAB_API}/projects/${projectScope}/repository/files/${encodedPath}?ref=${encodeURIComponent(branch)}`
    const probe = await fetch(probeUrl, {
      headers: { "PRIVATE-TOKEN": token },
    })
    const method = probe.status === 200 ? "PUT" : "POST"

    // 2. Create or update.
    const res = await fetch(`${GITLAB_API}/projects/${projectScope}/repository/files/${encodedPath}`, {
      method,
      headers: {
        "PRIVATE-TOKEN": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        branch,
        content: html,
        commit_message: `chore(experiments): ${method === "PUT" ? "update" : "publish"} ${slug} — ${title}`,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GitLab publish failed (${res.status}): ${text}`)
    }

    const data = (await res.json()) as { commit_id?: string; blob_id?: string }
    return {
      provider: "gitlab",
      publicUrl: buildPublicUrl(filePath),
      commitSha: data.commit_id,
      raw: data,
    }
  },
}
