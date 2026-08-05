const express = require('express');
const {
  uploadExcel,
  getGroupLinks,
  deleteGroupLink,
  clearAllLinks
} = require('../controllers/groupScraperController');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file limit
});

const router = express.Router();

router.post('/upload', protect, authorize('admin'), upload.single('file'), uploadExcel);
router.get('/', protect, getGroupLinks);
router.delete('/:id', protect, authorize('admin'), deleteGroupLink);
router.delete('/', protect, authorize('admin'), clearAllLinks);

module.exports = router;
