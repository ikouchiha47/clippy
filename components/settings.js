const {
  app,
  BrowserWindow
} = require('electron')

module.exports = (function() {
  function CreateSettingsWindow(
    parentApp,
    parentWindow,
    ipcMain
  ) {
    let window;

    window = new BrowserWindow({
      parent: parentWindow,
      width: 500,
      height: 120,
      fullscreenable: false,
      resizable: false,
      show: false,
      frame: true,
      skipTaskbar: true,
      webPreferences: {
        backgroundThrottling: false,
        //  devTools: true
      }
    });

    window.setVisibleOnAllWorkspaces(true)
    // window.webContents.openDevTools({ mode: 'detach'});

    ipcMain.on('update-password', (event, password) => {
      if(window.isVisible()) window.close()
      parentWindow.show()
    })

    return window
  }
  return CreateSettingsWindow
})()
