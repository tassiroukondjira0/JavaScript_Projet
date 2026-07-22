/**
 * Reset complet de la base de données JSON (mode développement)
 * Supprime toutes les données et réinitialise avec les utilisateurs par défaut
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.json');

console.log('🔄 Reset de la base de données JSON...\n');

// Base complètement vide
const defaultData = {
  users: [],
  posts: [],
  comments: [],
  likes: [],
  friends: [],
  messages: [],
  notifications: [],
  reactions: [],
  reports: [],
  activity_logs: [],
  password_reset_otps: []
};

try {
  fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2), 'utf8');
  console.log('✅ Base de données réinitialisée avec succès !\n');
  console.log('📊 Aucun utilisateur présent.\n');
  console.log('🔄 Redémarrez le serveur pour prendre en compte les changements.');
  console.log('   npm start\n');
} catch (err) {
  console.error('❌ Erreur lors du reset:', err);
  process.exit(1);
}