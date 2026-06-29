export type ToolStatus = "available" | "checked_out" | "missing"

export interface Tool {
  id: string
  name: string
  category: string
  reference: string
  location: string
  status: ToolStatus
  checked_out_by?: string
  checked_out_at?: string
  last_scan?: string
}

export interface Worker {
  id: string
  name: string
  color: string
}

export interface ScanEvent {
  id: string
  tool_id: string
  tool_name: string
  worker_id: string
  worker_name: string
  action: "checkout" | "return"
  timestamp: string
}

export interface StoreState {
  tools: Map<string, Tool>
  workers: Map<string, Worker>
  events: ScanEvent[]
  subscribers: Set<(event: ScanEvent) => void>
}
