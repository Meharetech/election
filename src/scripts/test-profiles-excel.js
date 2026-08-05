require('dotenv').config({ path: '../../.env' });
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const ProfileScraper = require('../models/ProfileScraper');

// 1. Setup DB Connection
async function runTest() {
  try {
    console.log('Connecting to database for Profiles test...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // 2. Create a mock excel file with Profiles
    const mockData = [
      ['Campaign Profile Targets', 'Contact Info', 'Notes'],
      ['https://www.facebook.com/profile.php?id=1000123', 'profile1@test.com', 'Primary candidate profile'],
      ['Invalid Link without dot', 'No Info', 'Ignore me'],
      ['facebook.com/user_profile_name', 'admin@profile.com', 'Should be parsed & prefixed with https://'],
      ['Some other random text', 'http://profile-link.com/home', 'Matches general HTTP link']
    ];

    // Create sheet
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.aoa_to_sheet(mockData);
    xlsx.utils.book_append_sheet(wb, ws, 'Profiles');

    const tempFilePath = path.join(__dirname, 'mock_profile_targets.xlsx');
    xlsx.writeFile(wb, tempFilePath);
    console.log('✅ Created mock Excel file at:', tempFilePath);

    // 3. Run parsing logic (replicated from our controller)
    const workbook = xlsx.readFile(tempFilePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length === 0) {
      throw new Error('Excel file is empty');
    }

    const headers = jsonData[0].map(h => (h || '').toString().toLowerCase().trim());
    let urlIndex = -1;
    let contactIndex = -1;
    let notesIndex = -1;

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (h.includes('profile') || h.includes('url') || h.includes('link') || h.includes('target') || h.includes('facebook') || h.includes('user') || h.includes('member')) {
        if (urlIndex === -1) urlIndex = i;
      } else if (h.includes('contact') || h.includes('email') || h.includes('phone') || h.includes('info')) {
        if (contactIndex === -1) contactIndex = i;
      } else if (h.includes('notes') || h.includes('note') || h.includes('desc') || h.includes('comment')) {
        if (notesIndex === -1) notesIndex = i;
      }
    }

    if (urlIndex === -1) urlIndex = 0;
    if (contactIndex === -1 && headers.length > 1) contactIndex = 1;
    if (notesIndex === -1 && headers.length > 2) notesIndex = 2;

    console.log(`Detected columns: Url index: ${urlIndex}, Contact info index: ${contactIndex}, Notes index: ${notesIndex}`);

    const records = [];
    const dummyUserId = new mongoose.Types.ObjectId(); // Create a temp ObjectId for testing

    const isMaybeUrl = (str) => {
      if (!str) return false;
      if (/\s/.test(str)) return false;
      if (!str.includes('.')) return false;
      return true;
    };

    for (let r = 1; r < jsonData.length; r++) {
      const row = jsonData[r];
      if (!row || row.length === 0) continue;

      let rawUrl = (row[urlIndex] || '').toString().trim();
      let contactInfo = contactIndex !== -1 && row[contactIndex] ? row[contactIndex].toString().trim() : '';
      let notes = notesIndex !== -1 && row[notesIndex] ? row[notesIndex].toString().trim() : '';

      // Fallback fallback checks
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

      let formattedUrl = rawUrl;
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl;
      }

      records.push({
        url: formattedUrl,
        contactInfo,
        notes,
        uploadedBy: dummyUserId
      });
    }

    // Clean up file
    fs.unlinkSync(tempFilePath);
    console.log('✅ Temporary file cleaned up');

    console.log('Parsed records:', records);

    // Save to Database
    if (records.length > 0) {
      // Clear previous records for test
      await ProfileScraper.deleteMany({ uploadedBy: dummyUserId });
      const saved = await ProfileScraper.insertMany(records);
      console.log(`✅ Successfully saved ${saved.length} records into Database:`);
      console.log(saved);

      // Verify fetch works
      const fetched = await ProfileScraper.find({ uploadedBy: dummyUserId });
      console.log(`✅ Verified fetch from database. Found: ${fetched.length} profile links`);
    } else {
      console.log('❌ No records parsed');
    }

  } catch (error) {
    console.error('❌ Error executing test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

runTest();
