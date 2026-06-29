import { NextRequest } from "next/server"
import { store } from "@/lib/store"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send current state snapshot on connect
      const snapshot = {
        type: "snapshot",
        tools: Array.from(store.tools.values()),
        events: store.events.slice(0, 20),
        workers: Array.from(store.workers.values()),
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`))

      // Subscribe to future events
      const cb = (event: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "scan", event })}\n\n`))
        } catch {
          store.subscribers.delete(cb)
        }
      }
      store.subscribers.add(cb)

      // Cleanup on disconnect
      req.signal.addEventListener("abort", () => {
        store.subscribers.delete(cb)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
