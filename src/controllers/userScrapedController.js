const xlsx = require('xlsx');
const fs = require('fs');
const UserScraped = require('../models/UserScraped');
const RosterFile = require('../models/RosterFile');

// @desc    Upload Excel/CSV list of users
// @route   POST /api/user-scraped/upload
// @access  Private/Admin
exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel or CSV file' });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Read the worksheet as a 2D array of arrays
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ success: false, message: 'Uploaded file is empty' });
    }

    // Try to find headers
    const headers = jsonData[0].map(h => (h || '').toString().toLowerCase().trim());
    
    let nameIndex = -1;
    let urlIndex = -1;
    let locationIndex = -1;
    let joinedIndex = -1;

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (h.includes('name') || h === 'title' || h === 'user' || h === 'member') {
        if (nameIndex === -1) nameIndex = i;
      } else if (h.includes('profile') || h.includes('url') || h.includes('link') || h.includes('facebook') || h.includes('href')) {
        if (urlIndex === -1) urlIndex = i;
      } else if (h.includes('location') || h.includes('city') || h.includes('state') || h.includes('country') || h.includes('address')) {
        if (locationIndex === -1) locationIndex = i;
      } else if (h.includes('joined') || h.includes('date') || h.includes('time') || h.includes('member since')) {
        if (joinedIndex === -1) joinedIndex = i;
      }
    }

    // Fallbacks if headers are not explicitly named or recognized
    if (nameIndex === -1) nameIndex = 0;
    if (urlIndex === -1 && headers.length > 1) urlIndex = 1;
    if (locationIndex === -1 && headers.length > 2) locationIndex = 2;
    if (joinedIndex === -1 && headers.length > 3) joinedIndex = 3;

    // Create RosterFile Document first
    const rosterFile = await RosterFile.create({
      fileName: req.file.originalname,
      recordCount: 0,
      uploadedBy: req.user.id
    });

    const records = [];
    const startIndex = 1; // start after header row

    const isMaybeUrl = (str) => {
      if (!str) return false;
      if (/\s/.test(str)) return false;
      if (!str.includes('.')) return false;
      return true;
    };

    for (let r = startIndex; r < jsonData.length; r++) {
      const row = jsonData[r];
      if (!row || row.length === 0) continue;

      let name = nameIndex !== -1 && row[nameIndex] ? row[nameIndex].toString().trim() : '';
      let rawUrl = urlIndex !== -1 && row[urlIndex] ? row[urlIndex].toString().trim() : '';
      let location = locationIndex !== -1 && row[locationIndex] ? row[locationIndex].toString().trim() : '';
      let joined = joinedIndex !== -1 && row[joinedIndex] ? row[joinedIndex].toString().trim() : '';

      // Validate or find a fallback URL in the row if the primary one is invalid
      if (!isMaybeUrl(rawUrl)) {
        rawUrl = '';
        for (let colIdx = 0; colIdx < row.length; colIdx++) {
          const val = (row[colIdx] || '').toString().trim();
          if (isMaybeUrl(val) && (val.includes('facebook.com') || val.startsWith('http://') || val.startsWith('https://'))) {
            rawUrl = val;
            break;
          }
        }
      }

      // If we don't even have a name and a URL, skip
      if (!name && !rawUrl) continue;

      // Ensure prefix for url if exists
      let formattedUrl = rawUrl;
      if (formattedUrl && !formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
      }

      records.push({
        name: name || 'Anonymous Target',
        profileUrl: formattedUrl,
        location,
        joined,
        fileId: rosterFile._id,
        uploadedBy: req.user.id
      });
    }

    // Delete temp upload file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    if (records.length === 0) {
      // Clean up the created roster file entry if no valid rows found
      await RosterFile.findByIdAndDelete(rosterFile._id);
      return res.status(400).json({ success: false, message: 'No valid user record fields found in file' });
    }

    const inserted = await UserScraped.insertMany(records);

    // Update record count on RosterFile
    rosterFile.recordCount = inserted.length;
    await rosterFile.save();

    res.status(201).json({
      success: true,
      message: `Parsed and uploaded ${inserted.length} user scraped records`,
      count: inserted.length,
      data: rosterFile
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all uploaded Roster files
// @route   GET /api/user-scraped/files
// @access  Private
exports.getRosterFiles = async (req, res) => {
  try {
    const files = await RosterFile.find().populate('uploadedBy', 'name email').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: files.length,
      data: files
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all user scraped records (optionally filtered by fileId)
// @route   GET /api/user-scraped
// @access  Private
exports.getUserScrapedList = async (req, res) => {
  try {
    const filter = {};
    if (req.query.fileId) {
      filter.fileId = req.query.fileId;
    }

    const list = await UserScraped.find(filter).populate('uploadedBy', 'name email').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete single user scraped entry
// @route   DELETE /api/user-scraped/:id
// @access  Private/Admin
exports.deleteUserScrapedItem = async (req, res) => {
  try {
    const item = await UserScraped.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    
    await UserScraped.findByIdAndDelete(req.params.id);
    
    // Decrement count on parent RosterFile
    await RosterFile.findByIdAndUpdate(item.fileId, { $inc: { recordCount: -1 } });

    res.status(200).json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a Roster File and all its parsed user records
// @route   DELETE /api/user-scraped/files/:fileId
// @access  Private/Admin
exports.deleteRosterFile = async (req, res) => {
  try {
    const file = await RosterFile.findById(req.params.fileId);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Cascade delete target records
    await UserScraped.deleteMany({ fileId: req.params.fileId });
    await RosterFile.findByIdAndDelete(req.params.fileId);

    res.status(200).json({ success: true, message: 'File and all its user records deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear all user scraped records and roster files
// @route   DELETE /api/user-scraped
// @access  Private/Admin
exports.clearUserScrapedList = async (req, res) => {
  try {
    await UserScraped.deleteMany({});
    await RosterFile.deleteMany({});
    res.status(200).json({ success: true, message: 'All scraped records and files cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
