# Djokko — Réseau social web dynamique

Plateforme sociale moderne, sécurisée et multilingue conformément au cahier des charges V2.0.

## Fonctionnalités (Sprint 1)
- ✅ Inscription avec validation âge (16 ans minimum)
- ✅ OTP par SMS via Sendchamp (expiration 5min, 3 tentatives max)
- ✅ Connexion sécurisée avec blocage (3 tentatives → 15min)
- ✅ Hash bcrypt (coût 12)
- ✅ JWT (access 24h + refresh 7 jours)
- ✅ Réinitialisation mot de passe
- ✅ Validation mot de passe robuste (8 caractères, majuscule, minuscule, chiffre, caractère spécial)
- ✅ Architecture MVC
- ✅ i18n (fr, en)

## Prérequis
- Node.js 18+
- MySQL 8+
- WAMP (Windows) ou équivalent
- Clé API Sendchamp (optionnelle pour OTP)

## Variables d'environnement
 Copier `.env` et configurer :
- `DB_*` : Connexion MySQL
- `JWT_SECRET` / `JWT_REFRESH_SECRET` : Clés JWT (changer en production)
- `SENDCHAMP_API_KEY` : Clé API Sendchamp pour OTP SMS

## Installation
1. Installer les dépendances :
   ```bash
   npm install
   ```
2. Configurer la base de données :
   ```bash
   mysql -u root -p < sql/schema.sql
   mysql -u root -p < sql/djokko_sprint1.sql
   ```
3. Configurer `.env`
4. Lancer en dev :
   ```bash
   npm run dev
   ```

Le serveur démarre sur `http://localhost:3000`

## Structure
- MVC : `controllers/`, `models/`, `routes/`, `middleware/`
- Vue : `views/`
- Front : `public/`
- Temps réel : `sockets/`
- Config : `config/`
- Utils : `utils/`

## Sécurité
- Helmet (headers sécurisés)
- bcrypt (hachage mots de passe)
- JWT (sessions sans état)
- Rate limiting (login 3 tentatives/15min, OTP 3 tentatives/5min)
- Validation des entrées
- Protection CSRF

## Documentation
- Cahier des charges : `docs/CAHIER_CHARGES_DJOKKO_MAPPING.md`
- Guide d'installation : `docs/INSTALLATION.md`
- Guide WAMP : `docs/GUIDE_WAMP.md`

## License
ISC

