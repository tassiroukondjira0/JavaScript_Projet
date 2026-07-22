# Guide WAMP Server & phpMyAdmin - Djokko

Ce guide explique comment configurer WAMP Server et phpMyAdmin pour utiliser avec la plateforme Djokko.

## 🚀 Installation de WAMP Server

### 1. Téléchargement
- Rendez-vous sur [wampserver.com](https://www.wampserver.com/)
- Téléchargez la version adaptée à votre système (32 ou 64 bits)

### 2. Installation
- Exécutez le fichier téléchargé en tant qu'administrateur
- Suivez les étapes d'installation
- Choisissez le répertoire d'installation (par défaut `C:\wamp64\`)

### 3. Premier lancement
- Lancez WAMP Server
- Attendez que l'icône dans la barre des tâches devienne **verte**
- Si orange/rouge, vérifiez les conflits de ports

## 🔧 Configuration des ports

### Vérifier les ports utilisés
```bash
# Dans un terminal
netstat -an | findstr :80
netstat -an | findstr :443
netstat -an | findstr :3306
```

### Modifier le port Apache (si nécessaire)
1. Ouvrez `C:\wamp64\bin\apache\apache[version]\conf\httpd.conf`
2. Trouvez la ligne `Listen 80` et remplacez par `Listen 8080`
3. Redémarrez WAMP

## 📊 phpMyAdmin

### Accès à phpMyAdmin
- URL : http://localhost/phpmyadmin
- Par défaut, aucun login n'est requis (utilisateur: `root`, mot de passe vide)

### Créer un utilisateur MySQL (optionnel mais recommandé)
```sql
CREATE USER 'djokko'@'localhost' IDENTIFIED BY 'votre_mot_de_passe_securise';
CREATE DATABASE djokko CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON djokko.* TO 'djokko'@'localhost';
FLUSH PRIVILEGES;
```

## 🛠️ Dépannage commun

### L'icône WAMP reste orange
1. **Port 80 occupé** : Arrêtez Skype, IIS, ou autres services
2. **Port 443 occupé** : Désactivez le service World Wide Web Publishing

### Erreur "Access denied for user 'root'@'localhost'"
- Vérifiez que le mot de passe dans `.env` correspond
- WAMP par défaut utilise `root` avec mot de passe vide

### phpMyAdmin ne se charge pas
- Vérifiez que le module Apache `rewrite_module` est chargé
- Dans WAMP : Clic droit → Apache → Modules → rewrite_module (coché)

## 📁 Répertoires WAMP

```
C:\wamp64\
├── bin\                # Exécutables (Apache, MySQL, PHP)
├── tmp\                # Fichiers temporaires
├── alias\              # Alias Apache
└── www\                # Racine web (placer votre projet ici si besoin)
```

## 🔄 Redémarrage des services

### Via l'icône système
- Clic droit sur l'icône WAMP
- Menu "Redémarrer les services"

### Via la console
```bash
# Redémarrer Apache
httpd -k restart

# Redémarrer MySQL
net stop mysql
net start mysql
```

## 🔐 Sécurité

Pour un environnement de développement, la configuration par défaut est suffisante.
Pour la production, assurez-vous de :
- Changer les mots de passe par défaut
- Désactiver l'accès à phpMyAdmin depuis l'extérieur
- Utiliser HTTPS