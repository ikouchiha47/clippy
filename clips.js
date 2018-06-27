const CACHE_SIZE = 99
let DATA = [];

function quote(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function findWithIndex(arr, cb) {
  for(let i = 0, len = arr.length; i < len; i++) {
    if(cb(arr[i], i)) return { index: i, value: arr[i] }
  }

  return { index: -1, value: null }
}

function putInCache(text) {
  let data = getFromCache({text: text})

  if(data && data.text == text ) {
    data.time = +(new Date());
    rearrangeData()
    return DATA;
  }

  DATA = [{text: text, time: +(new Date())}].concat(DATA)
  rearrangeData();

  return DATA;
}

function rearrangeData() {
  DATA = DATA.sort((p, n) => n.time - p.time)
  if(DATA.length > CACHE_SIZE) DATA.pop();

  return DATA
}

function getFromCache(props = {}) {
  if(props.text) return getByText(props.text)
  else if(props.index) return getByIndex(props.index - 1)
  else { index: -1 }
}

function getByText(text) {
  let { index, value } = findWithIndex(DATA, (value) => value.text == text)
  if(index < 0) return { index: index }

  DATA[index]["time"] = +(new Date())
  rearrangeData();

  return value
}

function getByIndex(id) {
  let { index, value } = findWithIndex(DATA, (value, index) => index == id)
  if(index < 0) return { index: index }

  DATA[index]["time"] = +(new Date())
  rearrangeData();

  return value
}

function searchInCache(text) {
  let rx = new RegExp(`${quote(text)}`, 'i')

  return DATA
          .filter(d => rx.test(d.text))
          .sort((p, n) => n.time - p.time)

}

function removeFromCache(text) {
  let { index, value } = findWithIndex(DATA, (value) => value.text == text)
  if(index < 0) return false;

  DATA = DATA.filter((v, i) => i == index);
  return true
}

function getAllData() {
  return DATA;
}

module.exports = {
  put: putInCache,
  search: searchInCache,
  get: getFromCache,
  sort: rearrangeData,
  all: getAllData,
  remove: removeFromCache
}