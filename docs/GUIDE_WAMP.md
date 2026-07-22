# Guide d'installation WAMP - Djokko

## Étape 1 : Installer WAMP Server

1. Télécharger WAMP Server sur https://www.wampserver.com/
2. Installer avec les options par défaut
3. Lancer WAMP Server (icône dans la barre des tâches)

## Étape 2 : Configurer MySQL

1. Cliquer sur l'icône WAMP → MySQL → `my.ini`
2. Vérifier les paramètres :
   - `port=3306`
   - `bind-address=127.0.0.1`
3. Sauvegarder et redémarrer WAMP

## Étape 3 : Créer la base de données

1. Ouvrir le navigateur → http://localhost/phpmyadmin
2. Se connecter (utilisateur: `root`, mot de passe vide par défaut)
3. Créer une nouvelle base de données nommée `djokko`
4. Aller dans l'onglet `SQL`
5. Copier-coller le contenu de `sql/djokko_complete.sql`
6. Cliquer sur `Exécuter`

## Étape 4 : Configurer l'application

1. Copier `.env.example` vers `.env`
2. Éditer `.env` :
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_mot_de_passe_mysql
DB_NAME=djokko

SESSION_SECRET=djokko_session_secret_2024
JWT_SECRET=djokko_jwt_secret_2024
SENDCHAMP_API_KEY=votre_cle_api_sendchamp
PORT=3000
```

## Étape 5 : Installer les dépendances et lancer

```bash
npm install
npm start
```

Le serveur démarre sur http://localhost:3000

## Dépannage

### Port 3306 déjà utilisé
- Changer le port MySQL dans `my.ini` (ex: 3307)
- Mettre à jour `DB_PORT` dans `.env`

### WAMP reste orange
- Vérifier que le port 80 n'est pas utilisé par Skype, Teams, etc.
- Désactiver IIS dans "Activer ou désactiver des fonctionnalités Windows"

### Erreur de connexion MySQL
- Vérifier que MySQL est démarré dans WAMP
- Tester la connexion : http://localhost/phpmyadmin