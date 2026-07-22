# Solution des problèmes d'envoi

## Problème 1 : SMS Sendchamp - "Low balance"

**Erreur** : `{"code":407,"message":"Low balance, fund your wallet"}`

**Solution** :
1. Aller sur https://dashboard.sendchamp.com
2. Se connecter avec votre compte
3. Aller dans **Settings** → **Billing**
4. Créditer le compte avec le montant souhaité
5. Les SMS fonctionneront immédiatement

**Vérification** :
- Coût approximatif : 1-2 crédits par SMS
- Le solde se recharge instantanément après paiement

## Problème 2 : Email SES - "Email address is not verified"

**Erreur** : `Email address is not verified. The following identities failed the check in region US-EAST-1`

**Cause** : AWS SES nécessite de vérifier les adresses email avant de pouvoir envoyer des emails.

**Solution** :

### Option A : Mode Sandbox (recommandé pour les tests)

1. **Vérifier une adresse email** :
   ```bash
   # Vérifier l'adresse source
   aws ses verify-email-identity --email-address noreply@diokko.com --region us-east-1
   
   # OU vérifier l'adresse de destination (tassirou44@gmail.com)
   aws ses verify-email-identity --email-address tassirou44@gmail.com --region us-east-1
   ```

2. **Confirmer la vérification** :
   - AWS envoie un email de confirmation
   - Cliquer sur le lien dans l'email
   - OU via AWS CLI :
     ```bash
     aws ses get-verification-status --email-address noreply@diokko.com --region us-east-1
     ```

3. **Vérifier le statut** :
   - Aller sur https://console.aws.amazon.com/ses
   - Cliquer sur **Verified identities**
   - L'adresse doit avoir le statut **Verified**

### Option B : Sortir du mode Sandbox (production)

1. **Demander la production** :
   - Aller sur https://console.aws.amazon.com/ses
   - Cliquer sur **Account dashboard**
   - Cliquer sur **Request production access**
   - Remplir le formulaire :
     - Use case description : "Verification emails for user authentication"
     - Website URL : votre site web
     - Acceptable bounce rate : < 1%
     - Acceptable complaint rate : < 0.1%

2. **Attendre l'approbation** (généralement 24-48h)

3. **Une fois approuvé**, vous pourrez envoyer à n'importe quelle adresse sans vérification préalable

## Configuration recommandée pour les tests

### 1. Utiliser une adresse vérifiée

Modifier `.env` pour utiliser une adresse déjà vérifiée :
```env
AWS_SES_FROM_EMAIL=noreply@diokko.com
```

Puis vérifier cette adresse dans AWS SES :
```bash
aws ses verify-email-identity --email-address noreply@diokko.com --region us-east-1
```

### 2. Vérifier l'adresse de destination

Si vous testez avec `tassirou44@gmail.com`, vérifiez aussi cette adresse :
```bash
aws ses verify-email-identity --email-address tassirou44@gmail.com --region us-east-1
```

## Test de vérification

Après vérification des adresses, relancer le test :
```bash
node test-sendchamp.js
```

## Vérification du statut SES

```bash
# Lister les identités vérifiées
aws ses list-verified-email-addresses --region us-east-1

# Vérifier le statut d'une adresse
aws ses get-verification-status --email-address noreply@diokko.com --region us-east-1
```

## Notes importantes

- **Sandbox SES** : Vous ne pouvez envoyer des emails qu'entre adresses vérifiées
- **Production SES** : Vous pouvez envoyer à n'importe quelle adresse (mais soumis à quotas)
- **Quotas** : Vérifiez vos quotas sur https://console.aws.amazon.com/ses
  - Compte sandbox : 200 emails/jour
  - Compte production : illimité (avec monitoring)

## Dépannage rapide

Si vous ne pouvez pas utiliser AWS CLI :

1. **Console AWS SES** :
   - https://console.aws.amazon.com/ses
   - Cliquer sur **Verified identities**
   - Cliquer sur **Create identity**
   - Choisir **Email address**
   - Entrer l'adresse email
   - Cliquer sur **Create**
   - Confirmer via l'email reçu

2. **Vérifier** :
   - L'adresse apparaît avec un checkmark vert ✅
   - Statut : "Verified"