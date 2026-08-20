const xlsx = require('xlsx');
const fs = require('fs');
const GroupScraper = require('../models/GroupScraper');

// @desc    Upload Excel list of groups
// @route   POST /api/group-scraper/upload
// @access  Private/Admin
exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel file' });
    }

    let uploadedBy = req.user.id;
    if (req.user.role === 'admin' && (req.body.userId || req.query.userId)) {
      uploadedBy = req.body.userId || req.query.userId;
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Read the worksheet as a 2D array of arrays
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ success: false, message: 'Excel file is empty' });
    }

    // Try to find headers
    const headers = jsonData[0].map(h => (h || '').toString().toLowerCase().trim());
    
    let urlIndex = -1;
    let contactIndex = -1;
    let notesIndex = -1;

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (h.includes('target') || h.includes('group') || h.includes('url') || h.includes('link') || h.includes('facebook') || h.includes('scraper')) {
        if (urlIndex === -1) urlIndex = i;
      } else if (h.includes('contact') || h.includes('email') || h.includes('phone') || h.includes('info')) {
        if (contactIndex === -1) contactIndex = i;
      } else if (h.includes('notes') || h.includes('note') || h.includes('desc') || h.includes('comment')) {
        if (notesIndex === -1) notesIndex = i;
      }
    }

    // Fallbacks if headers are not explicitly named or recognized
    if (urlIndex === -1) urlIndex = 0;
    if (contactIndex === -1 && headers.length > 1) contactIndex = 1;
    if (notesIndex === -1 && headers.length > 2) notesIndex = 2;

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

      let rawUrl = (row[urlIndex] || '').toString().trim();
      let contactInfo = contactIndex !== -1 && row[contactIndex] ? row[contactIndex].toString().trim() : '';
      let notes = notesIndex !== -1 && row[notesIndex] ? row[notesIndex].toString().trim() : '';

      // Validate or find a fallback URL in the row
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

      if (!rawUrl || !isMaybeUrl(rawUrl)) continue;

      // Ensure prefix
      let formattedUrl = rawUrl;
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
      }

      records.push({
        url: formattedUrl,
        contactInfo,
        notes,
        uploadedBy
      });
    }

    // Delete temp upload file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    if (records.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid group link records found in Excel' });
    }

    const inserted = await GroupScraper.insertMany(records);

    res.status(201).json({
      success: true,
      message: `Parsed and uploaded ${inserted.length} group links`,
      count: inserted.length,
      data: inserted
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all scraper group links
// @route   GET /api/group-scraper
// @access  Private
exports.getGroupLinks = async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'admin') {
      if (req.query.userId) {
        query.uploadedBy = req.query.userId;
      }
    } else {
      query.uploadedBy = req.user.id;
    }
    const links = await GroupScraper.find(query).populate('uploadedBy', 'name email').sort({ createdAt: -1, _id: 1 });
    res.status(200).json({
      success: true,
      count: links.length,
      data: links
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete single group link
// @route   DELETE /api/group-scraper/:id
// @access  Private/Admin
exports.deleteGroupLink = async (req, res) => {
  try {
    const link = await GroupScraper.findById(req.params.id);
    if (!link) {
      return res.status(404).json({ success: false, message: 'Link not found' });
    }
    await GroupScraper.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Link deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear all group scraper links
// @route   DELETE /api/group-scraper
// @access  Private/Admin
exports.clearAllLinks = async (req, res) => {
  try {
    await GroupScraper.deleteMany({});
    res.status(200).json({ success: true, message: 'All scraper links cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
