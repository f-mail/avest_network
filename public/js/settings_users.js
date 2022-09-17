async function loadUsers(isStartPage = false) {
    try {        
        const response = await getAjax('/api/settings/users');
        if (!response.ok) {
            $('#root').html(getHtmlError("500 Server error", ""));            
            return;
        }
        let users = await response.json();
        window.users = users;        
        $('#root').html(createUserDom(users));

    } catch(e) {
        $('#root').html(getHtmlError("400 Client error:", e.stack))
    }
}

function createUserDom(data) {
    //modal 
    let htmlModal = `
    <div class="modal" id="modalUserAdd" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">					
                <div class="modal-body pb-1">                                
                    <div class="card align-left">
                        <div class="card-header pt-3">
                            <h5 class="card-title" id="user-edit-caption">Add new user</h5>                            
                        </div>
                        <div class="card-body pt-0">                                        
                            <div class="form-group">
                                <label class="form-label">Name</label>
                                <input id="user-edit-name" type="text" class="form-control" placeholder="">                                
                            </div>
                            <div class="form-group">
                                <label class="form-label">Role</label>
                                <select class="custom-select mb-3" id="user-edit-role">
                                    <option selected="">user</option>
                                    <option>admin</option>                                    
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Password</label>
                                <input id="user-edit-password" type="password" size="15"                                                    
                                    class="form-control" placeholder="">
                            </div>
                            <button type="submit" class="btn btn-primary" onclick="clickUserAdd(event)">Add</button>
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>                                                                           
                    </div>
                    </div>
                </div>                                       
            </div>
        </div>
    </div>`

    let htmlUser = `<div class="card">
                        <div class="card-header">
                                <h5 class="card-title">Управление пользователями</h5>
                                <h6 class="card-subtitle text-muted"></h6>
                        </div>
                        <table class="table table-striped align-center">
                                <thead>
                                        <tr>
                                                <th style="width:20%;">UserID</th>
                                                <th style="width:30%">Name</th>
                                                <th style="width:20%">Role</th>                                                
                                                <th>Actions</th>
                                        </tr>
                                </thead>
                                <tbody>`;
    for(let i = 0; i < window.users.length; i++) {
        const user = window.users[i];
        htmlUser += `
            <tr>
                <td>${user.userId}</td>
                <td>${user.name}</td>
                <td>${user.role}</td>
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
                            onclick="clickUserRemove(event)"
                            id="user-remove-${i}">
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
    
    htmlUser += `    </tbody>
                </table>                
            </div>
            <div class="m-2">
                    <button class="btn btn-primary" onclick="clickUserShowAdd(event)">Add...</button>
                </div>`   

    return htmlModal + htmlUser;    
}

async function clickUserShowAdd(e) {
    $('#modalUserAdd').modal('show')
}

async function clickUserAdd(e) {
    $('#modalUserAdd').modal('hide');    

    let sendData = {
        name : $('#user-edit-name').val(),
        role : $('#user-edit-role').val(),
        password : $('#user-edit-password').val()        
    }    

    const response = await postAjax('/api/settings/user/add', sendData);
    if (!response.ok) {
        alertShow('danger', '500 Server error - failed adding');        
        return;
    }
    let resSave = await response.json();         
    if(resSave) {
        loadUsers();
    } else {
        alertShow('danger', 'Error');
    } 
}

async function clickUserRemove(e) {
    const uiButton = $(`#${e.currentTarget.id}`);
    uiButton.attr('disabled', true);

    let idString = e.currentTarget.id;
    let numbers = idString.match(/\d+/g).map(Number);
    let number = numbers[0];

    let sendData = {
        userId : window.users[number].userId
    }
    
    const response = await postAjax('/api/settings/user/remove', sendData);
    if (!response.ok) {
        alertShow('danger', '500 Server error - failed remove user');        
        return;
    }
    let res = await response.json();         
    if(res) {
        loadUsers();
    } else {
        alertShow('danger', 'Failed remove user');
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

$(document).ready(loadUsers.bind(this, true));
