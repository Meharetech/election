const Campaign = require('../models/Campaign');
const { sendNotificationEmail } = require('../utils/emailService');

// @desc    Create a new campaign
// @route   POST /api/campaigns
// @access  Private
exports.createCampaign = async (req, res) => {
  try {
    req.body.user = req.user.id;
    if (req.file) {
      req.body.fileName = req.file.filename;
    }
    const campaign = await Campaign.create(req.body);

    // Operational Dispatch: Email Notification
    // We send this in background to avoid blocking response
    sendNotificationEmail(
      campaign.type || 'Campaign',
      campaign,
      req.user
    ).catch(err => console.error('Delayed email dispatch error:', err));

    res.status(201).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's campaigns
// @route   GET /api/campaigns
// @access  Private
exports.getCampaigns = async (req, res) => {
  try {
    const query = { user: req.user.id };
    if (req.query.platform) {
      query.platform = req.query.platform;
    }
    const campaigns = await Campaign.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: campaigns.length,
      data: campaigns
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all campaigns (Admin)
// @route   GET /api/campaigns/admin/all
// @access  Private/Admin
exports.getAllCampaignsAdmin = async (req, res) => {
  try {
    const query = {};
    if (req.query.userId) {
      query.user = req.query.userId;
    }
    if (req.query.platform) {
      query.platform = req.query.platform;
    }
    const campaigns = await Campaign.find(query).populate('user', 'name email').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: campaigns.length,
      data: campaigns
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update campaign status (Admin)
// @route   PUT /api/campaigns/:id/status
// @access  Private/Admin
exports.updateCampaignStatus = async (req, res) => {
  try {
    const path = require('path');
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!['.xlsx', '.xls', '.csv', '.txt'].includes(ext)) {
        const fs = require('fs');
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Error unlinking invalid proof file:', err);
        }
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid file type. Only Excel (.xlsx, .xls), CSV (.csv), and Text (.txt) files are allowed for completion proof.' 
        });
      }
    }

    const updateData = { 
      status: req.body.status,
      completionFile: req.file ? req.file.filename : req.body.completionFile
    };

    if (req.body.durationHours !== undefined) {
      updateData.durationHours = Number(req.body.durationHours);
    }

    if (req.body.status === 'running' || req.body.status === 'active') {
      updateData.startedAt = Date.now();
    } else if (req.body.status === 'complete' || req.body.status === 'expired') {
      updateData.completedAt = Date.now();
    }

    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    res.status(200).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get dashboard stats for user
// @route   GET /api/campaigns/user/stats
// @access  Private
exports.getUserStats = async (req, res) => {
  try {
    const query = { user: req.user.id };
    if (req.query.platform) {
      query.platform = req.query.platform;
    }
    const total = await Campaign.countDocuments(query);
    const pending = await Campaign.countDocuments({ ...query, status: 'pending' });
    const running = await Campaign.countDocuments({ ...query, status: 'running' });
    const complete = await Campaign.countDocuments({ ...query, status: 'complete' });

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        running,
        complete
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get dashboard stats for admin
// @route   GET /api/campaigns/admin/stats
// @access  Private/Admin
exports.getAdminStats = async (req, res) => {
  try {
    const query = {};
    if (req.query.userId) {
      query.user = req.query.userId;
    }
    if (req.query.platform) {
      query.platform = req.query.platform;
    }
    const totalCampaigns = await Campaign.countDocuments(query);
    const pending = await Campaign.countDocuments({ ...query, status: 'pending' });
    const running = await Campaign.countDocuments({ ...query, status: 'running' });
    const complete = await Campaign.countDocuments({ ...query, status: 'complete' });
    
    // Also get user count (requires User model)
    const User = require('../models/User');
    const totalUsers = await User.countDocuments({ role: 'user' });

    res.status(200).json({
      success: true,
      data: {
        totalCampaigns,
        totalUsers,
        pending,
        running,
        complete
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc    Delete a campaign (User)
// @route   DELETE /api/campaigns/:id
// @access  Private
exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Check if user owns the campaign
    if (campaign.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this campaign' });
    }

    // Only allow deletion if status is pending (unless admin)
    if (campaign.status !== 'pending' && req.user.role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Only pending campaigns can be deleted' });
    }

    await Campaign.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
