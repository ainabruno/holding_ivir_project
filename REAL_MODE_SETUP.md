# Mode réel — Holding IVIR avec Légifrance / PISTE

## Pourquoi l’ancienne interface affichait zéro document

L’ancienne version du dashboard était une interface de restitution. Elle interrogeait la base de données, mais aucun corpus Légifrance réel n’était encore alimenté dans l’environnement déployé. Le mode `VITE_FRONTEND_ONLY=true` pouvait afficher une prévisualisation locale, mais ces enregistrements n’étaient pas des décisions produites par Légifrance et ne devaient pas être présentés comme des résultats juridiques réels.

La version actuelle ajoute une page métier **Recherche Légifrance**, une navigation latérale, une connexion administrateur et un pipeline réel : recherche PISTE → déduplication → stockage SQLAlchemy → extraction Bêta → affichage dans le dashboard.

## Activation de Légifrance

L’accès à l’API Légifrance est restreint par le portail [PISTE](https://piste.gouv.fr/). Il faut créer ou activer une application Légifrance dans l’environnement sandbox, accepter les conditions applicables, puis récupérer un Client ID et un Client Secret. La documentation DILA indique que le token sandbox est obtenu avec le flux OAuth2 `client_credentials` via :

```text
https://sandbox-oauth.piste.gouv.fr/api/oauth/token
```

La base API sandbox documentée est :

```text
https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app
```

Les deux URL sont configurables par variables d’environnement. Le client utilise ensuite `Authorization: Bearer <access_token>` et appelle le test de santé `/list/ping`, puis la recherche `POST /search` dans le fonds `JURI`.

> Une authentification OAuth2 réussie ne garantit pas que l’application dispose du droit d’appeler l’API Légifrance. Une réponse HTTP 403 signifie généralement que l’application PISTE est authentifiée mais que l’abonnement, l’API ou l’environnement sandbox n’est pas encore activé.

## Variables obligatoires

| Variable | Rôle |
|---|---|
| `LEGIFRANCE_CLIENT_ID` | Identifiant de l’application PISTE. |
| `LEGIFRANCE_CLIENT_SECRET` | Secret de l’application PISTE. |
| `PISTE_TOKEN_URL` | URL OAuth2, par défaut l’URL sandbox officielle. |
| `LEGIFRANCE_API_BASE_URL` | Base de l’API Légifrance, par défaut le chemin applicatif sandbox officiel. |
| `ADMIN_API_TOKEN` | Jeton Bearer interne qui protège les recherches, le scraping et l’extraction. |
| `MISTRAL_API_KEY` | Clé du module Bêta ; sans elle, le fallback local est utilisé et doit être clairement distingué d’une extraction IA réelle. |

Les valeurs doivent être ajoutées dans les secrets de l’environnement de déploiement ou dans un fichier `.env` local non versionné. Le fichier `ENVIRONMENT.template` contient uniquement des placeholders.

## Utilisation de l’interface

1. Ouvrir `/legifrance`.
2. Vérifier l’état **Credentials PISTE** et cliquer sur **Tester PISTE**.
3. Si l’API répond HTTP 403, activer l’accès Légifrance sandbox dans le portail PISTE ; il ne s’agit pas d’un problème d’interface ou de format de token.
4. Ouvrir `/admin`, saisir `ADMIN_API_TOKEN` dans la page de connexion, puis lancer les opérations administratives.
5. Depuis `/legifrance`, saisir des mots-clés comme `malfaçon construction` ou `garantie décennale`, ajouter éventuellement une période, puis cliquer sur **Rechercher dans Légifrance et enregistrer**.
6. Ouvrir `/dashboard` pour consulter les documents stockés, les entités extraites, les filtres et les exports CSV/PDF.

## Vérifications effectuées dans le dépôt

Le token OAuth2 PISTE a été vérifié par un test Vitest sans afficher le secret. Le test du pipeline Python vérifie également la construction du contrat `JURI`, la déduplication, le stockage SQLite et la restitution au dashboard. Le test d’accès administrateur vérifie qu’une requête sans Bearer est refusée et qu’une requête avec le jeton configuré est autorisée.

Le smoke test de l’API réelle atteint bien l’endpoint Légifrance, mais l’environnement courant retourne HTTP 403 après authentification. L’application affiche maintenant ce diagnostic explicitement et attend l’activation des droits PISTE avant de présenter des résultats réels.

## Références officielles

- [Portail PISTE](https://piste.gouv.fr/)
- [Fiche API Légifrance sur data.gouv.fr](https://www.data.gouv.fr/dataservices/legifrance)
- [Documentation API et exemples DILA](https://www.legifrance.gouv.fr/contenu/pied-de-page/open-data-et-api)
