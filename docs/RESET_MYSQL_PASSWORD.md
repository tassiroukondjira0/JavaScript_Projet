# Réinitialiser le mot de passe MySQL root (WAMP)

## Méthode 1 : Via WAMP MySQL Console (recommandé)

1. **Fermer l'application Node.js** (Ctrl+C dans le terminal)
2. **Cliquer sur l'icône WAMP** dans la barre des tâches
3. **Aller dans** : MySQL → **MySQL console**
4. **Entrer le mot de passe actuel** (si demandé) :
   - Si c'est `root`, entrez `root`
   - Si vous ne le savez pas, essayez de vous connecter via phpMyAdmin

5. **Exécuter ces commandes SQL** :

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';
FLUSH PRIVILEGES;
```

6. **Vérifier le changement** :

```sql
SELECT User, Host FROM mysql.user WHERE User='root';
```

7. **Fermer la console** et **redémarrer l'application Node.js**

---

## Méthode 2 : Via phpMyAdmin

1. **Ouvrir** http://localhost/phpmyadmin
2. **Se connecter** avec le mot de passe actuel
3. **Aller dans** l'onglet **SQL**
4. **Coller et exécuter** :

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';
FLUSH PRIVILEGES;
```

5. **Redémarrer l'application Node.js**

---

## Après la réinitialisation

Votre fichier `.env` est déjà configuré avec `DB_PASSWORD=` (vide), donc l'application se connectera sans mot de passe.

**Redémarrer l'application :**
```bash
npm start
```

Le serveur devrait démarrer sur http://localhost:3000 sans erreur de connexion MySQL.

---

## En cas d'erreur "Access denied"

Si vous avez oublié le mot de passe root actuel, vous pouvez :

1. Arrêter WAMP complètement
2. Ouvrir un terminal en tant qu'administrateur
3. Naviguer vers le dossier MySQL de WAMP (ex: `cd C:\wamp64\bin\mysql\mysql8.0.x\bin`)
4. Exécuter :
   ```
   mysql -u root
   ```
5. Si cela fonctionne sans mot de passe, exécuter les commandes SQL ci-dessus
6. Si un mot de passe est demandé et que vous ne le connaissez pas, vous devrez réinitialiser MySQL complètement via WAMP

---
**Note :** Cette configuration sans mot de passe est uniquement pour le développement local. Pour la production, utilisez toujours un mot de passe fort.