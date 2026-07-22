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
    // Generate unique name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter (images only by default)
const fileFilter = (req, file, cb) => {
  const imageTypes = /jpeg|jpg|png|gif|webp/;
  const videoTypes = /mp4|webm|mov|avi|mkv/;

  if (file.fieldname === 'video') {
    // Allow video files for the video field
    const mimeType = videoTypes.test(file.mimetype.split('/')[1]) || videoTypes.test(file.mimetype);
    const extName = videoTypes.test(path.extname(file.originalname).toLowerCase().replace('.', ''));
    if (mimeType || extName) return cb(null, true);
    return cb(new Error('Format de vidéo non supporté. Formats acceptés: MP4, WebM, MOV, AVI, MKV.'));
  }

  // Default: images only
  const mimeType = imageTypes.test(file.mimetype);
  const extName = imageTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimeType && extName) {
    return cb(null, true);
  }
  cb(new Error('Format de fichier non supporté. Seules les images sont autorisées.'));
};

// Export upload middleware (limit size to 5MB for images, 50MB for videos)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }
});

module.exports = upload;
