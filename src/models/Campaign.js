const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    enum: ['facebook', 'instagram'],
    default: 'facebook'
  },
  type: {
    type: String,
    enum: ['post', 'story', 'group', 'comment', 'bulk', 'invite', 'insta-story', 'insta-message', 'insta-share', 'insta-comment', 'insta-like', 'insta-group-msg'],
    required: true
  },
  campaignName: {
    type: String,
    required: [true, 'Please provide a campaign name']
  },
  caption: {
    type: String
  },
  targetUrl: {
    type: String
  },
  nature: {
    type: String // for comments: positive, negative, neutral
  },
  messageText: {
    type: String // for bulk sender
  },
  fbPageUrl: {
    type: String // for invite on page
  },
  fileName: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'complete', 'active', 'expired'],
    default: 'pending'
  },
  completionFile: {
    type: String // name/url of file attached on completion
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  durationHours: {
    type: Number,
    default: 3
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Campaign', campaignSchema);
 