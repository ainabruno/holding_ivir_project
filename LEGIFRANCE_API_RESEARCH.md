# Vérifications officielles — API Légifrance / PISTE

## Sources consultées le 17 août 2026

1. Portail PISTE officiel : https://piste.gouv.fr/en/
2. Fiche API Légifrance sur data.gouv.fr : https://www.data.gouv.fr/dataservices/legifrance

## Faits vérifiés

- L’API Légifrance est fournie via le portail PISTE.
- L’accès nécessite la création d’un compte PISTE et l’obtention de credentials/API keys.
- La fiche officielle indique que la documentation technique de chaque méthode est disponible sur PISTE via Swagger.
- La fiche officielle expose comme base de sandbox `https://sandbox-api.piste.gouv.fr` et précise que les appels sont soumis à des quotas par jeton d’accès.
- Les fonctionnalités annoncées couvrent notamment la recherche par mots-clés, filtres et critères, le format JSON et le téléchargement de données/métadonnées.
- Les credentials ne peuvent pas être inventés ou déduits du code : ils doivent être créés par le propriétaire du projet sur PISTE, puis ajoutés comme secrets d’environnement.

## Conséquence pour Holding IVIR

Le code peut préparer le client OAuth2, le cache du token et le connecteur de recherche, mais la collecte réelle contre Légifrance ne peut être validée qu’après fourniture de `LEGIFRANCE_CLIENT_ID` et `LEGIFRANCE_CLIENT_SECRET`, création/activation de l’application PISTE et confirmation des chemins/méthodes exacts dans le Swagger associé au compte.

## Limite de l’implémentation actuelle

L’interface déployée affiche zéro document parce qu’aucun corpus réel n’est encore en base sur l’environnement visible et parce que le pipeline ne dispose pas encore d’un accès PISTE configuré. Le mode front-only est une aide de démonstration locale, pas un résultat juridique de production.

> Important : aucune donnée juridique fictive ne doit être présentée comme un résultat réel. Les données de démonstration doivent rester explicitement séparées des données produites par Légifrance.

## Détails confirmés par l’exemple officiel DILA

Le document officiel `exemples-d-utilisation-de-l-api.docx` (version révisée le 17 septembre 2025) indique :

- En sandbox, le token OAuth2 est demandé à `https://sandbox-oauth.piste.gouv.fr/api/oauth/token` avec le flux `client_credentials`, les champs `client_id`, `client_secret`, `scope=openid` et le type de contenu `application/x-www-form-urlencoded`.
- Le token est envoyé avec `Authorization: Bearer <access_token>`.
- La base API sandbox est `https://sandbox-api.piste.gouv.fr/dila/legifrance/lf-engine-app`.
- Le test de santé documenté est `GET /list/ping`.
- La recherche se fait avec `POST /search` et un JSON structuré contenant notamment `fond`, `recherche.champs`, `filtres`, `pageNumber`, `pageSize`, `sort` et `typePagination`.
- Les consultations utilisent notamment `POST /consult/getArticle` ou `POST /consult/legiPart`.
- Les fonds et champs doivent suivre les valeurs décrites par le Swagger PISTE. Pour une recherche de décisions judiciaires, le fond et les champs exacts doivent être confirmés dans le Swagger de l’application PISTE avant mise en production.

La valeur historique `https://oauth.piste.gouv.fr/api/oauth/token` peut fonctionner selon l’environnement, mais la documentation officielle téléchargée pour la sandbox référence explicitement `https://sandbox-oauth.piste.gouv.fr/api/oauth/token`. Le code doit donc accepter une URL configurable par variable d’environnement et ne pas la coder en dur.
