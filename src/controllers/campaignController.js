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
    const campaigns = await Campaign.find({ user: req.user.id }).sort({ createdAt: -1 });

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
    const campaigns = await Campaign.find().populate('user', 'name email').sort({ createdAt: -1 });

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
    const updateData = { 
      status: req.body.status,
      completionFile: req.body.completionFile
    };

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
    const total = await Campaign.countDocuments({ user: req.user.id });
    const pending = await Campaign.countDocuments({ user: req.user.id, status: 'pending' });
    const running = await Campaign.countDocuments({ user: req.user.id, status: 'running' });
    const complete = await Campaign.countDocuments({ user: req.user.id, status: 'complete' });

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
    const totalCampaigns = await Campaign.countDocuments();
    const pending = await Campaign.countDocuments({ status: 'pending' });
    const running = await Campaign.countDocuments({ status: 'running' });
    const complete = await Campaign.countDocuments({ status: 'complete' });
    
    // Also get user count (requires User model)
    const User = require('../models/User');
    const totalUsers = await User.countDocuments();

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
