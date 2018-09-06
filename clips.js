const CACHE_SIZE = 99
let DATA = [];

function testData() {
    for(let i = 0; i < 50 ; i++) {
        DATA.push({text: `Copytext ${i}` })
    }
}

testData();

let Sort = {
  quick: function(arr, left, right) {
    if(left < right) {
      let pi = Sort.partition(arr, left, right)

      this.quick(arr, left, pi - 1)
      this.quick(arr, pi + 1, right)
    }
  },

  partition: function(arr, left, right) {
    let pivot = arr[right]
    let i, trace = left;

    for(i = left; i < right; i++) {
      if(arr[i].time >= pivot.time) {
        [arr[i], arr[trace]] = [arr[trace], arr[i]];
        trace += 1
      }
    }

    [arr[right], arr[trace]] = [arr[trace], arr[right]];
    return trace;
  },
}

function trace() {
  console.log(new Error().stack)
}

function quote(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function findWithIndex(arr, cb) {
  for(let i = 0, len = arr.length; i < len; i++) {
    if(cb(arr[i], i)) return { index: i, value: arr[i] }
  }

  return { index: -1, value: null }
}

function putInCache(text, shouldUpdate) {
  let data = getFromCache({text: text})

  if( data && data.text == text ) {
    data.time = +(new Date());
    if(shouldUpdate) rearrangeData()
    return DATA;
  }

  DATA = [{ text: text, time: +(new Date()) }].concat(DATA)
  if(shouldUpdate) rearrangeData();

  return DATA;
}

function rearrangeData() {
  Sort.quick(DATA, 0, DATA.length - 1)

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

  return value
}

function getByIndex(id) {
  let { index, value } = findWithIndex(DATA, (value, index) => index == id)
  if(index < 0) return { index: index }

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
