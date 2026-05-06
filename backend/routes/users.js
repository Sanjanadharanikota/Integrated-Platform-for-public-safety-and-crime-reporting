// backend/routes/users.js
const express = require('express');
const { getUsers, updateUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('Admin'));

router.route('/')
    .get(getUsers);

router.route('/:id')
    .put(updateUser);

module.exports = router;
