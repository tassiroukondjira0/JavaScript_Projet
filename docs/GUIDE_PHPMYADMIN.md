# Guide phpMyAdmin - Djokko

## Accéder à phpMyAdmin

1. Démarrer WAMP Server
2. Ouvrir http://localhost/phpmyadmin
3. Se connecter avec :
   - Utilisateur : `root`
   - Mot de passe : (vide par défaut)

## Importer la base de données

### Méthode 1 : Import complet (nouveau projet)

1. Créer une base nommée `djokko`
2. Aller dans l'onglet `SQL`
3. Coller le contenu de `sql/djokko_complete.sql`
4. Cliquer sur `Exécuter`

### Méthode 2 : Mise à jour avec migrations

Si la base existe déjà, appliquer les migrations dans l'ordre :

```sql
-- migrations/01_add_user_profile_fields.sql
ALTER TABLE users ADD COLUMN first_name VARCHAR(120) AFTER fullname;
ALTER TABLE users ADD COLUMN last_name VARCHAR(120) AFTER first_name;
ALTER TABLE users ADD COLUMN username VARCHAR(30) UNIQUE AFTER last_name;
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE users ADD COLUMN failed_login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until DATETIME;

-- migrations/add_profile_cover_fields.sql
ALTER TABLE users ADD COLUMN cover_photo VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN location VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN establishment VARCHAR(255) DEFAULT NULL;

-- migrations/add_super_admin.sql
ALTER TABLE users ADD COLUMN is_super_admin TINYINT DEFAULT 0;

-- migrations/add_preferred_language_theme.sql
ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'fr';
ALTER TABLE users ADD COLUMN preferred_theme VARCHAR(10) DEFAULT 'dark';
```

## Vérifier les tables

Vérifier que toutes les tables sont présentes :

| Table | Description |
|-------|-------------|
| users | Utilisateurs |
| posts | Publications |
| comments | Commentaires |
| reactions | Réactions types |
| likes | Likes (legacy) |
| friends | Relations d'amitié |
| messages | Messages privés |
| notifications | Notifications |
| reports | Signalements |
| activity_logs | Journal d'activité |
| password_reset_otps | OTP réinitialisation |

## Gérer les comptes administrateurs

Pour créer un admin :

```sql
UPDATE users SET is_admin = 1, status = 'active' WHERE email = 'admin@djokko.com';
```

## Dépannage

### Erreur "Table doesn't exist"
- Vérifier que le script SQL a bien été exécuté
- Vérifier la base sélectionnée (bien être sur `djokko`)

### Erreur de collation
- Utiliser `utf8mb4_unicode_ci`

### Mot de passe admin oublié
- Réinitialiser via phpMyAdmin :
```sql
UPDATE users SET password = '$2b$12$...' WHERE email = 'admin@djokko.com';