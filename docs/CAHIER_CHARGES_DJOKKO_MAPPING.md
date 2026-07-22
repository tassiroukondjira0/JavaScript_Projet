# CAHIER DES CHARGES DJOKKO — Mapping (V2.0 → Implémentation repo)

## Date
Juillet 2026

## Objectif du document
Ce document liste, à gros grain, les correspondances entre le cahier des charges fourni (V2.0) et l’implémentation présente dans le dépôt.

> Remarque : l’implémentation étant en cours/évolutive, ce mapping vise à identifier les écarts majeurs (fonctionnalités manquantes / incohérences de champs / validations).

---

## Chapitre 4 — Authentification
### Exigences cahier des charges
- Inscription avec âge minimum (16 ans)
- OTP (SMS Sendchamp) + expiration + limitation tentatives
- JWT / sessions sécurisées
- Réinitialisation mot de passe

### Implémentation repo (observée)
- Inscription : `views/auth/register.ejs` + `controllers/authController.js`
  - Champ `date_of_birth` présent côté formulaire
  - Calcul/validation âge serveur via `deriveAgeFromDateOfBirth()` et `validateAge()`
- Stockage : `models/userModel.js`
  - `createUser({ ..., date_of_birth })`
  - Rôle initial : premier utilisateur `SUPER_ADMIN`
- OTP : `controllers/authController.js` + `models/otpModel.js` + `config/sendchamp.js`
  - OTP générés (`randomOtpCode(6)`), hashés (`sha256`), stockés, puis vérifiés/consommés
  - Fallback via `req.session.pendingOtp` pour test local
- Réinitialisation : `forgotPassword` + `resetPassword`

### Points à valider sur la conformité
- Dans le cahier des charges : âge minimum “16 ans révolus” + OTP expiration 5 minutes + 3 tentatives max + blocage 15 minutes pour login.
- Dans le repo : OTP expiry et règles de bruteforce/nb tentatives doivent être vérifiées précisément dans `middleware/rateLimitOtp.js` et `models/otpModel.js`.

---

## Chapitre 5 — Gestion des utilisateurs
### Exigences cahier des charges
- Profil public / modification
- Upload avatar & cover (taille/type)
- Bio (max 500 caractères)
- Paramètres & confidentialité
- Suppression de compte

### Implémentation repo (observée)
- Modules disponibles :
  - `controllers/profileController.js`
  - `routes/profile.js`
  - migrations : `migrations/add_profile_cover_fields.sql`, `migrations/add_user_profile_fields.sql`, etc.
  - middleware : `middleware/upload.js`

### Points à valider
- Limites exactes (5MB, types JPG/PNG/GIF, bio 500 caractères)
- Paramètres & confidentialité : repérer si le repo stocke dans `users.settings` (cahier des charges V2.0) ou dans des colonnes dédiées (`preferred_language`, `preferred_theme`, etc.).

---

## Chapitre 6 — Publications

> Début : audit code (post/feeds/uploads) vs cahier des charges V2.0.
### Exigences cahier des charges
- CRUD posts
- Images (max 10, types, tailles)
- Fil d’actualité paginé
- Propriété (auteur seul modifie/supprime)
- Rate limiting

### Implémentation repo (observée)
- Modules disponibles :
  - `controllers/postController.js`, `controllers/postsController.js`
  - `routes/posts.js`
  - middleware upload : `middleware/upload.js`

### Points à valider
- Max images / max taille : **implémentation actuelle upload 1 image** (`routes/posts.js` utilise `upload.single('image')`).
  - À aligner avec le cahier des charges : “max 10 images par publication” (actuellement non supporté multi-images).
  - Taille : limite déjà présente (2MB ici sur `routes/posts.js`, 5MB dans `middleware/upload.js`) → vérifier laquelle est effectivement utilisée en production.
- Pagination/ORDER BY (repo: `controllers/postsController.js` rend avec pagination LIMIT/OFFSET; vérifier si `page` est bien utilisé partout + feed API)
- Règle “modification seulement dans 24h (optionnel)” : non implémentée dans `controllers/postController.js` (update sans contrainte temps) → à aligner si exigé par ton cahier des charges

---

## Chapitres 7 & 8 — Commentaires & Réactions
- Modules disponibles :
  - `controllers/commentController.js`, `routes/*` (commentaires)
  - `controllers/reactionController.js`, `routes/*` (réactions)
  - `migrations/add_reactions_table.sql`

### Points à valider
- Unicité réaction (contrainte UNIQUE post_id,user_id)
- Profondeur commentaires (max 3 niveaux)

---

## Chapitre 9 — Messagerie temps réel
### Exigences cahier des charges
- Socket.IO (messages 1-1)
- Typing indicator
- Accusés de lecture
- Images en message
- Historique & pagination

### Implémentation repo (observée)
- `sockets/chatSocket.js`, `sockets/socket.js`, `sockets/socketHandler.js`
- `controllers/chatController.js`
- `models/ChatModel.js` / `models/Message.js`

### Points à valider
- Pagination messages
- Logique read receipts (`is_read`, `read_at`)
- Indicateur typing

---

## Chapitre 10 — Notifications
### Exigences cahier des charges
- Notifications messages/commentaires/réactions/report
- Temps réel via Socket.IO
- Conserver 30 jours puis archiver

### Implémentation repo (observée)
- `controllers/notificationController.js`, `routes/notifications.js`
- `public/js/notificationsSocket.js`
- `models/notificationModel.js`

### Points à valider
- Durée de conservation/archivage

---

## Chapitres 11 & 12 — Recherche & Signalements
- Modules disponibles :
  - `controllers/searchController.js` / routes correspondantes
  - `controllers/reportController.js` / routes correspondantes

### Points à valider
- FULLTEXT / indexes
- Unicité reporter/content
- Anonymat signalant

---

## Chapitres 13 & 14 — Administration
### Exigences cahier des charges
- Admin : suppression/suspension, modération, traitement reports
- Super admin : réglages système, maintenance
- Journal d’activité complet

### Implémentation repo (observée)
- `controllers/adminController.js`, `controllers/adminCrudController.js`
- `middleware/admin.js`, `middleware/superAdmin.js`
- `models/ActivityLog.js` + migration `migrations/add_activity_log.sql`

### Points à valider
- Toutes les routes super-admin (maintenance/on-off)
- Existence/activation mode maintenance

---

## Changement appliqué (capture du TODO)

---

## Changement à compléter après audit Chapitres 7 & 8 (Commentaires & Réactions)
- Dans `controllers/reactionController.js`, vérifier la cohérence entre le nom de méthode appelée (toggle) et l’implémentation dans `models/reactionModel.js` (fonction `react`).
- Aligner les types de réactions : cahier des charges attend `grr`, repo semble utiliser `angry` (à vérifier dans DB/migrations).
- Pour les commentaires : confirmer l’absence/presence de limites “max 3 niveaux” et “modification 30 min optionnel” côté code.
### Alignement âge / date_of_birth
- `views/auth/register.ejs` : champ `date_of_birth`
- `controllers/authController.js` : validation serveur via dérivation de l’âge
- `models/userModel.js` : insertion champ `date_of_birth`

---

## Prochaines étapes recommandées
1. Lancer l’application et tester inscription (validation âge >= 16)
2. Vérifier l’expiration OTP + règles anti bruteforce dans `models/otpModel.js` et `middleware/rateLimitOtp.js`
3. Faire un audit rapide des limites (bio, images posts/messages) en comparant contrôleurs + migrations

