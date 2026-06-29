# T8 — Historique Traçabilité Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/history` page showing the full live event log of tool movements with action and worker filters.

**Architecture:** Single client component that opens an SSE connection to `/api/events`, mirrors the snapshot+update pattern from `app/page.tsx`, and applies filters locally in React state. No new shared components — reuses existing `Badge` and `Card` from `@/components/ui`.

**Tech Stack:** Next.js 16 App Router, React 19 (`useState`, `useEffect`), SSE via `EventSource`, Tailwind v4, TypeScript.

## Global Constraints

- Next.js 16.2.9 — client component requires `"use client"` directive
- SSE endpoint: `GET /api/events` — sends `snapshot` then `scan` messages (see `app/api/events/route.ts`)
- `snapshot` payload: `{ type: "snapshot", tools: Tool[], events: ScanEvent[], workers: Worker[] }`
- `scan` payload: `{ type: "scan", event: ScanEvent }`
- `store.events` capped at 100 — no pagination needed
- Dark theme: `bg-gray-950 text-white` matching dashboard

---

### Task 1: History page

**Files:**
- Create: `app/history/page.tsx`

**Interfaces:**
- Consumes: `EventSource("/api/events")` — SSE stream
- Consumes: `Badge` from `@/components/ui/badge`, `Card`, `CardContent` from `@/components/ui/card`
- Consumes: `ScanEvent`, `Worker` from `@/lib/types`
- Produces: route `/history` — live filtered event log

- [ ] **Step 1: Create the page**

```tsx
// app/history/page.tsx
"use client"

import { useEffect, useState } from "react"
import type { ScanEvent, Worker } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

type ActionFilter = "all" | "checkout" | "return"

export default function HistoryPage() {
  const [events, setEvents] = useState<ScanEvent[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [connected, setConnected] = useState(false)
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all")
  const [workerFilter, setWorkerFilter] = useState<string>("all")

  useEffect(() => {
    const es = new EventSource("/api/events")
    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === "snapshot") {
        setEvents(data.events)
        setWorkers(data.workers)
      }
      if (data.type === "scan") {
        setEvents((prev) => [data.event, ...prev].slice(0, 100))
      }
    }
    return () => es.close()
  }, [])

  const filtered = events.filter((ev) => {
    if (actionFilter !== "all" && ev.action !== actionFilter) return false
    if (workerFilter !== "all" && ev.worker_id !== workerFilter) return false
    return true
  })

  const workerMap = new Map(workers.map((w) => [w.id, w]))

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-sm">F</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Historique</h1>
            <p className="text-xs text-gray-400">{filtered.length} mouvement{filtered.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
            <span className="text-gray-400">{connected ? "Temps réel" : "Déconnecté"}</span>
          </div>
          <a href="/" className="text-xs text-gray-400 hover:text-white transition-colors">
            ← Dashboard
          </a>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["all", "checkout", "return"] as ActionFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setActionFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              actionFilter === f
                ? "bg-gray-100 text-gray-900 border-gray-100"
                : "border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            {f === "all" ? "Tous" : f === "checkout" ? "Sorties" : "Retours"}
          </button>
        ))}

        {workers.length > 0 && (
          <select
            value={workerFilter}
            onChange={(e) => setWorkerFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500 transition-colors outline-none"
          >
            <option value="all">Tous les opérateurs</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Event list */}
      {filtered.length === 0 && (
        <p className="text-xs text-gray-500 mt-8 text-center">
          Aucun mouvement.{" "}
          <a href="/simulator" className="underline text-gray-400">
            Ouvrir le simulateur →
          </a>
        </p>
      )}

      <div className="space-y-2">
        {filtered.map((ev) => {
          const worker = workerMap.get(ev.worker_id)
          const time = new Date(ev.timestamp).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
          return (
            <Card key={ev.id} className="bg-gray-900 border-gray-800">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge
                      variant="outline"
                      className={
                        ev.action === "checkout"
                          ? "border-amber-600 text-amber-400 text-xs shrink-0"
                          : "border-emerald-600 text-emerald-400 text-xs shrink-0"
                      }
                    >
                      {ev.action === "checkout" ? "↑ Sortie" : "↓ Retour"}
                    </Badge>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{ev.tool_name}</div>
                      <div className="text-xs font-mono text-gray-500">{ev.tool_id}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-0.5">
                    <span
                      className="text-xs font-medium"
                      style={{ color: worker?.color ?? "#9ca3af" }}
                    >
                      {ev.worker_name}
                    </span>
                    <span className="text-xs text-gray-500">{time}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/kieranleleux/dev/ynov/concours/tooltrack
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Start dev server and verify in browser**

Open `http://localhost:3000/history`.

Verify:
- Page loads with "Temps réel" indicator green
- Empty state shows link to simulator
- "← Dashboard" link navigates home

- [ ] **Step 4: Test live updates and filters**

Open `http://localhost:3000/simulator` in another tab. Trigger 3-4 scans.

Switch back to `/history`. Verify:
- New events appear at top of list in real time
- "Sorties" pill hides return events
- "Retours" pill hides checkout events
- Worker dropdown filters to selected worker's events only
- Resetting filters to "Tous" / "Tous les opérateurs" restores all events

- [ ] **Step 5: Commit**

```bash
git add app/history/page.tsx
git commit -m "feat(t8): add /history live traceability log with filters"
```
