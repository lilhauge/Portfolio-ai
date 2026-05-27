# Opsætning af Anthropic API-nøgle

## Trin 1: Få en API-nøgle
1. Gå til console.anthropic.com
2. Opret en konto (gratis at oprette)
3. Gå til "API Keys" → "Create Key"
4. Kopiér nøglen (starter med `sk-ant-...`)

## Trin 2: Tilføj nøglen til projektet

Opret filen `.env` i rod-mappen:
```
VITE_ANTHROPIC_KEY=sk-ant-din-nøgle-her
```

Rediger `src/main.jsx` — tilføj denne linje øverst i storage-polyfill-blokken:
```js
// API key til Anthropic (kurshentning + AI analyse)
window.__ANTHROPIC_KEY__ = import.meta.env.VITE_ANTHROPIC_KEY
```

Rediger `src/App.jsx` — find de to steder hvor der kaldes:
```js
fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
```
og tilføj `"x-api-key": window.__ANTHROPIC_KEY__` til headers-objektet:
```js
headers: {
  "Content-Type": "application/json",
  "x-api-key": window.__ANTHROPIC_KEY__,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
}
```

## Trin 3: Tilføj til Vercel
I Vercel dashboard → dit projekt → Settings → Environment Variables:
- Key: `VITE_ANTHROPIC_KEY`
- Value: din API-nøgle

Redeploy projektet.

## Pris
Kurshentning: ~$0.01–0.03 per opdatering (web search koster lidt)
AI-analyse: ~$0.01–0.02 per analyse
Samlet: formentlig under $1/måned ved normal brug
