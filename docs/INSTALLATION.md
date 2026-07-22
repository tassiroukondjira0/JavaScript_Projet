# Guide d'Installation - Djokko

Ce guide détaillé vous aidera à installer et configurer la plateforme Djokko sur votre machine locale.

## 📋 Prérequis

### Logiciels nécessaires
- **Node.js** (version 14 ou supérieure) - [Télécharger](https://nodejs.org/)
- **npm** (installé avec Node.js) ou **yarn**
- **WAMP Server** ou tout autre serveur Apache/MySQL - [Télécharger WAMP](https://www.wampserver.com/)

### Vérification des prérequis
```bash
node --version  # Doit afficher v14.x.x ou supérieur
npm --version
```

## 🗄️ Configuration de la base de données

### 1. Démarrer WAMP Server
- Lancez WAMP Server
- Vérifiez que les services Apache et MySQL sont en marche (icône verte dans la barre des tâches)

### 2. Créer la base de données
- Ouvrez votre navigateur et allez sur http://localhost/phpmyadmin
- Cliquez sur "Nouvelle base de données"
- Nommez-la `djokko` et sélectionnez `utf8mb4_general_ci` comme collation

### 3. Importer le schéma
- Sélectionnez la base `djokko`
- Cliquez sur l'onglet "Importer"
- Choisissez le fichier `sql/schema.sql`
- Cliquez sur "Exécuter"

## ⚙️ Configuration du projet

### 1. Copier le fichier d'environnement
```bash
cp .env.example .env
```

### 2. Éditer le fichier .env
Ouvrez le fichier `.env` et configurez les valeurs :

```env
# Configuration MySQL (WAMP par défaut)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=    # Laissez vide par défaut avec WAMP
DB_NAME=djokko

# Secrets de session et JWT
SESSION_SECRET=une-chaine-aleatoire-tres-longue-et-complexe
JWT_SECRET=une-autre-chaine-aleatoire-tres-longue-et-complexe

# Sendchamp API (pour l'envoi de SMS)
SENDCHAMP_API_KEY=votre-cle-api-sendchamp

# Port du serveur
PORT=3000
```

### 3. Installer les dépendances
```bash
npm install
```

## ▶️ Lancer l'application

### Mode développement
```bash
npm run dev
# ou
node app.js
```

### Mode production
```bash
npm start
```

L'application sera accessible sur : http://localhost:3000

## 🔧 Dépannage

### Port déjà utilisé
Si le port 3000 est occupé, modifiez la variable `PORT` dans `.env` :
```env
PORT=3001
```

### Erreur de connexion à la base de données
Vérifiez que :
1. WAMP est bien démarré (Apache et MySQL)
2. Le nom de la base est bien `djokko`
3. Les identifiants dans `.env` sont corrects

### Erreur Sendchamp
Pour tester sans Sendchamp API, vous pouvez commenter les appels API dans le code ou utiliser une clé factice pour les tests.