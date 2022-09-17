const UserDb = require('./db_user');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = {
    getAllUsers : async function() {        
        try {
            const _users = await UserDb.findAll()
            if (_users === undefined) return undefined;
            
            return _users.map(val => {
                return {
                    userId : val.id,
                    name : val.name,
                    role : val.role
                }     
            });
        } catch(e) {
            logger.error('creating user', e);
            return undefined;
        }        
    },


    addUser : async function(user) {       
        if (user.name.toString().length === 0) return false;
        if (!(user.role.toString() === 'admin' ||
            user.role.toString() === 'user')) return false;
        if (user.password.toString().length === 0) return false;

        //password hash
        const salt = bcrypt.genSaltSync(+process.env.PWD_SALT_ROUNDS);
        const hash = bcrypt.hashSync(user.password, salt);    

        console.log(user);
        try {
            const _user = await UserDb.create({
                name : user.name,
                role : user.role,
                password : hash
            })
            if (_user === undefined) return false;            
        } catch(e) {
            logger.error('creating user', e);
            return false;
        }
        return true;
    },

    removeUser : async function(userId) {        
        try {
            const _user = await UserDb.findByPk(userId);
            await _user.destroy();         
        } catch(e) {
            logger.error('removing user', e);
            return false;
        }
        return true;
    },

    login : async function(user) {
        try {
            if (user.name.toString().length === 0) return null;
            if (user.password.toString().length === 0) return null;

            let candidate = null;

            if (user.name == process.env.SUPERADMIN_NAME ||
                user.password == process.env.SUPERADMIN_PASSWORD) {
                    candidate = {
                        id : 0,
                        name : user.name,
                        password : user.password,
                        role : 'admin'
                    }
                
            } else {
                candidate = await UserDb.findOne({where : { name : user.name }});
                if (candidate === null) {
                    return null;
                }

                if (!bcrypt.compareSync(user.password, candidate.password)) {
                    return null;
                }
            }

            //generate web-token
            const data = {
                id : candidate.id,
                name : candidate.name,
                role : candidate.role
            };

            return jwt.sign({data}, process.env.PWD_JWT_SIGNATURE,
                {expiresIn : '30 days'});

        } catch(e) {
            logger.error('login user', e);
            return undefined;
        }
        
    }
}