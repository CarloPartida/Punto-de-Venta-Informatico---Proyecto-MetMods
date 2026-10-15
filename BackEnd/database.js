const mysql2 = require('mysql2/promise')

require('dotenv').config();

async function conexion(){
    const db = await mysql2.createConnection({ 
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT)
    });
    return db;
}
    
module.exports = conexion;