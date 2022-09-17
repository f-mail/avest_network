const Olt = require('./olt');
const fs = require('fs');
const path = require('path');
const sequelize = require('../utils/dababase');
const logger = require('../utils/logger');
const debuggerUtils = require('../debug/debugger_utils');
const OnuDb = require('./db_onu');



class OltsStatus {   
    constructor() {
        //singleton
        const instance = this.constructor.instance;
        if (instance) {
            return instance;
        }
        this.constructor.instance = this;

        this.init();
    }    
    
    init() {        
        this.status = {
            olts : []
        };
        //load config olt
        try {            
            this.oltsConf = this.getOltsConfig();           

            for(let oltConf of this.oltsConf) {
                this.status.olts.push(new Olt(oltConf.ipAddress, oltConf.vendorId, oltConf.ponAmount));
            }
        } catch(e) {
            logger.error('loading olt config', e);
        }
    } 

    getOltsConfig() {
        return JSON.parse(
            fs.readFileSync(path.join(process.cwd(), "config", "olts.json")));    
    }

    saveOltConfig(oltConfig) {
        fs.writeFile(path.join(process.cwd(), "config", "olts.json"),
            JSON.stringify(oltConfig, null, '\t'), (err) => {
                if (err) logger.error('writing olt config file', err);
                this.init();
            });
    }

    deleteOltConfig(ipAddress) {
        try {
            let config = this.getOltsConfig();
            config = config.filter(olt => olt.ipAddress.toString().trim()
                !== ipAddress.toString().trim());
            this.saveOltConfig(config);
            return true;
        } catch (e) {
            logger.error('deleting olt config', e);
            return false;
        }
    }

    addOltConfig(olt) {
        try {
            let config = this.getOltsConfig();
            config.push(olt);
            this.saveOltConfig(config);
            return true;
        } catch (e) {
            logger.error('add olt config', e);
            return false;
        }
    }
    
    debugGetBaseInfoFromJson(ms) {
        return new Promise((resolve, reject) => {
             setTimeout(resolve(debuggerUtils.loadJsonFromFile('baseInfo.json')), 1500)             
        });
    } 

    async getBaseInfo() {
        this.onusDb = undefined;

        if (process.env.NODE_ENV == 'debug') {            
            const res = await Promise.allSettled([this.loadCacheDb(),
                this.debugGetBaseInfoFromJson()]);
            if (res[0].status == 'fulfilled') {
                this.onusDb = res[0].value;
            } else {
                logger.error('read onus data from database', res[0].reason);  
            }

            if (res[1].status == 'fulfilled') {
                this.status = res[1].value;
            } else {
                logger.error('getting olt base info', res[1].reason);  
                throw res[1].reason;                                
            }
            
            this.fromCacheDb();            
            return this.status;
        }  
        
        //production
        const res = await Promise.allSettled([this.loadCacheDb(),
            this.refreshBaseInfo()]);
        if (res[0].status == 'fulfilled') {
            this.onusDb = res[0].value;
        } else {
            logger.error('read onus data from database', res[0].reason);  
        }

        if (res[1].status == 'fulfilled') {
            this.status = res[1].value;
        } else {
            logger.error('fetching onus base info', res[1].reason);  
            throw res[1].reason;                                
        }
        
        this.fromCacheDb();            
        return this.status;            
    }

    async getExtendedInfo(numOlt) {
        if (process.env.NODE_ENV == 'debug') {
            await this.timeout(1000);
            this.status = debuggerUtils.loadJsonFromFile(`extInfo_${numOlt}.json`);            
            this.toCacheDb(numOlt);
            this.fromCacheDb();
            return this.status;
        }

        await this.refreshExtraInfo(numOlt);
        this.toCacheDb(numOlt);
        this.fromCacheDb();
        return this.status;
    }

    async getPortsInfo(numOlt) {
        if (process.env.NODE_ENV == 'debug') {
            await this.timeout(3000);
            return debuggerUtils.loadJsonFromFile(`portsInfo_${numOlt}.json`);
        }

        await this.refreshPortsInfo(numOlt);
        return this.status;
    }    

    async refreshBaseInfo() {        
        for(let olt of this.status.olts) {
            await olt.refreshBaseInfo();
        }
        this.refreshStatus();
        return this.status;
    }


    async refreshExtraInfo(numOlt) {
        if (numOlt < 0) return;
        if (numOlt < this.status.olts.length) {
            await this.status.olts[numOlt].refreshExtendedInfo();
        }        
    }

    async refreshPortsInfo(numOlt) {
        if (numOlt < 0) return;
        if (numOlt < this.status.olts.length) {
            await this.status.olts[numOlt].refreshPortsInfo();
        }        
    }

    async rebootOnu(numOlt, portId, onuId) {
        if (process.env.NODE_ENV == 'debug') {
            await this.timeout(1000);            
            return true;
        }
        
        const res = await this.status.olts[numOlt].rebootOnu(portId, onuId)        
        return res;
    }

    refreshStatus() {
        this.status.onusAmount = 0;
        this.status.onusOnline = 0;
        this.status.onusOffline = 0;
        for(let olt of this.status.olts) {
            olt.onusBad = 0;
            for (let port of olt.ports) {
                for (let onu of port.onus) {
                    this.status.onusAmount++;
                    if (onu.status === 1) this.status.onusOnline++;
                    if (onu.status === 2) { this.status.onusOffline++; olt.onusBad++ }
                    if (onu.status === 3) { this.status.onusAlarm++; olt.onusBad++ }
                }
            }
        }
    }

    loadCacheDb() {        
        return OnuDb.findAll();
    }

    fromCacheDb() {
        if (this.onusDb === undefined) return;

        for(let i = 0; i < this.status.olts.length; i++) {  
            let olt = this.status.olts[i];          
            for(let j = 0; j < olt.ports.length; j++) {
                for(let k = 0; k < olt.ports[j].onus.length; k++) {
                    let onu = this.status.olts[i].ports[j].onus[k];
                    const onuCache = this.onusDb.find((val, num, obj) => {                       
                        return (val.ipOlt.toString() === olt.ipAddress.toString() &&
                        val.portId.toString() === onu.portId.toString() &&
                        val.onuId.toString() === onu.onuId.toString())
                    });
                    if (onuCache === undefined) continue;
                    
                    //mac from cache
                    if (onu.mac === undefined) onu.mac = "";
                    if (onuCache.mac === undefined || onuCache.mac === null)
                        onuCache.mac = "";                    

                    if (onu.mac.toString().trim().length === 0) {
                        onu.mac = onuCache.mac;                        
                    }
                    
                    //name from cache
                    //first - use custom name (if custom mac identity)
                    if (onu.name === undefined) onu.name = "";
                    if (onuCache.name === undefined || onuCache.name === null)
                        onuCache.name = "";
                    if (onuCache.customMac === undefined || onuCache.customMac === null)
                        onuCache.customMac = "";
                    if (onuCache.customName === undefined || onuCache.customName === null)
                        onuCache.customName = "";
                    
                    if (onu.mac === onuCache.mac && onuCache.customName.toString().length > 0) {
                        onu.name = onuCache.customName;
                    } else {
                        if (onu.name.toString().length === 0)
                            onu.name = onuCache.name;
                    }

                    //ip from cache
                    //first - use custom name (if custom mac identity)
                    if (onu.ipAddress === undefined) onu.ipAddress = "";
                    if (onuCache.ipAddress === undefined || onuCache.ipAddress === null)
                        onuCache.ipAddress = "";
                    if (onuCache.customIpAddress === undefined || onuCache.customIpAddress === null)
                        onuCache.customIpAddress = "";                    
                    
                    if (onu.mac === onuCache.mac && onuCache.customIpAddress.toString().length > 0) {
                        onu.ipAddress = onuCache.customIpAddress;
                    } else {
                        if (onu.ipAddress.toString().length === 0)
                            onu.ipAddress = onuCache.ipAddress;
                    } 
                }
            }
        }
    }
    
    async toCacheDb(numOlt) {
        const olt = this.status.olts[numOlt];
        for (let port of olt.ports) {
            for (let onu of port.onus) {
                if (onu.name === undefined) onu.name = "";                
                if (onu.mac === undefined) continue;                
                if (onu.mac.trim().length === 0) continue;

                try {                    
                    const _onuCandidate = await OnuDb.findOne({where : {
                        ipOlt: olt.ipAddress,
                        portId: onu.portId,
                        onuId: onu.onuId
                    }});

                    if (!_onuCandidate) {
                        const _onuCreate = await OnuDb.create({
                        ipOlt: olt.ipAddress,
                        portId: onu.portId,
                        onuId: onu.onuId,
                        mac: onu.mac,
                        name: onu.name,
                        lastStatus: onu.status,
                        lastRxPower: onu.rxPower
                        });                        
                    }
                    else {
                        const _onuUpdate = await OnuDb.update({
                            mac: onu.mac,
                            name: onu.name,
                            lastStatus: onu.status,
                            lastRxPower: onu.rxPower
                        }, { where: {
                            ipOlt: olt.ipAddress,
                            portId: onu.portId,
                            onuId: onu.onuId, 
                        }})    
                    }
                } catch(e) {
                    logger.error('saving to database onus data', e);
                }

            }
        }
        
    }

    async saveCustomDb(data) {
        try {                    
            const _onuCandidate = await OnuDb.findOne({where : {
                ipOlt: data.oltIpAddress,
                portId: data.portId,
                onuId: data.onuId
            }});
            if (_onuCandidate === undefined) {
                logger.error('save custom data to database',
                     `not find onu candidate [${data.oltIpAddress}, ${data.portId}, ${data.oltId}]`);
                return false;
            }
        } catch (e) {
            logger.error('saving custom data to database', e);
            return false;
        }

        //update
        try {
            const _onuUpdate = await OnuDb.update({
                customMac: data.onuMac,
                customName: data.onuName,
                customIpAddress: data.onuIpAddress                
            }, { where: {
                ipOlt: data.oltIpAddress,
                portId: data.portId,
                onuId: data.onuId
            }});
            return _onuUpdate[0] > 0;            
        } catch (e) {
            logger.error('saving custom data to database', e);
            return false;
        }
    }

    timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = OltsStatus;