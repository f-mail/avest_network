async function loadOlts(isStartPage = false) {
    try {        
        const response = await getAjax('/api/settings/olts');
        if (!response.ok) {
            $('#root').html(getHtmlError("500 Server error", ""));            
            return;
        }
        let oltsConfig = await response.json();
        window.oltsConfig = oltsConfig;        
        $('#root').html(createOltDom(oltsConfig));

    } catch(e) {
        $('#root').html(getHtmlError("400 Client error:", e.stack))
    }
}

function createOltDom(data) {
    //modal 
    let htmlModal = `
    <div class="modal" id="modalOltAdd" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">					
                <div class="modal-body pb-1">                                
                    <div class="card align-left">
                        <div class="card-header pt-3">
                            <h5 class="card-title" id="olt-edit-caption">Add new OLT</h5>                            
                        </div>
                        <div class="card-body pt-0">                                        
                            <div class="form-group">
                                <label class="form-label">IP Address</label>
                                <input id="olt-edit-ip" type="text" class="form-control" placeholder="">                                
                            </div>
                            <div class="form-group">
                                <label class="form-label">VendorID</label>
                                <input id="olt-edit-vendorid" type="text" size="15"                                                    
                                    class="form-control" placeholder="" value="34592">
                            </div>
                            <div class="form-group">
                                <label class="form-label">PON ports</label>
                                <input id="olt-edit-ponports" type="text" size="15"                                                    
                                    class="form-control" placeholder="">
                            </div>
                            <button type="submit" class="btn btn-primary" onclick="clickOltAdd(event)">Add</button>
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>                                                                           
                    </div>
                    </div>
                </div>                                       
            </div>
        </div>
    </div>`

    let htmlOlt = `<div class="card">
                        <div class="card-header">
                                <h5 class="card-title">Конфигурация мониторинга OLT</h5>
                                <h6 class="card-subtitle text-muted"></h6>
                        </div>
                        <table class="table table-striped align-center">
                                <thead>
                                        <tr>
                                                <th style="width:25%;">OLT IP Address</th>
                                                <th style="width:25%">VendorID</th>
                                                <th style="width:25%">PON Ports</th>
                                                <th>Actions</th>
                                        </tr>
                                </thead>
                                <tbody>`;
    for(let i = 0; i < window.oltsConfig.length; i++) {
        const olt = window.oltsConfig[i];
        htmlOlt += `
            <tr>
                <td>${olt.ipAddress}</td>
                <td>${olt.vendorId}</td>
                <td>${olt.ponAmount}</td>
                <td class="table-action">                    
                    <a>
                        <svg xmlns="http://www.w3.org/2000/svg"
                            width="24" height="24"
                            viewBox="0 0 24 24" fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            class="feather feather-trash align-middle"
                            onclick="clickOltRemove(event)"
                            id="olt-remove-${i}">
                            <polyline points="3 6 5 6 21 6">
                            </polyline>
                            <path
                                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2">
                            </path>
                        </svg>
                    </a>
                </td>
            </tr>`
    }
    
    htmlOlt += `    </tbody>
                </table>                
            </div>
            <div class="m-2">
                    <button class="btn btn-primary" onclick="clickOltShowAdd(event)">Add...</button>
                </div>`   

    return htmlModal + htmlOlt;    
}

async function clickOltShowAdd(e) {
    $('#modalOltAdd').modal('show')
}

async function clickOltAdd(e) {
    $('#modalOltAdd').modal('toggle');    

    let sendData = {
        ipAddress : $('#olt-edit-ip').val(),
        vendorId : $('#olt-edit-vendorid').val(),
        ponAmount : $('#olt-edit-ponports').val()        
    }    

    const response = await postAjax('/api/settings/olt/add', sendData);
    if (!response.ok) {
        alertShow('danger', '500 Server error - failed adding');        
        return;
    }
    let resSave = await response.json();         
    if(resSave) {
        loadOlts();
    } else {
        alertShow('danger', 'Error');
    } 
}

async function clickOltRemove(e) {
    const uiButton = $(`#${e.currentTarget.id}`);
    uiButton.attr('disabled', true);

    let idString = e.currentTarget.id;
    let numbers = idString.match(/\d+/g).map(Number);
    let number = numbers[0];

    let sendData = {
        ipAddress : window.oltsConfig[number].ipAddress
    }
    
    const response = await postAjax('/api/settings/olt/remove', sendData);
    if (!response.ok) {
        alertShow('danger', '500 Server error - failed remove olt');        
        return;
    }
    let res = await response.json();         
    if(res) {
        loadOlts();
    } else {
        alertShow('danger', 'Failed remove olt');
    }

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

$(document).ready(loadOlts.bind(this, true));
