fs = require('fs');
path = require('path');

module.exports = {
    error : function(category, e) {
        console.log(e);
        
        let msg = new Date().toLocaleString().
                            replace(/T/, ' ').      // replace T with a space
                            replace(/\..+/, '');
        msg += " : [" + category.toUpperCase() + "] : " + e.stack + '\n\n\n';
        
        if (!fs.existsSync(path.join(process.cwd(), "logs"))){
            fs.mkdirSync(path.join(process.cwd(), "logs"));
        }
        fs.appendFile(path.join(process.cwd(), "logs", "errors.log"), msg, (err) => {});
    },

    getLog : function() {
        if (!fs.existsSync(path.join(process.cwd(), "logs", "errors.log"))) {
            return "";
        }
        return fs.readFileSync(path.join(process.cwd(), "logs", "errors.log"));
    }
}