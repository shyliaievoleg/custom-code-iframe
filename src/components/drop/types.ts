export type ProviderName = "local" | "github" | "gitlab"
export type ExperimentStatus = "draft" | "publishing" | "published" | "failed"

export interface Experiment {
  id: string
  slug: string
  title: string
  html: string
  provider: ProviderName
  status: ExperimentStatus
  publicUrl: string | null
  commitSha: string | null
  sizeBytes: number
  errorMessage: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
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

export const DATOCMS_LIMIT_BYTES = 300 * 1024

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function formatRelative(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "только что"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} мин назад`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} ч назад`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} дн назад`
  return d.toLocaleDateString("ru-RU")
}
