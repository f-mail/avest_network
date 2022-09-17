const logger = require('../utils/logger');
const OltStatus = require('../models/oltStatus');
const User = require('../models/user');

const {Router} = require('express');
const router = new Router();


router.get('/olts', async (req, res) => {
    if (!res.locals.isAdmin) return res.redirect('/login');
    try {
        oltStatus = new OltStatus();
        let oltsConfig = oltStatus.getOltsConfig();
        res.status(200).json(oltsConfig);
    } catch(e) {
        logger.error('GET API', e);
        res.status(500).json({
            message: 'Server error'
        })
    }
});

router.post('/olt/add', async (req, res) => {
    if (!res.locals.isAdmin) return res.redirect('/login');
    try {
        oltStatus = new OltStatus();        
        let resOperation = await oltStatus.addOltConfig(req.body);
        res.status(200).json(resOperation);
    } catch(e) {
        logger.error('POST API', e);
        res.status(500).json({
            message: e.stack
        })
    }
});

router.post('/olt/remove', async (req, res) => {
    if (!res.locals.isAdmin) return res.redirect('/login');
    try {
        oltStatus = new OltStatus();        
        let resOperation = await oltStatus.deleteOltConfig(req.body.ipAddress);
        res.status(200).json(resOperation);
    } catch(e) {
        logger.error('POST API', e);
        res.status(500).json({
            message: e.stack
        })
    }
});


router.get('/users', async (req, res) => {
    if (!res.locals.isAdmin) return res.redirect('/login');
    try {        
        let _users = await User.getAllUsers();
        res.status(200).json(_users);
    } catch(e) {
        logger.error('GET API', e);
        res.status(500).json({
            message: 'Server error'
        })
    }
});

router.post('/user/add', async (req, res) => {
    if (!res.locals.isAdmin) return res.redirect('/login');
    try {               
        let resOperation = await User.addUser(req.body);
        res.status(200).json(resOperation);
    } catch(e) {
        logger.error('POST API', e);
        res.status(500).json({
            message: e.stack
        })
    }
});

router.post('/user/remove', async (req, res) => {
    if (!res.locals.isAdmin) return res.redirect('/login');
    try {
        let resOperation = await User.removeUser(req.body.userId);
        res.status(200).json(resOperation);
    } catch(e) {
        logger.error('POST API', e);
        res.status(500).json({
            message: e.stack
        })
    }
});

module.exports = router;