import { NextRequest, NextResponse } from "next/server"
import { processScan } from "@/lib/store"

export async function POST(req: NextRequest) {
  const { tool_id, worker_id } = await req.json()
  if (!tool_id || !worker_id) {
    return NextResponse.json({ error: "tool_id and worker_id required" }, { status: 400 })
  }
  const event = processScan(tool_id, worker_id)
  if (!event) {
    return NextResponse.json({ error: "Unknown tool or worker" }, { status: 404 })
  }
  return NextResponse.json(event)
}
