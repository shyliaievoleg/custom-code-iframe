"use client"

import { useEffect, useMemo, useState } from "react"
import { Rocket, Copy, Loader2, Sparkles, CheckCircle2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { CodeEditor } from "./code-editor"
import { LivePreview } from "./live-preview"
import {
  DATOCMS_LIMIT_BYTES,
  formatBytes,
  type Experiment,
  type PublishConfig,
  type ProviderName,
} from "./types"

const SAMPLE_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Drop demo</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0b1220; color: #e2e8f0; }
  .wrap { padding: 40px 24px; max-width: 560px; margin: 0 auto; text-align: center; }
  .card {
    padding: 32px; border-radius: 18px;
    background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
    color: #042f2e; box-shadow: 0 20px 60px -20px rgba(16,185,129,.45);
  }
  h1 { margin: 0 0 8px; font-size: 28px; font-weight: 800; }
  p { margin: 0 0 20px; opacity: .85; }
  button {
    padding: 10px 18px; border: 0; border-radius: 999px;
    background: #042f2e; color: #ecfdf5; font-weight: 600; cursor: pointer;
    transition: transform .12s ease;
  }
  button:hover { transform: translateY(-1px); }
  .count { font-variant-numeric: tabular-nums; font-weight: 700; font-size: 32px; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Привет из Drop</h1>
      <p>Самодостаточный фрагмент. Никаких внешних зависимостей.</p>
      <div class="count" id="count">0</div>
      <p style="margin-top:12px"><button id="b">Кликнуть</button></p>
    </div>
  </div>
  <script>
    let n = 0;
    const el = document.getElementById('count');
    document.getElementById('b').addEventListener('click', () => {
      n += 1; el.textContent = n;
    });
    // Контракт авто-высоты: сообщаем родительскому iframe свой рост
    const send = () => parent.postMessage({ type: 'experiment-height', h: document.body.scrollHeight }, '*');
    window.addEventListener('load', () => { send(); setTimeout(send, 250); });
    new ResizeObserver(send).observe(document.body);
  </script>
</body>
</html>`

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

interface ExperimentEditorProps {
  initial: Experiment | null
  config: PublishConfig | null
  onPublished: (exp: Experiment) => void
}

export function ExperimentEditor({ initial, config, onPublished }: ExperimentEditorProps) {
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [html, setHtml] = useState("")
  const [provider, setProvider] = useState<ProviderName>("local")
  const [reloadToken, setReloadToken] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [result, setResult] = useState<Experiment | null>(null)

  // Seed from `initial` whenever it changes (selected from list, or cleared).
  useEffect(() => {
    if (initial) {
      setTitle(initial.title)
      setSlug(initial.slug)
      setSlugTouched(true)
      setHtml(initial.html)
      setProvider(initial.provider)
      setResult(initial.status === "published" || initial.status === "failed" ? initial : null)
    } else {
      setTitle("")
      setSlug("")
      setSlugTouched(false)
      setHtml("")
      setResult(null)
      if (config) setProvider(config.defaultProvider)
    }
    setReloadToken((t) => t + 1)
  }, [initial?.id])

  // Default provider follows config until user picks one explicitly.
  useEffect(() => {
    if (config && !initial) setProvider(config.defaultProvider)
  }, [config, initial])

  const derivedSlug = useMemo(() => slugify(title), [title])
  const effectiveSlug = slugTouched ? slug : derivedSlug
  const slugValid = SLUG_RE.test(effectiveSlug)
  const bytes = typeof TextEncoder !== "undefined"
    ? new TextEncoder().encode(html).length
    : html.length

  async function handlePublish() {
    if (!title.trim()) {
      toast({ title: "Укажите заголовок", variant: "destructive" })
      return
    }
    if (!slugValid) {
      toast({ title: "Slug некорректен", description: "Только строчные буквы, цифры и дефисы.", variant: "destructive" })
      return
    }
    if (!html.trim()) {
      toast({ title: "HTML пуст", variant: "destructive" })
      return
    }
    setPublishing(true)
    setResult(null)
    try {
      const res = await fetch("/api/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug: effectiveSlug, html, provider }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      const exp = data.experiment as Experiment
      setResult(exp)
      toast({
        title: "Опубликовано",
        description: `${exp.slug} → ${exp.provider}`,
      })
      onPublished(exp)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast({ title: "Ошибка публикации", description: message, variant: "destructive" })
    } finally {
      setPublishing(false)
    }
  }

  const embedSnippet = result?.publicUrl
    ? `<iframe\n  src="${result.publicUrl}"\n  sandbox="allow-scripts allow-same-origin"\n  loading="lazy"\n  title="${result.slug}"\n  style="width:100%;border:0;min-height:420px"\n></iframe>`
    : ""

  const providerLabel: Record<ProviderName, string> = {
    local: "Local preview",
    github: "GitHub Pages",
    gitlab: "GitLab Pages",
  }

  return (
    <div className="flex h-full min-w-0 flex-col gap-4 p-4">
      {/* Meta row */}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="exp-title" className="text-xs">Заголовок</Label>
          <Input
            id="exp-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Анимированный hero"
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="exp-slug" className="text-xs">Slug (URL)</Label>
          <Input
            id="exp-slug"
            value={effectiveSlug}
            onChange={(e) => {
              setSlug(e.target.value)
              setSlugTouched(true)
            }}
            placeholder="hero-animation"
            className={`font-mono ${!slugValid && effectiveSlug ? "border-destructive focus-visible:ring-destructive" : ""}`}
          />
          {!slugValid && effectiveSlug ? (
            <p className="text-[11px] text-destructive">только a-z, 0-9 и дефисы</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              будет: <code className="font-mono">…/{effectiveSlug || "slug"}/index.html</code>
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Публикация в</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as ProviderName)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["github", "gitlab", "local"] as ProviderName[]).map((p) => {
                const configured =
                  p === "local" ? true : config?.providers.find((x) => x.name === p)?.configured
                return (
                  <SelectItem
                    key={p}
                    value={p}
                    disabled={!configured}
                    className={configured ? "" : "opacity-50"}
                  >
                    {providerLabel[p]} {!configured && "(не настроен)"}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Editor + preview grid */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <Card className="min-w-0 flex min-h-0 flex-col overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Код фрагмента</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground"
              onClick={() => {
                setHtml(SAMPLE_HTML)
                if (!title) setTitle("Drop demo")
                if (!slugTouched) setSlug("drop-demo")
                setReloadToken((t) => t + 1)
              }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Пример
            </Button>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            <div className="h-full">
              <CodeEditor value={html} onChange={setHtml} />
            </div>
          </CardContent>
        </Card>

        <div className="min-h-0 min-w-0">
          <LivePreview html={html} reloadToken={reloadToken} />
        </div>
      </div>

      {/* Publish bar */}
      <Card className="min-w-0 overflow-hidden">
        <CardContent className="min-w-0 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="font-mono">{formatBytes(bytes)}</Badge>
            {bytes > DATOCMS_LIMIT_BYTES ? (
              <span className="text-amber-600 dark:text-amber-400">
                &gt; 300KB — через DatoCMS HTML-поле не пройдёт, через iframe работает
              </span>
            ) : (
              <span>в рамках лимита DatoCMS 300KB</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePublish}
              disabled={publishing}
              className="gap-2"
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {publishing ? "Публикуем…" : initial ? "Обновить" : "Опубликовать"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={`min-w-0 overflow-hidden ${result.status === "failed" ? "border-destructive/40" : "border-emerald-500/40"}`}>
          <CardContent className="min-w-0 space-y-3 p-4">
            <div className="flex items-center gap-2">
              {result.status === "published" ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-amber-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {result.status === "failed"
                    ? "Публикация не удалась"
                    : result.status === "publishing"
                      ? "Публикуется…"
                      : "Опубликовано"}
                </p>
                {result.publicUrl && (
                  <p className="truncate font-mono text-xs text-muted-foreground">{result.publicUrl}</p>
                )}
              </div>
              {result.publicUrl && (
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={result.publicUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> Открыть
                  </a>
                </Button>
              )}
            </div>

            {result.status === "failed" && result.errorMessage && (
              <pre className="max-h-32 overflow-auto rounded bg-destructive/10 p-2 text-xs text-destructive">
                {result.errorMessage}
              </pre>
            )}

            {result.publicUrl && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Embed-сниппет для DatoCMS</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(embedSnippet)
                        toast({ title: "Сниппет скопирован" })
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> Копировать
                    </Button>
                  </div>
                  <Textarea
                    readOnly
                    value={embedSnippet}
                    className="font-mono text-xs"
                    rows={6}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Вставьте этот URL в блок <code className="font-mono">ExperimentEmbed</code> в DatoCMS.
                    На фронте рендерится через <code className="font-mono">&lt;iframe sandbox="allow-scripts"&gt;</code>.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
