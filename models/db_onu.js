const Sequelize = require('sequelize');
const sequelize = require('../utils/dababase');

const onuDb = sequelize.define('onu', {
    ipOlt : {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false
    },
    portId : {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false
    },
    onuId : {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false
    },
    mac : {
        type: Sequelize.STRING,
        allowNull: true
    },
    name : {
        type: Sequelize.STRING,
        allowNull: true
    },
    ipAddress : {
        type: Sequelize.STRING,
        allowNull: true
    },
    customMac : {
        type: Sequelize.STRING,
        allowNull: true
    },
    customName : {
        type: Sequelize.STRING,
        allowNull: true
    },
    customIpAddress : {
        type: Sequelize.STRING,
        allowNull: true
    },
    lastStatus : {
        type: Sequelize.SMALLINT,
        allowNull: true
    },
    lastRxPower : {
        type: Sequelize.REAL,
        allowNull: true
    },
    countOffline : {
        type: Sequelize.BIGINT,
        allowNull: true
    },
    countAlarm : {
        type: Sequelize.BIGINT,
        allowNull: true
    },
    lastOnline : {
        type: Sequelize.DATE,
        allowNull: true
    },
    lastOffline : {
        type: Sequelize.DATE,
        allowNull: true
    },
    lastAlarm : {
        type: Sequelize.DATE,
        allowNull: true
    }
});

module.exports = onuDb;