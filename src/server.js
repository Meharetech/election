require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const fs = require('fs');
const path = require('path');

// Database & Filesystem Prep
connectDB();

// Tactical Directory Sync: Ensure critical mission vaults exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('🛡️  Operational Directory Synchronized: [uploads]');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for tactical flexibility
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// Load routes
const auth = require('./routes/auth');
const campaigns = require('./routes/campaigns');

// Mount routes
app.use('/api/auth', auth);
app.use('/api/campaigns', campaigns);

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Election Portal API is running...' });
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Tactical Error Handlers: Catching over-capacity deployments
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'MISSION_ABORTED: PAYLOAD_EXCEEDS_CAPACITY (Max 100MB)'
    });
  }
  res.status(500).json({ success: false, message: 'INTERNAL_CORE_ERROR' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
