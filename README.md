# Holding IVIR — Legal Intelligence Platform (100% Python FastAPI + React)

Plateforme d’intelligence juridique automatisant le scraping de sources (Wikipedia / Légifrance), l’enrichissement par IA Mistral (Pydantic, scores de confiance, classification des verdicts), le stockage relationnel et la restitution via un tableau de bord React moderne avec exports CSV/PDF natifs.

## Architecture

- **Backend** : Python 3.12 + FastAPI (API REST, routes d’export, scraping, extraction IA)
- **Base de données** : MySQL / SQLite via SQLAlchemy ORM
- **Frontend** : React 19 + Tailwind 4 + shadcn/ui
- **Modules** :
  - **Module Alpha** : Scraping Python avec déduplication MD5 et retry exponential backoff
  - **Module Beta** : Extraction IA Mistral avec validation Pydantic et scores de confiance
  - **Module Gamma** : Modèles SQLAlchemy et gestion des sessions
  - **Module Delta** : Endpoints FastAPI REST typés et documentés (`/docs`)
  - **Module Interface** : Tableau de bord filtrable avec tri accessible et rapports CSV/PDF

## Lancement avec Docker (Recommandé)

```bash
cp ENVIRONMENT.template .env
# Renseignez vos clés dans .env
docker compose up --build
```

L’application est accessible sur **http://localhost:3000**. Le backend FastAPI sert à la fois l’API REST et l’interface React.

## Lancement en local avec Python et pnpm

```bash
python3 -m pip install -r requirements.txt
python3 -m uvicorn backend.main:app --reload --port 3000
```

Pour prévisualiser le frontend seul sans base de données :
```bash
pnpm install --frozen-lockfile
VITE_FRONTEND_ONLY=true pnpm dev:frontend
```
