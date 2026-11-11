"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, FileCode2, Github, Gitlab, HardDrive, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ExperimentList } from "./experiment-list"
import { ExperimentEditor } from "./experiment-editor"
import { ConfigBadge } from "./config-badge"
import { toast } from "@/hooks/use-toast"
import type { Experiment, PublishConfig } from "./types"

export function DropApp() {
  const [config, setConfig] = useState<PublishConfig | null>(null)
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [editing, setEditing] = useState<Experiment | null>(null)
  const [editorKey, setEditorKey] = useState(0)
  const [helpOpen, setHelpOpen] = useState(false)

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/config", { cache: "no-store" })
      if (res.ok) setConfig(await res.json())
    } catch {
      /* silent */
    }
  }, [])

  const loadList = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await fetch("/api/experiments", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setExperiments(data.experiments as Experiment[])
      }
    } catch {
      /* silent */
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
    loadList()
  }, [loadConfig, loadList])

  const handleSelect = useCallback((exp: Experiment) => {
    setEditing(exp)
    setEditorKey((k) => k + 1)
  }, [])

  const handleNew = useCallback(() => {
    setEditing(null)
    setEditorKey((k) => k + 1)
  }, [])

  const handlePublished = useCallback(
    (exp: Experiment) => {
      setExperiments((prev) => {
        const idx = prev.findIndex((e) => e.slug === exp.slug)
        if (idx === -1) return [exp, ...prev]
        const next = [...prev]
        next[idx] = exp
        return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      })
      setEditing(exp)
    },
    [],
  )

  const handleDelete = useCallback(
    async (slug: string) => {
      try {
        const res = await fetch(`/api/experiments/${encodeURIComponent(slug)}`, {
          method: "DELETE",
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || `HTTP ${res.status}`)
        }
        setExperiments((prev) => prev.filter((e) => e.slug !== slug))
        if (editing?.slug === slug) handleNew()
        toast({ title: "Удалено" })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        toast({ title: "Не удалось удалить", description: message, variant: "destructive" })
      }
    },
    [editing, handleNew],
  )

  const activeProvider = config?.defaultProvider ?? "local"

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileCode2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="text-base font-semibold tracking-tight">Drop</h1>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                Публикация дизайн-экспериментов на GitHub / GitLab Pages
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ProviderIcon provider={activeProvider} />
            <ConfigBadge config={config} />
            <Separator orientation="vertical" className="hidden h-6 sm:block" />
            <Button onClick={handleNew} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Новый</span><span className="sm:hidden">+</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto grid max-w-[1600px] gap-0 lg:grid-cols-[380px_1fr]">
          <aside className="min-w-0 border-b lg:border-b-0 lg:border-r">
            <Card className="h-full rounded-none border-0 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>Эксперименты</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {experiments.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[55vh] lg:h-[calc(100vh-13rem)]">
                  <ExperimentList
                    experiments={experiments}
                    activeSlug={editing?.slug ?? null}
                    loading={loadingList}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                  />
                </div>
              </CardContent>
            </Card>
          </aside>

          <section className="min-w-0 min-h-[calc(100vh-4rem)]">
            <ExperimentEditor
              key={editorKey}
              initial={editing}
              config={config}
              onPublished={handlePublished}
            />
          </section>
        </div>
      </main>

      <footer className="mt-auto border-t bg-muted/30">
        <div className="mx-auto max-w-[1600px] px-4 py-3 sm:px-6">
          <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Drop · designers ship interactive HTML/CSS/JS to a static host,
                then paste the URL into a DatoCMS embed block.
              </p>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                  <BookOpen className="h-3.5 w-3.5" />
                  {helpOpen ? "Скрыть инструкцию" : "Как это работает"}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-3 space-y-2 text-xs text-muted-foreground">
              <ol className="ml-4 list-decimal space-y-1.5">
                <li>Дизайнер генерирует код (Claude/Figma→HTML) и вставляет его в редактор слева.</li>
                <li>
                  Выбирает провайдера: <strong>GitHub Pages</strong> или <strong>GitLab Pages</strong>
                  (настраивается через <code className="font-mono">.env</code>). Без токена работает
                  режим <strong>local</strong> для проверки.
                </li>
                <li>
                  Жмёт «Опубликовать» — Drop коммитит <code className="font-mono">{'{slug}/index.html'}</code> в репозиторий,
                  Pages его подхватывает, возвращается публичный URL.
                </li>
                <li>
                  Готовый <code className="font-mono">&lt;iframe sandbox&gt;</code>-сниппет копируется в
                  блок <strong>ExperimentEmbed</strong> в DatoCMS — без участия разработчика.
                </li>
              </ol>
              <p className="text-[11px]">
                Изоляция: каждый фрагмент живёт в собственном iframe, CSS/JS не конфликтуют с сайтом,
                лимит 300KB HTML-поля DatoCMS обходится. Для авто-высоты сниппет должен слать
                <code className="font-mono"> postMessage({'{type:"experiment-height",h}'})</code> — см. пример в редакторе.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </footer>
    </div>
  )
}

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === "github") return <Github className="h-4 w-4 text-muted-foreground" />
  if (provider === "gitlab") return <Gitlab className="h-4 w-4 text-muted-foreground" />
  return <HardDrive className="h-4 w-4 text-muted-foreground" />
}
