const {
  app,
  dialog,
  BrowserWindow,
  Tray,
  Menu,
  MenuItem,
  ipcMain,
  clipboard,
  globalShortcut,
  session
} = require("electron");
const path = require("path");
const crypto = require('crypto');
const components = require("./components")
const { all, putAll, sort, reset } = require("./clips");
const iconPath = path.join(__dirname, "rclipboard.png");

const algorithm = 'aes-256-ctr';

let window, swindow;
let loadFailed = true;
let key;

if(process.platform == "darwin")
    app.dock && app.dock.hide();

app.on("ready", () => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({responseHeaders: `default-src 'none'`})
  })

  createTray();
  createWindow();

  const ret1 = globalShortcut.register("Control+Space", () => {
    if(window.isVisible()) {
      window.hide()
    } else {
      showWindow()
    };
  });

  if (!ret1) {
    console.log("registration failed");
  }

  loadClipBoardHistoryFromFile();
});

app.on("will-quit", () => {
  saveClipBoardHistoryToFile(all());
  globalShortcut.unregister("Control+Space");
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  app.quit();
});

const confirm = (message) => {
  return dialog.showMessageBox(
    window,
    {
      type: "question",
      buttons: ["No", "Yes"],
      title: "Confirm Clear All Cache",
      message: message
    });
}

const getWindowPosition = () => {
  const windowBounds = window.getBounds();
  const trayBounds = tray.getBounds();

  const x = Math.round(
    trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2
  );
  const y = Math.round(trayBounds.y + trayBounds.height + 4);

  return { x: x, y: y };
};

const toggleWindow = () => {
  if (window.isVisible()) {
    window.hide();
  } else {
    showWindow();
  }
};

const versionToInt = (version) => {
   return parseInt(version.split('.').join(''))
}

const checkForUpdates = (version) => {
  const { net } = require('electron');
  const url = "https://raw.githubusercontent.com/ikouchiha47/clippy/master/package.json"
  const req = net.request(url);

  req.on('error', (e) => {
    console.log(e)
  })

  req.on('response', resp => {
    let body = "";
    resp.on('data', chunk => {
      body += chunk.toString()
    })

    resp.on('end', () => {
      try {
        let json = JSON.parse(body)

        if(versionToInt(version) < versionToInt(json.version)) {
          window.webContents.send('update-available', true)
        }
      } catch(e) {
        console.log("failed json parse", e)
      }
    })
  })

  req.end()
}

const showWindow = () => {
  const position = getWindowPosition();
  window.setPosition(position.x, position.y, false);
  window.show();
  window.focus();
};

const showSettingWindow = () => {
  swindow.show()
}

const createMenu = () => {
  let actions = [
    {
      label: 'Close',
      click() {
        app && app.quit()
      }
    },
    {
      label: 'Clear All',
      click() {
        if(confirm("Are you Sure")) {
          window.webContents.send('clipboard-data', {
            pastes: reset(true)
          });
          saveClipBoardHistoryToFile([], true)
        }
      }
    },
    {
      label: 'Settings',
      click() {
        if(!swindow) swindow = createSettingsWindow()
        swindow.webContents.on('dom-ready', () => {
          if(!swindow.isVisible()) {
            swindow.show()
          }
        })
      }
    }
  ]
  const menu = components.CreateMenu(Menu, MenuItem, app, actions)

  menu.popup({ window: window })
}

const createTray = () => {
  tray = new Tray(iconPath);

  //tray.on("right-click", () => { app && app.quit() });
  tray.on("right-click", createMenu);

  tray.on("double-click", toggleWindow);
  tray.on("click", function(event) {
    toggleWindow();

    if (window.isVisible() && process.defaultApp && event.metaKey) {
      window.openDevTools({ mode: "detach" });
    }
  });
};

const createSettingsWindow = () => {
  swindow = components.CreateSettingsWindow(app, window, ipcMain)
  swindow.loadURL(`file://${path.join(__dirname, "views", "settings.html")}`);
  swindow.on('close', () => {
    swindow = null;
    app.focus()
  })
  return swindow
}

const createWindow = () => {
  if(!window) window = components.CreateWindow(
    app,
    BrowserWindow,
    ipcMain,
    clipboard,
  )

  window.loadURL(`file://${path.join(__dirname, "views", "index.html")}`);
  window.on('show', () => {
    let pastes = sort();

    window.webContents.send("clipboard-data", {
      pastes: pastes.map(v => v.text)
    });

    checkForUpdates(app.getVersion());
  })
};

ipcMain.on('update-password', (event, password) => {
  key = password;
  if(loadFailed) loadClipBoardHistoryFromFile()
});

function encrypt(text, password){
  var cipher = crypto.createCipher(algorithm, password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}

function decrypt(text, password){
  var decipher = crypto.createDecipher(algorithm, password)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

function saveClipBoardHistoryToFile(data = [], reset=false) {
  let dir = require('os').homedir()
  let writeFileSync = require('fs').writeFileSync
  let path = `${dir}/.config/clippypastes`

  let str = JSON.stringify(data)
  if(key) str = encrypt(str, key)
  if(!reset && !str) return;

  writeFileSync(path, str, { encoding: 'utf8', mode: 0o600 })
}

function loadClipBoardHistoryFromFile() {
  let dir = require('os').homedir()
  let readFile = require('fs').readFile
  let path = `${dir}/.config/clippypastes`

  readFile(path, 'utf8', (err, data) => {
    if(err) {
      console.log(err);
      return
    }

    if(!data.trim()) return; //empty file

    let originalData;
    // try to decrypt
    try {
      originalData = decrypt(data, key);
      if(originalData.trim() == "") throw Error("FAILED_DECRYPTION")
    } catch(e) {
      // probably its plaintext
      // try parsing it in plaintext JSON
      originalData = data;
    }

    try {
      originalData = JSON.parse(originalData)
    } catch(e) {
      originalData = "";
    }

    if(originalData) {
      let pastes = putAll(originalData)

      loadFailed = false;
      window.webContents.send("clipboard-data", {
        pastes: pastes.map(v => v.text)
      });
    } else {
      console.log("Data Corrupted")
    }
  })
}

process.on('uncaughtException', function (error) {
    console.log(error)
})
