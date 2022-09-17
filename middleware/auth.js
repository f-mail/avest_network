const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    if (req.path === '/login') {        
        return next();
    }
    
    if (!req.cookies.authToken) 
        return res.redirect('/login');

    try {
        let decoded = jwt.verify(req.cookies.authToken, process.env.PWD_JWT_SIGNATURE);
        if (!decoded) throw 'invalid token';        
        res.locals.isAuth = true;
        res.locals.userName = decoded.data.name;
        res.locals.role = decoded.data.role;        
        if (decoded.data.role == 'admin')
            res.locals.isAdmin = true;
        next();

    } catch(e) {
        logger.error('verifying jwt token', e);
        return res.redirect('/login');
    }
  }