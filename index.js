const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  clipboard,
  globalShortcut
} = require("electron");
const path = require("path");
const watchClipB = require("./watchclipboard");
const { put, search, sort, all } = require("./clips");
const iconPath = path.join(__dirname, "rclipboard.png");

app.dock.hide();

app.on("ready", () => {
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
      backgroundThrottling: false
    }
  });

  window.loadURL(`file://${path.join(__dirname, "index.html")}`);
  //window.webContents.openDevTools();

  // Hide the window when it loses focus

  window.on("blur", () => {
    if (!window.webContents.isDevToolsOpened()) {
      window.hide();
    }
  });

  window.webContents.on("did-finish-load", () => {
    pastes = all();
    window.webContents.send("clipboard-data", {
      pastes: pastes.map(v => v.text)
    });

    if (watcher) watcher.stop();

    watcher = watchClipB({
      onTextChange: text => {
        text = text.trim();
        if (text) put(text);

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
        window.webContents.send("clipboard-data", {
          pastes: pastes.map(v => v.text)
        });
      }
    }, 1000);
  });

  ipcMain.on("copy-data", (event, text) => {
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
