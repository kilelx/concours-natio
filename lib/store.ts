import type { StoreState, ScanEvent } from "./types"
import { SEED_TOOLS, SEED_WORKERS } from "./seed"

declare global {
  // eslint-disable-next-line no-var
  var __tooltrack_store: StoreState | undefined
}

function createStore(): StoreState {
  const tools = new Map(SEED_TOOLS.map((t) => [t.id, { ...t }]))
  const workers = new Map(SEED_WORKERS.map((w) => [w.id, { ...w }]))
  return { tools, workers, events: [], subscribers: new Set() }
}

// Singleton persisting across Next.js hot reloads in dev
export const store: StoreState =
  globalThis.__tooltrack_store ?? (globalThis.__tooltrack_store = createStore())

export function processScan(toolId: string, workerId: string): ScanEvent | null {
  const tool = store.tools.get(toolId)
  const worker = store.workers.get(workerId)
  if (!tool || !worker) return null

  const action = tool.status === "available" ? "checkout" : "return"
  const now = new Date().toISOString()

  if (action === "checkout") {
    tool.status = "checked_out"
    tool.checked_out_by = worker.id
    tool.checked_out_at = now
  } else {
    tool.status = "available"
    tool.checked_out_by = undefined
    tool.checked_out_at = undefined
  }
  tool.last_scan = now

  const event: ScanEvent = {
    id: crypto.randomUUID(),
    tool_id: tool.id,
    tool_name: tool.name,
    worker_id: worker.id,
    worker_name: worker.name,
    action,
    timestamp: now,
  }

  store.events.unshift(event)
  if (store.events.length > 100) store.events.pop()

  store.subscribers.forEach((cb) => cb(event))
  return event
}
