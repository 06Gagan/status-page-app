const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => {
            let msg = err.msg;
            if (err.path) {
                msg = `${err.path}: ${msg}`;
            }
            return msg;
        });
        return next(ApiError.badRequest(errorMessages.join('; ')));
    }
    next();
};

module.exports = {
    handleValidationErrors
};
