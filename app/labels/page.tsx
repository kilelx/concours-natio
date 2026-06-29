"use client"

import { useEffect, useState } from "react"
import { QrLabel } from "@/components/qr-label"
import type { Tool } from "@/lib/types"

export default function LabelsPage() {
  const [tools, setTools] = useState<Tool[]>([])

  useEffect(() => {
    fetch("/api/tools")
      .then((r) => r.json())
      .then((data) => setTools(data.tools))
  }, [])

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .label-grid { gap: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-950 text-white">
        {/* Header — hidden on print */}
        <div className="no-print flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-sm">F</div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Étiquettes QR</h1>
              <p className="text-xs text-gray-400">{tools.length} outils · Prêt à imprimer</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-gray-400 hover:text-white transition-colors">
              ← Dashboard
            </a>
            <button
              onClick={() => window.print()}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
            >
              Imprimer
            </button>
          </div>
        </div>

        {/* Label grid */}
        <div className="label-grid p-6 grid grid-cols-4 gap-4">
          {tools.map((tool) => (
            <QrLabel key={tool.id} tool={tool} />
          ))}
        </div>
      </div>
    </>
  )
}
