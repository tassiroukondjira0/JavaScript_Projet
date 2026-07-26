// Script to fix notifications table schema
// Adds user_id and payload columns if they don't exist
const { connectDB, getDB } = require('../config/db');

async function fixNotificationsSchema() {
  try {
    await connectDB();
    const db = getDB();
    
    console.log('Connected to database. Checking notifications table...');
    
    // Check current columns
    const [columns] = await db.execute('DESCRIBE notifications');
    const columnNames = columns.map(c => c.Field);
    console.log('Current columns:', columnNames.join(', '));
    
    // Add user_id column if missing
    if (!columnNames.includes('user_id')) {
      await db.execute('ALTER TABLE notifications ADD COLUMN user_id INT DEFAULT NULL AFTER id');
      console.log('Added column: user_id');
    } else {
      console.log('Column user_id already exists');
    }
    
    // Add payload column if missing
    if (!columnNames.includes('payload')) {
      await db.execute('ALTER TABLE notifications ADD COLUMN payload TEXT DEFAULT NULL AFTER type');
      console.log('Added column: payload');
    } else {
      console.log('Column payload already exists');
    }
    
    // Add index on user_id if missing
    try {
      await db.execute('ALTER TABLE notifications ADD INDEX idx_notifications_user_id (user_id)');
      console.log('Added index on user_id');
    } catch (e) {
      console.log('Index on user_id already exists or could not be added:', e.message);
    }
    
    // Migrate existing data: receiver_id -> user_id
    const [migrateResult] = await db.execute(
      'UPDATE notifications SET user_id = receiver_id WHERE user_id IS NULL AND receiver_id IS NOT NULL'
    );
    console.log('Migrated receiver_id to user_id:', migrateResult.affectedRows, 'rows updated');
    
    // Migrate existing data: sender_id/entity_id -> payload
    const [migratePayload] = await db.execute(
      `UPDATE notifications SET payload = CONCAT('{"sender_id":', COALESCE(sender_id, 'null'), ',"entity_id":', COALESCE(entity_id, 'null'), '}') 
       WHERE (payload IS NULL OR payload = '') AND (sender_id IS NOT NULL OR entity_id IS NOT NULL)`
    );
    console.log('Migrated sender_id/entity_id to payload:', migratePayload.affectedRows, 'rows updated');
    
    console.log('Notifications table fixed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error fixing notifications schema:', err.message);
    process.exit(1);
  }
}

fixNotificationsSchema();