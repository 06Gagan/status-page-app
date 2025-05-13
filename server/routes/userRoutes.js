// status-page-app/server/routes/userRoutes.js
const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.get(
    '/',
    authenticateToken,
    authorizeRole(['admin']), // Only admins can get the full user list
    userController.getAllUsersInOrg
);

module.exports = router;