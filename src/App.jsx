import { useState, useEffect, useRef } from 'preact/hooks';
import useDeepCompareEffect from 'use-deep-compare-effect'
import { getCurrentWindow } from '@tauri-apps/api/window';
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
import { TrayIcon } from '@tauri-apps/api/tray';
import { Menu } from '@tauri-apps/api/menu';

import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';

import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';

import './App.css';


async function sendNotificationIfAllowed(message) {
  const permissionGranted = await isPermissionGranted();

  if (!permissionGranted) {

    const permission = await requestPermission();

    if (permission === 'granted') {
      sendNotification(message);
    }

  } else {
    console.log(message)
  }
}

const GLOBAL_SHORT_PREFIX = "Shift+Alt"//"CmdOrControl+Shift"
const KEYCODE_ENTER = 13;
const KEYCODE_ESC = 27;

const allowedKeys = [
  // ...Array.from({ length: 9 }, (_, i) => `${i + 1}`), // '1-9'
  'a', 'b', ...'defghijklmnopqrstuvwxy', 'z',
];

function App() {
  const [history, setHistory] = useState([]);
  const [searchedItems, setSearchedItems] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(100);
  const [visible, setVisible] = useState(false);
  const [copyTimeout, setCopyTimeout] = useState({});

  const searchRef = useRef(null);
  const currentWindow = useRef(null);
  const historyRef = useRef(history);

  // Function to handle system tray menu item clicks
  const handleTrayClick = async (itemId) => {
    if (!currentWindow.current) return;

    switch (itemId) {
      case 'show_history':
        if (visible) {
          await currentWindow.current.hide()
        } else {

          await currentWindow.current.show()
        }

        setVisible(!visible)
        break;
      case 'quit':
        await currentWindow.current.hide();
        break;
      default:
        break;
    }
  };

  const registerShortcuts = async () => {
    let futures = []
    for (const key of allowedKeys) {
      const shortCutKey = `${GLOBAL_SHORT_PREFIX}+${key}`
      futures.push(register(shortCutKey, () => handleShortcut(key)))
    }

    await Promise.all(futures)
  };

  const copyToClipboard = async (text) => {
    text = text.trim();
    if (!text) return

    await writeText(text)
    if (copyTimeout) {
      clearTimeout(copyTimeout)
    }

    let timeout = setTimeout(() => {
      setCopyTimeout(null);
    }, 2000)

    setCopyTimeout(timeout)
    clearTimeout(timeout);
  }

  const handleShortcut = async (key) => {
    let index;

    // Map keys to indices
    if (allowedKeys.includes(key)) {
      index = allowedKeys.indexOf(key) - 9; // Convert 'a-z' to index
    } else {
      return; // Unsupported key
    }

    const list = isSearching ? filteredList : history;
    if (index >= 0 && index < list.length) {
      try {
        await copyToClipboard(list[index]); // Copy to clipboard
        console.log(`Copied: ${list[index]}`);
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
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
        icon: 'icons/icon.png',
        menu,
      });

      currentWindow.current = getCurrentWindow()

      currentWindow.current.hide()
      return tray

    } catch (e) {
      console.log("Failed to setup tray")
      console.error(e)
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
      console.error('Error reading clipboard:', error);
    }
  };

  useEffect(async () => {
    let tray = await initializeTray();

    await updateClipboardHistory()

    return () => {
      TrayIcon.removeById(tray.id)
    }
  }, [])

  useDeepCompareEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(async () => {
    const intervalId = setInterval(() => {
      updateClipboardHistory(historyRef, setHistory);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    }

  }, [])

  useEffect(() => {
    const setupShortcuts = async () => {
      try {
        console.log("Registering shortcuts...");
        await registerShortcuts();
      } catch (e) {
        console.error("Failed to register shortcuts:", e);
      }
    };

    setupShortcuts();

    return () => {
      console.log("Unregistering shortcuts...");
      unregisterAll();
    };
  }, []);


  const handleCopySelected = async (e, item, index) => {
    e.preventDefault();

    try {
      await copyToClipboard(item)
      let rearrangedHistory = [...history]
      rearrangedHistory = [item, ...rearrangedHistory.slice(0, index), ...rearrangedHistory.slice(index + 1)]

      setHistory(rearrangedHistory);

      sendNotificationIfAllowed("Copied")
    } catch (e) {
      console.error("failed to copy to clipboard"); // TODO: show error on App.jsx
    }
  }

  const handleHistorySearch = (e) => {
    e.preventDefault();

    let item = searchRef.current && searchRef.current.value.trim();

    if (e.keyCode == KEYCODE_ESC || item.length < 3) {
      setIsSearching(false);
      setFilteredList([]);;
      searchRef.current.value = ""

      return;
    }

    setIsSearching(true);

    let filteredItems = history.filter(msg => msg.search(item) > -1)

    setSearchedItems(filteredItems);
  }

  const renderHistory = (thisHistory) => {
    return (
      <ul className='history'>
        {
          thisHistory.map((item, index) => (
            <li
              className='flex flex-row'
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

