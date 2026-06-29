import type { Tool, Worker } from "./types"

export const SEED_TOOLS: Tool[] = [
  { id: "FC-001", name: "Clé dynamométrique 1/2\"", category: "Serrage", reference: "E.316-75", location: "Armoire A - Tiroir 1", status: "available" },
  { id: "FC-002", name: "Clé dynamométrique 3/8\"", category: "Serrage", reference: "E.316-25", location: "Armoire A - Tiroir 1", status: "available" },
  { id: "FC-003", name: "Coffret douilles 1/2\" 19 pièces", category: "Douilles", reference: "R.360-19", location: "Armoire A - Tiroir 2", status: "available" },
  { id: "FC-004", name: "Coffret douilles 3/8\" 26 pièces", category: "Douilles", reference: "R.250-26", location: "Armoire A - Tiroir 2", status: "available" },
  { id: "FC-005", name: "Clé à cliquet réversible 1/2\"", category: "Cliquet", reference: "R.161", location: "Armoire A - Tiroir 3", status: "available" },
  { id: "FC-006", name: "Clé à cliquet réversible 3/8\"", category: "Cliquet", reference: "R.161-38", location: "Armoire A - Tiroir 3", status: "available" },
  { id: "FC-007", name: "Pince multiprise 250mm", category: "Pinces", reference: "111A.25", location: "Armoire B - Tiroir 1", status: "available" },
  { id: "FC-008", name: "Pince étau-acier 250mm", category: "Pinces", reference: "257A.25", location: "Armoire B - Tiroir 1", status: "available" },
  { id: "FC-009", name: "Jeu de tournevis 6 pièces", category: "Vissage", reference: "AEF.J6PB", location: "Armoire B - Tiroir 2", status: "available" },
  { id: "FC-010", name: "Jeu de clés mixtes 12 pièces", category: "Clés", reference: "440.J12", location: "Armoire B - Tiroir 3", status: "available" },
  { id: "FC-011", name: "Clé à chocs pneumatique 1/2\"", category: "Pneumatique", reference: "NK.500", location: "Armoire C - Tiroir 1", status: "available" },
  { id: "FC-012", name: "Extracteur de courroies", category: "Extraction", reference: "U.50J", location: "Armoire C - Tiroir 2", status: "available" },
]

export const SEED_WORKERS: Worker[] = [
  { id: "W1", name: "Martin Dubois", color: "#3B82F6" },
  { id: "W2", name: "Sophie Laurent", color: "#10B981" },
  { id: "W3", name: "Karim Benali", color: "#F59E0B" },
  { id: "W4", name: "Julie Moreau", color: "#8B5CF6" },
]
