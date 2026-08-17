# Vérification Wikipédia / MediaWiki

## Faits vérifiés

L’extension MediaWiki TextExtracts documente l’utilisation de l’Action API avec `action=query`, `prop=extracts`, `explaintext` et `titles` pour récupérer un extrait en texte brut. Exemple documenté : `api.php?action=query&prop=extracts&exchars=100&explaintext&titles=Earth`.

La politique officielle Wikimedia exige un User-Agent HTTP descriptif pour les requêtes automatisées et recommande d’inclure une information de contact. Un User-Agent générique ou absent peut être bloqué. Le module Alpha doit donc appeler l’API avec un User-Agent explicite, tout en conservant un délai entre les requêtes.

## Décision d’architecture

Pour les URLs Wikipédia, le pipeline doit utiliser l’API officielle MediaWiki au lieu de scraper directement le HTML de la page, ce qui évite le refus robots.txt observé sur `https://fr.wikipedia.org/wiki/Droit`. Pour les autres sites HTML, le pipeline conserve la vérification robots.txt, le mode fail-closed, les retries, le rate limiting et l’extraction BeautifulSoup.

## Sources

- https://www.mediawiki.org/wiki/Extension:TextExtracts
- https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy
