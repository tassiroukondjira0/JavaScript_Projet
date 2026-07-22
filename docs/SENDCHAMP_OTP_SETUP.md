# Configuration Sendchamp OTP pour la vérification

## Option 1 : Sendchamp OTP (Vérification native)

Sendchamp propose un service OTP intégré qui gère automatiquement la génération et la vérification des codes.

### Configuration dans `.env` :

```env
# Sendchamp OTP Configuration
SENDCHAMP_PUBLIC_KEY=your_sendchamp_public_key
SENDCHAMP_SENDER_ID=Djokko
SENDCHAMP_MODE=live
```

### Utilisation :

Le service actuel envoie déjà le code au **numéro de téléphone de l'utilisateur** (`user.phone`), pas à un numéro prédéfini.

Dans `controllers/authController.js` :

```javascript
// Envoi du code au numéro de l'utilisateur
sendPromises.push(verificationService.sendOtp({ 
  channel: 'sms', 
  destination: user.phone,  // Numéro de l'utilisateur connecté
  code: verificationCode 
}));
```

## Option 2 : Sendchamp SMS Classique (Actuel)

Actuellement, le système envoie des SMS classiques via Sendchamp. Le code est généré par vos soins et envoyé au numéro de l'utilisateur.

### Avantages :
- Code généré côté serveur (contrôle total)
- Même code envoyé sur email ET SMS
- Pas de dépendance à l'API OTP de Sendchamp

## Suppression du numéro prédéfini

Le numéro prédéfini dans `test-sendchamp.js` est uniquement pour les tests :

```javascript
// test-sendchamp.js
const testPhone = '+221775653857';  // À MODIFIER pour vos tests
```

En production, le système utilise automatiquement `user.phone` (le numéro fourni par l'utilisateur lors de l'inscription).

## Vérification

Pour vérifier que le bon numéro est utilisé :

1. **Inscription** : L'utilisateur fournit son numéro (`phone`)
2. **Login** : Le code est envoyé à `user.phone`
3. **Vérification** : L'utilisateur saisit le code reçu sur son propre numéro

Aucun numéro prédéfini n'est stocké en base de données pour l'envoi SMS.