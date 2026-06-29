# T7 — Générateur étiquettes QR

## Objectif

Page `/labels` permettant d'imprimer une feuille de stickers QR code pour chaque outil FACOM. Les stickers seront scannés par T6 (scanner navigateur ZXing).

## Décisions clés

- **Contenu QR** : ID outil brut (`FC-001`) — découplé du domaine, T6 fait le lookup local
- **Scope** : impression de tous les 12 outils, pas de sélection individuelle (YAGNI)
- **Impression** : `window.print()` + `@media print` CSS, pas de génération PNG/ZIP

## Architecture

```
app/labels/page.tsx        — server component, lit store.tools directement
components/qr-label.tsx    — composant QrLabel({ tool: Tool })
```

## Composant QrLabel

Reçoit un `Tool`. Affiche :
- QR code (lib `qrcode.react`, taille ~120px)
- ID outil (`FC-001`) en monospace
- Nom outil tronqué si nécessaire
- Référence FACOM (ex: `E.316-75`)

Dimensions sticker : ~6×4cm, border dashed (ligne de découpe visuelle).

## Layout

- Grille `grid-cols-4` sur la page (3 rangées × 4 = 12 stickers)
- Fond blanc forcé (`bg-white text-black`) — override dark theme
- Bouton "Imprimer" flottant en bas à droite, `hidden print:hidden`
- Lien "← Dashboard" en haut, caché à l'impression

## Print CSS

```css
@media print {
  .no-print { display: none; }
  body { background: white; }
  .label-grid { gap: 0; }
}
```

## Dépendances

- `qrcode.react` — à installer (`npm install qrcode.react`)

## Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `app/labels/page.tsx` | Créer |
| `components/qr-label.tsx` | Créer |
| `package.json` | Ajouter `qrcode.react` |
