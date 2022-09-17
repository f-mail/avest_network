async function loadOnus(isStartPage = false) {
    try {

        //baseInfo
        const response = await getAjax('/api/onus/base');
        if (!response.ok) {
            $('#root').html(getHtmlError("500 Server error", ""));            
            return;
        }
        let baseInfo = await response.json();
        if (!isStartPage)
            checkChangesOnu(baseInfo);
        window.oltsStatus = baseInfo;        
        $('#root').html(createOnuDom(baseInfo));
        selectingTableRow();
        prepareSearch();        
        
        //scroll to top
        $(window).scroll(function () {
			if ($(this).scrollTop() > 50) {
				$('#back-to-top').fadeIn();
			} else {
				$('#back-to-top').fadeOut();
			}
		});		
		$('#back-to-top').click(function () {
			$('body,html').animate({
				scrollTop: 0
			}, 400);
			return false;
		});

        //ext info
        for(let i = 0; i < baseInfo.olts.length; i++) {
            $('#loading-text').text(`Fetching onu's info (olt#${i+1})...`);
            const response = await getAjax(`/api/onus/ext/${i}`);
            if (!response.ok) {
                let msgError = "";
                try {
                    let msgError = await response.json();
                    msgError = msgError.message;
                } catch (e) {
                    msgError = e;
                }

                $('#root').html(getHtmlError("500 Server error", msgError))
                return;
            }
            let extInfo = await response.json(); 
            window.oltsStatus = extInfo;
            sessionStorage.setItem('oltStatus', JSON.stringify(extInfo));           
            updateOnuDomExt(extInfo, i);
        }

        //ports info
        for(let i = 0; i < baseInfo.olts.length; i++) {
            $('#loading-text').text(`Fetching onu's ports (olt#${i+1})...`)
            const response = await getAjax(`/api/onus/ports/${i}`);
            if (!response.ok) {
                let msgError = "";
                try {
                    let resMessage = await response.json();
                    msgError = resMessage.message;
                } catch (e) {
                    msgError = e;
                }

                alertShow("danger", "500 Server error - " + msgError);
                resetRefreshButton();
                return;
            }
            let portsInfo = await response.json();
            updateOnuDomPorts(portsInfo, i);
        }

        resetRefreshButton();

    } catch(e) {
        $('#root').html(getHtmlError("400 Client error:", e.stack))
    }
}

function createOnuDom(data) {
    //title page
    document.title = `${data.onusOffline} ONUs off - Avest Network`

    //oltHead
    let oltHead = `<div class="d-flex align-items-center mb-3">
         <div class="align-middle">         
            <span class="h4">&nbsp${data.onusAmount || 0} ONUs registered, ${
      data.onusOnline || 0
    } online, ${data.onusOffline || 0} offline</span>
            <span class="h4 ml-2 text-secondary">[${getCurrentTime()}]</span> `;         
    if (data.onusAlarm) oltHead += `, ${data.onusAlarm} alarm `; 
    oltHead += `</div> `;   
    oltHead += ` <div class="ml-auto" id="loading-placeholder">
                <div class="spinner-border text-primary align-middle" role="status" aria-hidden="true"></div>
                <span class="align-middle ml-2" id="loading-text"></span>
            </div>
        </div> `;

    //modal edit onu
    oltHead += `<div class="modal fade" id="modalOnuEdit" tabindex="-1" role="dialog" aria-hidden="true">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">					
                            <div class="modal-body pb-1">                                
                                <div class="card align-left">
                                    <div class="card-header pt-3">
                                        <h5 class="card-title" id="onu-edit-caption">ONU [25:F4:C1:A0]</h5>                            
                                    </div>
                                    <div class="card-body pt-0">                                        
                                        <div class="form-group">
                                            <label class="form-label">Name</label>
                                            <input id="onu-edit-name" type="text" class="form-control" placeholder="">
                                            <input id="onu-edit-mac" type="hidden">
                                            <input id="onu-edit-oltip" type="hidden">
                                            <input id="onu-edit-portid" type="hidden">
                                            <input id="onu-edit-onuid" type="hidden">
                                        </div>
                                        <div class="form-group">
                                            <label class="form-label">IP Address</label>
                                            <input id="onu-edit-ip" type="text" size="15"                                                    
                                                class="form-control" placeholder="">
                                        </div>
                                        <button type="submit" class="btn btn-primary" onclick="clickOnuEditSave(event)">Save changes</button>
                                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>                                                                           
                                </div>
                                </div>
                            </div>                                       
                        </div>
                    </div>
                </div>`;

    //search result (hiding)
    oltHead += `<div class="collapse" id="search-header">
                    <span class="h4 ml-2 mb-2">Search results:</span>
                </div>`;

    //oltTabsHead
    let tabsHead = `<div class="tab" id="tab-content">
        <ul class="nav nav-tabs" role="tablist"> `;    
    for(let i = 0; i < data.olts.length; i++) {
        let olt = data.olts[i];

        //active tab
        let isActive = '';
        if (i === 0) isActive = ` active`;

        //bad onus indicator
        let isOfflineOnus = '';        
        olt.onusBad = olt.onusBad || 0;
        if(olt.onusBad > 0) isOfflineOnus = `[${olt.onusBad}]`;


        let head = `<li class="nav-item" id="nav-item-${i}">
            <a class="nav-link pb-1 pt-2 ${isActive}" href="#tab-${i+1}"
                data-toggle="tab" role="tab">${olt.model || '[UNKNOWN_OLT_MODEL]'} (${olt.ipAddress}) 
                    <span class="ml-1 text-danger font-weight-bold">
                        ${isOfflineOnus}
                    </span>
            </a>
            </li> `;
        tabsHead += head;
    }
    tabsHead += '</ul> ';
    
    //oltsTabContent
    let tabContent = `<div class="tab-content"> `;
    for(let i = 0; i < data.olts.length; i++) {
        let olt = data.olts[i];
        let tabPanel = `<div class="tab-pane ${i==0 ? 'active' : ''}" id="tab-${i+1}" role="tabpanel">
            <div class="card" id="card-olt-${i}">
                <div class="card-header pb-1">
                    <span class="p-1 bg-light text-primary">
                        <i class="align-middle mr-1 p-2 fas fa-fw fa-bolt"></i>
                        status: ${olt.statusDesc || '[unknown]'}
                    </span>
                    <span class="p-1 ml-2 bg-light text-primary">
                        <i class="align-middle mr-1 fas fa-fw fa-play-circle"></i>
                        runtime: ${olt.runTime || '[unknown]'}
                    </span>
                    <span class="p-1 ml-2 bg-light text-primary">
                        <i class="align-middle mr-1 fas fa-fw fa-external-link-alt"></i>
                        <a class="d-inline" href='http://${olt.ipAddress}' target="_blank">web</a>
                    </span>

                </div>
                <table class="table table-condensed align-center mb-1" id="olt-table-${i}">
                    <thead>
                        <tr class="tr-headers">
                                <th style="width:10%;">ID</th>
                                <th style="width:30%">Status</th>
                                <th style="width:10%">Signal</th>
                                <th class="d-none d-md-table-cell" style="width:20%">Ports</th>
                                <th class="d-none d-md-table-cell" style="width:15%">IP</th>
                                <th style="width:10%">Reboot</th>
                                <th class="d-none d-md-table-cell">Edit</th>
                        </tr>
                    </thead>
                    <tbody> `;
            
            for(let p = 0; p < olt.ports.length; p++) {
                for(let j = 0; j < olt.ports[p].onus.length; j++) {
                    let onu = olt.ports[p].onus[j];  
                    
                    //status
                    let htmlStatus = `class="clickable-row`;
                    if (onu.status === 2) htmlStatus += ` bg-danger text-white`;
                    if (onu.status === 3) htmlStatus += ` bg-warning`;
                    htmlStatus += `"`

                    let rowOnu = `<tr ${htmlStatus}>
                        <td class="d-md-table-cell">${onu.portId}:${onu.onuId}</td>
                        <td class="d-md-table-cell align-left" id="cell-name-${i}-${onu.portId}-${onu.onuId}">${getHtmlOnuName(onu)}</td>
                        <td class="d-md-table-cell" id="cell-signal-${i}-${onu.portId}-${onu.onuId}">${getHtmlOnuSignal(onu)}</td>
                        <td class="d-none d-md-table-cell" id="cell-ports-${i}-${onu.portId}-${onu.onuId}"></td>
                        <td class="d-none d-md-table-cell align-center">${getHtmlOnuIp(onu)}</td>
                        <td class="d-md-table-cell">${getHtmlOnuReboot(i, onu)}</td>
                        <td class="d-none d-md-table-cell">${getHtmlOnuEdit(i, onu)}</td>                        
                    </tr> `
                    tabPanel += rowOnu;
                }
            }
            tabPanel += `</table></div></div> `                    
        
        tabContent += tabPanel;
    }
    tabContent += "</div> ";

    let endTabs = `</div>     
     
     <a id="back-to-top" href="#" class="btn btn-dark btn-lg back-to-top"
        role="button"><i class="fas fa-chevron-up"></i></a>
     
     `;

     

    return oltHead + tabsHead + tabContent + endTabs;    
}

function updateOnuDomExt(data, oltId) {
    let olt = data.olts[oltId];
    for(let port of olt.ports) {
        for(let j = 0; j < port.onus.length; j++) {
            let onu = port.onus[j];
            $(`#cell-name-${oltId}-${onu.portId}-${onu.onuId}`).html(getHtmlOnuName(onu));
            $(`#cell-signal-${oltId}-${onu.portId}-${onu.onuId}`).html(getHtmlOnuSignal(onu));            
        }
    }
}

function updateOnuDomPorts(data, oltId) {
    let olt = data.olts[oltId];
    for(let port of olt.ports) {
        for(let j = 0; j < port.onus.length; j++) {
            let onu = port.onus[j];
            $(`#cell-ports-${oltId}-${onu.portId}-${onu.onuId}`).html(getHtmlOnuPorts(onu));                          
        }
    }
}

function getHtmlOnuName(onu) {
    let imgStatus = "onu_status_bad.png";
    if (onu.status === 1) imgStatus = "onu_status_online.png";
    if (onu.status === 2) imgStatus = "onu_status_offline.png";

    return `<img src="img/onu/${imgStatus}" class="img-fluid" alt="onu status">
        ${convertOnuMacShort(onu.mac) || ''} ${onu.name || ''}`;
}

function getHtmlOnuSignal(onu) {
    if (onu.rxPower === undefined) return "";   
    return `<img src="img/onu/signal_${onu.rxPowerLevel}.png"
        width="15" class="img-fluid" alt="RX Power"
        data-toggle="tooltip" data-placement="top" title="${onu.rxPower} dbm">`
}

function getHtmlOnuPorts(onu) {
    if (!onu.ports) return "";
    let htmlRes = "";    
    for(let i = 0; i < onu.ports.length; i++) {
        let onuPort = onu.ports[i];
        htmlRes += ` <img src="img/onu/led.${onuPort.link === 1 ? "on" : "off"}.gif"
            class="img-fluid" alt="port ${onuPort.link === 1 ? "on" : "off"}">`
            
    }
    return htmlRes;
}

function getHtmlOnuIp(onu) {
    if (!onu.ipAddress) return "";
    return `<a href="http://${onu.ipAddress}"
        class="text-success" target="_blank">${onu.ipAddress}</a>`
}

function getHtmlOnuReboot(numOlt, onu) {    
    if (onu.status != "1") return "";    
    return `<button class="btn btn-sm btn-danger" onclick="rebootOnu(event)"
        id="btn-reboot-${numOlt}-${onu.portId}-${onu.onuId}">
        Reboot</button>`    
}

function getHtmlOnuEdit(numOlt, onu) {
    return `<a><svg xmlns="http://www.w3.org/2000/svg"
            width="24" height="24" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"
            class="feather feather-edit-2 align-middle"
            onclick="clickOnuEdit(event)"
            id="edit-${numOlt}-${onu.portId}-${onu.onuId}"
            >
            <path
                    d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z">
            </path>
        </svg></a>
        `
}

function getHtmlError(head, msg) {
    return `<div class="alert alert-danger alert-dismissible" role="alert">
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">×</span>
        </button>
            <div class="alert-icon">
                <i class="far fa-fw fa-bell"></i>
            </div>
            <div class="alert-message">
                <strong>${head}</strong> ${msg}
            </div>
        </div>`    
}

function clickOnuEdit(e) {    
    let idString = e.currentTarget.id;
    let numbers = idString.match(/\d+/g).map(Number);
    let onuPosition = {
        numOlt : numbers[0],
        portId : numbers[1],
        onuId : numbers[2]
    }  
    
    const onu = window.oltsStatus.olts[onuPosition.numOlt]
        .ports.find((e, i, a) => e.portId === onuPosition.portId)
        .onus.find((e, i, a) => e.onuId === onuPosition.onuId);

    
    $('#onu-edit-caption').text(`ONU [${onu.mac}]`);
    $('#onu-edit-name').val(onu.name || '')
    $('#onu-edit-ip').val(onu.ipAddress || '');

    $('#onu-edit-oltip').val(window.oltsStatus.olts[onuPosition.numOlt].ipAddress);
    $('#onu-edit-portid').val(onuPosition.portId);
    $('#onu-edit-onuid').val(onuPosition.onuId);
    $('#onu-edit-mac').val(onu.mac);

    $('#modalOnuEdit').modal('toggle'); 
}

async function clickOnuEditSave(e) {
    $('#modalOnuEdit').modal('hide');

    let sendData = {
        oltIpAddress : $('#onu-edit-oltip').val(),
        portId : $('#onu-edit-portid').val(),
        onuId : $('#onu-edit-onuid').val(),
        onuMac : $('#onu-edit-mac').val(),
        onuName : $('#onu-edit-name').val(),
        onuIpAddress : $('#onu-edit-ip').val()
    }

    console.log(sendData);

    const response = await postAjax('/api/onus/save', sendData);
    if (!response.ok) {
        alertShow('danger', '500 Server error - failed saving');        
        return;
    }
    let resSave = await response.json();         
    if(resSave) {
        alertShow('success', 'Save done, please refresh page');
    } else {
        alertShow('danger', 'Error during saving');
    } 
}

function clickReboot(e) {
    $('#onu-edit-name').text(e.currentTarget.id);
}

async function rebootOnu(e) {
    const uiButton = $(`#${e.currentTarget.id}`);
    uiButton.attr('disabled', true);

    let idString = e.currentTarget.id;
    let numbers = idString.match(/\d+/g).map(Number);
    let sendData = {
        numOlt : numbers[0],
        portId : numbers[1],
        onuId : numbers[2]
    }    
    
    const response = await postAjax('/api/onus/reboot', sendData);
    if (!response.ok) {
        alertShow('danger', '500 Server error - failed reboot onu');
        setTimeout(() => uiButton.attr('disabled', false), 10000); 
        return;
    }
    let resReboot = await response.json();         
    if(resReboot) {
        alertShow('success', 'Successed command to reboot onu');
    } else {
        alertShow('danger', 'Failed command to reboot onu');
    } 
    setTimeout(() => uiButton.attr('disabled', false), 10000);      
}

function prepareSearch() {    
    $("#input-search").on("keyup", function() {
        var value = $(this).val().toLowerCase();

        for(let i = 0; i < window.oltsStatus.olts.length; i++)
            $(`#olt-table-${i} tr:not(.tr-headers)`).filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
            }); 
        
        if (value.length > 0)
            showSearchContent();
        else
            hideSearchContent();
      });    
}

function showSearchContent() { 
    if (window.isModeSearch === true) return;

    for(let i = 1; i < window.oltsStatus.olts.length; i++) {
        $(`#card-olt-0`).append($(`#olt-table-${i}`));
        $(`#card-olt-${i}`).hide();
        $(`#card-olt-${i}`).removeClass('active');
        $(`#nav-item-${i}`).hide();   
    }    

    $(`#card-olt-0`).addClass('active');
    $('.nav-tabs a[href="#tab-1"]').tab('show');

    $(`#nav-item-0`).hide();
    $('.card-header').hide();
    $('#search-header').show();

    window.titleBackup = document.title;
    document.title = "Search - Avest Network";

    window.isModeSearch = true; 
}

function hideSearchContent() {   

    for(let i = 1; i < window.oltsStatus.olts.length; i++) {
        $(`#card-olt-${i}`).append($(`#olt-table-${i}`))
        $(`#card-olt-${i}`).show();
        $(`#nav-item-${i}`).show();
    }

    $(`#nav-item-0`).show();
    $('.card-header').show();
    $('#search-header').hide();

    document.title = window.titleBackup;

    window.isModeSearch = false;
}

function resetRefreshButton() {
    $('#loading-placeholder').html(`<button class="btn btn-primary align-middle"
            onclick="this.disabled=true; loadOnus(false);">Refresh</button>`)
}

function convertOnuMacShort(mac) {
    if (mac === undefined) return "";
    if (mac.toString().trim().length === 0) return "";
    let res = (mac.match(/[/[\d\w]+:[\d\w]+:[\d\w]+$/)).toString();
    if (res) res = "[" + res + "]";
    return res.toUpperCase();
}

function selectingTableRow() {    
    $(`.clickable-row`).on('click', function(event) {       
        if(event.target.type == 'submit') return;
        if(event.target.tagName == 'svg') return;
        if(event.target.tagName == 'path') return;        
        if($(this).hasClass('bg-primary')){
            $(this).removeClass('bg-primary');             
        } else {
            $(this).addClass('bg-primary').siblings().removeClass('bg-primary');            
        }
    });
}

function getCurrentTime() {
    var today = new Date();
    return today.getHours() + ":" +
        (today.getMinutes() < 10 ? '0' + today.getMinutes() : today.getMinutes());
}

function notifyOnuChanged(body) {
    sendNotification('ONUs status', {
        body: body,
        icon: '/img/network-monitoring-medium.png',
        dir: 'auto'
    })
}

function checkChangesOnu(data) {
    let oldData = window.oltsStatus;
    if (!oldData) return;

    let onusCnanged = []
    for(i = 0; i < data.olts.length; i++) {
        let olt = data.olts[i];
        for(j = 0; j < olt.ports.length; j++) {
            let port = olt.ports[j];
            for(k = 0; k < port.onus.length; k++) {
                let onu = port.onus[k];
                let oldOnu = undefined;
                try {
                    oldOnu = oldData.olts[i].ports[j].onus
                        .find((item, index, array) => {
                            return (item.portId === onu.portId &&
                                item.onuId === onu.onuId)
                        })
                    if (oldOnu) {
                        if (oldOnu.status != onu.status)
                            onusCnanged.push(onu);
                    }
                } catch {}
            }
        }
    }

    if (onusCnanged.length === 0) return;

    let txt = "";
    for (onu of onusCnanged) {
        if (onu.status === 1) txt += '(+) ';
        else if (onu.status === 2) txt += '(-) ';
        else if (onu.status === 3) txt += '(!) ';
        if (convertOnuMacShort(onu.mac).trim().length > 0 || (onu.name || '').trim().length > 0)
            txt += `${convertOnuMacShort(onu.mac) || ''} ${onu.name || ''}` + '\n';
        else
            txt += `{portID:${onu.portId} onuID:${onu.onuId}}` + '\n';
    }

    notifyOnuChanged(txt);
}


$(document).ready(loadOnus.bind(this, true));

setInterval(() => {
        if (window.isModeSearch == true)
            return;
        loadOnus(false);
    },
    1000 * 60 * 5);

