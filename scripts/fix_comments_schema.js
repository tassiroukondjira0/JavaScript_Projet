// Script to fix comments table schema
// Adds parent_id column if it doesn't exist
const { connectDB, getDB } = require('../config/db');

async function fixCommentsSchema() {
  try {
    await connectDB();
    const db = getDB();
    
    console.log('Connected to database. Checking comments table...');
    
    // Check current columns
    const [columns] = await db.execute('DESCRIBE comments');
    const columnNames = columns.map(c => c.Field);
    console.log('Current columns:', columnNames.join(', '));
    
    // Add parent_id column if missing
    if (!columnNames.includes('parent_id')) {
      await db.execute('ALTER TABLE comments ADD COLUMN parent_id INT DEFAULT NULL AFTER user_id');
      console.log('Added column: parent_id');
      
      // Add foreign key constraint
      try {
        await db.execute('ALTER TABLE comments ADD FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE');
        console.log('Added foreign key constraint on parent_id');
      } catch (e) {
        console.log('Could not add foreign key (may already exist):', e.message);
      }
    } else {
      console.log('Column parent_id already exists');
    }
    
    console.log('Comments table fixed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error fixing comments schema:', err.message);
    process.exit(1);
  }
}

fixCommentsSchema();