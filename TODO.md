# TODO - Réécriture Socket.IO / Notifications Temps Réel

## Étapes

### 1. ✅ Nettoyer `views/notifications/index.ejs` - FAIT
- [x] Supprimer le script inline redondant
- [x] Utiliser `window.loadNotifications()` de `main.js`
- [x] Ajouter un écouteur pour l'événement DOM `notification_received` pour rafraîchir la liste en temps réel

### 1b. ✅ Ajouter des routes API cohérentes dans `routes/notifications.js`
- [x] Ajouter les routes PUT `/notifications/read/:id` et PUT `/notifications/read-all` qui correspondent aux appels faits par le frontend vers `/api/notifications/read/:id` et `/api/notifications/read-all`

### 2. ✅ Simplifier `public/js/notificationsSocket.js` - FAIT
- [x] Supprimer l'affichage du toast (déjà dans `main.js`)
- [x] Déclencher un événement DOM personnalisé `notification_received`

### 3. ✅ Modifier `public/js/main.js` - FAIT
- [x] Exposer `loadNotifications` globalement (`window.loadNotifications`)
- [x] Émettre un événement DOM `notification_received` après avoir reçu une notification Socket.IO
- [x] S'assurer que `loadNotifications()` utilise l'endpoint `/api/notifications` pour les deux contextes

### 4. ✅ Sécuriser `public/js/chatSocket.js` - FAIT
- [x] Retirer la création de seconde socket en fallback
- [x] Attendre `window.mainSocket` via polling si non disponible

### 5. ✅ Vérifier les émissions Socket.IO dans les contrôleurs - FAIT
- [x] `app.js`: `app.set('socketio', socketApi.io)` est fait après `createSocketIO` ✓
- [x] `likeController.js`: émet `new_notification` via `req.app.get('socketio')` ✓
- [x] `friendController.js`: émet `new_notification` + `friend_request_received` + `friendship_updated` ✓
- [x] `commentController.js`: émet `new_notification` via `req.app.get('socketio')` ✓
- [x] `shareController.js`: émet `new_notification` via `req.app.get('socketio')` ✓
- [x] `reactionController.js`: émet `new_notification` via `req.app.get('socketio')` ✓
- [x] `messageController.js`: émet `private_message` + `new_notification` ✓

## Résumé des modifications

### Fichiers modifiés :
1. **`views/notifications/index.ejs`** - Remplacé le script inline redondant par `window.loadNotifications()` + écouteur DOM `notification_received`
2. **`public/js/notificationsSocket.js`** - Simplifié : supprime le double toast, déclenche seulement un événement DOM
3. **`public/js/main.js`** - `loadNotifications` exposée globalement (`window.loadNotifications`)
4. **`public/js/chatSocket.js`** - Fallback sécurisé : polling de `window.mainSocket` au lieu de créer une seconde connexion Socket.IO

### Aucun changement nécessaire dans :
- **`sockets/socket.js`** - Architecture robuste avec `userSockets` Map ✓
- **`app.js`** - `app.set('socketio', io)` correctement positionné ✓
- **`controllers/*.js`** - Tous les contrôleurs émettent déjà `new_notification` via Socket.IO ✓
- **`routes/api.js`** - Routes API `/api/notifications`, `/api/notifications/read/:id`, `/api/notifications/read-all` bien présentes ✓
- **`models/notificationModel.js`** - Utilisation correcte de `user_id` + `payload` JSON ✓

