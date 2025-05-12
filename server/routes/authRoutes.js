const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { 
    validateRegistration, 
    validateLogin,
    validateProfileUpdate,
    validatePasswordUpdate 
} = require('../middleware/validators');
const { handleValidationErrors } = require('../middleware/validateRequest');

router.post(
    '/register', 
    validateRegistration, 
    handleValidationErrors, 
    authController.register
);

router.post(
    '/login', 
    validateLogin, 
    handleValidationErrors, 
    authController.login
);

router.get(
    '/profile', 
    authenticateToken, 
    authController.getProfile
);

router.put(
    '/profile', 
    authenticateToken, 
    validateProfileUpdate, 
    handleValidationErrors, 
    authController.updateProfile
);

router.put(
    '/profile/password', 
    authenticateToken, 
    validatePasswordUpdate, 
    handleValidationErrors, 
    authController.updatePassword
);

module.exports = router;