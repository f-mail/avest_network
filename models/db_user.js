const Sequelize = require('sequelize');
const sequelize = require('../utils/dababase');

const userDb = sequelize.define('user', {
    id : {
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        type: Sequelize.INTEGER
    },
    name : {
        type: Sequelize.STRING,        
        allowNull: false
    },
    role : {
        type: Sequelize.STRING,        
        allowNull: false
    },
    password : {
        type: Sequelize.STRING,        
        allowNull: false 
    }    
});

module.exports = userDb;