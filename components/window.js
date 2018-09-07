const {
} = require("electron");
const watchClipB = require("../watchclipboard");
const { put, search, sort, all } = require("../clips");

let dataCopied = false; // is data copied from app

module.exports = function CreateWindow(
  app,
  BrowserWindow,
  ipcMain,
  clipboard,
) {
  let watcher;
  let pastes = [];
  let window;

  window = new BrowserWindow({
    width: 300,
    height: 450,
    fullscreenable: false,
    resizable: false,
    transparent: true,
    show: false,
    frame: false,
    skipTaskbar: true,
    webPreferences: {
      backgroundThrottling: false,
      //  devTools: true
    }
  });

  window.setVisibleOnAllWorkspaces(true)
  // window.webContents.openDevTools({ mode: 'detach'});

  // Hide the window when it loses focus
  window.on("blur", () => {
    if (!window.webContents.isDevToolsOpened()) {
      window.hide();
      // hide the app to bring the focus back to main window
      app && app.hide()
    }
  });

  window.webContents.on("dom-ready", () => {
    pastes = sort();

    window.webContents.send("clipboard-data", {
      pastes: pastes.map(v => v.text)
    });
  })

  // on finished loading load up data
  window.webContents.on("did-finish-load", () => {
    pastes = all();

    window.webContents.send("clipboard-data", {
      pastes: pastes.map(v => v.text)
    });

    // if existing watcher, stop it
    if (watcher) watcher.stop();

    // start watching for changes to clipboard data
    // when a new data comes in from copy to clipboard
    // load up all data sorted by time
    // and send data to frontend for render
    watcher = watchClipB({
      onTextChange: text => {
        text = text.trim();
        if (text) {
          // don't update cache if text copied from app
          put(text, !dataCopied);
          dataCopied = false
        }

        pastes = all();

        window.webContents.send("clipboard-data", {
          pastes: pastes.map(v => v.text)
        });
      }
    });
  });

  ipcMain.on("copy-data", (event, text) => {
    dataCopied = true;
    clipboard.writeText(text);
    window.webContents.send("copied-data", true);

    setTimeout(() => {
      app && app.hide()
    }, 300)
  });

  ipcMain.on("hide-window", () => {
    if(window && window.isVisible()) window.hide();
  });

  ipcMain.on("search-data", (event, text) => {
    text = text.trim();
    if (!text) {
      window.webContents.send("clipboard-data", {
        pastes: all().map(v => v.text)
      });
      return;
    }

    let data = search(text);
    window.webContents.send("clipboard-data", {
      pastes: data.map(v => v.text)
    });
  });

  return window
}
