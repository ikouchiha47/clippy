import { useState, useEffect, useRef } from 'preact/hooks';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
import { TrayIcon } from '@tauri-apps/api/tray';
import { Menu } from '@tauri-apps/api/menu';

import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';

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

const KEYCODE_ENTER = 13;
const KEYCODE_ESC = 27;

function App() {
  const [history, setHistory] = useState([]);
  const [searchedItems, setSearchedItems] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(100);
  const [visible, setVisible] = useState(false);

  const searchRef = useRef(null);
  const currentWindow = useRef(null);

  // Function to update clipboard history
  const updateClipboardHistory = async () => {
    try {
      const currentClipboard = (await readText()).trimEnd();

      if (currentClipboard && !history.includes(currentClipboard)) {
        const newHistory = [currentClipboard, ...history];
        if (newHistory.length > historyLimit) newHistory.pop();
        setHistory(newHistory);
      }
    } catch (error) {
      console.error('Error reading clipboard:', error);
    }
  };

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
        action: (event) => {
          console.log("event", event.type)
        }
      });

      currentWindow.current = getCurrentWindow()

      currentWindow.current.hide()
      return tray

    } catch (e) {
      console.log("Failed to setup tray")
      console.error(e)
    }
  };

  useEffect(async () => {
    let tray = await initializeTray();
    // console.log("get tray", tray) 

    return () => {
      TrayIcon.removeById(tray.id)
    }
  }, [])

  useEffect(() => {
    const intervalId = setInterval(updateClipboardHistory, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [history]);

  const handleCopySelected = async (e, item, index) => {
    e.preventDefault();

    try {
      await writeText(item)
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
            <li key={index} onClick={async (e) => await handleCopySelected(e, item, index)}>{item}</li>
          ))
        }
      </ul>
    )
  }

  return (
    <div>
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
      {isSearching ? renderHistory(searchedItems) : renderHistory(history)}
    </div>
  );
}

export default App;

