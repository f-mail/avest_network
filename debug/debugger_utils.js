fs = require('fs');
path = require('path');
const logger = require('../utils/logger');

module.exports = {
    saveJsonToFile : function(data, fileName) {
        fs.writeFile(path.join(process.cwd(), "debug", fileName),
            JSON.stringify(data, null, '\t'), (err) => {if (err) logger.error('debug', err)});
    },

    loadJsonFromFile : function(fileName) {
        return JSON.parse(fs.readFileSync(path.join(process.cwd(), "debug", fileName)))
    },

    saveToFile : function(data, fileName) {
        fs.writeFile(path.join(process.cwd(), "debug", fileName),
            data, (err) => {if (err) logger.error('debug', err)});
    },
}