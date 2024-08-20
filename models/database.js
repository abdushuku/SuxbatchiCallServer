// import pkg from "pg";
// const {Pool} = pkg

// import dotenv from 'dotenv'
const {Pool} = require('pg')
require('dotenv').config()
// dotenv.config() 

const db = new Pool({
    // host: process.env.DB_HOST,
    // user: process.env.DB_USER,
    // database: process.env.DB_NAME,
    // password: process.env.DB_PASSWORD,
    // port: process.env.DB_PORT

    connectionString: process.env.DATABASE_PUBLIC_URL
})


module.exports = db;