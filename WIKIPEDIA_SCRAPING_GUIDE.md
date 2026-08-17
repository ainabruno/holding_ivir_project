# Guide de Scraping Wikipédia et Conformité Robots.txt

## Pourquoi le scraping fonctionnait en partie mais échouait parfois sur Wikipédia

1. **Le respect de `robots.txt`** : Le Module Alpha vérifie systématiquement le fichier `robots.txt` de la source avant tout téléchargement. C’est une obligation légale et éthique pour un outil de veille juridique et d’intelligence économique.
2. **La politique User-Agent de Wikimedia** : Wikimedia interdit les User-Agents génériques (comme `python-requests/x.y`) et exige une chaîne explicite avec un moyen de contact (par exemple `HoldingIVIR-LegalResearchBot/1.0 (+https://example.com/contact)`).
3. **Le statut de l’URL** : Les articles Wikipédia de type `/wiki/Droit` sont explicitement autorisés par `robots.txt` pour les bots respectueux utilisant un User-Agent valide. En revanche, les chemins d’API brute `/w/api.php` sont bloqués par défaut par la configuration standard de Wikipédia (`Disallow: /api/`).

## Solution validée

Le Module Alpha utilise le téléchargement HTTP direct sur les pages `/wiki/...` avec :
- Un User-Agent conforme aux règles Wikimedia ;
- Le respect du fichier `robots.txt` (qui autorise les articles avec un bon bot) ;
- Le respect du `Crawl-delay` ;
- Une extraction propre du texte via BeautifulSoup (en éliminant les menus, scripts et pieds de page) ;
- Une déduplication MD5 robuste.

Le smoke test exécuté sur `https://fr.wikipedia.org/wiki/Droit` retourne avec succès :
- **Statut** : Succès (`Document collecté`)
- **Taille** : ~14 900 caractères de texte juridique brut extrait
- **Hash MD5** : Généré et prêt pour l’enrichissement IA par le module Bêta (Mistral)
