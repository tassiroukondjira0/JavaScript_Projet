# Vérification 2FA lors de la connexion

## Description

Cette fonctionnalité ajoute une vérification par code de sécurité (2FA - Two-Factor Authentication) lors de la connexion d'un utilisateur. Le même code de vérification est envoyé simultanément sur l'adresse email et le numéro de téléphone de l'utilisateur.

## Fonctionnalités

- ✅ Envoi automatique d'un code de vérification lors de la connexion
- ✅ Envoi simultané sur **email ET SMS** avec le **même code**
- ✅ Code valide 10 minutes
- ✅ Possibilité de renvoyer le code
- ✅ Interface utilisateur intuitive avec masquage du formulaire de connexion

## Architecture

### Backend

#### 1. Service de vérification (`services/verificationService.js`)
- Gère l'envoi des codes via email (Amazon SES) ou SMS (Sendchamp)
- Exporte les fonctions utilitaires :
  - `normalizeEmail(email)`
  - `isValidEmail(email)`
  - `normalizePhone(phone)`
  - `isValidPhone(phone)`
  - `generateVerificationCode()`
  - `sendOtp({ channel, destination, code })`

#### 2. Contrôleur d'authentification (`controllers/authController.js`)

**Nouvelles fonctions ajoutées :**

##### `verifyLoginCode(req, res)`
- Vérifie le code de connexion (2FA)
- **Route :** `POST /api/auth/verify-login-code`
- **Body :** `{ userId, code }`
- **Réponse succès (200) :**
  ```json
  {
    "message": "Connexion vérifiée avec succès.",
    "user": { "id": 1, "fullname": "...", "email": "...", ... }
  }
  ```
- **Réponses erreur :**
  - 400: Code manquant
  - 404: Utilisateur introuvable
  - 400: Code expiré
  - 400: Code incorrect

##### `login(req, res)` (modifiée)
- Après validation email/mot de passe, génère et envoie un code 2FA
- Stocke le code dans `login_verification_code` et `login_verification_expires_at`
- Envoie le même code sur email ET téléphone simultanément via `Promise.all()`
- **Réponse (200) avec 2FA :**
  ```json
  {
    "requiresTwoFactor": true,
    "message": "Un code de vérification identique a été envoyé sur votre email et votre numéro de téléphone.",
    "userId": 1,
    "debugCode": "123456"
  }
  ```

#### 3. Routes (`routes/api.js`)

```javascript
router.post('/auth/login', authController.login);
router.post('/auth/verify-login-code', authController.verifyLoginCode);
router.post('/auth/resend-verification', authController.resendVerificationCode);
```

#### 4. Middleware d'authentification (`middleware/auth.js`)

Les routes de vérification 2FA sont accessibles sans authentification :
```javascript
const allowedPaths = [
  '/api/auth/verify-login-code',
  '/api/auth/resend-verification'
];
```

### Frontend

#### 1. Vue de connexion (`views/auth/login.html`)

**Nouveaux éléments :**

```html
<div id="login-verification-step" style="display: none;">
  <h3>Vérification de sécurité</h3>
  <p id="login-verification-instructions">
    Un code de vérification a été envoyé à votre adresse email et sur votre numéro de téléphone.
  </p>
  <input type="text" id="login-verification-code" placeholder="123456" maxlength="6">
  <button type="button" id="btn-verify-login">Vérifier et se connecter</button>
  <button type="button" id="btn-resend-login-code">Renvoyer le code</button>
</div>
```

**Script inline :**
- Gestion de la vérification 2FA
- Écouteur d'événement `show-login-verification`
- Appels API vers `/api/auth/verify-login-code` et `/api/auth/resend-verification`

#### 2. JavaScript frontend (`public/js/auth.js`)

**Modification de `handleLoginSubmit()` :**
```javascript
if (data.requiresTwoFactor) {
  // Afficher l'interface de vérification 2FA
  pendingUserId = data.userId;
  const event = new CustomEvent('show-login-verification', {
    detail: { userId: data.userId }
  });
  window.dispatchEvent(event);
} else {
  // Connexion normale
  window.location.href = '/';
}
```

### Base de données

#### Migration SQL (`migrations/add_login_verification_fields.sql`)

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_verification_code VARCHAR(6) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_verification_expires_at DATETIME DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_login_verification 
ON users(login_verification_code, login_verification_expires_at);
```

**Exécuter la migration :**
```bash
# MySQL
mysql -u root -p social_network < migrations/add_login_verification_fields.sql

# Ou via Node.js
node -e "require('./config/db').query(require('fs').readFileSync('migrations/add_login_verification_fields.sql', 'utf8'))"
```

## Configuration

### Variables d'environnement (`.env`)

Le fichier `.env` contient toutes les variables nécessaires :

```env
# Canal par défaut pour l'enregistrement (le login envoie sur les DEUX canaux)
VERIFICATION_CHANNEL=email

# Configuration Sendchamp (SMS)
SENDCHAMP_PUBLIC_KEY=your_sendchamp_public_key
SENDCHAMP_SENDER_ID=Djokko
SENDCHAMP_MODE=live

# Configuration Amazon SES (Email)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
```

**Note :** Le système envoie automatiquement le même code sur **email ET SMS** lors de la connexion. La variable `VERIFICATION_CHANNEL` ne concerne que l'enregistrement initial.

Sendchamp est le service SMS utilisé pour l'envoi des codes de vérification.

## Flux d'utilisation

1. **Utilisateur se connecte** avec email/mot de passe
2. **Backend vérifie** les identifiants
3. **Backend génère** un code à 6 chiffres
4. **Backend envoie le même code** sur email ET téléphone simultanément
5. **Frontend affiche** l'interface de vérification 2FA
6. **Utilisateur saisit** le code reçu
7. **Backend vérifie** le code
8. **Connexion réussie** → redirection vers le feed

## Tests

Lancer le script de test :
```bash
# Démarrer le serveur
npm run dev

# Dans un autre terminal
node test-2fa.js
```

## Sécurité

- ✅ Code à 6 chiffres (généré avec `crypto.randomInt`)
- ✅ Expiration après 10 minutes
- ✅ Code effacé après vérification réussie
- ✅ Un seul code actif à la fois
- ✅ Ne fonctionne que pour les utilisateurs vérifiés (email/phone vérifié)

## Notes techniques

- Le canal de vérification est déterminé par `VERIFICATION_CHANNEL` dans `.env`
- En mode développement, le code est affiché dans les logs console ET retourné dans `debugCode`
- **SMS :** Sendchamp
- **Email :** Amazon SES uniquement
- Si Sendchamp n'est pas configuré, les codes s'affichent dans les logs (fallback)
- La vérification 2FA ne s'applique qu'aux utilisateurs ayant un email valide

## Améliorations futures possibles

- [ ] Support TOTP (Google Authenticator)
- [ ] Notification push
- [ ] Codes de secours
- [ ] Historique des connexions
- [ ] Limitation de tentatives (rate limiting)
- [ ] Authentification biométrique