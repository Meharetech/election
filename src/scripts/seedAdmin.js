const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: '../../.env' });

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/election');
    console.log('MongoDB Connected for seeding admin...');

    const adminIdentifier = 'admin';
    const exists = await User.findOne({ email: adminIdentifier });

    if (exists) {
      console.log('Admin already exists. Updating password...');
      exists.password = 'admin123';
      exists.role = 'admin';
      await exists.save();
      console.log('Admin updated successfully.');
    } else {
      await User.create({
        name: 'Administrator',
        email: adminIdentifier,
        password: 'admin123',
        role: 'admin'
      });
      console.log('Admin created successfully with username: admin and password: admin123');
    }

    process.exit();
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
};

seedAdmin();
