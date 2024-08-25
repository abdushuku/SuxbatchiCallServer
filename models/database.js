import pkg from "pg";
const {Pool} = pkg
import dotenv from 'dotenv'
dotenv.config() 

const db = new Pool({
    connectionString: process.env.DATABASE_PUBLIC_URL
})

// console.log(db);


export default  db;