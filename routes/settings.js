const {Router} = require('express');
const router = Router();
const logger = require('../utils/logger');

router.get('/olts', (req, res) => {
  if (!res.locals.isAdmin) return res.redirect('/login');
  res.render('settings_olts', {
    title: 'OLTs - Avest Network',
    isSettingsOlts: true
  })
});

router.get('/users', (req, res) => {
  if (!res.locals.isAdmin) return res.redirect('/login');
  res.render('settings_users', {
    title: 'Пользователи - Avest Network',
    isSettingsUsers: true
  })
});

router.get('/log', (req, res) => {
    if (!res.locals.isAdmin) return res.redirect('/login');
    let logErrors = logger.getLog().toString();
    let dataLog = logErrors.split('\n\n\n').reverse();    
    res.render('settings_log', {
      title: 'Журнал ошибок - Avest Network',
      isSettingsLog: true,
      dataLog: dataLog
    })
  })


module.exports = router