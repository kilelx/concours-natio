"use client"

import { QRCodeSVG } from "qrcode.react"
import type { Tool } from "@/lib/types"

export function QrLabel({ tool }: { tool: Tool }) {
  return (
    <div className="bg-white text-black border border-dashed border-gray-400 rounded p-3 flex flex-col items-center gap-2 w-full aspect-[3/2]">
      <QRCodeSVG value={tool.id} size={96} level="M" />
      <div className="text-center">
        <div className="font-mono text-xs font-bold text-gray-700">{tool.id}</div>
        <div className="text-xs font-medium text-gray-900 leading-tight mt-0.5 line-clamp-2">{tool.name}</div>
        <div className="text-xs text-gray-500 mt-0.5">{tool.reference}</div>
      </div>
    </div>
  )
}
