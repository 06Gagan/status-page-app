const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Team = require('../models/Team');
const Service = require('../models/Service');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

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


        const token = jwt.sign(
            { userId: userDetails.id, organizationId: userDetails.organization_id, role: userDetails.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );

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
             logger.error(`User ${user.id} logged in but has no organization_id or org details missing post-fetch.`);
             return next(ApiError.internalServerError('User account configuration error during login.'));
        }

        const token = jwt.sign(
            { userId: userDetails.id, organizationId: userDetails.organization_id, role: userDetails.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );
        
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
        const user = await User.findById(userId);

        if (!user) {
            return next(ApiError.notFound('User not found.'));
        }

        const teams = await Team.findTeamsByUserId(userId);
        // Ensure user.organization_id is valid before fetching services
        let services = [];
        if (user.organization_id) {
            services = await Service.findAllByOrganizationId(user.organization_id);
        } else {
            logger.warn(`User ${userId} has no organization_id in getProfile, services will be empty.`);
        }


        res.status(200).json({
            id: user.id,
            username: user.username,
            email: user.email,
            organization_id: user.organization_id,
            organization_name: user.organization_name,
            organization_slug: user.organization_slug,
            role: user.role,
            created_at: user.created_at,
            teams: teams,
            services: services
        });
    } catch (error) {
        logger.error(`Get profile error: ${error.message}`, { code: error.code, stack: error.stack });
        next(ApiError.internalServerError('Error fetching profile.'));
    }
};


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
        const userForHash = await User.findByEmail(req.user.email); // Assuming req.user has email after auth
        if (!userForHash || !userForHash.password_hash) {
            // Fallback or error if email not on req.user or user not found by email.
            // This part needs req.user to have email from authenticateToken if not fetching full user object there.
            // For now, let's rely on User.findById in auth providing enough context,
            // or fetch the user with password hash explicitly.
            const userWithSensitiveData = await User.findByEmail(req.user.email); // Re-fetch user by a unique field to get hash
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

