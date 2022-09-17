require('dotenv').config();

const express = require('express');
const path = require('path');
const handlebars = require('express-handlebars');
const cookieParser = require('cookie-parser');
const sequelize = require('./utils/dababase');

const onusRoutes = require('./routes/onus');
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const apiOnusRoutes = require('./routes/api_onus');
const apiSettingsRoutes = require('./routes/api_settings');

const authMiddleware = require('./middleware/auth');
const genImageMiddleware = require('./middleware/image_gen')

const app = express();
const hbs = handlebars.create({
    defaultLayout: 'main',
    extname: 'hbs'
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', 'views');

app.use(genImageMiddleware);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(authMiddleware);

app.use('/', onusRoutes);
app.use('/', authRoutes);
app.use('/settings', settingsRoutes);
app.use('/api/onus', apiOnusRoutes);
app.use('/api/settings', apiSettingsRoutes);


const PORT = process.env.HTTP_SERVER_PORT || 3000;

async function start() {
    try {    
      await sequelize.sync();
      app.listen(PORT, async () => {
        console.log(`Server is running on port ${PORT}`);       

      })
    } catch (e) {
      console.log(e);
    }
  }
  
  start();