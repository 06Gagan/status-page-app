const { Pool } = require('pg');
require('dotenv').config(); // Ensures .env variables are loaded

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', (client) => {
    // console.log('New client connected to database pool');
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client in database pool', err);
    process.exit(-1); // Exit if the pool encounters a critical error
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool, // Export the pool itself if direct access is needed (e.g. for transactions)
};