import { useState, useEffect, useRef } from 'preact/hooks';
import useDeepCompareEffect from 'use-deep-compare-effect'
import { getCurrentWindow } from '@tauri-apps/api/window';
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
import { TrayIcon } from '@tauri-apps/api/tray';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import { Menu } from '@tauri-apps/api/menu';
import { invoke } from '@tauri-apps/api/core';

import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';

import './App.css';

const GLOBAL_SHORT_PREFIX = "Shift+Alt"//"CmdOrControl+Shift"
const KEYCODE_ENTER = 13;
const KEYCODE_ESC = 27;

const allowedKeys = [
  // ...Array.from({ length: 9 }, (_, i) => `${i + 1}`), // '1-9'
  'a', 'b', ...'defghijklmnopqrstuvwxy', 'z',
];

const Config = {
  saveFileName: '/tmp/clippyhistory',
  syncTimeIntervalMs: 1000 * 60,
  longSyncTime: 1000 * 60 * 60 * 2,
}

async function saveHistory(history, fileName) {
  if (history.length == 0) return;

  const data = JSON.stringify(history);
  await invoke('save_to_file', { data, fileName })
  return true
}

async function loadHistory(fileName) {
  let dataStr = await invoke('load_from_file', { fileName });
  if (dataStr == "") return [];

  try {
    return JSON.parse(dataStr);
  } catch (e) {
    return [];
  }
}

function App() {
  const [history, setHistory] = useState([]);
  const [searchedItems, setSearchedItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(100);
  const [visible, setVisible] = useState(false);
  const [copyTimeout, setCopyTimeout] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now())

  const searchRef = useRef(null);
  const currentWindow = useRef(null);
  const historyRef = useRef(history);
  const searchOnRef = useRef(isSearching);
  const searchItemsRef = useRef(searchedItems);

  const getState = () => {
    return (historyRef && historyRef.current) || []
  }

  const bringFront = async (currWindow) => {
    await currWindow.show()
    await currWindow.setFocus()
  }

  const hideWindow = async (currWindow, fnKey) => {
    if ((Date.now() - lastSyncTime) >= Config.syncTimeIntervalMs)
      await saveHistory(getState(), Config.saveFileName)

    currWindow[fnKey] ? await currWindow[fnKey]() : await Promise.reject("")
  }

  const beforeFunc = async (innerFn, wrapperFn) => {
    return async (innerArgs) => {
      await innerFn(innerArgs)

      return wrapperFn
    }
  }

  const watchAndSaveHistory = async () => {
    return setInterval(async () => {
      await saveHistory(getState(), Config.saveFileName)
    }, Config.longSyncTime) // every 2 hours
  }


  // Function to handle system tray menu item clicks
  const handleTrayClick = async (itemId) => {
    if (!currentWindow.current) return;

    switch (itemId) {
      case 'show_history':
        if (visible) {
          await hideWindow(currentWindow.current, 'hide')
        } else {
          await bringFront(currentWindow.current)
        }

        setVisible(!visible)
        break;
      case 'quit':
        await hideWindow(currentWindow.current, 'close')
        break;
      default:
        break;
    }
  };

  const registerShortcuts = async () => {
    // global shortcut

    await register("CommandOrControl+Shift+K", async (e) => {
      if (e.state === "Pressed") return;

      let currWindow = currentWindow && currentWindow.current;
      // let currWindow = getCurrentWindow();
      let isVisible = await currWindow.isVisible()
      if (isVisible) {
        await hideWindow(currWindow, 'hide')
        return
      }

      await bringFront(currWindow);
    })

    let futures = []
    for (const key of allowedKeys) {
      const shortCutKey = `${GLOBAL_SHORT_PREFIX}+${key}`
      futures.push(register(shortCutKey, (e) => handleShortcut(e, key)))
    }

    await Promise.all(futures)
  };

  const copyToClipboard = async (text, index) => {
    text = text.trim();
    if (!text) return

    await writeText(text)
    if (copyTimeout) {
      clearTimeout(copyTimeout)
    }

    let timeout = setTimeout(() => {
      clearTimeout(timeout)
      setCopyTimeout(null)
      setSelectedIndex(-1)
    }, 360)

    setCopyTimeout(timeout)
    setSelectedIndex(index);

  }

  const handleShortcut = async (e, key) => {
    if (e.state === "Pressed") return;

    let index = 0;

    // Map keys to indices
    if (allowedKeys.includes(key)) {
      index = allowedKeys.indexOf(key); // Convert 'a-z' to index
    } else {
      return;
    }

    const list = searchOnRef && searchOnRef.current ? searchItemsRef.current : historyRef.current;
    // console.log("list", 
    // searchOnRef.current, 
    // searchedItems, 
    // searchItemsRef.current, 
    // index)

    if (index >= 0 && index < list.length) {
      try {
        await copyToClipboard(list[index], index); // Copy to clipboard
        console.log(`Copied: ${list[index]}`);
      } catch (err) {
        console.log('error: Failed to copy to clipboard:', err);
      }
    }
  };


  const initializeTray = async () => {
    try {
      const menu = await Menu.new({
        items: [
          { text: 'show history', id: 'show_history', action: handleTrayClick },
          { text: 'quit', id: 'quit', action: handleTrayClick },
        ]
      })

      const tray = await TrayIcon.new({
        icon: await defaultWindowIcon(),
        menu,
      });

      currentWindow.current = getCurrentWindow()

      currentWindow.current.hide()
      return tray

    } catch (e) {
      console.log("error: Failed to setup tray")
      console.log(e)
    }
  };

  const updateClipboardHistory = async (historyRef, setHistory) => {
    try {
      const currentClipboard = (await readText()).trimEnd();
      //
      // console.log("current", 
      //   currentClipboard, 
      //   historyRef.current, 
      //   currentClipboard && !historyRef.current.includes(currentClipboard))

      if (!historyRef) return;

      if (currentClipboard && !historyRef.current.includes(currentClipboard)) {
        const newHistory = [currentClipboard, ...historyRef.current];
        if (newHistory.length > historyLimit) newHistory.pop();

        setHistory(newHistory);
        historyRef.current = newHistory;
      }

    } catch (error) {
      console.log('error: Error reading clipboard:', error);
    }
  };

  useEffect(async () => {
    if (!currentWindow) return;

    let tray = await initializeTray();

    try {
      let savedHistory = await loadHistory(Config.saveFileName)
      setHistory(savedHistory)
    } catch (e) { }

    await updateClipboardHistory()

    return async () => {
      await TrayIcon.removeById(tray.id)
    }
  }, [])

  useDeepCompareEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    if (!searchOnRef) return;
    if (searchOnRef.current == isSearching) return;

    searchOnRef.current = isSearching
  }, [isSearching])

  useEffect(async () => {
    const intervalId = setInterval(() => {
      updateClipboardHistory(historyRef, setHistory);
    }, 1000);

    const syncSaveTicker = watchAndSaveHistory()

    return () => {
      clearInterval(intervalId);
      clearInterval(syncSaveTicker)
    }

  }, [])

  useEffect(() => {
    const setupShortcuts = async () => {
      try {
        console.log("Registering shortcuts...");
        await registerShortcuts();
      } catch (e) {
        console.log("error: Failed to register shortcuts:", e);
      }
    };

    setupShortcuts();

    return async () => {
      console.log("Unregistering shortcuts...");
      await unregisterAll();
    };
  }, []);


  const handleCopySelected = async (e, item, index) => {
    e.preventDefault();

    try {
      await copyToClipboard(item, index)
      let rearrangedHistory = [...history]
      rearrangedHistory = [item, ...rearrangedHistory.slice(0, index), ...rearrangedHistory.slice(index + 1)]

      setHistory(rearrangedHistory);
    } catch (e) {
      console.log("error: failed to copy to clipboard"); // TODO: show error on App.jsx
    }
  }

  const handleHistorySearch = (e) => {
    e.preventDefault();

    let item = searchRef.current && searchRef.current.value.trim();
    // console.log("item", item, item.length)

    if (e.keyCode == KEYCODE_ESC || item.length < 3) {
      if (isSearching) setIsSearching(false);
      if (searchedItems.length) setSearchedItems([]);

      return;
    }

    if (!isSearching) setIsSearching(true);

    let filteredItems = history.filter(msg => msg.search(item) > -1)
    setSearchedItems(filteredItems);
    searchItemsRef.current = filteredItems;
  }

  const renderHistory = (thisHistory) => {
    return (
      <ul className='history'>
        {
          thisHistory.map((item, index) => (
            <li
              className={`flex flex-row ${copyTimeout && selectedIndex == index ? 'hover' : ''}`}
              key={index}
              onClick={async (e) => await handleCopySelected(e, item, index)}>
              <span className='text-grey'>{allowedKeys[index]}</span>
              <span className='history-item'>{item}</span>
            </li>
          ))
        }
      </ul>
    )
  }

  return (
    <div className='container'>
      <h1>Clipboard History</h1>
      <div className='history-size flex flex-row justify-between align-center'>
        <label htmlFor='size'>History Limit</label>
        <input
          id='history-size-value'
          type='number'
          value={historyLimit}
          onChange={(e) => setHistoryLimit(Math.min(Number(e.value), 20))}
        />
      </div>
      <div className='search-wrapper flex flex-row align-center'>
        <input
          className='search-input'
          type="text"
          ref={searchRef}
          placeholder='search for items in clipboard'
          onKeyUp={handleHistorySearch}
        />
      </div>
      <p className='text-center text-grey' style={{ paddingBlock: '0.4rem' }}>{GLOBAL_SHORT_PREFIX}</p>
      {isSearching ? renderHistory(searchedItems) : renderHistory(history)}
      {copyTimeout ? <p className='notification'>Copied</p> : <></>}
    </div>
  );
}

export default App;

