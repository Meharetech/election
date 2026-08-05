const mongoose = require('mongoose');

const profileScraperSchema = new mongoose.Schema({
  url: {
    type: String,
    required: [true, 'Please provide a profile URL']
  },
  contactInfo: {
    type: String
  },
  notes: {
    type: String
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ProfileScraper', profileScraperSchema);
