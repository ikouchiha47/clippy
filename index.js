const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  clipboard,
  globalShortcut,
  session
} = require("electron");
const path = require("path");
const watchClipB = require("./watchclipboard");
const { put, search, sort, all } = require("./clips");
const iconPath = path.join(__dirname, "rclipboard.png");

let dataCopied = false; // is data copied from app

app.dock.hide();

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
});

app.on("will-quit", () => {
  globalShortcut.unregister("Control+Space");
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  app.quit();
});

const createTray = () => {
  tray = new Tray(iconPath);

  tray.on("right-click", () => { app && app.quit() });
  tray.on("double-click", toggleWindow);
  tray.on("click", function(event) {
    toggleWindow();

    if (window.isVisible() && process.defaultApp && event.metaKey) {
      window.openDevTools({ mode: "detach" });
    }
  });
};

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
        let remoteVersion = json.version

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

const createWindow = () => {
  let watcher;
  let pastes = [];

  window = new BrowserWindow({
    width: 300,
    height: 450,
    fullscreenable: false,
    resizable: false,
    transparent: true,
    show: false,
    frame: false,
    webPreferences: {
      backgroundThrottling: false,
      devTools: true
    }
  });

  window.setVisibleOnAllWorkspaces(true)
  window.loadURL(`file://${path.join(__dirname, "index.html")}`);
  window.webContents.openDevTools({ mode: 'detach'});

  // Hide the window when it loses focus
  window.on("blur", () => {
    if (!window.webContents.isDevToolsOpened()) {
      window.hide();
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

    checkForUpdates(app.getVersion());
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

    setInterval(() => {
      let data = sort();

      if (pastes.length && pastes[0].time != data[0].time) {
        pastes = data;

        if(window.isVisible()) return;

        window.webContents.send("clipboard-data", {
          pastes: pastes.map(v => v.text)
        });
      }
    }, 1000);
  });

  ipcMain.on("copy-data", (event, text) => {
    dataCopied = true;
    return clipboard.writeText(text);
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
};

process.on('uncaughtException', function (error) {
    console.log(error)
})
