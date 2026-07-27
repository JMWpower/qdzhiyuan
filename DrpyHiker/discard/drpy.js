


const skey = module.importParam;

function initHiker() {
  const ConfigManager = $.require('./subpage/ConfigManager.js');
  const isCloseLog = !ConfigManager.getGlobal("useLog");
  const localKey = "drpy";
  const CryptoUtil = $.require("hiker://assets/crypto-java.js");
  globalThis.local = {
    set(rulekey, k, v) {
      storage0.setItem(localKey + "@" + rulekey + "@" + k, v);
    },
    get(rulekey, k, v) {
      return storage0.getItem(localKey + "@" + rulekey + "@" + k, "") || v;
    },
    delete(rulekey, k) {
      storage0.clearItem(localKey + "@" + rulekey + "@" + k);
    }
  };
  globalThis.getProxy = function () {
    return getMyVar("Proxy_Url", "http://127.0.0.1:52020/proxy") + "?hikerSkey=" + encodeURIComponent(skey) + "&do=js";
  }
  eval(getCryptoJS());
  globalThis.CryptoJS = CryptoJS;

  let $request = request;
  let $post = post;

  function readFileToString(filePath) {
    const StringBuilder = java.lang.StringBuilder;
    const BufferedReader = java.io.BufferedReader;
    const File = java.io.File;
    const FileReader = java.io.FileReader;

    let file = new File(filePath);
    if (!file.exists()) return "";
    let fileContent = new StringBuilder();
    let br = null;
    try {
      br = new BufferedReader(new FileReader(file));
      let line;
      while ((line = br.readLine()) != null) {
        fileContent.append(line).append("\n");
      }
    } catch (e) {
      fileContent.append("");
    } finally {
      try {
        if (br != null) {
          br.close();
        }
      } catch (e) { }
    }
    return String(fileContent.toString());
  }
  function hasPropertyIgnoreCase(obj, propertyName) {
    return Object.keys(obj).some(key =>
      key.toLowerCase() === propertyName.toLowerCase()
    );
  }
  
  function valueStartsWith(obj, propertyName, prefix) {
    const key = Object.keys(obj).find(key =>
      key.toLowerCase() === propertyName.toLowerCase()
    );
    return key !== undefined && obj[key].startsWith(prefix);
  }

  globalThis.req = function (url, cobj) {
    try {
      let res = {};
      let obj = Object.assign({}, cobj);
      if (obj.data) {
        obj.body = obj.data;
        if ((obj.postType && obj.postType == "form") || (hasPropertyIgnoreCase(obj.headers, "Content-Type") && valueStartsWith(obj.headers, "Content-Type", "application/x-www-form-urlencoded"))) {
          let temp_obj = obj.data;
          obj.body = Object.keys(temp_obj).map(key => {
            return `${key}=${temp_obj[key]}`;
          }).join('&');
        }
        delete obj.data;
      }

      if (obj.hasOwnProperty("redirect")) obj.redirect = !!obj.redirect;
      if (obj.buffer === 2) {
        obj.toHex = true;
      }
      obj.headers = Object.assign({
        Cookie: "#noCookie#"
      }, obj.headers);
      if (url === "https://api.nn.ci/ocr/b64/text" && obj.headers) {
        obj.headers["Content-Type"] = "text/plain";
      }
      let isFile = url.startsWith("file://");
      if (isFile && (url.includes("?type=") || url.includes("?params="))) {
        url = url.slice(0, url.lastIndexOf("?"));
      }
      for (let key in obj.headers) {
        if (typeof obj.headers[key] !== "string") {
          obj.headers[key] = String(obj.headers[key]);
        }
      }
      let r = "";
      if (isFile) {
        r = readFileToString(url.replace("file://", ""));
      } else {
        r = $request(url, obj);
      }
      if (obj.withHeaders) {
        r = JSON.parse(r);
        res.content = r.body;
        res.headers = {};
        for (let [k, v] of Object.entries(r.headers || {})) {
          res.headers[k] = v[0];
        }
      } else {
        res.content = r;
      }
      if (obj.buffer === 2) {
        res.content = CryptoUtil.Data.parseHex(res.content).toBase64(_base64.NO_WRAP);
      }
      return res;
    } catch (e) {
      log("Error" + e.toString());
    }
  }
  /*
  const JinJa = $.require("https://cdn.bootcdn.net/ajax/libs/mustache.js/4.1.0/mustache.js");
 
  const JP = $.require("https://jsonpath-plus.github.io/JSONPath/dist/index-browser-umd.cjs");
  globalThis.cheerio = {
      jinja2(template, obj) {
          
          return $.log(JinJa.render(template, obj));
      },
      jp(path, json) {
          return JP.JSONPath({
              path,
              json
          })[0];
      }
  }*/
  /*globalThis.spdfa=pdfa;
  globalThis.spdfh=pdfh;
  globalThis.spd=pd;*/
  
  globalThis.pdfa = _pdfa;
  globalThis.pd = _pd;
  globalThis.pdfh = _pdfh;
  String.prototype.replaceAll = function (search, replacement) {
    return this.split(search).join(replacement);
  };
  let $toString = Function.prototype.toString;
  Function.prototype.toString = function () {
    return $toString.apply(this).trim();
  };
  if (isCloseLog) {
    // 重写console.log函数
    console.log = function () {
      // 检查传入参数的数量
      if (arguments.length > 1) {
        // 如果参数数量大于1，调用原始的console.log函数
        //originalLog.apply(console, arguments);
      } else {
        return;
      }
      // 如果参数只有一个，则不做任何操作
    };
  }
}
initHiker();
const drpyPath = getPath("hiker://files/data/" + MY_RULE.title + "/libs_hiker/drpy2.js");

if (!fileExist(drpyPath)) {
  throw new Error("缺少drpy.js运行库");
}
let drpy = $.require(drpyPath);
/*
let currentPath = "";
let $init = drpy.init;
drpy.init = function(ext) {
    if (ext === currentPath) return;
    $init.call(this, ext);
    currentPath = ext;
}*/
function sync(func, sp) {
  return new org.mozilla.javascript.Synchronizer(func, sp || {});
}
//drpy.proxy = sync(drpy.proxy, drpy);
drpy.play = sync(drpy.play, drpy);
$.exports = drpy;