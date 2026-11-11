"use client"

import { CheckCircle2, AlertTriangle, CloudOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { PublishConfig, ProviderName } from "./types"

const LABELS: Record<ProviderName, string> = {
  local: "Local preview",
  github: "GitHub Pages",
  gitlab: "GitLab Pages",
}

export function ConfigBadge({ config }: { config: PublishConfig | null }) {
  if (!config) {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <CloudOff className="h-3.5 w-3.5" /> Загрузка…
      </Badge>
    )
  }

  const active = config.defaultProvider
  const activeStatus = config.providers.find((p) => p.name === active)
  const isLocal = active === "local"
  const tip = isLocal
    ? "GitHub и GitLab не настроены — эксперименты публикуются через локальный preview endpoint. Добавьте GITHUB_TOKEN/GITLAB_TOKEN в .env для публикации на Pages."
    : active === "github"
      ? `github.com/${config.github.owner}/${config.github.repo} · branch ${config.github.branch}`
      : `GitLab project ${config.gitlab.projectId} · branch ${config.gitlab.branch}`

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={isLocal ? "secondary" : "default"}
            className={`gap-1.5 ${isLocal ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}`}
          >
            {isLocal ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {LABELS[active]}
            {activeStatus && !activeStatus.configured && !isLocal ? " (не настроен)" : ""}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs leading-relaxed">{tip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
