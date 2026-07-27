js:
var d = [];
var s = getParam("Sourse", "");
if (s == "dW5kZWZpbmVk") {
  s = undefined;
}
let hikpop = "http://hiker.nokia.press/hikerule/rulelist.json?id=6966";

if (s) {
  s = base64Decode(s);
  try {
    s = JSON.parse(s);
  } catch { }
}

addListener("onClose", () => {
  clearMyVar("tempcode");
});

let path = "hiker://files/_cache/viewSourceCode.js";
let tpath = "hiker://files/_cache/SourceCode.json";
let spath = "hiker://files/_cache/TestSourceCode.js";
let code;
let runtimeConfig = GM.defineModule("runtimeConfig");
let source = s ? s : runtimeConfig.getCurrentSource();
setPageTitle(source.name)
let DrpyManage = GM.defineModule("DrpyManage");
//let ext = runtimeConfig.getCurrentSourcePath();
let ext;
if (source.ext) {
  ext = runtimeConfig.getAbsolutePath(source.ext);
}
if (!source.hasOwnProperty("ext")) {
  ext = source;
}

let cfg;
if (typeof ext == "object" || ext == "new") {
  cfg = runtimeConfig.getCurrentConfig();
  if (ext != "new") {
    writeFile(tpath, JSON.stringify(ext, null, 2));
    ext = tpath;
  }
} else if (typeof ext == "string" && ext.startsWith("file")) {

}

if (s == "new" && !MY_URL.includes("window=1")) {
  d.push({
    title: `““””<small>新窗口</small>`,
    col_type: "text_center_1",
    url: MY_URL + "&window=1" + "#noRecordHistory##noHistory#",
    extra: {
      newWindow: true
    }
  })
}

if (s == "new") {
  setPageTitle("新");
  path = spath;
  source = {};
}


let testVars = storage0.getMyVar("testVars", {});
if (cfg) {
  source = Object.assign(source, testVars);
  if (source.id && testVars.key) {
    source.id = testVars.key;
  }
} else {
  source = Object.assign(source, testVars);
}


if (source.api == "csp_AppYsV2") {
  path = testVars.ext || source.ext;
}

Object.defineProperty(String.prototype, 'small', {
  get: function () {
    return `““””<small>${this}</small>`;
  },
  enumerable: false,
  configurable: true
});

//log(source)
if (s != "new") {
  d.push({
    title: "+".small,
    col_type: "flex_button",
    url: $('#noLoading#').lazyRule(() => {
      deleteFile("hiker://files/_cache/TestSourceCode.js")
      clearMyVar("tempcode");
      clearMyVar("testVars");
      return "hiker://page/editSource?rule=" + MY_RULE.title + "&Sourse=" + base64Encode("new") + "&window=1" + "#noRecordHistory##noHistory#";
    }),
    extra: {
      newWindow: true
    }
  })
}

d.push({
  title: "编辑".small,
  col_type: "flex_button",
  url: $('#noLoading#').lazyRule((path) => {
    toast("保存后请刷新");
    putMyVar("fileedit", "1");
    return "editFile://" + path;//+"@js=refreshPage(false)";
  }, path)
})

d.push({
  title: "刷新".small,
  col_type: "flex_button",
  url: $("#noLoading#").lazyRule(() => {
    refreshPage(false);
    return "toast://刷新完成";
  })
})

d.push({
  title: "测试".small,
  col_type: "flex_button",
  url: $("#noLoading#").lazyRule((path, source) => {
    let testVars = storage0.getMyVar("testVars", {});
    source = Object.assign(source, testVars);
    clearMyVar("links");
    clearMyVar("ruleTest" + "catei");
    let DrpyManage = GM.defineModule("DrpyManage");
    DrpyManage.del(source.key);
    if (getMyVar("tempcode")) {
      writeFile(path, getMyVar("tempcode"));
    }
    return "hiker://page/ruleTest?rule=" + MY_RULE.title + "&source=" + base64Encode(JSON.stringify(source)) + "&page=fypage&path=" + path;
  }, path, source),
  extra: {
    newWindow: true
  }
})


if (typeof ext == "string" && ext.startsWith("file") || cfg && cfg.path.startsWith("file") && cfg.path.endsWith(".json")) {
  d.push({
    title: "更新".small,
    col_type: "flex_button",
    url: $("#noLoading#").lazyRule((t, s, source, cfg) => {
      if (getMyVar("tempcode")) {
        writeFile(s, getMyVar("tempcode"));
      }

      function clearSource() {
        let runtimeConfig = GM.defineModule("runtimeConfig");
        let source = runtimeConfig.getCurrentSource();
        let DrpyManage = GM.defineModule("DrpyManage");
        DrpyManage.del(source.key);
        GM.clear("DrpyManage");
        if (!runtimeConfig.initDefault()) {
          toast("刷新失败");
        };
      }

      if (cfg && cfg.path.startsWith("file")) {
        let content = fetch(s);
        let json = JSON.parse(toCorrectJSONString(fetch(cfg.path)));
        let sites = json.sites;
        if (source.key == "") {
          return "toast://无key";
        }
        if (source.click == "") {
          source.click = undefined;
        }
        if (sites.hasOwnProperty("data")) {
          sites = json.sites.data;
        }

        let i = sites.findIndex(x => x.id ? x.id == source.id : x.key == source.key);

        let result = {
          name: source.name,
          key: source.key,
          click: source.click,
        }

        if (source.hasOwnProperty("id")) {
          let temp = JSON.parse(content);
          delete temp.key;
          content = JSON.stringify(temp);
        }

        if (i != -1) {
          if (source.type == 3) {
            sites[i] = Object.assign(sites[i], result);
            sites[i]["ext"] = JSON.parse(content);
          } else {
            sites[i] = JSON.parse(content);
          }
        } else {
          if (source.type == 3) {
            source["ext"] = JSON.parse(content);
            sites.push(source)
          } else {
            sites.push(JSON.parse(content));
          }
        }
        log(sites[i]);
        writeFile(cfg.path, JSON.stringify(json, null, 2));
        clearSource();
        return "toast://完成";
      }
      let content = fetch(s);
      writeFile(t, content);
      clearSource();
      return "toast://完成";
    }, ext, path, source, cfg)
  })
}

d.push({
  title: "还原".small,
  col_type: "flex_button",
  url: $("#noLoading#").lazyRule((path) => {
    deleteFile(path);
    clearMyVar("tempcode");
    refreshPage(false);
    return "hiker://empty";
  }, path)
})

d.push({
  col_type: "blank_block",
  key: "line"
})

if (source.api == "csp_AppYsV2") {
  d.push({
    title: "ext",
    key: "ext",
    col_type: "input",
    url: $.toString((tr) => {
      tr["ext"] = input;
      storage0.putMyVar("testVars", tr);
      refreshPage(false);
    }, testVars),
    extra: {
      defaultValue: testVars.ext || source.ext,
    }
  })
}


d.push({
  title: "type",
  col_type: "input",
  url: $.toString((tr, h) => {
    const hikerPop = $.require(h);
    hikerPop.selectCenter({
      options: [0, 1, 3],
      columns: 1,
      title: "type",
      //position: index,
      click(input, MY_INDEX) {
        tr["type"] = input;
        storage0.putMyVar("testVars", tr);
        refreshPage(false);
      }
    });
  }, testVars, hikpop),
  extra: {
    onChange: $.toString((tr) => {
      tr["type"] = input;
      storage0.putMyVar("testVars", tr);
    }, testVars),
    defaultValue: testVars.type || source.type,
  }
})

if (testVars.type == "3") {
  d.push({
    title: "api",
    col_type: "input",
    url: $.toString((tr, h) => {
      const hikerPop = $.require(h);
      hikerPop.selectCenter({
        options: ["csp_XBPQ", "csp_AppYsV2", "DRPY"],
        columns: 3,
        title: "选择api",
        //position: index,
        click(input, MY_INDEX) {
          if (input == "DRPY") {
            input = "./drpy_libs/drpy2.min.js";
          }
          tr["api"] = input;
          storage0.putMyVar("testVars", tr);
          refreshPage(false);
        }
      });
    }, testVars, hikpop),
    extra: {
      onChange: $.toString((tr) => {
        tr["api"] = input;
        storage0.putMyVar("testVars", tr);
      }, testVars),
      defaultValue: testVars.api || source.api,
    }
  })
}

if (cfg || s == "new") {
  d.push({
    title: "title",
    col_type: "input",
    url: $.toString((tr) => {
      tr["name"] = input;
      storage0.putMyVar("testVars", tr);
      refreshPage(false);
    }, testVars),
    extra: {
      onChange: $.toString((tr) => {
        tr["name"] = input;
        storage0.putMyVar("testVars", tr);
      }, testVars),
      defaultValue: testVars.name || source.name,
    }
  })

  d.push({
    title: "key",
    col_type: "input",
    url: $.toString((tr) => {
      tr["key"] = input;
      storage0.putMyVar("testVars", tr);
      refreshPage(false);
    }, testVars),
    extra: {
      onChange: $.toString((tr) => {
        tr["key"] = input;
        storage0.putMyVar("testVars", tr);
      }, testVars),
      defaultValue: testVars.key || source.key
    }
  })
  if (source.type == "3") {
    d.push({
      title: "click",
      col_type: "input",
      url: $.toString((tr) => {
        tr["click"] = input;
        storage0.putMyVar("testVars", tr);
        refreshPage(false);
      }, testVars),
      extra: {
        onChange: $.toString((tr) => {
          tr["click"] = input;
          storage0.putMyVar("testVars", tr);
        }, testVars),
        defaultValue: testVars.click || source.click,
        type: "textarea",
        height: -1,
      }
    })
  }
}


if (fileExist(path)) {
  code = fetch(path);
  if (source.hasOwnProperty("id")) {
    code = JSON.stringify(source, null, 2);
    writeFile(path, code);
  }
} else {
  if (ext) {
    if (ext.endsWith(".json")) {
      code = fetch(ext);
    } else if (ext.endsWith(".js")) {
      code = DrpyManage.get(source.key).runMain("let main=" + $.toString((ext) => {
        return () => getOriginalJs(request(ext, {
          'method': 'GET'
        }));
      }, ext));
    }
    writeFile(path, code || JSON.stringify(source, null, 4));
  } else {
    code = JSON.stringify(source, null, 2);
    writeFile(path, code);
  }
}


let di = d.findIndex(x => x.key == "line");

d.splice(di, 1, {
  title: "复制".small,
  col_type: "flex_button",
  url: $('#noLoading#').lazyRule((source, code) => {
    let json = {};
    if (source.type == "3" && source.api == "csp_XBPQ") {
      json.type = source.type;
      json.name = source.name;
      json.key = source.key;
      json.click = source.click != "" ? source.click : undefined;
      json.ext = JSON.parse(code);
    } else if (source.api.includes("drpy2")) {
      return "copy://" + code;
    } else {
      json = source;
    }
    return "copy://" + JSON.stringify(json);
  }, source, code)
})

let ei = d.findIndex(x => x.key == "ext");

if (getMyVar("fileedit", "") == "1") {
  clearMyVar("fileedit");
} else {
  if (getMyVar("tempcode")) {
    code = getMyVar("tempcode");
    writeFile(path, code);
  }
}

if (ei == -1) {
  d.push({
    title: "",
    desc: "ext",
    col_type: "input",
    extra: {
      type: "textarea",
      height: -1,
      //highlight: true,
      onChange: $.toString(() => {
        putMyVar("tempcode", input);
      }),
      titleVisible: false,
      defaultValue: code,
    }
  })
}
setResult(d);