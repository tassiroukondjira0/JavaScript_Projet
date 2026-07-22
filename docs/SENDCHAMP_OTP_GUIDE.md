# Guide Sendchamp OTP (vérification par SMS)

## Sendchamp OTP API

Sendchamp propose une API OTP native qui gère automatiquement :
- La génération du code
- L'envoi du SMS
- La vérification du code

## Utilisation

### 1. Créer un template OTP dans Sendchamp

1. Aller sur https://dashboard.sendchamp.com
2. **Developers** → **OTP**
3. **Create Template**
4. Configurer le template :
   ```
   Votre code de vérification Djokko est : {otp}
   ```
5. Copier le `template_id`

### 2. Envoyer un code OTP

```javascript
const sendchamp = require('sendchamp-sdk');

sendchamp.setPublicKey(process.env.SENDCHAMP_PUBLIC_KEY);

const otp = sendchamp.OTP;

// Envoyer un code OTP
const result = await otp.send({
  phone_number: '+221775653857',
  email: 'tassirou44@gmail.com',
  first_name: 'Tassirou',
  last_name: 'Sissoko',
  template_id: 'votre_template_id'
});
```

### 3. Vérifier le code OTP

```javascript
const result = await otp.verify({
  phone_number: '+221775653857',
  code: '123456'
});
```

## Avantages OTP Sendchamp

- ✅ Pas besoin de stocker les codes en base de données
- ✅ Expiration automatique (gérée par Sendchamp)
- ✅ Moins de code à maintenir
- ✅ Gestion des tentatives limitées
- ✅ Plus sécurisé

## Migration depuis SMS classique

### Avant (SMS classique) :
```javascript
const code = generateVerificationCode();
await sendSms(user.phone, code);
await saveToDatabase(user.id, code);
```

### Après (OTP Sendchamp) :
```javascript
const result = await sendchampOTP.send({
  phone_number: user.phone,
  email: user.email
});
const reference = result.data.reference; // Stocker ceci
```

### Vérification :
```javascript
const result = await sendchampOTP.verify({
  phone_number: user.phone,
  code: userInput
});
if (result.data.verified) {
  // Connexion réussie
}
```

## Configuration

```env
SENDCHAMP_PUBLIC_KEY=sendchamp_live_...
SENDCHAMP_OTP_TEMPLATE_ID=votre_template_id
```

## Notes

- Le code OTP est valide 5 minutes (configurable dans Sendchamp)
- Maximum 3 tentatives par défaut
- Le référence OTP permet de vérifier sans redemander le code