const multer = require('multer');
const {
  MAX_PLAYER_IMAGE_BYTES,
  SUPPORTED_IMAGE_TYPES,
} = require('../services/playerImage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PLAYER_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!SUPPORTED_IMAGE_TYPES.has(file.mimetype)) {
      const error = new Error('Player photo must be a JPG, PNG, or WebP image');
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  },
}).single('photo');

const playerPhotoUpload = (req, res, next) => {
  upload(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Player photo must be 2 MB or smaller' });
    }
    return next(error);
  });
};

module.exports = playerPhotoUpload;
