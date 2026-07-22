const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'msg-' + uniqueSuffix + ext);
  }
});

// File filter (images + videos for messages)
const fileFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|gif|webp/;
  const videoTypes = /mp4|webm|ogg|mov|avi/;
  const ext = path.extname(file.originalname).toLowerCase();
  const isImage = imageTypes.test(file.mimetype) || imageTypes.test(ext);
  const isVideo = videoTypes.test(file.mimetype) || videoTypes.test(ext);

  if (isImage || isVideo) {
    return cb(null, true);
  }
  cb(new Error('Format de fichier non supporté. Images (jpg, png, gif, webp) et vidéos (mp4, webm) autorisées.'));
};

// Export upload middleware (limit size to 20MB for video support)
const messageUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }
});

module.exports = messageUpload;