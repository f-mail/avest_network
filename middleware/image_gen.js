const ImageGenerator = require('../utils/image_generator');
const logger = require('../utils/logger');
const OltStatus = require('../models/oltStatus');

module.exports = async function(req, res, next) {    
    if (req.path === '/img/onu_status.png') {
        let baseInfo = null;
        try {
            oltStatus = new OltStatus();
            baseInfo = await oltStatus.getBaseInfo();
        } catch(e) {
            baseInfo = null;
            logger.error("saving image file (onu status)", e);
        }

        try {  
            let txt = 'no data';
            if (baseInfo !== null) txt = `${baseInfo.onusOffline} off / ${baseInfo.onusAmount}`          
            await ImageGenerator.genText(txt);
        } catch(e) {
            logger.error("saving image file (onu status)", e);
        }
    }  
    return next();  
  }