# FAQ - Questions du Jury

## Questions techniques

### 1. Pourquoi avoir choisi Node.js et Express ?
**Réponse :**
- Écosystème riche (npm)
- Performant pour les applications temps réel
- Courbe d'apprentissage rapide en JavaScript
- Express est minimaliste et flexible

### 2. Pourquoi MySQL plutôt qu'un autre SGBD ?
**Réponse :**
- Relations complexes nécessaires (posts, comments, friends, messages)
- Transactions et intégrité référentielle
- largement répandu, facile à installer avec WAMP
- Performances avec les index appropriés

### 3. Pourquoi Socket.IO pour le temps réel ?
**Réponse :**
- API simple et intuitive (rooms, events)
- Fallbacks automatiques (long-polling si WebSocket indisponible)
- Scaling possible avec Redis adapter
- Gestion native de la reconnexion

### 4. Pourquoi pas de framework frontend (React, Vue...) ?
**Réponse :**
- Performance maximale sans build step
- Simplicité pour un projet académique
- Apprentissage approfondi du JavaScript vanilla
- Pas de dette technique framework

---

## Questions sécurité

### 5. Comment protégez-vous les mots de passe ?
**Réponse :**
- Hash bcrypt avec sel automatique (12 rounds)
- Validation stricte (8 caractères, majuscule, minuscule, chiffre, spécial)
- Blacklist de mots de passe courants
- Interdiction d'utiliser nom/date de naissance

### 6. Pourquoi OTP SMS plutôt qu'un email ?
**Réponse :**
- 2FA plus fort (quelque chose que l'utilisateur possède)
- Pas de mot de passe à mémoriser
- Vérification du numéro de téléphone
- Expérience utilisateur moderne

### 7. Comment empêchez-vous les injections SQL ?
**Réponse :**
- Requêtes préparées avec placeholders `?`
- Pas de concaténation de chaînes
- Validation et sanitization des entrées
- ORM fait maison avec queries paramétrées

### 8. Quelle protection contre les attaques brute force ?
**Réponse :**
- 5 tentatives max
- Verrouillage 15 minutes après échecs
- Logging des tentatives
- Messages génériques (pas d'indication si email/username existe)

---

## Questions architecture

### 9. Expliquez votre architecture MVC
**Réponse :**
- **Models** : Accès données (`models/User.js`, etc.)
- **Views** : Templates HTML (`views/`)
- **Controllers** : Logique métier (`controllers/`)
- **Routes** : Endpoints API REST
- **Sockets** : Gestion temps réel séparée
- Séparation des responsabilités, maintenabilité

### 10. Comment gérez-vous les sessions ?
**Réponse :**
- Express-session avec cookies HttpOnly
- Stockage en mémoire (production : Redis)
- Régénération de session après login
- Destruction à la déconnexion

### 11. Comment scalez-vous l'application ?
**Réponse :**
- Architecture modulaire, séparation claire
- Prêt pour Docker/Kubernetes
- Socket.IO scalable avec Redis adapter
- Base de données indexée

---

## Questions fonctionnalités

### 12. Comment fonctionne le typing indicator ?
**Réponse :**
- Event `typing` émis à chaque frappe
- Timeout 900ms pour `stop_typing`
- Broadcast via Socket.IO à la room du partenaire
- Affichage/masquage dynamique dans le DOM

### 13. Comment sont gérés les accusés de lecture ?
**Réponse :**
- Marquage en DB via `markAsRead()`
- Émission Socket.IO `message_read` à l'expéditeur
- Mise à jour UI en temps réel sans refresh
- Compteur de messages non lus

### 14. Comment fonctionne la recherche ?
**Réponse :**
- Endpoint `/api/users/search?q=`
- Requête SQL avec LIKE et wildcards
- Index sur `username` pour performance
- Limité à 20 résultats

### 15. Expliquez le système de rôles
**Réponse :**
- `user` : Membre standard
- `admin` : Modération, statistiques
- `super_admin` : Gestion des rôles
- Middlewares protègent les routes sensibles

---

## Questions deployment

### 16. Comment déployer en production ?
**Réponse :**
- PM2 pour le processus Node.js
- Nginx comme reverse proxy
- Redis pour les sessions partagées
- MySQL sur serveur dédié
- HTTPS obligatoire

### 17. Quelle est la stack complète ?
**Réponse :**
- Backend : Node.js, Express, Socket.IO
- DB : MySQL avec index optimisés
- Frontend : HTML/CSS/JS vanilla
- Auth : JWT + Sessions + OTP SMS
- Upload : Multer
- Sécurité : bcrypt, helmet, validation

---

## Questions management

### 18. Comment avez-vous géré le projet ?
**Réponse :**
- Méthode Agile : 5 sprints
- Documentation continue (TODO par sprint)
- Tests manuels à chaque sprint
- Versioning Git

### 19. Quelles ont été les difficultés ?
**Réponse :**
- Gestion du temps réel avec Socket.IO
- Upload de fichiers multiples (avatar + cover)
- OTP SMS avec Sendchamp
- Responsive mobile/desktop
- Mode sombre/clair avec CSS variables

### 20. Que retenez-vous de ce projet ?
**Réponse :**
- Importance de la sécurité dès la conception
- Documentation essentielle
- Tests réguliers évitent les régressions
- Architecture modulaire facilite les évolutions

---

*FAQ mise à jour pour la soutenance*