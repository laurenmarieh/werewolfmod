require('dotenv').config();
const { Client } = require('pg');

// setup connection to postgres
module.exports = {
    db: new Client({
        user: process.env.PG_USER,
        host: process.env.PG_HOST,
        database: process.env.PG_DB_NAME,
        password: process.env.PG_PW,
        port: process.env.PG_PORT
    })
};
