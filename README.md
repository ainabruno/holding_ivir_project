# Holding IVIR — Legal Intelligence Platform

Holding IVIR collecte des sources juridiques, enrichit les documents avec une extraction IA et expose les résultats dans un dashboard React connecté à une API tRPC et une base relationnelle.

## Fonctionnalités principales

Le projet est structuré autour de **Module Alpha** pour le scraping, **Module Beta** pour l’extraction NLP/IA, **Module Gamma** pour la persistance, **Module Delta** pour l’API typée et **Module Interface** pour le dashboard.

Le dashboard disponible sur `/dashboard` permet de rechercher et filtrer les documents par texte, source, verdict et période. Les filtres actifs sont conservés lors de l’export grâce aux deux actions suivantes :

- `GET /api/legal/export.csv` génère un CSV UTF-8 avec les documents, verdicts, juridictions, montants, parties, références légales, scores de confiance et résumés.
- `GET /api/legal/export.pdf` génère un rapport PDF A4 lisible avec les mêmes données et les filtres appliqués.

Les verdicts utilisent exclusivement les valeurs `favorable`, `rejected` et `partial`.

## Démarrage local

```bash
pnpm install
pnpm check
pnpm dev
```

Après le clonage, copiez `ENVIRONMENT.template` vers `.env`, puis remplacez les placeholders. Les variables importantes sont `DATABASE_URL`, `MISTRAL_API_KEY`, `JWT_SECRET` et les variables Manus OAuth. Ne committez jamais le fichier `.env` dans le dépôt.

## Tests et build

```bash
pnpm check
pnpm test
pnpm build
```

Les tests couvrent l’autorisation tRPC, le format CSV, la génération PDF, l’échappement des valeurs CSV, les filtres et les noms de fichiers exportés.

## Docker

Le Dockerfile utilise explicitement `pnpm@10.4.1` et copie le dossier `patches/` avant l’installation, en cohérence avec le lockfile du projet. Cela rend l’installation reproductible en production :

```bash
docker build -t holding-ivir .
docker run --env-file .env -p 3000:3000 holding-ivir
```

Pour un environnement local complet avec MySQL, utilisez `docker-compose.yml`. Les instructions complémentaires sont disponibles dans [SETUP.md](./SETUP.md) et [DEPLOYMENT.md](./DEPLOYMENT.md).

## Structure utile

```text
client/src/pages/Dashboard.tsx       Dashboard, filtres et actions d’export
server/legalExports.ts                Génération CSV/PDF et normalisation des lignes
server/legalExportRoutes.ts           Routes HTTP de téléchargement
server/db.ts                          Requête jointe documents-entités
server/routers/legal.ts               Procédures tRPC et filtrage de la liste
drizzle/schema.ts                     Schéma relationnel
```

## Limitations opérationnelles

L’export renvoie un document vide mais valide lorsque la base ne contient aucun résultat. L’extraction IA nécessite une variable `MISTRAL_API_KEY` valide. Les exports sont des lectures publiques cohérentes avec l’accès public au dashboard ; les actions d’administration restent protégées par le rôle `admin`.
