const {Router} = require('express')
const router = Router()

router.get('/', (req, res) => {
  res.render('onus', {
    title: 'ONUs - Avest Network',
    isHome: true,
    isOnus: true
  })
})

router.get('/onus/signals', (req, res) => {
  res.render('onus_signal', {
    title: 'ONUs signals - Avest Network',
    isOnusSignals: true    
  })
})


module.exports = router