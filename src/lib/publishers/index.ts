import { localPublisher } from "./local"
import { githubPublisher } from "./github"
import { gitlabPublisher } from "./gitlab"
import type { Publisher, ProviderName, PublishConfig, ProviderStatus } from "./types"

export const publishers: Record<ProviderName, Publisher> = {
  local: localPublisher,
  github: githubPublisher,
  gitlab: gitlabPublisher,
}

export const providerOrder: ProviderName[] = ["github", "gitlab", "local"]

export function getPublisher(name: ProviderName): Publisher {
  const p = publishers[name]
  if (!p) throw new Error(`Unknown publisher: ${name}`)
  return p
}

export function getConfiguredProviders(): ProviderStatus[] {
  return providerOrder.map((name) => ({
    name,
    configured: publishers[name].isConfigured(),
  }))
}

export function getDefaultProvider(): ProviderName {
  const fromEnv = process.env.DROP_DEFAULT_PROVIDER as ProviderName | undefined
  if (fromEnv && publishers[fromEnv]) return fromEnv
  const firstConfigured = providerOrder.find((n) => publishers[n].isConfigured())
  return firstConfigured || "local"
}

export function getPublishConfig(): PublishConfig {
  return {
    providers: getConfiguredProviders(),
    defaultProvider: getDefaultProvider(),
    github: {
      configured: githubPublisher.isConfigured(),
      owner: process.env.GITHUB_OWNER || null,
      repo: process.env.GITHUB_REPO || null,
      branch: process.env.GITHUB_BRANCH || "main",
      pathPrefix: process.env.GITHUB_PATH_PREFIX || "",
      pagesBase: process.env.GITHUB_PAGES_BASE || null,
    },
    gitlab: {
      configured: gitlabPublisher.isConfigured(),
      projectId: process.env.GITLAB_PROJECT_ID || null,
      branch: process.env.GITLAB_BRANCH || "main",
      pathPrefix: process.env.GITLAB_PATH_PREFIX || "",
      pagesBase: process.env.GITLAB_PAGES_BASE || null,
    },
  }
}

export type { ProviderName, PublishInput, PublishResult, Publisher, PublishConfig, ProviderStatus } from "./types"
