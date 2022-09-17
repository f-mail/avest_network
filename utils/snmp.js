const snmp = require('net-snmp');
const logger = require('../utils/logger');

class SnmpHelper {
    constructor(ip_address) {
        this.ip_address = ip_address;
    }

    open(timeout = 5000, community = "public") {
        this.session = snmp.createSession (this.ip_address, community, {
            port: 161,
            retries: 1,
            timeout: timeout,
            backoff: 1.0,   
            trapPort: 162,
            version: snmp.Version1    
        });                
    }

    close() {
        this.session.close();
    }

    getSnmpVarbinds(oids) {
        return new Promise((res, rej) => {        	
            this.session.get(oids, function (error, varbinds) {
                if (error) {
                    rej(error);
                } else {                    
                    for (var i = 0; i < varbinds.length; i++) {
                        if (snmp.isVarbindError(varbinds[i]))
                            rej.error(snmp.varbindError(varbinds[i]));
                            
                    }
                    res(varbinds);
                }  
            })               
        });
    } 

    async getSnmpSingleVarbind(oid) {
        let oids = [ oid ]
        let res = await this.getSnmpVarbinds(oids);
        return res[0];        
    }

    async setSnmpIntegerValue(oid, value) {        
        return new Promise((res, rej) => { 
            let varbinds = [{
                oid: oid,
                type: snmp.ObjectType.Integer,
                value: value
            }]       	
            this.session.set(varbinds, function (error, varbinds) {
                if (error) {
                    rej(error);
                } else {    
                    // for version 1 we can assume all OIDs were successful                
                    return true;
                }  
            })               
        });
    }
}

module.exports = SnmpHelper;