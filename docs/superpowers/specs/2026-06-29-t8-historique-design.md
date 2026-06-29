# T8 — Historique traçabilité

## Objectif

Page `/history` affichant l'historique complet des mouvements d'outils (checkout/retour), plus riche que l'activité récente du dashboard. Live via SSE.

## Décisions clés

- **Richesse** : liste filtrée simple — pas de stats agrégées (YAGNI pour la démo)
- **Filtres** : pills action (Tous / Sorties / Retours) + dropdown worker
- **Live** : même pattern SSE que `app/page.tsx` (snapshot + updates)
- **Pas de pagination** : store limité à 100 events, liste scrollable suffit

## Architecture

```
app/history/page.tsx    — client component, SSE, filtres locaux
```

Pas de nouveau composant partagé — réutilise `Badge`, `Card` de shadcn/ui existants.

## UI

### Header
- Titre "Historique" + lien "← Dashboard"
- Indicateur connexion SSE (même pattern que dashboard)

### Filtres
- Pills : `Tous` | `Sorties` | `Retours` (filtre sur `event.action`)
- Dropdown : `Tous les opérateurs` + un item par worker présent dans les events

### Liste events
Chaque item affiche :
- Badge action : `↑ Sortie` (amber) ou `↓ Retour` (emerald)
- Nom outil en gras
- Worker coloré (couleur `worker.color`)
- Heure formatée `HH:mm:ss` (FR locale)
- ID outil en monospace gris (secondary info)

Ordre : chronologique inversé (plus récent en haut).

### État vide
Message "Aucun mouvement enregistré. Ouvrir le simulateur →" avec lien.

## Data flow

1. `useEffect` ouvre `EventSource("/api/events")`
2. Message `snapshot` → initialise `events` + `workers`
3. Message `scan` → prepend event à la liste locale
4. Filtres appliqués en mémoire (dérivés de `events` state)

## Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `app/history/page.tsx` | Créer |
