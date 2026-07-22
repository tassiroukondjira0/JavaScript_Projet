const multer = require('multer');
const path = require('path');
const { getDB } = require('../config/db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

async function myProfile(req, res) {
  const userId = req.session.user.id;
  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM users WHERE id=? LIMIT 1', [userId]);
  const user = rows?.[0] || null;

  res.render('profile/index', { user });
}

async function updateProfile(req, res) {
  const userId = req.session.user.id;
  const bioRaw = (req.body.bio || '').trim();
  const bio = bioRaw.length > 500 ? bioRaw.slice(0, 500) : (bioRaw || null);
  const city = (req.body.establishment || '').trim() || null;
  const country = (req.body.location || '').trim() || null;
  const passionsRaw = (req.body.passions || '').trim();
  const passions = passionsRaw.length > 2000 ? passionsRaw.slice(0, 2000) : (passionsRaw || null);

  const avatarFilename = req.files?.avatar?.[0]?.filename;
  const coverFilename = req.files?.cover?.[0]?.filename;

  const db = getDB();

  try {
    if (avatarFilename) {
      await db.execute('UPDATE users SET profile_picture=? WHERE id=?', [avatarFilename, userId]);
    }

    if (coverFilename) {
      await db.execute('UPDATE users SET cover_picture=? WHERE id=?', [coverFilename, userId]);
    }

    await db.execute(
      `UPDATE users SET bio=?, passions=?, city=?, country=? WHERE id=?`,
      [bio, passions, city, country, userId]
    );

    const [rows] = await db.execute('SELECT * FROM users WHERE id=? LIMIT 1', [userId]);
    req.session.user = { 
      id: rows[0].id, 
      email: rows[0].email, 
      role: rows[0].role, 
      fullname: rows[0].fullname,
      profile_picture: rows[0].profile_picture,
      bio: rows[0].bio,
      establishment: rows[0].city,
      location: rows[0].country,
      cover_picture: rows[0].cover_picture
    };

    return res.redirect('/profile/' + userId);
  } catch (e) {
    console.error('updateProfile error:', e);
    return res.status(500).send('Erreur mise à jour profil');
  }
}

async function deleteAvatar(req, res) {
  const userId = req.session.user.id;
  const db = getDB();

  try {
    // Get current profile_picture filename
    const [rows] = await db.execute('SELECT profile_picture FROM users WHERE id=?', [userId]);
    const currentPicture = rows?.[0]?.profile_picture;

    // Delete physical file if exists
    if (currentPicture) {
      const fs = require('fs');
      const filePath = path.join(__dirname, '..', 'public', 'uploads', currentPicture);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Set profile_picture to NULL in DB
    await db.execute('UPDATE users SET profile_picture=NULL WHERE id=?', [userId]);

    // Update session
    req.session.user.profile_picture = null;

    res.status(200).json({ ok: true, message: 'Photo de profil supprimée.' });
  } catch (e) {
    console.error('deleteAvatar error:', e);
    res.status(500).json({ error: 'Erreur lors de la suppression de la photo de profil.' });
  }
}

module.exports = { upload, myProfile, updateProfile, deleteAvatar };

