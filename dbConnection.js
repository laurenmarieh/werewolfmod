require('dotenv').config();

// setup connection to postgres
module.exports = {
    db : new Client({
        user: process.env.PG_USER,
        host: process.env.HOST,
        database: process.env.PG_DB_NAME,
        password: process.env.PG_PW,
        port: 5432,
        })
};