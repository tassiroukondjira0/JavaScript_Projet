# Guide de test et configuration

## Résultats des tests

### SMS (Sendchamp)
- **Statut technique** : ✅ Fonctionne
- **Erreur** : "Low balance, fund your wallet"
- **Cause** : Le compte Sendchamp n'a plus de crédit
- **Solution** :
  1. Aller sur https://dashboard.sendchamp.com
  2. Créditer le compte
  3. Vérifier que `SENDCHAMP_PUBLIC_KEY` et `SENDCHAMP_SENDER_ID` sont corrects dans `.env`

### Email (Amazon SES)
- **Statut technique** : ❌ Erreur d'authentification
- **Erreur** : "The request signature we calculated does not match"
- **Cause** : Les credentials AWS sont incorrects
- **Solution** :
  1. Vérifier les credentials dans `.env` :
     - `AWS_ACCESS_KEY_ID` : doit commencer par `AKIA...`
     - `AWS_SECRET_ACCESS_KEY` : clé secrète
  2. Vérifier que la région est correcte (`AWS_REGION`)
  3. Vérifier que `AWS_SES_FROM_EMAIL` correspond à une adresse vérifiée dans SES
  4. Si nécessaire, créer de nouveaux credentials dans AWS IAM

## Configuration AWS SES

### Étape 1 : Vérifier l'identité dans SES
```bash
# Via AWS CLI
aws ses verify-email-identity --email-address noreply@yourdomain.com --region us-east-1
```

### Étape 2 : Créer des credentials IAM
1. Aller sur https://console.aws.amazon.com/iam
2. Créer un utilisateur avec accès `AmazonSESFullAccess`
3. Générer un Access Key ID et Secret Access Key
4. Les copier dans `.env`

### Étape 3 : Vérifier la configuration
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...  # 20 caractères
AWS_SECRET_ACCESS_KEY=...  # 40 caractères
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
```

## Configuration Sendchamp

### Étape 1 : Vérifier le compte
1. Aller sur https://dashboard.sendchamp.com
2. Vérifier le solde : Settings → Billing
3. Créditer si nécessaire

### Étape 2 : Vérifier les credentials
```env
SENDCHAMP_PUBLIC_KEY=sendchamp_live_...
SENDCHAMP_SENDER_ID=Djokko
SENDCHAMP_MODE=live
```

## Relancer les tests

```bash
node test-sendchamp.js
```

## Vérification en production

```bash
# Démarrer le serveur
npm run dev

# Tester la connexion
# 1. Aller sur http://localhost:3000/login
# 2. Se connecter
# 3. Vérifier la réception du SMS et de l'email