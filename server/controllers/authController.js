// status-page-app/server/controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const DEBUG_FORCED_EXPIRES_IN = '8h'; 
logger.info(`[authController] DEBUG: Forcing token expiration to: ${DEBUG_FORCED_EXPIRES_IN}`);


exports.register = async (req, res, next) => {
    const { username, email, password, organizationName } = req.body;

    if (!username || !email || !password || !organizationName) {
        return next(ApiError.badRequest('Username, email, password, and organization name are required'));
    }

    try {
        const existingUserByEmail = await User.findByEmail(email);
        if (existingUserByEmail) {
            return next(ApiError.conflict('Email already in use.'));
        }
        
        const newUser = await User.createWithOrganizationAndTeam({
            username,
            email,
            password,
            organizationName,
            teamName: 'Default Team'
        });

        const userDetails = await User.findById(newUser.id); 
        if (!userDetails) {
            logger.error(`Failed to fetch details for newly registered user ID: ${newUser.id}`);
            return next(ApiError.internalServerError('User registration succeeded but failed to fetch user details.'));
        }

        const secretForSigning = process.env.JWT_SECRET;
        logger.info(`[authController.register] DEBUG: Actual JWT_SECRET used for signing: "${secretForSigning}"`); 
        if (!secretForSigning || secretForSigning.length < 16 || secretForSigning === 'your-super-secret-jwt-key-change-this-in-production') {
            logger.error("[authController.register] CRITICAL: JWT_SECRET is missing, placeholder, or too short. CANNOT SIGN TOKEN.");
            return next(ApiError.internalServerError('Server configuration error preventing token signing.'));
        }

        const token = jwt.sign(
            { userId: userDetails.id, organizationId: userDetails.organization_id, role: userDetails.role },
            secretForSigning,
            { expiresIn: DEBUG_FORCED_EXPIRES_IN }
        );
        logger.info(`[authController.register] Token generated for user ${userDetails.email}. DEBUG_TOKEN_SIGNED: "${token}"`);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: userDetails.id,
                username: userDetails.username,
                email: userDetails.email,
                organization_id: userDetails.organization_id,
                organization_name: userDetails.organization_name,
                organization_slug: userDetails.organization_slug,
                role: userDetails.role,
            }
        });
    } catch (error) {
        logger.error(`Registration error: ${error.message}`, { stack: error.stack, username, email, organizationName });
        if (error.message && error.message.toLowerCase().includes('already exist')) {
             return next(ApiError.conflict(error.message));
        }
        next(ApiError.internalServerError('Error registering user. Please try again later.'));
    }
};

exports.login = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(ApiError.badRequest('Email and password are required'));
    }

    try {
        const user = await User.findByEmail(email); 
        if (!user) {
            return next(ApiError.unauthorized('Invalid credentials.'));
        }

        const isMatch = await User.comparePassword(password, user.password_hash); 
        if (!isMatch) {
            return next(ApiError.unauthorized('Invalid credentials.'));
        }
        
        const userDetails = await User.findById(user.id); 
        if (!userDetails || !userDetails.organization_id) { 
             logger.error(`User ${user.id} logged in, but full details (like organization_id) are missing after fetching by ID.`);
             return next(ApiError.internalServerError('User account configuration error during login (missing details).'));
        }

        const secretForSigning = process.env.JWT_SECRET;
        logger.info(`[authController.login] DEBUG: Actual JWT_SECRET used for signing: "${secretForSigning}"`);
        if (!secretForSigning || secretForSigning.length < 16 || secretForSigning === 'your-super-secret-jwt-key-change-this-in-production') {
            logger.error("[authController.login] CRITICAL: JWT_SECRET is missing, placeholder, or too short. CANNOT SIGN TOKEN.");
            return next(ApiError.internalServerError('Server configuration error preventing token signing.'));
        }

        const token = jwt.sign( 
            { userId: userDetails.id, organizationId: userDetails.organization_id, role: userDetails.role },
            secretForSigning,
            { expiresIn: DEBUG_FORCED_EXPIRES_IN }
        );
        logger.info(`[authController.login] Token generated for user ${userDetails.email}. DEBUG_TOKEN_SIGNED: "${token}"`);
        
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: userDetails.id,
                username: userDetails.username,
                email: userDetails.email,
                organization_id: userDetails.organization_id,
                organization_name: userDetails.organization_name,
                organization_slug: userDetails.organization_slug,
                role: userDetails.role,
            }
        });
    } catch (error) {
        logger.error('Login error:', {message: error.message, stack: error.stack});
        next(ApiError.internalServerError('Error logging in. Please try again later.'));
    }
};

exports.getProfile = async (req, res, next) => {
    try {
        const userId = req.user.userId; 
        const user = await User.findById(userId); // Your User.findById should ideally join with Organizations to get name/slug
        if (!user) {
            return next(ApiError.notFound('User not found.'));
        }
        // These were from your original getProfile, ensure models support them
        // const teams = await Team.findTeamsByUserId(userId); 
        // const services = await Service.findAllByOrganizationId(user.organization_id);

        res.status(200).json({
            id: user.id,
            username: user.username,
            email: user.email,
            organization_id: user.organization_id,
            organization_name: user.organization_name, // Comes from User.findById joining Organizations
            organization_slug: user.organization_slug, // Comes from User.findById joining Organizations
            role: user.role,
            created_at: user.created_at,
            // teams: teams || [], // Add back if Team model is imported and findTeamsByUserId exists
            // services: services || [] // Add back if Service model is imported and findAllByOrganizationId exists
        });
    } catch (error) {
        logger.error(`Get profile error: ${error.message}`, { code: error.code, stack: error.stack, userId: req.user?.userId });
        next(ApiError.internalServerError('Error fetching profile.'));
    }
};

// updateProfile and updatePassword as previously provided (they were generally fine)
exports.updateProfile = async (req, res, next) => {
    const userId = req.user.userId;
    const { username, email } = req.body;
    if (!username && !email) {
        return next(ApiError.badRequest('No fields to update. Provide username or email.'));
    }
    try {
        const updatedUser = await User.updateProfile(userId, { username, email });
        if (!updatedUser) {
            return next(ApiError.notFound('User not found or update failed.'));
        }
        const userDetails = await User.findById(updatedUser.id);
        if (!userDetails) {
             logger.error(`Failed to fetch details for updated user ID: ${updatedUser.id}`);
            return next(ApiError.internalServerError('Profile update succeeded but failed to fetch updated user details.'));
        }
        res.status(200).json({
            message: 'Profile updated successfully.',
            user: {
                id: userDetails.id,
                username: userDetails.username,
                email: userDetails.email,
                organization_id: userDetails.organization_id,
                organization_name: userDetails.organization_name,
                organization_slug: userDetails.organization_slug,
                role: userDetails.role,
            }
        });
    } catch (error) {
        logger.error(`Update profile error for user ${userId}:`, {message: error.message, stack: error.stack});
        if (error.message.includes('already taken') || error.message.includes('already exists')) {
            return next(ApiError.conflict(error.message));
        }
        next(ApiError.internalServerError('Error updating profile.'));
    }
};

exports.updatePassword = async (req, res, next) => {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return next(ApiError.badRequest('Current password and new password are required.'));
    }
    if (newPassword.length < 6) { 
        return next(ApiError.badRequest('New password must be at least 6 characters long.'));
    }
    try {
        const userForHash = await User.findByEmail(req.user.email); 
        if (!userForHash || !userForHash.password_hash) {
            const userWithSensitiveData = await User.findByEmail(req.user.email); 
             if(!userWithSensitiveData || !userWithSensitiveData.password_hash) {
                logger.error(`Could not retrieve password hash for user ${userId} during password update.`);
                return next(ApiError.internalServerError('Could not verify current password.'));
            }
             const isMatch = await User.comparePassword(currentPassword, userWithSensitiveData.password_hash);
            if (!isMatch) {
                return next(ApiError.unauthorized('Incorrect current password.'));
            }
        } else {
            const isMatch = await User.comparePassword(currentPassword, userForHash.password_hash);
            if (!isMatch) {
                return next(ApiError.unauthorized('Incorrect current password.'));
            }
        }
        await User.updatePassword(userId, newPassword);
        res.status(200).json({ message: 'Password updated successfully.' });
    } catch (error) {
        logger.error(`Update password error for user ${userId}:`, {message: error.message, stack: error.stack});
        next(ApiError.internalServerError('Error updating password.'));
    }
};