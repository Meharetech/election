const express = require('express');
const {
  uploadExcel,
  getUserScrapedList,
  deleteUserScrapedItem,
  clearUserScrapedList,
  getRosterFiles,
  deleteRosterFile
} = require('../controllers/userScrapedController');
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
router.get('/files', protect, getRosterFiles);
router.delete('/files/:fileId', protect, authorize('admin'), deleteRosterFile);
router.get('/', protect, getUserScrapedList);
router.delete('/:id', protect, authorize('admin'), deleteUserScrapedItem);
router.delete('/', protect, authorize('admin'), clearUserScrapedList);

module.exports = router;
