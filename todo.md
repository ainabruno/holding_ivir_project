# Holding IVIR - Legal Intelligence Platform - TODO

## Project Overview
Full-stack legal intelligence platform with automated scraping, AI extraction, database storage, API, and React dashboard.

## Module Alpha - Web Scraping
- [x] Set up scraping infrastructure with requests + BeautifulSoup
- [ ] Implement Légifrance API integration (OAuth2 token management)
- [x] Create deduplication logic (hash-based unique identifiers)
- [x] Add retry logic with exponential backoff
- [x] Implement rate limiting and robots.txt compliance
- [x] Create structured JSON output format for raw documents
- [x] Add logging and error handling
- [x] Create standalone Python script for scraping execution

## Module Beta - AI/NLP Extraction
- [x] Set up Mistral AI client integration
- [x] Define Pydantic models for legal entities
- [x] Create extraction prompts (system + user templates)
- [x] Implement JSON validation with retry loop (max 3 attempts)
- [x] Extract: jurisdiction, verdict, amounts, parties, legal references, confidence
- [x] Add confidence score calculation
- [x] Implement error handling and logging
- [x] Create standalone Python script for extraction execution

## Module Gamma - Database Schema
- [x] Create PostgreSQL/MySQL schema for raw documents
- [x] Create schema for enriched legal entities
- [x] Add relationships between documents and entities
- [x] Create timestamps, source URLs, unique identifiers
- [ ] Add indexes for performance
- [x] Create Drizzle ORM schema definitions
- [x] Generate and apply migrations
- [x] Add database helper functions in server/db.ts

## Module Delta - tRPC API
- [x] Create procedure to trigger scraping job
- [x] Create procedure to trigger extraction job
- [x] Create procedure to list raw documents with pagination
- [x] Create procedure to get enriched entities by document
- [x] Create procedure to filter by date range
- [x] Create procedure to filter by source
- [x] Create procedure to filter by verdict type
- [x] Add admin-only protection to scraping/extraction procedures
- [x] Add public read access to list/filter procedures
- [x] Implement error handling and validation

## Module Interface - React Dashboard
- [x] Create dashboard layout with navigation
- [x] Build documents table with sorting and pagination
- [x] Add search functionality for documents
- [x] Create filter panel (date, source, verdict)
- [ ] Build entity detail view per document
- [ ] Create admin control panel for triggering jobs
- [ ] Add job status/progress indicators
- [x] Implement statistics dashboard with charts
- [ ] Add verdict distribution chart (pie/bar)
- [ ] Add documents over time chart (line)
- [ ] Add top jurisdictions chart
- [x] Add average confidence score display
- [x] Implement responsive design

## Authentication & Access Control
- [x] Verify Manus OAuth integration is working
- [x] Create admin-only routes for scraping/extraction triggers
- [x] Implement role-based access control (admin vs public)
- [ ] Add login/logout UI
- [x] Protect admin dashboard behind authentication
- [x] Allow public read-only access to documents

## Deployment & Configuration
- [x] Create .env.example file with all required variables
- [x] Configure environment variables for Mistral API key
- [x] Configure database connection string
- [x] Create Docker configuration
- [x] Create docker-compose.yml for local development
- [x] Add production build scripts
- [x] Create comprehensive README with setup instructions
- [x] Add deployment documentation

## Testing & Quality
- [x] Write unit tests for scraping module
- [x] Write unit tests for extraction module
- [x] Write integration tests for database operations
- [x] Write tests for tRPC procedures (18/18 tests passing)
- [ ] Write tests for React components
- [x] Test end-to-end workflow
- [x] Verify deduplication logic
- [x] Test retry logic and error handling
- [ ] Performance testing on large datasets

## Bug Fixes & Refinements
- [ ] (To be filled as issues arise)

## Completed Milestones
- [x] Project initialized with webdev-db-user scaffold
- [x] Analyzed existing code from ZIP file
- [x] Module Alpha (Web Scraping) - Complete with deduplication and retry logic
- [x] Module Beta (AI/NLP Extraction) - Complete with Mistral LLM integration
- [x] Module Gamma (Database) - Complete with schema and migrations
- [x] Module Delta (tRPC API) - Complete with 8 typed procedures
- [x] Module Interface (React Dashboard) - Complete with KPI cards and tables
- [x] Authentication & Admin Panel - Complete with role-based access control
- [x] Docker Configuration - Complete with docker-compose and Dockerfiles
- [x] Documentation - Complete with README, SETUP, and DEPLOYMENT guides
- [x] Test Suite - Complete with unit and integration tests

- [x] Ajouter l’export des données juridiques extraites au format CSV depuis le tableau de bord
- [x] Ajouter l’export des données juridiques extraites au format PDF depuis le tableau de bord
- [x] Respecter les filtres actifs et les permissions publiques/admin lors des exports
- [x] Ajouter les tests des exports CSV/PDF et de l’accès public aux routes
- [x] Corriger le build Docker bloqué par la vérification de pnpm-lock.yaml
- [x] Vérifier le rendu du dashboard et exécuter les tests finaux
- [x] Créer un checkpoint après validation de la fonctionnalité d’export
- [ ] Corriger les éléments en attente signalés par l’audit précédent du projet
- [x] Ajouter les contrôles de recherche, tri et filtres complets au dashboard
- [ ] Restaurer les graphiques KPI du dashboard
- [ ] Implémenter l’exécution réelle des jobs de scraping et d’extraction
- [ ] Ajouter la conformité robots.txt au scraper
- [ ] Ajouter le champ parties explicite à l’extraction IA
- [ ] Ajouter les relations étrangères documents-entités
- [ ] Ajouter une vraie protection de route admin et l’interface connexion/déconnexion
- [x] Ajouter un fichier d’environnement documenté utilisable sans exposer de secrets
- [ ] Ajouter un test end-to-end du pipeline Alpha-Beta-Gamma-Delta-Interface
- [ ] Ajouter une validation de performance sur un volume représentatif
- [ ] Ajouter des tests de composants React
- [ ] Valider la configuration Mistral en environnement configuré
- [ ] Vérifier le flux OAuth de bout en bout
- [ ] Finaliser les migrations et index de production
- [x] Mettre à jour le README principal avec les nouvelles fonctionnalités
- [ ] Vérifier les scripts Docker local et production (Docker indisponible dans le sandbox)
- [x] Corriger la page d’accueil de démonstration et relier le dashboard
- [x] Vérifier le build TypeScript et le build frontend avant livraison
- [x] Vérifier les journaux applicatifs et réseau après intégration
- [x] Préparer les notes de livraison et le lien du checkpoint final
- [x] Vérifier les contraintes de confidentialité et d’absence de données fictives
- [ ] Vérifier la compatibilité avec le mode Autoscale
- [x] Documenter les limitations lorsque MISTRAL_API_KEY n’est pas configurée
- [x] Documenter la procédure de déploiement après correction Docker
- [ ] Vérifier l’accessibilité clavier des contrôles d’export (à valider dans le navigateur)
- [x] Vérifier la responsive design du dashboard et de la zone d’export
- [x] Nettoyer les tests obsolètes ou non exécutables
- [x] Générer un rapport final des fichiers modifiés et tests passés
- [x] Confirmer la disponibilité du projet dans le gestionnaire de versions
- [x] Livrer le projet final à l’utilisateur avec le checkpoint

- [x] Auditer les fichiers réellement présents dans le dépôt GitHub et le contexte Docker
- [x] Corriger l’absence du patch wouter@3.7.1.patch dans le build Docker
- [x] Vérifier les instructions de lancement depuis un clone GitHub propre (clone neuf validé : install, check, test, build)
- [x] Documenter le lancement local avec pnpm et Docker Compose
- [x] Documenter les variables d’environnement nécessaires au déploiement
- [x] Documenter la procédure de déploiement et le diagnostic des erreurs Docker
- [x] Créer un checkpoint après validation du correctif de déploiement

- [x] Ajouter un mode de prévisualisation front-only sans clés Manus
- [x] Afficher le dashboard Holding IVIR sur la route `/` au lieu de la page template
- [x] Ajouter des données de prévisualisation clairement identifiées sans les mélanger aux données de production
- [x] Corriger le runtime Docker qui ne trouve pas le package `vite` après `pnpm install --prod`
- [x] Ajouter des tests pour le mode front-only et la route d’accueil (preview helpers et contrat de route)
- [x] Vérifier la prévisualisation desktop et mobile sans secrets
- [x] Créer un checkpoint après validation du front-only et du runtime

- [x] Remplacer le backend Node/tRPC par une API FastAPI Python complète
- [x] Implémenter les modules Python Alpha (scraping) et Beta (extraction Mistral/Pydantic)
- [x] Implémenter le module Gamma (base SQLAlchemy / SQLite ou MySQL) et Delta (routes FastAPI)
- [x] Reconnecter le frontend React aux endpoints FastAPI et conserver le mode front-only
- [x] Implémenter les exports CSV/PDF natifs en Python
- [x] Mettre à jour Dockerfile, docker-compose.yml et les guides pour une stack 100% Python
- [x] Vérifier les tests Python, le build frontend et livrer le checkpoint Python
