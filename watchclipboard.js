'use strict'

const { clipboard } = require("electron")

/*
Usage:
```
const clipboardWatcher = require('electron-clipboard-watcher')
const watcher = clipboardWatcher({
  watchDelay: 1000,
  onTextChange: function (text) { ... }
})

watcher.stop()
```
*/

module.exports = function (opts) {
  opts = opts || {}
  const watchDelay = opts.watchDelay || 1000

  let lastText = clipboard.readText()

  const intervalId = setInterval(() => {
    const text = clipboard.readText()

    if (opts.onTextChange && textHasDiff(text, lastText)) {
      lastText = text
      return opts.onTextChange(text)
    }
  }, watchDelay)

  return {
    stop: () => clearInterval(intervalId)
  }
}

/*
Tell if there is any difference between 2 strings
*/
function textHasDiff (a, b) {
  return a && b !== a
}