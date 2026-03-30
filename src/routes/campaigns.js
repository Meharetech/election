const express = require('express');
const { 
  createCampaign, 
  getCampaigns, 
  getAllCampaignsAdmin, 
  updateCampaignStatus, 
  getUserStats, 
  getAdminStats,
  deleteCampaign
} = require('../controllers/campaignController');
const { protect, authorize } = require('../middleware/auth');

const multer = require('multer');
const path = require('path');

// Multer Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const router = express.Router();

router.post('/', protect, upload.single('file'), createCampaign);
router.get('/', protect, getCampaigns);
router.delete('/:id', protect, deleteCampaign);
router.get('/user/stats', protect, getUserStats);

// Admin Routes
router.get('/admin/all', protect, authorize('admin'), getAllCampaignsAdmin);
router.get('/admin/stats', protect, authorize('admin'), getAdminStats);
router.put('/:id/status', protect, authorize('admin'), updateCampaignStatus);

module.exports = router;
