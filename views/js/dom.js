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
  } else if(el.startsWith("#")) {
    return document.querySelector(el)
  }

  let els = document.querySelectorAll(el);

  return els.length ? els.length == 1 ? els[0] : els : null;
}

window.$ = $
