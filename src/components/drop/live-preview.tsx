"use client"

import { useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LivePreviewProps {
  html: string
  /** Bump to force a full reload (re-runs scripts, resets animations). */
  reloadToken?: number
}

/**
 * Sandboxed iframe that renders the experiment HTML inline via `srcDoc`.
 * Listens for `postMessage({ type: "experiment-height", h })` from the
 * embedded document so the iframe auto-resizes to its content — this is
 * the contract designers should ship in their snippets so the production
 * embed on the DatoCMS-driven site also auto-sizes.
 */
export function LivePreview({ html, reloadToken = 0 }: LivePreviewProps) {
  const [debounced, setDebounced] = useState(html)
  const [height, setHeight] = useState(420)
  const [restartNonce, setRestartNonce] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce html so we don't reload the iframe on every keystroke.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebounced(html), 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [html])

  // Iframe is remounted (scripts re-run) whenever the parent reloadToken
  // bumps (e.g. sample loaded / experiment selected) or the user hits Restart.
  const iframeKey = `${reloadToken}-${restartNonce}`

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data
      if (data && typeof data === "object" && data.type === "experiment-height") {
        const h = Number(data.h)
        if (Number.isFinite(h) && h > 0) setHeight(Math.min(Math.max(h, 120), 4000))
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  return (
    <Card className="flex h-full min-w-0 flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">Предпросмотр (sandboxed iframe)</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground"
          onClick={() => setRestartNonce((n) => n + 1)}
          title="Перезапустить скрипты"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Restart
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <iframe
          key={iframeKey}
          srcDoc={debounced}
          title="experiment preview"
          sandbox="allow-scripts allow-same-origin allow-popups"
          className="h-full w-full rounded-b-lg border-0 bg-white"
          style={{ height }}
          loading="lazy"
        />
      </CardContent>
    </Card>
  )
}
