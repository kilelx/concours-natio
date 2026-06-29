import { NextResponse } from "next/server"
import { store } from "@/lib/store"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    tools: Array.from(store.tools.values()),
    workers: Array.from(store.workers.values()),
    events: store.events.slice(0, 20),
  })
}
