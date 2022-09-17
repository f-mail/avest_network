async function clickLogin() {
    let sendData = {
        name : $('#edit-name').val(),
        password : $('#edit-password').val()
    }    

    const response = await postAjax('/login', sendData);
    if (!response.ok) {
        alertShowLogin('Ошибка сервера - нет ответа на запрос аутентификации');        
        return;
    }
    let res = await response.json();         
    if(res.status === 401) {
        alertShowLogin('Неверный пользователь или пароль');
    } else if (res.status === 500) {
        alertShowLogin('Ошибка сервера во время аутентификации');
    } else  {
        let date = new Date();
        date = new Date(date.setDate(date.getDate() + 30));
        let cookie =  
        `authToken=${res.token};` +
        ` expires=${date.toUTCString()};` +
        ` path=/;`;        
        document.cookie = cookie;        
        window.location.replace('/');
    }
}

function alertShowLogin(msg) {
    $('#alert-login-text').text(msg);
    $('#alert-login').show();
}

function clickCloseAlert(msg) {    
    $('#alert-login').hide();
}