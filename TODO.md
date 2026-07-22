# TODO - Ajout fonctionnalité Vidéo & Filtrage

## Étapes
- [x] Plan approuvé
- [x] 1. Migration SQL - ajouter colonne `video` à la table `posts`
- [x] 2. Script `scripts/create_missing_tables.js` - ajout de la colonne video
- [x] 3. `middleware/upload.js` - accepter les fichiers vidéo
- [x] 4. `models/postModel.js` - support du champ `video`
- [x] 5. `controllers/postController.js` - gestion du champ video
- [x] 6. `routes/posts.js` - accepter le champ video dans la création
- [x] 7. `routes/api.js` - accepter le champ video dans la création
- [x] 8. `views/posts/index.ejs` - ajout bouton vidéo, prévisualisation, lecteur vidéo, filtres
- [x] 9. `public/js/postsInteractions.js` - gestion vidéo + filtrage
- [x] 10. `public/css/style.css` - styles pour la vidéo et les filtres

