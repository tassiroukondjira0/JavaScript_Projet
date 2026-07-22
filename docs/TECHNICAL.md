# Documentation Technique - Djokko

## 📐 Architecture MVC

Le projet suit une architecture **Model-View-Controller** :

```
project/
├── models/           # Interaction avec la base de données
├── views/            # Templates HTML (interfaces utilisateur)
├── controllers/      # Logique métier et traitement des requêtes
├── routes/           # Définition des routes (API et pages)
├── middleware/       # Filtres et vérifications (auth, admin, upload)
├── public/           # Fichiers statiques (CSS, JS, images)
├── sockets/          # Gestion des événements temps réel
└── utils/            # Fonctions utilitaires
```

## 🗄️ Modèles de données

### Users (Utilisateurs)
```sql
- id: INT (PK, Auto Increment)
- fullname: VARCHAR(255)
- first_name, last_name, username: VARCHAR(120/30)
- email: VARCHAR(255) UNIQUE
- password: VARCHAR(255) (bcrypt hash)
- profile_picture, cover_photo: VARCHAR(255)
- bio, location, establishment: TEXT/VARCHAR
- date_of_birth: DATE
- phone: VARCHAR(20)
- phone_verified: TINYINT
- status: pending|active|suspended (default: pending)
- is_admin: TINYINT (default: 0)
- failed_login_attempts: INT
- locked_until: DATETIME
- created_at: DATETIME
```

### Posts (Publications)
```sql
- id: INT (PK)
- user_id: INT (FK users)
- content: TEXT
- image: VARCHAR(255)
- shared_from: INT (FK posts - pour les reposts)
- created_at: DATETIME
```

### Comments (Commentaires)
```sql
- id: INT (PK)
- post_id: INT (FK posts)
- user_id: INT (FK users)
- parent_id: INT (FK comments - pour les réponses)
- content: TEXT
- created_at: DATETIME
```

### Reactions (Réactions)
```sql
- id: INT (PK)
- post_id: INT (FK posts)
- user_id: INT (FK users)
- reaction_type: ENUM('like', 'love', 'haha', 'wow', 'sad', 'angry')
- UNIQUE(post_id, user_id) - un utilisateur = une réaction max par post
```

### Messages
```sql
- id: INT (PK)
- sender_id, receiver_id: INT (FK users)
- content: TEXT
- image: VARCHAR(255)
- is_read: TINYINT (default: 0)
- read_at: DATETIME
- created_at: DATETIME
```

### Notifications
```sql
- id: INT (PK)
- receiver_id, sender_id: INT (FK users)
- type: VARCHAR(50)
- entity_id: INT
- is_read: TINYINT
- created_at: DATETIME
```

### Reports (Signalements)
```sql
- id: INT (PK)
- reporter_id: INT (FK users)
- entity_type: VARCHAR(50)
- entity_id: INT
- reason: TEXT
- status: pending|resolved (default: pending)
```

## 🔒 Politique des mots de passe

### Mot de passe interdit
- `12345678`
- `password`
- `abcdefgh`
- Prénom ou nom de l'utilisateur
- Date de naissance
- Suites de chiffres (ex: `1234`, `5678`)
- Suites de lettres (ex: `abcd`, `wxyz`)

### Exigences obligatoires
- Minimum 8 caractères
- Au moins une majuscule (A-Z)
- Au moins une minuscule (a-z)
- Au moins un chiffre (0-9)
- Au moins un caractère spécial (!@#$%^&*...)

## 🎭 Gestion des rôles

### Utilisateur (user)
- `is_admin = 0`
- Permissions: publier, commenter, réagir, modifier profil, envoyer messages

### Administrateur (admin)
- `is_admin = 1`
- Permissions: tout utilisateur + gestion users, modération contenu, statistiques

### Super Administrateur (super_admin) - Optionnel
- Pour les versions futures : création d'autres admins, gestion complète

## ⚡ Socket.IO Events

### Événements côté serveur
```javascript
// Connexion utilisateur au salon privé
io.to(`user-${userId}`).emit('private_message', messageData);
io.to(`user-${userId}`).emit('new_notification', notifData);
io.to(`user-${userId}`).emit('typing_start', { userId, partnerId });
io.to(`user-${userId}`).emit('typing_stop', { userId, partnerId });
```

### Événements côté client
```javascript
socket.emit('typing', { receiver_id: partnerId });
socket.on('private_message', handleMessage);
socket.on('new_notification', handleNotification);
socket.on('user_typing', showTypingIndicator);
```

## 🔄 API Response Format

### Succès
```json
{
  "message": "Message de confirmation",
  "data": {...} // ou "user", "post", "notifications", etc.
}
```

### Erreur
```json
{
  "error": "Description de l'erreur"
}
```

## 📊 Statistiques (Admin)

L'endpoint `/api/admin/stats` retourne :
```json
{
  "users": 150,
  "posts": 500,
  "comments": 1200,
  "likes": 800,
  "reactions": 900,
  "messages": 350,
  "byStatus": { "active": 120, "pending": 25, "suspended": 5 },
  "signups30d": [{ "date": "2024-01-15", "count": 3 }, ...],
  "reactions": { "like": 200, "love": 150, "haha": 80, "wow": 60, "sad": 40, "angry": 30 }
}
```

## 🛡️ Middlewares

### auth.js
Vérifie que l'utilisateur est connecté (session valide)

### admin.js
Vérifie que l'utilisateur a les droits administrateur

### upload.js
Gestion des uploads d'images pour les publications

### messageUpload.js
Gestion des uploads d'images pour les messages (max 5MB)

## 📝 Journal d'activité

Actions enregistrées :
- `login_success` - Connexion réussie
- `logout` - Déconnexion
- `register` - Inscription
- `post_created` - Publication créée
- `post_deleted` - Publication supprimée
- `comment_created` - Commentaire créé
- `user_suspended` - Utilisateur suspendu
- `user_deleted` - Utilisateur supprimé

## 🌐 Internationalisation (i18n)

La plateforme supporte :
- Français (fr) - par défaut
- English (en) - pour les versions futures

## 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 768px) { ... }

/* Tablette */
@media (min-width: 769px) and (max-width: 1024px) { ... }

/* Desktop */
@media (min-width: 1025px) { ... }