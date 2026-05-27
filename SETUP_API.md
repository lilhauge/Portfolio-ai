# Opsætning af Anthropic API-nøgle

API-nøglen håndteres nu server-side via en Vercel proxy.
Du behøver IKKE sætte nøglen i frontend-koden.

## Trin 1: Få en API-nøgle
1. Gå til console.anthropic.com
2. Gå til "API Keys" → "Create Key"
3. Kopiér nøglen (starter med `sk-ant-...`)

## Trin 2: Tilføj nøglen i Vercel (KUN her — ikke i koden)
1. Vercel dashboard → dit projekt → Settings → Environment Variables
2. Tilføj:
   - Name:  ANTHROPIC_API_KEY
   - Value: din nøgle
3. Klik Save
4. Gå til Deployments → Redeploy

Det er alt. Nøglen forbliver server-side og eksponeres aldrig i browseren.

## Hvordan det virker
Appen kalder /api/claude (din Vercel-server) i stedet for Anthropic direkte.
Vercel-serveren tilføjer API-nøglen og videresender til Anthropic.
