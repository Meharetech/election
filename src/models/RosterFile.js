const mongoose = require('mongoose');

const rosterFileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  recordCount: {
    type: Number,
    default: 0
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

module.exports = mongoose.model('RosterFile', rosterFileSchema);
