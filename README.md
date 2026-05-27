# PortfolioAI — PWA

## Deploy til Vercel (10 minutter)

### 1. Installér afhængigheder lokalt (kun for at tjekke det virker)
```bash
npm install
npm run build
```

### 2. Upload til GitHub
1. Gå til github.com → New repository → kald den `portfolio-ai` → Create
2. Kør i mappen:
```bash
git init
git add .
git commit -m "Initial"
git branch -M main
git remote add origin https://github.com/DIT-BRUGERNAVN/portfolio-ai.git
git push -u origin main
```

### 3. Deploy på Vercel
1. Gå til vercel.com → Add New Project
2. Import din `portfolio-ai` GitHub-repo
3. Framework Preset: **Vite**
4. Klik Deploy — det tager ~60 sekunder

### 4. Installér på iPhone/Android
**Android (Chrome):**
- Åbn din Vercel-URL i Chrome
- Tryk på de tre prikker (⋮) → "Tilføj til startskærm"

**iPhone (Safari):**
- Åbn URL i Safari
- Tryk Del-ikonet (firkant med pil op) → "Føj til hjemmeskærm"

## Vigtig note om API-nøgle
Appen kalder Anthropic API direkte fra browseren.
Dette virker i Claude's artifact-miljø fordi nøglen er injected automatisk.
I din egen deployment skal du tilføje din egen API-nøgle.

Se SETUP_API.md for instruktioner.
