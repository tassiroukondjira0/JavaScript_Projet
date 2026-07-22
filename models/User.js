const { getDB } = require('../config/db');

class User {
  static async create({
    fullname,
    first_name,
    last_name,
    username,
    email,
    password,
    is_admin = 0,
    is_super_admin = 0,

    phone = null,
    phone_verified = 0,
    phone_verification_code = null,
    phone_verification_expires_at = null,
    status = 'pending',
    date_of_birth = null
  }) {
    const sql = `
      INSERT INTO users (
        fullname,
        email,
        password,
        is_admin,
        is_super_admin,
        phone,

        phone_verified,
        phone_verification_code,
        phone_verification_expires_at,
        first_name,
        last_name,
        username,
        status,
        date_of_birth
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const db = getDB();
    const result = await db.query(sql, [
      fullname,
      email,
      password,
      is_admin,
      is_super_admin,
      phone,

      phone_verified,
      phone_verification_code,
      phone_verification_expires_at,
      first_name || null,
      last_name || null,
      username || null,
      status,
      date_of_birth
    ]);
    return result.insertId;
  }

  static async findByUsernameOrEmail(identifier) {
    const normalized = String(identifier || '').trim().toLowerCase();
    const db = getDB();
    const rows = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?',
      [normalized, normalized]
    );
    return rows.length > 0 ? rows[0] : null;
  }

  // Enregistre une tentative de connexion échouée et renvoie true si le compte doit être verrouillé
  static async recordFailedLogin(id, { maxAttempts = 5, lockMinutes = 15 } = {}) {
    const user = await User.findById(id);
    if (!user) return false;

    const attempts = (user.failed_login_attempts || 0) + 1;
    let lockedUntil = null;
    if (attempts >= maxAttempts) {
      lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000).toISOString();
    }

    const db = getDB();
    await db.query(
      'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
      [attempts, lockedUntil, id]
    );
    return attempts >= maxAttempts;
  }

  static async resetFailedLogin(id) {
    const db = getDB();
    await db.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
      [id]
    );
  }

  static isLocked(user) {
    if (!user || !user.locked_until) return false;
    return new Date(user.locked_until).getTime() > Date.now();
  }


  static async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const db = getDB();
    const rows = await db.query(sql, [email]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async findById(id) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const db = getDB();
    const rows = await db.query(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

    static async update(id, { fullname, first_name, last_name, username, profile_picture, cover_photo, bio, location, establishment, phone, status, is_admin, is_super_admin, phone_verified, phone_verification_code, phone_verification_expires_at, phone_verification_reference, login_verification_code, login_verification_expires_at, login_verification_reference, date_of_birth, preferred_language, preferred_theme, password, last_login, password_reset_code, password_reset_expires_at, password_reset_request_count, password_reset_request_first_at, password_reset_block_until, password_reset_last_used_hash, reset_token, reset_token_expires }) {

    // Dynamically build update to avoid overwriting fields with null
    const updates = [];
    const params = [];

    if (fullname !== undefined) {
      updates.push('fullname = ?');
      params.push(fullname);
    }
    if (first_name !== undefined) {
      updates.push('first_name = ?');
      params.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push('last_name = ?');
      params.push(last_name);
    }
    if (username !== undefined) {
      updates.push('username = ?');
      params.push(username);
    }
    if (profile_picture !== undefined) {
      updates.push('profile_picture = ?');
      params.push(profile_picture);
    }
    if (cover_photo !== undefined) {
      updates.push('cover_photo = ?');
      params.push(cover_photo);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(bio);
    }
    if (location !== undefined) {
      updates.push('location = ?');
      params.push(location);
    }
    if (establishment !== undefined) {
      updates.push('establishment = ?');
      params.push(establishment);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (is_admin !== undefined) {
      updates.push('is_admin = ?');
      params.push(is_admin);
    }
    if (is_super_admin !== undefined) {
      updates.push('is_super_admin = ?');
      params.push(is_super_admin);
    }
    if (phone_verified !== undefined) {
      updates.push('phone_verified = ?');
      params.push(phone_verified);
    }
    if (phone_verification_code !== undefined) {
      updates.push('phone_verification_code = ?');
      params.push(phone_verification_code);
    }
    if (phone_verification_expires_at !== undefined) {
      updates.push('phone_verification_expires_at = ?');
      params.push(phone_verification_expires_at);
    }
    if (phone_verification_reference !== undefined) {
      updates.push('phone_verification_reference = ?');
      params.push(phone_verification_reference);
    }

    if (login_verification_code !== undefined) {
      updates.push('login_verification_code = ?');
      params.push(login_verification_code);
    }
    if (login_verification_expires_at !== undefined) {
      updates.push('login_verification_expires_at = ?');
      params.push(login_verification_expires_at);
    }
    if (login_verification_reference !== undefined) {
      updates.push('login_verification_reference = ?');
      params.push(login_verification_reference);
    }

    if (date_of_birth !== undefined) {
      updates.push('date_of_birth = ?');
      params.push(date_of_birth);
    }

    if (preferred_language !== undefined) {
      updates.push('preferred_language = ?');
      params.push(preferred_language);
    }
    if (preferred_theme !== undefined) {
      updates.push('preferred_theme = ?');
      params.push(preferred_theme);
    }

    // Password reset, login, and other fields
    if (password !== undefined) {
      updates.push('password = ?');
      params.push(password);
    }
    if (last_login !== undefined) {
      updates.push('last_login = ?');
      params.push(last_login);
    }
    if (reset_token !== undefined) {
      updates.push('reset_token = ?');
      params.push(reset_token);
    }
    if (reset_token_expires !== undefined) {
      updates.push('reset_token_expires = ?');
      params.push(reset_token_expires);
    }
    if (password_reset_code !== undefined) {
      updates.push('password_reset_code = ?');
      params.push(password_reset_code);
    }
    if (password_reset_expires_at !== undefined) {
      updates.push('password_reset_expires_at = ?');
      params.push(password_reset_expires_at);
    }
    if (password_reset_request_count !== undefined) {
      updates.push('password_reset_request_count = ?');
      params.push(password_reset_request_count);
    }
    if (password_reset_request_first_at !== undefined) {
      updates.push('password_reset_request_first_at = ?');
      params.push(password_reset_request_first_at);
    }
    if (password_reset_block_until !== undefined) {
      updates.push('password_reset_block_until = ?');
      params.push(password_reset_block_until);
    }
    if (password_reset_last_used_hash !== undefined) {
      updates.push('password_reset_last_used_hash = ?');
      params.push(password_reset_last_used_hash);
    }

    if (updates.length === 0) return 0;

    params.push(id);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    const db = getDB();
    const result = await db.query(sql, params);
    return result.affectedRows;
  }

  static async search(searchTerm, currentUserId) {
    const sql = `
      SELECT id, fullname, username, email, profile_picture, bio 
      FROM users 
      WHERE (fullname LIKE ? OR username LIKE ? OR email LIKE ?) AND id != ?
      LIMIT 20
    `;
    const formattedTerm = `%${searchTerm}%`;
    const db = getDB();
    return await db.query(sql, [formattedTerm, formattedTerm, formattedTerm, currentUserId]);
  }

  static async getAll() {
    const sql = 'SELECT id, fullname, email, profile_picture, is_admin, created_at FROM users ORDER BY created_at DESC';
    const db = getDB();
    return await db.query(sql);
  }

  static async delete(id) {
    const sql = 'DELETE FROM users WHERE id = ?';
    const db = getDB();
    const result = await db.query(sql, [id]);
    return result.affectedRows;
  }

  static async getStats() {
    const db = getDB();
    const usersCount = await db.query('SELECT COUNT(*) as count FROM users');
    const postsCount = await db.query('SELECT COUNT(*) as count FROM posts');
    const commentsCount = await db.query('SELECT COUNT(*) as count FROM comments');
    const likesCount = await db.query('SELECT COUNT(*) as count FROM likes');
    const reactionsCount = await db.query('SELECT COUNT(*) as count FROM reactions');
    const messagesCount = await db.query('SELECT COUNT(*) as count FROM messages');

    return {
      users: usersCount[0].count,
      posts: postsCount[0].count,
      comments: commentsCount[0].count,
      likes: likesCount[0].count,
      reactions: reactionsCount[0]?.count || 0,
      messages: messagesCount[0].count
    };
  }

  // Get reaction statistics by type
  static async getReactionStats() {
    const stats = {};
    const reactionTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

    for (const type of reactionTypes) {
      const db = getDB();
      const result = await db.query('SELECT COUNT(*) as count FROM reactions WHERE reaction_type = ?', [type]);
      stats[type] = result[0]?.count || 0;
    }

    return stats;
  }
}

module.exports = User;