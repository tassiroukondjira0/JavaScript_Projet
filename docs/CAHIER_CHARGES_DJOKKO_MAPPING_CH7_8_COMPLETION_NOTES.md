# Chapitres 7 & 8 — Comments & Réactions (V2.0 → Repo) — notes d’implémentation

## Chapitre 7 — Commentaires : points à valider (v2.0)
- Propriété : seul l’auteur modifie/supprime
- Hiérarchie : max 3 niveaux
- Modification : seulement dans 30min (optionnel)
- Supression admin : peut supprimer commentaire signalé
- Contenu : max 5000 caractères

## Observé dans le repo (implémentation)
### Fichiers clés
- `controllers/commentController.js`
- `models/commentModel.js`
- `controllers/postsController.js` (route d’ajout + lecture via `commentModel`)

### Création / droits
- `commentController.createComment` : vérifie que `post` existe et `content` non vide.
- Détermination de la cible de notification :
  - top-level → auteur du post
  - reply → auteur du commentaire parent
- Suppression : `commentController.deleteComment` autorise :
  - auteur du commentaire
  - auteur du post
  - admin (via `req.user?.isAdmin || req.session?.isAdmin`)

### Hiérarchie / profondeur
- Le code de `commentController.createComment` accepte `parent_id`.
- **Manque à confirmer** : aucune règle explicite visible “max 3 niveaux” dans `commentController.js` / `commentModel.js`.

### Modification / limitation temps
- Pas d’endpoint de modification visible dans les fichiers lus.
- **Manque à confirmer** : règle 30 minutes non visible.

### Limite de longueur (5000 caractères)
- `commentController` vérifie seulement `content` non vide.
- **Manque à confirmer** : pas de limite 5000 visible dans les fichiers lus.

## Chapitre 8 — Réactions : points à valider (v2.0)
- Unicité : 1 seule réaction par utilisateur/publication
- Modification / retrait de la réaction
- 6 types : like, love, haha, wow, sad, grr

## Observé dans le repo (implémentation)
### Fichiers clés
- `controllers/reactionController.js`
- `models/reactionModel.js`

### Unicité + toggling
- `reactionModel.react` : exécute `DELETE FROM reactions WHERE post_id=? AND user_id=?` puis `INSERT`.
  - Cela garantit qu’il n’existe qu’une réaction par (post_id, user_id) à la fin.
- `reactionController.toggleReaction` :
  - appelle `reactionModel.toggle` (remarque : l’implémentation lue est `react`, pas `toggle` → incohérence de code à vérifier dans le fichier réel utilisé côté runtime)
  - renvoie `counts` et `total_count`

### Types de réactions
- `reactionController.getStats` référence des types : `['like','love','haha','wow','sad','angry']`.
- Le cahier des charges attend : `grr` au lieu de `angry`.
- **Incohérence potentielle** : mapping des types à aligner.

### Comptage / résumé
- `reactionModel.getReactionSummary` (pour un post) existe.
- **Manque à confirmer** : endpoints de compteurs/affichage alignés.

