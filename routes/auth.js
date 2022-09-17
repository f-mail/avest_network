const {Router} = require('express')
const User = require('../models/user');
const router = Router()

router.get('/login', (req, res) => {
  res.render('login', {
    title: 'Вход в систему - Avest Network', 
    layout: false 
  })
});

router.post('/login', async (req, res) => {
    const resAuth = await User.login(req.body);
    if (resAuth === null) {
        res.status(200).json({
            status : 401
        })
    } else if (resAuth === undefined) {
        res.status(200).json({
            status : 500
        })
    } else {
        res.status(200).json({
            status : 200,
            token : resAuth
        })
    }
})

module.exports = router