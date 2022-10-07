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
        
        var filePath = path.join(process.cwd(), "logs", "errors.log");
        var stats = fs.statSynch(filePath);
        var fileSizeInBytes = stats.size;
        if (fileSizeInBytes > (1024 * 1024))
            fs.unlinkSync(filePath)

        fs.appendFile(filePath, msg, (err) => {});
    },

    getLog : function() {
        if (!fs.existsSync(path.join(process.cwd(), "logs", "errors.log"))) {
            return "";
        }
        return fs.readFileSync(path.join(process.cwd(), "logs", "errors.log"));
    }
}