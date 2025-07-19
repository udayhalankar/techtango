require('dotenv').config(); // Make sure to import dotenv here too

const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  max: 5,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 30000
});

module.exports = pool;


//Below is old DB setting
// const Pool = require("pg").Pool;

// const pool = new Pool ({
//         user: "postgres",
//         port: 5432,
//         password: "Test1234?",
//         host: "localhost",
//         database: "ttoct23",
//         dialect: "postgres",
//         pool: {
//             max: 5,
//             min: 0,
//             acquire: 30000,
//             idle: 10000
//         }
//     });

//     module.exports = pool;



