const ipc = require('electron').ipcRenderer;
let pastes = [];
let selected = 1; // used to determine which element to highlight
let keymap = { seq: [] }
let codes = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57] // keycodes for numbers for shortcut

ipc.on('clipboard-data', function (event, store) {
  pastes = store.pastes;
  //console.log(pastes);
  renderPaste(store);
})

function $(el, props = {}) {
  let rx = /<([^/*]+)\/?>/;

  if(el.startsWith("<")) {
    let ma6 = el.match(rx);
    if(!ma6) return false;
    else el = ma6[1].trim();

    let d = document.createElement(el);
    Object.keys(props).forEach(prop => {
      let val = props[prop];

      if(prop == "className") d.className = val;
      else if(prop == "id") d.id = val;
      else if(prop == "data") Object.keys(props[prop]).forEach(atr => d.dataset[atr] = val[atr]);
      else if(prop == "text") d.textContent = val;
      else d.setAttribute(prop, val);
    })

    return d;
  } else if(el.startsWith(".")) {
    return document.querySelectorAll(el);
  } else if(el.startsWith("#")) {
    return document.querySelector(el)
  }

  let els = document.getElementsByTagName(el);
  return els.length ? els : null;
}

/**
 *
 * bad shit, triggers reflows
 * but necessary to do proper scroll to view with keyboard navigation
 * amount to scroll up = boundingRektHyt + offsetHyt - 450
 * amount to scroll down = - boundingRektHyt - offsetHyt - experimentalPx(13)
 *
 */


function scrollIntoView(el) {
  let offsetY = el.offsetHeight
  let top = el.getBoundingClientRect().top

  if(top > 0 /* going down */) {
    let innerY = window.innerHeight
    window.scrollBy(0, top + offsetY - innerY)
  } else if(top < 0) {
    window.scrollBy(0, top - offsetY - 13)
  }
}

/**
 *
 * select the element by index + 1 of the paste item in list
 * value received from keyup
 *
 */
function selectThis(selected) {
  if(!selected || isNaN(selected)) { selected = 1;  return; }

  let selEl = document.querySelector('.paste[data-selected=true]');
  let elToChange = document.querySelector(`#opt_${selected}`);

  if(!selEl || !elToChange) return;

  selEl.dataset.selected = false;
  elToChange.parentNode.dataset.selected = true;
  scrollIntoView(elToChange.parentNode)
}

function renderEachPaste(text, i) {
  i += 1;

  let parentEl = $("<div />", { className: "paste", data: { key: i, selected: i == selected}});
  let shortcutEl = $("<span />", { className: "shortcut", text: i < 100 ? "⌘" + i : "" })
  let textEl = $("<span />", { className: "text", text: text, title: text, id: `opt_${i}`})

  parentEl.appendChild(shortcutEl)
  parentEl.appendChild(textEl);

  return parentEl;
}

function renderPaste(store) {
  let parent = $('#pastes');

  let docfrag = document.createDocumentFragment();
  store.pastes.forEach((paste, i) => {
    let el = renderEachPaste(paste, i);
    docfrag.appendChild(el)
  });

  parent.innerHTML = '';
  parent.appendChild(docfrag);
}

function getSelected(keycode) {
  let toSelect = (keycode == 40 ? selected + 1 : (keycode == 38 ? selected - 1 : selected))

  if(toSelect < 1) toSelect = pastes.length;
  else if(toSelect > pastes.length) toSelect = 1;

  return toSelect;
}

/**
 *
 * the keyup keydown handler exists to serve two purposes:
 * * to handle shortcut selection
 * * to handle scroll
 * the keypress combo for selection is ctrl/cmd + number
 *
 * when a key is pressed, set the keymap[keycode] to true
 * * if its an arrow key
 * * * move the selection highlighter and scroll into view
 * * * discard rest sequence
 *
 * * if its enter
 * * * send signal to copy the highlighted selection
 * * * discard rest sequence
 *
 * * if it starts with ctrl/cmd
 * * * if its any of number keys, push the keys to seq
 *
 * on key release
 * if only the last release is a cmd/ctrl
 * * get the first two elements in seq(coz history is 0 to 99)
 * * * discard rest sequence
 * * * convert to string to get the nth selector
 *
 */


window.onkeydown = function(e) {
  keycode = [17, 91].includes(e.keyCode) ? 91 : e.keyCode
  keycode = Number(keycode);
  keymap[keycode] = true;

  if(keycode == 27) {
    keymap = { seq: [] };
    ipc.send("hide-window");
    return
  }

  if([38, 40].includes(keycode)) {
    keymap = { seq: [] }
    selected = getSelected(keycode);
    selectThis(selected)
  } else if(keycode == 13) {
    keymap = { seq: [] }
    let paste = pastes[selected - 1];
    if(paste) ipc.send('copy-data', paste);
  } else if(codes.includes(keycode)) {
    keymap.seq.push(keycode)
  }
}

window.onkeyup = function(e) {
  keycode = [17, 91].includes(e.keyCode) ? 91 : e.keyCode
  keymap[keycode] = false;

  if(keycode == 91) {
    // can be extended to mulptilr key presses
    let seq = keymap.seq.slice(0, 2)
    keymap = { seq: [] };

    let arr = seq.map(v => v - 48);
    if(arr.filter(a => a < 0).length) return;

    let index = arr.join('');
    if(index > 99) return;

    let textEl = $(`#opt_${index}`);

    if(textEl && textEl.textContent) {
      ipc.send('copy-data', textEl.textContent);

      selected = 1;
      selectThis(selected);
    }
  }
}

window.onload = () => {
  $('#pastes').onclick = function(e) {
    let target = e.target;
    let parentEl;

    if(!target) return;
    if(target.className == "paste") parentEl = target;
    else if(target.parentNode.className == "paste") parentEl = target.parentNode;

    if(!parentEl) return;

    selected = parentEl.dataset.key
    selected = Number(selected);

    selectThis(selected);
  }

  $('#search_term').onkeyup = $('#search_term').onchange = function(e) {
    let timeout;

    function fn() {
      ipc.send("search-data", e.target.value);
    }

    if (timeout) {
      window.cancelAnimationFrame(timeout);
    }

    timeout = window.requestAnimationFrame(fn)
  }
}
