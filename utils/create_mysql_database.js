
//using for creating database once

require('dotenv').config();

const Sequilize = require('sequelize');

const seq = new Sequilize("",
    process.env.MYSQL_USER_NAME, process.env.MYSQL_PASSWORD, {
        host: process.env.MYSQL_HOST,
        dialect: 'mysql'
});

seq.query(`CREATE DATABASE IF NOT EXISTS ${process.env.MYSQL_DB_NAME};`);      