# ✅ Corrections du Projet - Terminées

## ✅ Étape 1: Centrage des icônes du header
- [x] Restructurer le header dans `public/js/main.js` pour ajouter une section centrale `.fb-header-center` contenant les icônes de navigation
- [x] Ajouter le CSS pour `.fb-header-center` dans `public/css/style.css`
- [x] Ajuster la taille des boutons (44px) et des SVG (24px) pour un meilleur centrage

## ✅ Étape 2: Localisation des dates
- [x] Dans `views/posts/index.ejs`: Formater `p.created_at` avec `language` via fonction `formatDate()`
- [x] Dans `public/js/postsInteractions.js`: Remplacer `'fr-FR'` codé en dur par `document.documentElement.lang`

## ✅ Étape 3: Correction des sessions dans les controllers
- [x] `controllers/reactionController.js`: `req.session?.fullname` → `req.session?.user?.fullname`, `req.session?.userId` → `req.session?.user?.id`
- [x] `controllers/shareController.js`: `req.session?.fullname` → `req.session?.user?.fullname`, `req.session?.profile_picture` → `req.session?.user?.profile_picture`
- [x] `controllers/commentController.js`: Correction `req.session?.userId` → `req.session?.user?.id` et `req.session?.fullname` → `req.session?.user?.fullname`
- [x] `controllers/likeController.js`: Correction `req.session?.userId` → `req.session?.user?.id` et `req.session?.fullname` → `req.session?.user?.fullname`

## ✅ Étape 4: Publications sur la page de profil
- [x] Ajouter section "Publications" dans `views/profile/index.ejs` avec chargement JS via `/api/posts/user/:id`
- [x] Ajouter route API `GET /api/posts/user/:id` dans `routes/api.js`
- [x] Ajouter méthode `getUserPostsById` dans `controllers/postController.js`

## ✅ Étape 5: Statistiques et liste d'amis sur la page de profil
- [x] Ajouter ligne de stats (publications, amis) dynamiques dans `views/profile/index.ejs`
- [x] Ajouter section "Amis" avec chargement via `/api/friends/user/:id`

## ✅ Étape 6: Bouton Message → conversation directe
- [x] Le bouton Message redirige maintenant vers `/messages?user=ID`

## ✅ Étape 7: Bouton signaler supprimé
- [x] Déjà retiré du template `views/posts/index.ejs` (confirmé)

## ✅ Étape 10: Correction notifications temps réel "J'aime" (Socket.IO room manquante)
- [x] `sockets/socket.js`: Ajout de `socket.join(`user-${uid}`)` dans l'événement `register` pour créer la room nécessaire
  - Les contrôleurs utilisent `io.to(`user-${userId}`).emit(...)` pour envoyer des notifications en temps réel
  - Sans `socket.join()`, la room n'existait pas et l'événement n'atteignait jamais le destinataire
  - C'est la cause racine : le toast de notification ne s'affichait pas quand l'utilisateur était en ligne

## ✅ Étape 11: Icône appareil photo SVG + Suppression photo de profil
- [x] `views/posts/index.ejs`: Remplacer 📷 par une icône SVG (appareil photo) dans le bouton story et le label photo du compositeur
- [x] `routes/api.js`: Ajout route `POST /api/profile/avatar/delete` protégée par requireLogin
- [x] `controllers/profileController.js`: Ajout méthode `deleteAvatar()` — supprime le fichier physique + met `profile_picture=NULL` en DB + met à jour la session
- [x] `views/profile/edit.ejs`: Bouton "🗑️ Supprimer la photo de profil" visible seulement si l'utilisateur a une photo + script JS pour appel API et mise à jour dynamique de l'avatar
- [x] `models/notificationModel.js`: `listNotifications()` utilise désormais `LEFT JOIN users` pour retourner `sender_name` et `sender_picture` depuis la table `users`
- [x] `controllers/authController.js`: Stockage de `fullname` et `profile_picture` dans `req.session.user` lors de l'inscription (otpVerify) et connexion (loginStep)
- [x] `controllers/reactionController.js`: Fallback à `senderUser.fullname` depuis la DB si la session ne contient pas le nom
- [x] `controllers/likeController.js`: Fallback à `senderUser.fullname` depuis la DB si la session ne contient pas le nom
- [x] `controllers/commentController.js`: Fallback à `userProfile.fullname` depuis la DB si la session ne contient pas le nom
- [x] `controllers/shareController.js`: Fallback à `senderUser.fullname` depuis la DB si la session ne contient pas le nom
- [x] `controllers/friendController.js`: Utilisait déjà `senderUser.fullname` comme fallback — correct

