"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import jsQR from "jsqr"
import { Badge } from "@/components/ui/badge"
import type { ScanEvent } from "@/lib/types"

const WORKERS = [
  { id: "W1", name: "Martin Dubois", color: "#3B82F6" },
  { id: "W2", name: "Sophie Laurent", color: "#10B981" },
  { id: "W3", name: "Karim Benali", color: "#F59E0B" },
  { id: "W4", name: "Julie Moreau", color: "#8B5CF6" },
]

const TOOL_IDS = new Set([
  "FC-001","FC-002","FC-003","FC-004","FC-005","FC-006",
  "FC-007","FC-008","FC-009","FC-010","FC-011","FC-012",
])

export default function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const lastScannedRef = useRef<string>("")
  const cooldownRef = useRef<boolean>(false)

  const [selectedWorker, setSelectedWorker] = useState(WORKERS[0].id)
  const [lastEvent, setLastEvent] = useState<ScanEvent | null>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [detected, setDetected] = useState<string | null>(null)

  const handleQR = useCallback(async (toolId: string) => {
    if (cooldownRef.current || lastScannedRef.current === toolId) return
    if (!TOOL_IDS.has(toolId)) return

    cooldownRef.current = true
    lastScannedRef.current = toolId
    setScanning(true)
    setDetected(toolId)

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool_id: toolId, worker_id: selectedWorker }),
      })
      const event: ScanEvent = await res.json()
      setLastEvent(event)
    } finally {
      setScanning(false)
      // 3s cooldown before same QR can re-trigger
      setTimeout(() => {
        cooldownRef.current = false
        lastScannedRef.current = ""
        setDetected(null)
      }, 3000)
    }
  }, [selectedWorker])

  useEffect(() => {
    let stream: MediaStream | null = null

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      } catch {
        setCameraError("Caméra inaccessible. Autorisez l'accès dans les permissions du navigateur.")
      }
    }

    startCamera()

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

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      })

      if (code?.data) {
        handleQR(code.data)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [handleQR])

  const worker = WORKERS.find((w) => w.id === selectedWorker)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-sm">F</div>
          <div>
            <h1 className="text-xl font-bold">Scanner Caméra</h1>
            <p className="text-xs text-gray-400">Scan QR codes outils en live</p>
          </div>
        </div>
        <a href="/" className="text-xs text-gray-400 underline">Dashboard →</a>
      </div>

      {/* Technicien */}
      <div className="grid grid-cols-2 gap-2 mb-4">
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

      {/* Camera view */}
      <div className="relative rounded-xl overflow-hidden bg-black mb-4 aspect-video">
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center text-center p-4">
            <p className="text-red-400 text-sm">{cameraError}</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-48 h-48 border-2 rounded-lg transition-colors duration-200 ${
                detected ? "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]" : "border-white/30"
              }`} />
            </div>
            {/* Status overlay */}
            <div className="absolute top-2 right-2">
              <div className={`text-xs px-2 py-1 rounded-full ${
                scanning ? "bg-amber-500/80 text-white" :
                detected ? "bg-emerald-500/80 text-white" :
                "bg-black/50 text-gray-300"
              }`}>
                {scanning ? "Enregistrement..." : detected ? `${detected} détecté` : "En attente de scan"}
              </div>
            </div>
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Last event */}
      {lastEvent && (
        <div className={`rounded-xl border p-4 mb-4 transition-all ${
          lastEvent.action === "checkout" ? "border-amber-600 bg-amber-950/20" : "border-emerald-600 bg-emerald-950/20"
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{lastEvent.action === "checkout" ? "🔴" : "🟢"}</span>
            <Badge variant="outline" className={lastEvent.action === "checkout" ? "border-amber-600 text-amber-400" : "border-emerald-600 text-emerald-400"}>
              {lastEvent.action === "checkout" ? "Sortie enregistrée" : "Retour enregistré"}
            </Badge>
          </div>
          <div className="text-sm font-medium text-white">{lastEvent.tool_name}</div>
          <div className="text-xs mt-0.5" style={{ color: worker?.color }}>
            {lastEvent.worker_name} · {new Date(lastEvent.timestamp).toLocaleTimeString("fr-FR")}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">
        Imprime les QR codes sur{" "}
        <a href="/labels" className="underline text-gray-400">/labels</a>{" "}
        · Cooldown 3s après chaque scan
      </p>
    </div>
  )
}
