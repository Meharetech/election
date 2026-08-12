const mongoose = require('mongoose');

const userScrapedSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name']
  },
  profileUrl: {
    type: String,
    required: [true, 'Please provide a profile URL']
  },
  location: {
    type: String
  },
  joined: {
    type: String
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RosterFile',
    required: true
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

module.exports = mongoose.model('UserScraped', userScrapedSchema);
