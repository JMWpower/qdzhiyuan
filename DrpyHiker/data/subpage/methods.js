js:
const ConfigManager = $.require('./subpage/ConfigManager.js');
//去除html标签
function removeHtmlTags(str) {
  stringex();
  return str.retag();
}

/**
 * 移除字符串中指定的字符
 * 
 * @param {string} originalText - 原始文本
 * @param {string} charsToRemove - 需要移除的字符
 * @returns {string} - 移除指定字符后的文本
 */
function removeChars(originalText, charsToRemove) {
  // 将原始文本转换为字符数组，以便后续处理
  return originalText.split('').reduce((acc, char) => {
    // 判断当前字符是否需要被移除
    return charsToRemove.includes(char) ? acc : acc + char;
  }, '');
}

function toSuperscript(mumber) {
  const superscriptMap = {
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
  }
  // 将数字转换为字符串，并替换每个字符
  return mumber.toString().split('').map(char => superscriptMap[char] || char).join('');
}

// 自然排序
function naturalSort(arr, key) {
  stringex();
  return arr.sort((a, b) => {
    let astr, bstr;
    if (typeof a === 'object' && typeof b === 'object' && key) {
      astr = a[key].retag();
      bstr = b[key].retag();
    } else {
      astr = a.toString().retag();
      bstr = b.toString().retag();
    }
    return astr.localeCompare(bstr, undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  });
}

function getLeach() {
  let leach;
  let gleach = ConfigManager.getGlobal("leach");
  let tleach = getMyVar("tempLeach", "");
  if (tleach != "") {
    leach = false;
    return leach;
  }
  if (gleach) {
    leach = true;
  }
  return leach || false;
}

function leachlist(shouldLeach) {
  let leachState = shouldLeach;
  Object.defineProperty(Array.prototype, 'leachList', {
    value: function () {
      let b = "KFtcW+OAkF0pW+Wvhl0oW+OAkVxdXSk=";
      var reg = new RegExp(base64Decode(b));
      if (leachState) {
        return this.filter(v => !reg.test(v.name));
      } else {
        return this;
      }
    },
    enumerable: false,
    writable: true,
    configurable: true
  });
}

//使用排序
let usingSort = {
  name: "usingSort.json",
  path: "hiker://files/rules/DrpyHiker/",
  key: undefined,
  save(content) {
    saveFile(this.path + this.name, content);
  },
  init() {
    let json = {};
    if (!fileExist(this.path + this.name)) {
      this.save("{}");
    }
    try {
      json = JSON.parse(readFile(this.path + this.name));
    } catch (e) {
      json = {};
      this.save("{}");
    }
    return json;
  },
  sort() {
    let json = this.init();
    let sortedEntries = Object.entries(json).sort((a, b) => b[1] - a[1]);
    let sortedArray = sortedEntries.map(([key, value]) => {
      let obj = {};
      obj[key] = value;
      return obj;
    });
    return sortedArray
  },
  sortKeysByUsage(json, keys, nestedKey) {
    stringex();
    return keys.sort((a, b) => {
      let keyA, keyB, valA, valB;

      if (typeof a === 'object' && typeof b === 'object') {
        keyA = a[nestedKey];
        keyB = b[nestedKey];
      } else {
        keyA = a.toString().retag();
        keyB = b.toString().retag();
      }

      valA = json[keyA] || 0;
      valB = json[keyB] || 0;
      if (valB - valA !== 0) {
        return valB - valA;
      } else {
        return naturalSort([keyA, keyB])[0] === keyA ? -1 : 1;
      }
    });
  },
  get(keys, key) {
    let json = this.init();
    //log(this.sort())
    if (key == undefined) {
      key = this.key;
    }
    return this.sortKeysByUsage(json, keys, key);
  },
  setkey(key) {
    this.key = key;
  },
  set(key) {
    let json = this.init();
    if (json.hasOwnProperty(key)) {
      json[key] += 1;
    } else {
      json[key] = 1;
    }
    this.save(JSON.stringify(json));
  }
}

function isValidColor(color) {
  // 匹配十六进制颜色
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const namedColors = {
    black: true,
    white: true,
  };
  // 如果是常见颜色名称，返回 true
  if (namedColors[color.toLowerCase()]) {
    return true;
  }
  if (color.toLowerCase() === "random") {
    return true; // 这里可以进一步处理，例如生成一个随机颜色字符串
  }
  return hexPattern.test(color)
}

/**
 * 字体样式
 * @param {string} text 
 * @param {object} params 
 * @returns 
 */
function fontstyle(text, params, col) {
  params = params || undefined;
  var h = params.h !== false ? '““””' : '';
  let ontag = ["icon_small_3"];
  if (col != undefined) {
    if (ontag.includes(col)) {
      h = '';
    }
  }
  var tags = params.tags || "";
  if (params.c != undefined) {
    text = text.fontcolor(params.c);
  }
  if (tags) {
    var tagArray = tags.split('|').filter(e => e);
    var openTags = '';
    var closeTags = '';
    for (var i = 0; i < tagArray.length; i++) {
      openTags += '<' + tagArray[i] + '>';
      closeTags = '</' + tagArray[i] + '>' + closeTags;
    }
    text = openTags + text + closeTags;
  }
  return h + text;
}

/**
 * 计算字符串的字节数
 * @param {string} text 
 * @returns 
 */
function countTotalBytes(text) {
  var count = 0;
  for (var i = 0; i < text.length; i++) {
    var code = text.charCodeAt(i);
    if (code >= 0x0100) { // 双字节字符的 Unicode 编码大于 255
      count += 2; // 双字节字符计数为2
    } else {
      count += 1; // 单字节字符计数为1
    }
  }
  return count;
}

/**
 * 找到数组中最长的元素
 * @param {array} arr 
 * @returns 
 */
function findLongestElement(arr) {
  return arr.reduce((a, b) => a.length > b.length ? a : b);
}

/**
 * 截取字符串
 * @param {string} str 
 * @param {number} maxLength 
 * @returns 
 */
function substr(str, maxLength) {
  let len = 0;
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 255) {
      len += 2;
    } else {
      len++;
    }
    if (len > maxLength) {
      return str.slice(0, i) + '...';
    }
  }
  return str;
}

//字体背景
function backColor(title, colors) {
  var def = {
    fc: '#737A80',
    bc: '#F7F8FA',
  }
  colors = Object.assign(def, colors);
  return '<font color="' + colors.fc + '"><span style="background-color: ' + colors.bc + '">' + title + '</span></font>'
}

/**
 * 扩展字符串方法
 */
function stringex() {
  Object.defineProperties(String.prototype, {
    retag: {
      value: function () {
        return this.replace(/<[^>]*>/g, '').replace(/[“”']/g, "");
      },
      writable: true,
      enumerable: false,
    },
    Split: {
      value: function (s, e) {
        if (e) {
          return this.split(s).filter(item => item !== '');
        } else {
          return this.split(s);
        }
      },
      writable: true,
      enumerable: false,
    }
  });
}

/**
 * 扩展列表方法
 */
function arrayex() {
  Object.defineProperties(Array.prototype, {
    Last: {
      value: function () {
        return this[this.length - 1];
      },
      enumerable: false,
    },
    excludeKeys: {
      value: function (keys, exclude, renameCallback) {
        // 确定是排除还是只保留键
        const shouldExclude = typeof exclude === 'boolean' ? exclude : true;
        const keysToHandle = Array.isArray(keys) ? keys : [];

        // 使用Array.prototype.map遍历数组中的每个元素
        return this.map(item => {
          // 如果元素是一个数组，递归调用excludeKeys
          if (Array.isArray(item)) {
            return item.excludeKeys(exclude, keys, renameCallback);
          } else if (typeof item === 'object' && item !== null) {
            // 如果元素是一个对象，使用Object.fromEntries和Object.entries来处理键
            const entries = Object.entries(item);
            const processedEntries = entries.map(([key, value]) => {
              // 如果有重命名回调函数，则调用它
              if (typeof renameCallback === 'function') {
                return [renameCallback(key, value), value];
              }
              return [key, value];
            });
            const filteredEntries = shouldExclude ?
              processedEntries.filter(([key]) => !keysToHandle.includes(key)) :
              processedEntries.filter(([key]) => keysToHandle.includes(key));
            return Object.fromEntries(filteredEntries);
          } else {
            // 如果元素不是对象或数组，直接返回
            return item;
          }
        });
      },
      enumerable: false, // 设置为不可枚举
    },
    transformKeys: {
      value: function (keyMapping) {
        // 使用Array.prototype.map遍历数组中的每个元素
        return this.map(item => {
          // 如果元素是一个数组，递归调用transformKeys
          if (Array.isArray(item)) {
            return item.transformKeys(keyMapping);
          } else if (typeof item === 'object' && item !== null) {
            // 如果元素是一个对象，使用Object.fromEntries和Object.entries来处理键
            const entries = Object.entries(item);
            const transformedEntries = entries.map(([key, value]) => {
              const newKey = keyMapping[key] || key; // 如果键在映射中，使用新键；否则使用原始键
              return [newKey, value];
            });
            return Object.fromEntries(transformedEntries);
          } else {
            // 如果元素不是对象或数组，直接返回
            return item;
          }
        });
      },
      enumerable: false, // 设置为不可枚举
    }
  });
}

/**
 * 扩展对象方法
 */
function objectex() {
  Object.defineProperties(Object.prototype, {
    // 添加 isEmpty 属性
    isEmpty: {
      get: function () {
        return Object.keys(this).length === 0;
      },
      configurable: true,
      enumerable: false  // 设置为不可枚举
    }
  });
}

/**
 * 获取历史记录
 * @param {string} mode 
 * @param {string} skey 
 * @param {string} id 
 * @param {object} value 
 * @returns 
 */
function historylog(mode, skey, id, value) {
  let er = ConfigManager.getErConfig();
  var name = "history.json";
  let json = [];
  if (skey.includes("测@")) {
    return [];
  }
  if (fileExist(name)) {
    json = JSON.parse(readFile(name, 0)) || [];
  }
  if (mode == "get") {
    let index = json.findIndex(obj => obj.skey === skey && obj.id === id);
    if (index != -1) {
      return String(json[index].page);
    }
  }
  let maxcount = er.历史记录;
  if (mode == "set") {
    if (json.length > maxcount) {
      json = json.slice(json.length - maxcount);
    }
    //log(json.length)
    let index = json.findIndex(obj => obj.skey === skey && obj.id === id);
    if (index != -1) {
      if (json[index].page != value.page) {
        json[index].page = value.page;
        saveFile(name, JSON.stringify(json), 0);
      };
    } else {
      json.push({
        skey: skey,
        id: id,
        title: value.title,
        page: value.page,
      })
      saveFile(name, JSON.stringify(json), 0);
    }
  }
}

function isDarkMode() {
  const Configuration = android.content.res.Configuration;
  let cx = getCurrentActivity();

  let theme = cx.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
  return theme == Configuration.UI_MODE_NIGHT_YES;

}

function insertArrayAt(array, index, elementsToInsert) {
  if (!Array.isArray(elementsToInsert)) {
    elementsToInsert = [elementsToInsert];
  }
  // 使用splice方法插入数组
  array.splice.apply(array, [index, 0].concat(elementsToInsert));
}

let erInfo = storage0.getMyVar("erInfo", "{}");

function getEInfo() {
  let source = erInfo.source;
  let skey = erInfo.skey;
  let id = erInfo.id;
  let line = getMyVar(id + "sourcei", "0");
  let his = historylog("get", skey, md5(id));
  let pagenum = Number(getMyVar("pagenum", (his || "0")));
  let maxs = erInfo.total;
  let spagenum = pagenum + 1;
  if (maxs && spagenum > maxs[line]) {
    spagenum = maxs[line];
  }
  return {
    source: source,
    line,
    pagenum,
    spagenum: spagenum,
    from: erInfo.from,
    max: erInfo.total,
    playp: erInfo.playp,
    plays: erInfo.plays,
  }
}

function erRefresh(i) {
  let er = ConfigManager.getErConfig();
  if (er.二级刷新) {
    clearMyVar("playlist_ready");
    refreshPage(false);
  } else {
    //toast(i)
    GM.get("renovateList", () => { })(i);
  }
  return "hiker://empty";
}

let cacheManage = {
  root: "hiker://files/_cache/" + MY_RULE.title + "/",
  getName(id) {
    return this.root + md5(id);
  },
  get(id) {
    let name = this.getName(id);
    if (fileExist(name)) {
      return JSON.parse(fetch(name))
    }
    return {};
  },
  set(id, json) {
    let name = this.getName(id);
    saveFile(name, JSON.stringify(json), 0);
  },
  del(id) {
    let name = this.getName(id);
    deleteFile(name);
  },
  exist(id) {
    let name = this.getName(id);
    if (fileExist(name)) {
      return true;
    } else {
      return false;
    }
  }
}

let erOptions = {
  get(key, def) {
    if (key == undefined) {
      return erInfo;
    }
    return erInfo[key] || def;
  },
  set(key, value) {
    erInfo[key] = value;
    storage0.putMyVar("erInfo", erInfo);
  }
}

function removeDuplicatesByValue(arr, valueToCheck) {
  // 使用 Set 对象来存储已经遇到的值
  const seenValues = new Set();
  const uniqueArr = [];
  // 遍历原始数组
  for (let obj of arr) {
    // 如果对象包含要检查的值，并且这个值之前没有出现过，则添加到结果数组中
    if (obj[valueToCheck] && !seenValues.has(obj[valueToCheck])) {
      seenValues.add(obj[valueToCheck]);
      uniqueArr.push(obj);
    }
  }
  return uniqueArr;
}

function viewSourse(s) {
  let ss = s ? s : { by: "current" }
  deleteFile("hiker://files/_cache/viewSourceCode.js")
  clearMyVar("tempcode");
  clearMyVar("testVars");
  return "hiker://page/editSources#noHistory##noRecordHistory#?rule=" + MY_RULE.title + "&source=" + base64Encode(JSON.stringify(ss));
}

function createLogger(shouldCheckIsCloseLog) {
  const originalLog = log; // 使用 console.log 作为原始的 log 函数
  const isCloseLog = ConfigManager.getGlobal("useLog"); // 获取本地存储项
  //originalLog("s:" + shouldCheckIsCloseLog)
  //originalLog("use:" + isCloseLog)
  return function () {
    var message = Array.prototype.map.call(arguments, function (arg) {
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(arg);
      } else {
        return String(arg);
      }
    }).join(' ');
    if (shouldCheckIsCloseLog && !isCloseLog) {
      return; // 如果应该检查但 isCloseLog 为 false，则不执行日志记录
    }
    originalLog(message);
  };
}

let drpyConfig = {
  path: "hiker://files/rules/DrpyHiker/" + "drpyconfig.json",
  uniqueArrayByProperty(array, property) {
    let unique = [];
    let map = new Map();
    for (let item of array) {
      let key = item[property];
      if (!map.has(key)) {
        map.set(key, true);
        unique.push(item);
      }
    }
    return unique;
  },
  get() {
    let list = [];
    try {
      list = JSON.parse(readFile(this.path)) || [];
    } catch (e) {
      console.log(e.message);
    }
    this.uniqueArrayByProperty(list, "path");
    return list;
  },
  has(path) {
    let list = this.get();
    return list.findIndex(x => x.path == path) != -1
  },
  set(obj, index) {
    let list = this.get();
    if (!this.has(obj.path)) {
      if (index == undefined) {
        list.push(obj);
      } else {
        list.splice(index, 0, obj);
      }
    }
    saveFile(this.path, JSON.stringify(list));
  }
}

function removeTagsExceptList(htmlString, tagList) {
  if (htmlString == "") {
    return htmlString;
  }
  if (tagList == undefined) {
    tagList = [];
  }
  // 构建一个正则表达式，排除列表中的标签
  let tagPattern = tagList.map(tag => `</?${tag}(\\s+[^>]*)?>`).join('|');
  let regex = tagList.length > 0
    ? new RegExp(`<(?!${tagPattern})[^>]+>|<!--.*?-->`, 'gs')
    : /<[^>]+>|<!--.*?-->/gs; // 如果 tagList 为空，则匹配所有标签
  // 使用正则表达式替换掉除了列表中标签之外的所有HTML标签
  return htmlString.replace(regex, (match) => {
    // 如果匹配的是注释，则直接返回空字符串
    if (match.startsWith('<!--')) {
      return '';
    }
    // 如果 tagList 为空，则直接返回空字符串，因为我们要删除所有标签
    if (tagList == undefined || tagList.length === 0) {
      return '';
    }
    // 如果匹配的是我们要保留的标签，则返回原字符串
    if (tagList.some(tag => match.includes(`<${tag}`) || match.includes(`</${tag}>`))) {
      return match;
    }
    // 否则，返回空字符串，即删除该标签
    return '';
  });
}

function replaceTagsWithMapping(htmlString, replacementMap) {
  // 遍历映射并构建替换逻辑
  const replacements = Object.entries(replacementMap).map(([newTag, oldTags]) => {
    // 构建正则表达式来匹配旧标签的开始和结束标签
    let openTagRegex = new RegExp(`<(${oldTags.join('|')})(\\s+[^>]*)?>`, 'g');
    let closeTagRegex = new RegExp(`</(${oldTags.join('|')})>`, 'g');
    // 替换函数
    return (str) => {
      return str
        .replace(openTagRegex, `<${newTag}$2>`)  // 替换开始标签
        .replace(closeTagRegex, `</${newTag}>`); // 替换结束标签
    };
  });
  // 执行替换
  return replacements.reduce((acc, replace) => {
    return replace(acc);
  }, htmlString);
}


$.exports = {
  log: createLogger(true), //log 受 isCloseLog 控制
  slog: createLogger(false), // slog 不受 isCloseLog 控制
  drpyConfig,
  createLogger,
  toSuperscript,
  removeChars,
  viewSourse,
  getLeach,
  leachlist,
  erRefresh,
  cacheManage,
  isDarkMode,
  naturalSort,
  usingSort,
  removeHtmlTags,
  fontstyle,
  backColor,
  isValidColor,
  findLongestElement,
  countTotalBytes,
  insertArrayAt,
  historylog,
  erOptions,
  getEInfo,
  substr,
  stringex,
  arrayex,
  objectex,
  removeDuplicatesByValue,
  removeTagsExceptList,
  replaceTagsWithMapping,
}