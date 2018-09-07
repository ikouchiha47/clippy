const ipc = require('electron').ipcRenderer;

let passwordEl = $("#password")
$("form").addEventListener('submit', function(e) {
    e.preventDefault();
    let password = passwordEl.value.trim()

    ipc.send('update-password', password)
    return false;
})

ipc.on('password-updated', (event, success) => {
    connsole.log('password updated')
})
