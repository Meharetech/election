const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['post', 'story', 'group', 'comment', 'bulk', 'invite'],
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Campaign', campaignSchema);
 