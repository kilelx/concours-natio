"use client"

import { useEffect, useState } from "react"
import type { Tool, ScanEvent, Worker } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

function statusDot(status: Tool["status"]) {
  if (status === "available") return "bg-emerald-500"
  if (status === "checked_out") return "bg-amber-500"
  return "bg-red-500"
}

function statusLabel(status: Tool["status"]) {
  if (status === "available") return "Disponible"
  if (status === "checked_out") return "Sorti"
  return "Manquant"
}

export default function Dashboard() {
  const [tools, setTools] = useState<Tool[]>([])
  const [events, setEvents] = useState<ScanEvent[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const es = new EventSource("/api/events")
    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === "snapshot") {
        setTools(data.tools)
        setEvents(data.events)
        setWorkers(data.workers)
      }
      if (data.type === "scan") {
        const ev: ScanEvent = data.event
        setEvents((prev) => [ev, ...prev].slice(0, 20))
        setTools((prev) =>
          prev.map((t) => {
            if (t.id !== ev.tool_id) return t
            if (ev.action === "checkout") {
              return { ...t, status: "checked_out", checked_out_by: ev.worker_id, checked_out_at: ev.timestamp, last_scan: ev.timestamp }
            }
            return { ...t, status: "available", checked_out_by: undefined, checked_out_at: undefined, last_scan: ev.timestamp }
          })
        )
      }
    }
    return () => es.close()
  }, [])

  const available = tools.filter((t) => t.status === "available").length
  const out = tools.filter((t) => t.status === "checked_out").length
  const workerMap = new Map(workers.map((w) => [w.id, w]))

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-sm">F</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">ToolTrack</h1>
            <p className="text-xs text-gray-400">Traçabilité outillage · FACOM SCANDIAG</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <a href="/labels" className="text-gray-400 hover:text-white transition-colors">Étiquettes</a>
          <a href="/simulator" className="text-gray-400 hover:text-white transition-colors">Simulateur</a>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
            <span className="text-gray-400">{connected ? "Temps réel" : "Déconnecté"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-400">{available}</div>
            <div className="text-xs text-gray-400 mt-1">Disponibles</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-400">{out}</div>
            <div className="text-xs text-gray-400 mt-1">En utilisation</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-300">{tools.length}</div>
            <div className="text-xs text-gray-400 mt-1">Total outils</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Inventaire</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tools.map((tool) => {
              const worker = tool.checked_out_by ? workerMap.get(tool.checked_out_by) : undefined
              return (
                <Card key={tool.id} className="bg-gray-900 border-gray-800 hover:border-gray-600 transition-colors">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-gray-500 mb-0.5">{tool.reference}</div>
                        <div className="text-sm font-medium text-white truncate">{tool.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{tool.location}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${statusDot(tool.status)}`} />
                          <span className="text-xs text-gray-300">{statusLabel(tool.status)}</span>
                        </div>
                        {worker && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{ backgroundColor: worker.color + "22", color: worker.color }}
                          >
                            {worker.name.split(" ")[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Activité récente</h2>
          <div className="space-y-2">
            {events.length === 0 && (
              <p className="text-xs text-gray-500">
                Aucun scan.{" "}
                <a href="/simulator" className="underline text-gray-400">Simulateur →</a>
                {" "}ou{" "}
                <a href="/scanner" className="underline text-gray-400">Scanner caméra →</a>
              </p>
            )}
            {events.map((ev) => {
              const worker = workerMap.get(ev.worker_id)
              const time = new Date(ev.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
              return (
                <div key={ev.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <Badge
                      variant="outline"
                      className={ev.action === "checkout"
                        ? "border-amber-600 text-amber-400 text-xs"
                        : "border-emerald-600 text-emerald-400 text-xs"}
                    >
                      {ev.action === "checkout" ? "↑ Sortie" : "↓ Retour"}
                    </Badge>
                    <span className="text-xs text-gray-500">{time}</span>
                  </div>
                  <div className="text-xs text-white font-medium truncate">{ev.tool_name}</div>
                  <div className="text-xs mt-0.5" style={{ color: worker?.color ?? "#9ca3af" }}>
                    {ev.worker_name}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
