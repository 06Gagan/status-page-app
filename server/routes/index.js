// status-page-app/server/routes/index.js
const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const organizationRoutes = require('./organizationRoutes');
const teamRoutes = require('./teamRoutes');
const serviceRoutes = require('./serviceRoutes');
const incidentRoutes = require('./incidents'); 
const userRoutes = require('./userRoutes');

router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/teams', teamRoutes);
router.use('/services', serviceRoutes);
router.use('/incidents', incidentRoutes);
router.use('/users', userRoutes);

module.exports = router;