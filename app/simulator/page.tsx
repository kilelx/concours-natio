"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import jsQR from "jsqr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { ScanEvent } from "@/lib/types"

const TOOLS = [
  { id: "FC-001", name: 'Clé dynamométrique 1/2"' },
  { id: "FC-002", name: 'Clé dynamométrique 3/8"' },
  { id: "FC-003", name: "Coffret douilles 1/2\" 19 pcs" },
  { id: "FC-004", name: "Coffret douilles 3/8\" 26 pcs" },
  { id: "FC-005", name: 'Cliquet réversible 1/2"' },
  { id: "FC-006", name: 'Cliquet réversible 3/8"' },
  { id: "FC-007", name: "Pince multiprise 250mm" },
  { id: "FC-008", name: "Pince étau 250mm" },
  { id: "FC-009", name: "Jeu tournevis 6 pcs" },
  { id: "FC-010", name: "Jeu clés mixtes 12 pcs" },
  { id: "FC-011", name: "Clé à chocs 1/2\"" },
  { id: "FC-012", name: "Extracteur courroies" },
]

const TOOL_IDS = new Set(TOOLS.map((t) => t.id))

const WORKERS = [
  { id: "W1", name: "Martin Dubois", color: "#3B82F6" },
  { id: "W2", name: "Sophie Laurent", color: "#10B981" },
  { id: "W3", name: "Karim Benali", color: "#F59E0B" },
  { id: "W4", name: "Julie Moreau", color: "#8B5CF6" },
]

function CameraScanner({
  workerId,
  onEvent,
  onClose,
}: {
  workerId: string
  onEvent: (e: ScanEvent) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const cooldownRef = useRef(false)

  const [detected, setDetected] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const handleQR = useCallback(async (toolId: string) => {
    if (cooldownRef.current || !TOOL_IDS.has(toolId)) return
    cooldownRef.current = true
    setDetected(toolId)
    setProcessing(true)
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool_id: toolId, worker_id: workerId }),
      })
      const event: ScanEvent = await res.json()
      onEvent(event)
    } finally {
      setProcessing(false)
      setTimeout(() => {
        cooldownRef.current = false
        setDetected(null)
      }, 2500)
    }
  }, [workerId, onEvent])

  useEffect(() => {
    let stream: MediaStream | null = null
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 } },
    }).then((s) => {
      stream = s
      if (videoRef.current) {
        videoRef.current.srcObject = s
        videoRef.current.play()
      }
    }).catch(() => {
      setCameraError("Accès caméra refusé. Autorisez dans les permissions du navigateur.")
    })
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    const tick = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" })
      if (code?.data) handleQR(code.data)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [handleQR])

  return (
    <div className="mb-4">
      <div className="relative w-full rounded-xl overflow-hidden bg-black aspect-video mb-3">
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
            <p className="text-red-400 text-sm">{cameraError}</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-44 h-44 border-2 rounded-lg transition-colors duration-150 ${
                detected ? "border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.6)]" : "border-white/30"
              }`} />
            </div>
            <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
              <div className={`text-xs px-2 py-1 rounded-full ${
                processing ? "bg-amber-500/80 text-white" :
                detected ? "bg-emerald-600/80 text-white" :
                "bg-black/60 text-gray-300"
              }`}>
                {processing ? "Enregistrement…" : detected ? `${detected} détecté` : "Pointez un QR code"}
              </div>
            </div>
          </>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <button
        onClick={onClose}
        className="w-full py-2 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-500 transition-colors"
      >
        ✕ Fermer la caméra
      </button>
    </div>
  )
}

export default function Simulator() {
  const [selectedTool, setSelectedTool] = useState(TOOLS[0].id)
  const [selectedWorker, setSelectedWorker] = useState(WORKERS[0].id)
  const [lastEvent, setLastEvent] = useState<ScanEvent | null>(null)
  const [scanning, setScanning] = useState(false)
  const [log, setLog] = useState<ScanEvent[]>([])
  const [cameraOpen, setCameraOpen] = useState(false)

  function addEvent(event: ScanEvent) {
    setLastEvent(event)
    setLog((prev) => [event, ...prev].slice(0, 10))
  }

  async function scan() {
    setScanning(true)
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool_id: selectedTool, worker_id: selectedWorker }),
      })
      addEvent(await res.json())
    } finally {
      setScanning(false)
    }
  }

  async function runDemo() {
    const pairs = [
      { tool: "FC-001", worker: "W1" },
      { tool: "FC-005", worker: "W2" },
      { tool: "FC-003", worker: "W3" },
      { tool: "FC-007", worker: "W1" },
      { tool: "FC-009", worker: "W4" },
    ]
    for (const p of pairs) {
      await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool_id: p.tool, worker_id: p.worker }),
      })
      await new Promise((r) => setTimeout(r, 600))
    }
  }

  const worker = WORKERS.find((w) => w.id === selectedWorker)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-sm">F</div>
          <div>
            <h1 className="text-xl font-bold">Simulateur FACOM</h1>
            <p className="text-xs text-gray-400">Simule l&apos;appareil SCANDIAG via BLE</p>
          </div>
        </div>
        <a href="/" className="text-xs text-gray-400 underline">Dashboard →</a>
      </div>

      {/* Technician select */}
      <Card className="bg-gray-900 border-gray-800 mb-4">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm text-gray-300">Technicien</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="grid grid-cols-2 gap-2">
            {WORKERS.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedWorker(w.id)}
                className={`text-sm px-3 py-2 rounded-lg border transition-all text-left ${
                  selectedWorker === w.id ? "border-white/40 bg-white/10" : "border-gray-700 hover:border-gray-500"
                }`}
                style={selectedWorker === w.id ? { borderColor: w.color + "80", backgroundColor: w.color + "15" } : {}}
              >
                <span style={{ color: selectedWorker === w.id ? w.color : "#d1d5db" }}>{w.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Camera scanner (inline, toggled) */}
      {cameraOpen && (
        <CameraScanner
          workerId={selectedWorker}
          onEvent={(ev) => { addEvent(ev); setCameraOpen(false) }}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {/* Tool select — hidden when camera open */}
      {!cameraOpen && (
        <Card className="bg-gray-900 border-gray-800 mb-4">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm text-gray-300">Outil à scanner</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="space-y-1">
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTool(t.id)}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                    selectedTool === t.id
                      ? "border-red-600 bg-red-950/30 text-white"
                      : "border-gray-800 hover:border-gray-600 text-gray-300"
                  }`}
                >
                  <span className="font-mono text-xs text-gray-500 mr-2">{t.id}</span>
                  {t.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan button */}
      {!cameraOpen && (
        <button
          onClick={() => setCameraOpen(true)}
          disabled={scanning}
          className="w-full h-20 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 text-white font-bold text-lg transition-all mb-3 flex items-center justify-center gap-3"
        >
          <span className="text-2xl">📡</span>
          <span>Scanner l&apos;outil</span>
        </button>
      )}

      {/* Manual scan fallback */}
      {!cameraOpen && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={scan}
            disabled={scanning}
            className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-500 disabled:opacity-50 transition-colors"
          >
            {scanning ? "Scan en cours…" : "Scan manuel (outil sélectionné)"}
          </button>
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300"
            onClick={runDemo}
          >
            ▶ Démo
          </Button>
        </div>
      )}

      {/* Last event feedback */}
      {lastEvent && (
        <div className={`rounded-xl border p-4 mb-4 ${
          lastEvent.action === "checkout" ? "border-amber-600 bg-amber-950/20" : "border-emerald-600 bg-emerald-950/20"
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{lastEvent.action === "checkout" ? "🔴" : "🟢"}</span>
            <Badge variant="outline" className={lastEvent.action === "checkout" ? "border-amber-600 text-amber-400" : "border-emerald-600 text-emerald-400"}>
              {lastEvent.action === "checkout" ? "Sortie enregistrée" : "Retour enregistré"}
            </Badge>
          </div>
          <div className="text-sm font-medium text-white">{lastEvent.tool_name}</div>
          <div className="text-xs text-gray-400 mt-0.5" style={{ color: worker?.color }}>
            {lastEvent.worker_name} · {new Date(lastEvent.timestamp).toLocaleTimeString("fr-FR")}
          </div>
        </div>
      )}

      {/* Mini log */}
      {log.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-gray-500 mb-2">Historique session</div>
          {log.map((ev) => (
            <div key={ev.id} className="flex items-center gap-2 text-xs text-gray-400 py-1 border-b border-gray-800">
              <span>{ev.action === "checkout" ? "↑" : "↓"}</span>
              <span className="flex-1 truncate">{ev.tool_name}</span>
              <span style={{ color: WORKERS.find((w) => w.id === ev.worker_id)?.color }}>
                {ev.worker_name.split(" ")[0]}
              </span>
              <span className="text-gray-600">{new Date(ev.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
