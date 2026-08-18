const express = require('express');
const { register, login, getMe, getAllUsers, deleteUser, changeUserPassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/users', protect, authorize('admin'), getAllUsers);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);
router.put('/users/:id/password', protect, authorize('admin'), changeUserPassword);

module.exports = router;
