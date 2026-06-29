# ToolTrack — Traçabilité outillage FACOM SCANDIAG

Prototype de système de traçabilité d'outillage en temps réel. Simule un appareil FACOM SCANDIAG via BLE : scan QR code → checkout/retour → dashboard live.

---

## Utilisation

### 1. Générer les étiquettes QR

Ouvre [`/labels`](http://localhost:3000/labels) — la grille affiche les 12 outils avec leur QR code. Imprime avec **Cmd+P** (fond blanc forcé, optimisé impression). Chaque QR encode l'ID de l'outil (`FC-001`, `FC-002`…).

### 2. Scanner un outil

Deux modes disponibles depuis [`/simulator`](http://localhost:3000/simulator) :

**Mode caméra (démo réelle)**
1. Sélectionne un technicien parmi les 4 disponibles
2. Clique **"Scanner l'outil"** — la caméra du Mac s'ouvre
3. Pointe le QR code imprimé dans le cadre
4. Le scan se déclenche automatiquement dès détection
5. Cooldown 2,5 s avant de pouvoir rescanner le même outil

**Mode manuel (démo rapide)**
1. Sélectionne technicien + outil dans la liste
2. Clique **"Scan manuel"** — déclenche directement sans caméra
3. Bouton **"Démo automatique"** — enchaîne 5 scans prédéfinis avec 600 ms d'intervalle

### 3. Observer le dashboard en temps réel

Ouvre [`/`](http://localhost:3000) dans une autre fenêtre. Chaque scan met à jour instantanément :
- Le statut de l'outil (Disponible / Sorti) avec le nom du technicien
- Les compteurs en haut (disponibles / en utilisation / total)
- Le feed "Activité récente" (20 derniers événements)

L'indicateur vert pulsant en haut à droite confirme la connexion SSE active.

### 4. Consulter l'historique

[`/history`](http://localhost:3000/history) — liste chronologique de tous les événements de la session.

> **Note** : l'état est in-memory. Un redémarrage du serveur remet tous les outils à "Disponible" et efface l'historique.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Temps réel | Server-Sent Events (SSE) |
| QR génération | qrcode.react (QRCodeSVG) |
| QR décodage | jsQR (canvas + getUserMedia) |
| State serveur | Singleton in-memory (globalThis) |
| Langage | TypeScript |

---

## Lancer le projet

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

---

## Architecture

```
app/
├── page.tsx              # Dashboard temps réel (/)
├── simulator/page.tsx    # Simulateur scan + caméra (/simulator)
├── scanner/page.tsx      # Page caméra standalone (/scanner)
├── labels/page.tsx       # Étiquettes QR imprimables (/labels)
├── history/page.tsx      # Historique des événements (/history)
└── api/
    ├── scan/route.ts     # POST /api/scan
    ├── tools/route.ts    # GET /api/tools
    └── events/route.ts   # GET /api/events (SSE)

lib/
├── store.ts              # State serveur + processScan + pub/sub
├── seed.ts               # Données initiales (12 outils, 4 techniciens)
├── types.ts              # Types TypeScript partagés
└── utils.ts

components/
├── qr-label.tsx          # Composant étiquette QR
└── ui/                   # Composants shadcn/ui
```

---

## Modèles de données

### Tool
```ts
interface Tool {
  id: string           // "FC-001"
  name: string
  category: string
  reference: string    // Référence FACOM (ex: "E.316-75")
  location: string     // "Armoire A - Tiroir 1"
  status: "available" | "checked_out" | "missing"
  checked_out_by?: string   // Worker.id
  checked_out_at?: string   // ISO 8601
  last_scan?: string
}
```

### Worker
```ts
interface Worker {
  id: string     // "W1"
  name: string
  color: string  // Couleur hex pour l'UI
}
```

### ScanEvent
```ts
interface ScanEvent {
  id: string
  tool_id: string
  tool_name: string
  worker_id: string
  worker_name: string
  action: "checkout" | "return"
  timestamp: string  // ISO 8601
}
```

---

## API

### POST /api/scan

Déclenche un scan. Bascule l'état de l'outil (disponible → sorti, ou sorti → disponible) et notifie tous les clients SSE.

**Body**
```json
{ "tool_id": "FC-001", "worker_id": "W1" }
```

**Réponse 200**
```json
{
  "id": "uuid",
  "tool_id": "FC-001",
  "tool_name": "Clé dynamométrique 1/2\"",
  "worker_id": "W1",
  "worker_name": "Martin Dubois",
  "action": "checkout",
  "timestamp": "2026-06-29T14:32:00.000Z"
}
```

**Erreurs** : `400` si champs manquants, `404` si outil ou technicien inconnu.

---

### GET /api/tools

Retourne l'état courant de tous les outils, techniciens et 20 derniers événements.

```json
{
  "tools": [...],
  "workers": [...],
  "events": [...]
}
```

---

### GET /api/events

Flux SSE. Envoie un snapshot initial à la connexion, puis un événement à chaque scan.

**Message snapshot (connexion)**
```json
{ "type": "snapshot", "tools": [...], "workers": [...], "events": [...] }
```

**Message scan (temps réel)**
```json
{ "type": "scan", "event": { ...ScanEvent } }
```

Headers : `Content-Type: text/event-stream`, `Cache-Control: no-cache`.

---

## Fonctions clés

### processScan — lib/store.ts

Logique métier centrale. Consulte l'état courant de l'outil :

- Si `available` → `checkout` (affecté au technicien, `checked_out_by` et `checked_out_at` renseignés)
- Si `checked_out` → `return` (remis disponible, champs effacés)

L'événement est publié via un pattern pub/sub interne (`store.subscribers`) pour notifier tous les clients SSE connectés simultanément, sans délai.

```ts
export function processScan(toolId: string, workerId: string): ScanEvent | null
```

Retourne `null` si l'outil ou le technicien est inconnu.

---

### CameraScanner — app/simulator/page.tsx

Composant React client intégré au simulateur. Activé par le bouton "Scanner l'outil".

`getUserMedia` ouvre le flux caméra (`facingMode: environment`). Une boucle `requestAnimationFrame` capture chaque frame sur un `<canvas>` hors-écran, extrait les pixels via `getImageData`, et les passe à `jsQR`.

Dès qu'un QR valide est détecté :
- Si l'ID correspond à un outil connu → appel `POST /api/scan`
- Un cooldown de 2,5 s empêche le double-déclenchement sur le même QR
- Le résultat est affiché inline et propagé au dashboard via SSE

Le flux caméra est arrêté (`getTracks().stop()`) au démontage du composant.

---

### QrLabel — components/qr-label.tsx

Composant React client utilisant `qrcode.react` (QRCodeSVG). Chaque étiquette encode `tool.id`, affiche le nom en 2 lignes maximum et la référence FACOM. Format 3:2, fond blanc forcé, optimisé pour l'impression.

---

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard temps réel — inventaire + activité récente via SSE |
| `/simulator` | Simulateur scan : sélection technicien + outil + caméra QR |
| `/scanner` | Scanner caméra standalone |
| `/labels` | Grille d'étiquettes QR imprimables (Cmd+P) |
| `/history` | Historique complet des événements |

---

## State serveur

L'état est un singleton `globalThis.__tooltrack_store` persistant entre les hot-reloads Next.js en développement. Il contient :

- `tools` — Map des outils indexés par ID
- `workers` — Map des techniciens
- `events` — Tableau des 100 derniers événements (LIFO)
- `subscribers` — Set des callbacks SSE actifs

Aucune base de données. État remis à zéro au redémarrage du serveur.
