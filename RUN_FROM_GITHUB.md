# Lancer Holding IVIR depuis GitHub

Ce guide utilise le dépôt final synchronisé avec les dernières fonctionnalités :

```text
https://github.com/ainabruno/holding_ivir_project
```

## 1. Prérequis

Installez Git, Node.js 22 ou supérieur, pnpm 10.4.1 ou Docker et Docker Compose. Pour l’extraction IA, il faut aussi une clé `MISTRAL_API_KEY`. Pour l’environnement complet Docker, MySQL est lancé automatiquement par `docker-compose.yml`.

## 2. Récupérer le code final

```bash
git clone https://github.com/ainabruno/holding_ivir_project.git
cd holding_ivir_project
git checkout main
git pull origin main
```

Vérifiez que les fichiers importants existent :

```bash
ls Dockerfile docker-compose.yml package.json pnpm-lock.yaml patches/wouter@3.7.1.patch ENVIRONMENT.template
```

## 3. Configurer les variables d’environnement

Ne cherchez pas un fichier `.env.example` : le projet fournit `ENVIRONMENT.template` pour éviter de versionner une configuration qui pourrait être confondue avec des secrets.

```bash
cp ENVIRONMENT.template .env
```

Ouvrez `.env` et remplacez au minimum :

```env
DATABASE_URL=mysql://holding_user:holding_password@localhost:3306/holding_ivir
MISTRAL_API_KEY=your_real_mistral_key
JWT_SECRET=generate_a_long_random_secret
VITE_APP_ID=your_manus_app_id
OWNER_NAME=Administrator
OWNER_OPEN_ID=your_owner_open_id
BUILT_IN_FORGE_API_KEY=your_forge_key
VITE_FRONTEND_FORGE_API_KEY=your_frontend_forge_key
```

Les variables Manus déjà configurées par votre hébergeur doivent être conservées lorsqu’elles sont disponibles. Ne committez jamais `.env`.

## 4. Prévisualiser uniquement le frontend sans clés Manus

Pour voir l’interface sans OAuth, base de données, clé Mistral ni serveur Express, utilisez le serveur Vite seul et activez le mode `VITE_FRONTEND_ONLY`. Il affiche le dashboard directement sur `/` avec des données synthétiques clairement marquées comme prévisualisation. Ces données ne sont ni envoyées à l’API ni utilisées en production.

```bash
pnpm install --frozen-lockfile
VITE_FRONTEND_ONLY=true pnpm dev:frontend
```

Ouvrez ensuite `http://localhost:5173/`. Les boutons CSV/PDF sont désactivés dans ce mode, car ils nécessitent l’API réelle. La page `/dashboard` affiche la même prévisualisation.

## Lancer un traitement depuis l’interface d’administration

Avec le backend FastAPI démarré, ouvrez `http://localhost:3000/admin`. Saisissez l’URL complète de la source juridique, choisissez le type de source, puis cliquez sur **Lancer le traitement**. Le backend télécharge l’URL, applique le retry et la déduplication, enregistre les documents, puis lance l’extraction Pydantic/Mistral. Le panneau affiche le statut, le nombre de documents ajoutés et les erreurs de validation éventuelles.

```bash
python3 -m uvicorn backend.main:app --reload --port 3000
```

Exemples d’URL : `https://fr.wikipedia.org/wiki/Droit` ou une URL HTTP publique autorisée par la source. Une URL doit être complète et commencer par `http://` ou `https://`.

## 5. Lancement local complet avec pnpm

Cette méthode nécessite MySQL accessible et une base `holding_ivir` configurée dans `DATABASE_URL`.

```bash
corepack enable
corepack prepare pnpm@10.4.1 --activate
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm dev
```

Ouvrez ensuite :

```text
http://localhost:3000
http://localhost:3000/dashboard
http://localhost:3000/admin
```

Le dashboard est accessible en lecture. Les actions de scraping et d’extraction restent réservées aux administrateurs authentifiés.

## 6. Lancement recommandé avec Docker Compose

```bash
cp ENVIRONMENT.template .env
# Éditez .env puis démarrez les services
docker compose up --build
```

Si votre installation utilise l’ancien binaire :

```bash
docker-compose up --build
```

Services fournis :

| Service | Adresse / rôle |
|---|---|
| `app` | Application web sur `http://localhost:3000` |
| `mysql` | Base MySQL sur le port `3306` |
| `python_runner` | Environnement pour les modules Alpha et Beta |

Initialisez les migrations après le démarrage :

```bash
docker compose exec app pnpm drizzle-kit migrate
```

## 7. Construire et lancer l’image de production

```bash
docker build -t holding-ivir:latest .
docker run --rm --env-file .env -p 3000:3000 holding-ivir:latest
```

Le Dockerfile copie `patches/` avant `pnpm install`. Cette étape est obligatoire car `package.json` et `pnpm-lock.yaml` utilisent le patch `wouter@3.7.1`.

## 8. Déployer sur un hébergeur Docker

Construisez puis poussez l’image vers votre registre :

```bash
docker build -t REGISTRY/holding-ivir:latest .
docker push REGISTRY/holding-ivir:latest
```

Configurez ensuite dans le service d’hébergement :

```text
PORT=3000
NODE_ENV=production
DATABASE_URL=connexion_mysql_de_production
MISTRAL_API_KEY=clé_mistral
JWT_SECRET=secret_long_et_aléatoire
VITE_APP_ID=identifiant_manus
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
```

Le service doit exposer le port `3000`. La base MySQL doit être accessible depuis le conteneur et les migrations doivent être appliquées avant le premier usage.

## 9. Diagnostic du précédent échec Docker

L’erreur précédente était :

```text
ENOENT: no such file or directory, open '/app/patches/wouter@3.7.1.patch'
```

La cause était que le Dockerfile copiait `package.json` et `pnpm-lock.yaml`, mais pas `patches/`, avant l’installation des dépendances. Le correctif actuel contient :

```dockerfile
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN npm install -g pnpm@10.4.1 && pnpm install --frozen-lockfile
```

Après avoir récupéré la branche `main` à jour, relancez le build sans utiliser une ancienne image :

```bash
git pull origin main
docker build --no-cache -t holding-ivir:latest .
```

## 10. Vérifications après déploiement

```bash
curl -I https://VOTRE_DOMAINE/dashboard
curl -I https://VOTRE_DOMAINE/api/legal/export.csv
curl -I https://VOTRE_DOMAINE/api/legal/export.pdf
```

Les réponses attendues sont `200`, avec `text/csv` pour le CSV et `application/pdf` pour le PDF. Le dashboard doit afficher les boutons `Export CSV` et `Export PDF`.
