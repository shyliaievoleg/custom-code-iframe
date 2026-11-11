export type ProviderName = "local" | "github" | "gitlab"

export type ExperimentStatus = "draft" | "publishing" | "published" | "failed"

export interface PublishInput {
  slug: string
  title: string
  html: string
}

export interface PublishResult {
  provider: ProviderName
  /** Absolute or site-relative URL where the experiment is reachable. */
  publicUrl: string
  commitSha?: string
  raw?: unknown
}

export interface Publisher {
  name: ProviderName
  isConfigured: () => boolean
  publish: (input: PublishInput) => Promise<PublishResult>
}

export interface ProviderStatus {
  name: ProviderName
  configured: boolean
}

export interface PublishConfig {
  providers: ProviderStatus[]
  defaultProvider: ProviderName
  github: {
    configured: boolean
    owner: string | null
    repo: string | null
    branch: string
    pathPrefix: string
    pagesBase: string | null
  }
  gitlab: {
    configured: boolean
    projectId: string | null
    branch: string
    pathPrefix: string
    pagesBase: string | null
  }
}
