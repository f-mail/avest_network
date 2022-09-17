const logger = require('../utils/logger');
const OltStatus = require('../models/oltStatus');
const ImageGenerator = require('../utils/image_generator');

const {Router} = require('express');
const router = new Router();


router.get('/base', async (req, res) => {    
    try {
        oltStatus = new OltStatus();
        let baseInfo = await oltStatus.getBaseInfo();
        res.status(200).json(baseInfo)
    } catch(e) {
        logger.error('GET API', e);
        res.status(500).json({
            message: 'Server error'
        })
    }
});

router.get('/ext/:num', async (req, res) => {    
    try {
        oltStatus = new OltStatus();
        let baseInfo = await oltStatus.getExtendedInfo(req.params.num);
        res.status(200).json(baseInfo)
    } catch(e) {
        logger.error('GET API', e);
        res.status(500).json({
            message: 'Server error'
        })
    }
});

router.get('/ports/:num', async (req, res) => {    
    try {
        oltStatus = new OltStatus();
        let baseInfo = await oltStatus.getPortsInfo(req.params.num);
        res.status(200).json(baseInfo)
    } catch(e) {
        logger.error('GET API', e);
        res.status(500).json({
            message: e.stack
        })
    }
});

router.post('/reboot', async (req, res) => {    
    try {
        oltStatus = new OltStatus();        
        let resultReboot = await oltStatus.rebootOnu(req.body.numOlt, req.body.portId, req.body.onuId);
        res.status(200).json(resultReboot)
    } catch(e) {
        logger.error('POST API', e);
        res.status(500).json({
            message: e.stack
        })
    }
});

router.post('/save', async (req, res) => {    
    try {
        oltStatus = new OltStatus();        
        let resultReboot = await oltStatus.saveCustomDb(req.body);
        res.status(200).json(resultReboot)
    } catch(e) {
        logger.error('POST API', e);
        res.status(500).json({
            message: e.stack
        })
    }
});

router.get('/onu_status_image', async (req, res) => {    
    try {        
        //res.set({'Content-Type': 'image/png'});
        res.status(500).json({
            message: 'Server error'
        })
        //res.send(ImageGenerator.genText('ddd'));
    } catch(e) {
        logger.error('GET API', e);
        res.status(500).json({
            message: 'Server error'
        })
    }
});

module.exports = router;