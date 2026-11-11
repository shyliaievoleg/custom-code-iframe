import type { Publisher } from "./types"

/**
 * Local provider — stores the HTML inside the Drop database and serves it via
 * `/api/experiments/[slug]/preview`. Useful for demos, staging, and as the
 * automatic fallback when neither GitHub nor GitLab is configured.
 *
 * The URL returned is site-relative; the API layer will absolutize it using
 * the incoming request host so it can be pasted into DatoCMS verbatim.
 */
export const localPublisher: Publisher = {
  name: "local",
  isConfigured: () => true,
  async publish({ slug }) {
    return {
      provider: "local",
      publicUrl: `/api/experiments/${slug}/preview`,
    }
  },
}
