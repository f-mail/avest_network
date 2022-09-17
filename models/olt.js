const SnmpHelper = require('../utils/snmp');
const Onu = require('./onu');
const logger = require('../utils/logger');

class Olt {
    constructor(ipAddress, vendorId, ponAmount) {
        this.ipAddress = ipAddress;
        this.vendorId = vendorId;
        this.ponAmount = 8;                
    }

    //define oids
    #oidOltModel = "1.3.6.1.4.1.{{vendorId}}.1.3.1.3.1.0";
    #oidOltRunStatus = "1.3.6.1.4.1.{{vendorId}}.1.3.1.5.1.5.0";
    #oidOltRunTime = "1.3.6.1.4.1.{{vendorId}}.1.3.1.5.1.6.0";
    #oidPortStatus = "1.3.6.1.4.1.{{vendorId}}.1.3.3.14.1.1.1.{{portId}}"; 
    #oidOnuName = "1.3.6.1.4.1.{{vendorId}}.1.3.4.1.1.4.1.{{portId}}.{{onuId}}"; 
    #oidOnuMac = "1.3.6.1.4.1.{{vendorId}}.1.3.4.1.1.7.1.{{portId}}.{{onuId}}";  
    #oidOnuDistance = "1.3.6.1.4.1.{{vendorId}}.1.3.4.1.1.13.1.{{portId}}.{{onuId}}"; 
    #oidOnuRxPower = "1.3.6.1.4.1.{{vendorId}}.1.3.4.1.1.36.1.{{portId}}.{{onuId}}";
    #oidOnuType = "1.3.6.1.4.1.{{vendorId}}.1.3.4.1.1.2.1.{{portId}}.{{onuId}}"; 
    #oidOnuPortsAmount = "1.3.6.1.4.1.{{vendorId}}.1.3.4.1.1.14.1.{{portId}}.{{onuId}}";
    #oidOnuPortLink = "1.3.6.1.4.1.{{vendorId}}.1.3.4.3.1.3.1.{{portId}}.{{onuId}}.{{onuPortId}}";
    #oidOnuReboot = "1.3.6.1.4.1.{{vendorId}}.1.3.4.1.1.32.1.{{portId}}.{{onuId}}";


    async refreshBaseInfo() {        
        this.ports = [];
        this.status = 0;
        this.statusDesc = 'host unreacheable'

        //open snmp connection
        const snmpHelper = new SnmpHelper(this.ipAddress);
        try {
            snmpHelper.open();
        } catch(e) {
            logger.error('open snmp connection', e);
            throw e;
        }

        //get olt base info
        const oidsOlt = [
            this.#oidOltModel.replace("{{vendorId}}", this.vendorId),
            this.#oidOltRunStatus.replace("{{vendorId}}", this.vendorId),
            this.#oidOltRunTime.replace("{{vendorId}}", this.vendorId)
        ];
        let resOltVarbinds = null;
        try {
            resOltVarbinds = await snmpHelper.getSnmpVarbinds(oidsOlt);
            if (resOltVarbinds.length < 3) throw 'Mismatch count olt snmp varbinds.';
        } catch(e) {
            logger.error('getting olt base info', e); 
            snmpHelper.close();          
            throw e;             
        }                
        this.model = this.convertOltModel(resOltVarbinds[0].value);
        this.status = this.convertOltStatus(resOltVarbinds[1].value);
        this.statusDesc = this.convertOltStatusDesc(resOltVarbinds[1].value); 
        this.rawRunTime = resOltVarbinds[2].value;
        this.runTime = this.convertOltRunTime(resOltVarbinds[2].value);       

        //foreach method
        for(let i = 1; i <= this.ponAmount; i++) {
            const oidPort = this.#oidPortStatus.replace("{{vendorId}}", this.vendorId)
                                                .replace("{{portId}}", i);
            let portStatusVarbind = null;
            try {
                 portStatusVarbind = await snmpHelper.getSnmpSingleVarbind(oidPort);
            } catch(e) {
                logger.error('getting port status', e);
                continue;
            }

            //ports forming
            let onusStatus = portStatusVarbind.value.toJSON().data;
            this.ports.push({
                portId: i,
                onus: []
            });            
            for(let j = 0; j < 64; j++) {
                //onu statuses
                //0 - not exists
                //1 - online
                //2 - offline
                //3 - alarm
                if (onusStatus[j] == 0) continue;
                let _onu = new Onu(i, j+1, onusStatus[j]);
                this.ports[i-1].onus.push(_onu);
            }
        }
        
        snmpHelper.close();        
    }

    async refreshExtendedInfo() {
        if (!this.ports) this.refreshBaseInfo();
        if (this.status == 0) return;

        //open snmp connection
        const snmpHelper = new SnmpHelper(this.ipAddress);
        try {
            snmpHelper.open();
        } catch(e) {
            logger.error('open snmp connection', e);
            return;
        }

        //onus ext info
        for(let port of this.ports) {
            for(let onu of port.onus) { 
                if (onu.status != 1) continue;               
                let oidsOnuInfo = [
                    this.#oidOnuName.replace("{{vendorId}}", this.vendorId)
                        .replace("{{portId}}", onu.portId).replace("{{onuId}}", onu.onuId),
                    this.#oidOnuMac.replace("{{vendorId}}", this.vendorId)
                        .replace("{{portId}}", onu.portId).replace("{{onuId}}", onu.onuId),
                    this.#oidOnuRxPower.replace("{{vendorId}}", this.vendorId)
                        .replace("{{portId}}", onu.portId).replace("{{onuId}}", onu.onuId),
                ];

                let resOnuVarbinds = null;
                try {
                    resOnuVarbinds = await snmpHelper.getSnmpVarbinds(oidsOnuInfo);
                    if (resOnuVarbinds.length < 3) throw 'Mismatch count onu snmp varbinds.';
                } catch(e) {
                    logger.error('getting onu extra info', e);
                    continue;
                }                    
                onu.name = this.convertOnuName(resOnuVarbinds[0].value);
                onu.mac = this.convertOnuMac(resOnuVarbinds[1].value);
                onu.macShort = this.convertOnuMacShort(onu.mac);
                onu.rxPower = this.convertOnuRxPower(resOnuVarbinds[2].value);
                onu.rxPowerLevel = this.convertOnuRxPowerLevel(onu.rxPower);
            }
        }
        
        snmpHelper.close();
    }

    async refreshPortsInfo() {
        if (!this.ports) this.refreshBaseInfo();
        if (this.status == 0) return;

        //open snmp connection
        const snmpHelper = new SnmpHelper(this.ipAddress);
        try {
            snmpHelper.open();
        } catch(e) {
            logger.error('open snmp connection', e);
            return;
        } 

        //onus ports info
        for(let port of this.ports) {
            for(let onu of port.onus) {                
                if (onu.status != 1) {
                    continue;
                }
                //get ports amount 
                let oidPortsAmount = this.#oidOnuPortsAmount.replace("{{vendorId}}", this.vendorId)
                                                .replace("{{portId}}", onu.portId).replace("{{onuId}}", onu.onuId);
                let oidPortsAmountVarbind = null;  
                let portsAmount = 0;              
                try {
                    oidPortsAmountVarbind = await snmpHelper.getSnmpSingleVarbind(oidPortsAmount)
                    portsAmount = parseInt(oidPortsAmountVarbind.value);
                } catch(e) {
                    logger.error('getting onus port amount info', e);
                    continue;
                }
                
                //get each port status
                onu.ports = [];
                for(let p = 1; p <= portsAmount; p++) {
                    let oidsOnuPortsInfo = [
                        this.#oidOnuPortLink.replace("{{vendorId}}", this.vendorId)
                            .replace("{{portId}}", onu.portId).replace("{{onuId}}", onu.onuId)
                            .replace("{{onuPortId}}", p)                        
                    ];
    
                    let resOnuPortsVarbinds = null;
                    try {
                        resOnuPortsVarbinds = await snmpHelper.getSnmpVarbinds(oidsOnuPortsInfo);
                        if (resOnuPortsVarbinds.length < 1) throw 'Mismatch count onus ports snmp varbinds.';
                    } catch(e) {
                        logger.error('getting onus port info', e);
                        break;
                    }
    
                    let onuPort = { portId: p };
                    onuPort.link = this.convertOnuPortLink(resOnuPortsVarbinds[0].value);
                    onu.ports.push(onuPort);
                }                
            }
        }

        snmpHelper.close();
    }

    async rebootOnu(portId, onuId) {
         //open snmp connection
        const snmpHelper = new SnmpHelper(this.ipAddress);
        try {
            snmpHelper.open(5000, "private");
        } catch(e) {
            logger.error('open snmp connection', e);
            return false;
        }

        const oid = this.#oidOnuReboot.replace("{{vendorId}}", this.vendorId)
            .replace("{{portId}}", portId).replace("{{onuId}}", onuId);
        let resultSnmp = null;
        try {
            resultSnmp = await snmpHelper.setSnmpIntegerValue(oid, 2);
        } catch(e) {
            logger.error(`setting reboot snmp value for ${portId}:${onuId}`, e);
            return false;
        }

        return resultSnmp;        
    }
    
    

    //private methods
    convertOltModel(modelId) {        
        let mapModels = new Map([
            [16843009, 'EPON-2U8P'],
            [17105153, 'EPON-1U2P'],
            [17170689, 'EPON-1U8P'],
            [17172225, 'FD1216S'],
            [17236225, 'EPON-1U4P'],
            [17236993, 'EPON-1U4P'],
            [17237761, 'EPON-1U4P'],
            [17238529, 'EPON-1U4P'],
        ]);        
        if (mapModels.get(modelId))
            return mapModels.get(modelId);
        else
            return 'UNKNOWN_NAME_MODEL'
    }

    convertOltStatus(statusId) {
        let mapStatus = new Map([
            [1, 0],
            [2, 0],
            [3, 1],
            [4, 1],
            [5, 1]
        ]);
        if (mapStatus.get(statusId))
            return mapStatus.get(statusId);
        else
            return 1
    }

    convertOltRunTime(rawRuntime) {
        let seconds = Number(rawRuntime/100);
        var d = Math.floor(seconds / (3600*24));
        var h = Math.floor(seconds % (3600*24) / 3600);
        var m = Math.floor(seconds % 3600 / 60);
        var s = Math.floor(seconds % 60);

        var dDisplay = d > 0 ? d + (d == 1 ? " day" : " days") : "";
        var hDisplay = h > 0 ? h + (h == 1 ? " hour" : " hours") : "";
        var mDisplay = m > 0 ? m + (m == 1 ? " minute" : " minutes") : "";
        var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
        if (d > 0) return dDisplay;
        if (h > 0) return hDisplay;  
        if (m > 0) return mDisplay;
        return sDisplay; 
    }

    convertOltStatusDesc(statusId) {
        let mapStatus = new Map([
            [1, 'not present'],
            [2, 'offline'],
            [3, 'online'],
            [4, 'normal'],
            [5, 'abnormal']
        ]);
        if (mapStatus.get(statusId))
            return mapStatus.get(statusId);
        else
            return 'unknown status'
    }

    convertOnuName(rawName) {
        //check \00 values
        //return rawName;
        let isNull = true;
        for(let val of rawName) {
            if (val != 0) isNull = false
        }
        if (isNull) return "";
        return rawName.toString('utf8');
    }

    convertOnuMac(rawMac) {        
        let mac = "";
        for(let val of rawMac) {
            let macWord = val.toString(16);
            if (macWord.length == 1) macWord = "0" + macWord;
            mac += macWord + ":";
        }
        return mac.toUpperCase().replace(/:$/g, '');
    }

    convertOnuMacShort(mac) {
        let res = (mac.match(/[/[\d\w]+:[\d\w]+:[\d\w]+$/)).toString();
        if (res) res = "[" + res + "]";
        return res;
    }

    convertOnuRxPower(rawRxPower) {
        if (rawRxPower === 0) return 0;
        let rx = 10 * (Math.log(rawRxPower) / Math.log(10)) - 40;
        return rx.toFixed(2);
    }

    convertOnuRxPowerLevel(rxPower) {
        rxPower = +rxPower;
        if (rxPower < -28) return 0;
        if (rxPower >= -28 && rxPower < -23) return 1;
        if (rxPower >= -23 && rxPower < -19) return 2;
        if (rxPower >= -19 && rxPower < -15) return 3;
        if (rxPower >= -15 && rxPower < -10) return 4;
        if (rxPower >= -10) return 5
    }

    convertOnuPortLink(portLink) {
        //1 == linkup
        //2 == linkdown
        if (portLink == 1) 
            return 1;
        else
            return 0;        
    }
}

module.exports = Olt;