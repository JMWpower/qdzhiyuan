js:
const ConfigManager = $.require('./subpage/ConfigManager.js');
let {
  objectex
} = $.require("methods");
objectex();
let config = MY_PARAMS.config || {};

let hikpop = "hiker://files/data/DrpyHiker/libs/hikerPop.js";
let runtimeConfig = GM.defineModule("runtimeConfig");

if (config.isEmpty) {
  config = runtimeConfig.getCurrentConfig();
}

let temp_config = storage0.getMyVar("temp_config", {});
if (temp_config.name) {
  config = temp_config;
}

let configType = runtimeConfig.getConfigType(config);
let source = {};
let tmpsource = getMyVar("m_source_tmpsource", "");
if (tmpsource) {
  source = JSON.parse(tmpsource);
} else if (!MY_PARAMS.newSource) {
  source = MY_PARAMS.source || JSON.parse(decodeURIComponent(base64Decode(getParam("source", ""))));
  if (source.by == "current") {
    source = runtimeConfig.getCurrentSource();
    source.by = "current";
  }
  sourceType = runtimeConfig.getSourceType(source);

  putMyVar("m_source_tmpsource", JSON.stringify(source));
  putMyVar("m_source_myKey", source.key);
} else {
  putMyVar("m_source_tmpsource", JSON.stringify(source));
}
storage0.putMyVar("m_source_config", config);
setPageTitle(source.name ? "源:" + source.name : "编辑源")

let orginwriteFile = globalThis.writeFile;

$.extend({
  initHiker() {
    /*globalThis.writeFile = function (path, content) {
      //orginwriteFile(path, content);
      return isave
    }*/
  }
})

//log(configType)

if (configType == "local_index_js") {
  source.name = (source.name || "")
    .replace(/\(XBPQ\)/g, "")
    .replace(/\(drpy_t3\)/g, "");
  MY_PARAMS.canSave = true;
}

if (/(local_index|local_dir)/.test(configType)) {
  MY_PARAMS.canSave = true;
}

if (configType == "local_index" && getMyVar("m_source_loaden", "") == "") {
  let searchable = source.searchable || "";
  let quickSearch = source.quickSearch || "";
  let filterable = source.filterable || "";
  putMyVar("m_source_searchable", searchable);
  putMyVar("m_source_quickSearch", quickSearch);
  putMyVar("m_source_filterable", filterable);
  putMyVar("m_source_loaden", "1");
}

Object.defineProperty(String.prototype, 'small', {
  get: function () {
    return `““””<small>${this}</small>`;
  },
  enumerable: false,
  configurable: true
});

let d = [];
addListener("onClose", () => {
  clearMyVar("m_source_hasTmpExt");
  deleteFile("hiker://files/_cache/viewSourceCode.js");
  listMyVarKeys().forEach(v => v.includes("m_source") && clearMyVar(v));
});

function builderRule(source) {
  let newObject = {
    "name": getMyVar("m_source_name", ""),
    "key": getMyVar("m_source_key", ""),
    "type": Number(getMyVar("m_source_type", "")) || 0,
    "api": getMyVar("m_source_api", ""),
    "searchable": getMyVar("m_source_searchable", ""),
    "quickSearch": getMyVar("m_source_quickSearch", ""),
    "filterable": getMyVar("m_source_filterable", ""),
    "click": getMyVar("m_source_click", ""),
    "ext": getMyVar("m_source_ext", ""),
  };

  ["searchable", "quickSearch", "filterable"].forEach(key => {
    if (!newObject[key]) {
      delete newObject[key];
    } else {
      newObject[key] = Number(newObject[key]);
    }
  });
  if (getMyVar("m_source_extIsObject", "")) {
    newObject.ext = JSON.parse(newObject.ext);
  }
  let newSource = Object.assign({}, source, newObject);
  return newSource;
}

function sortObject(source) {
  let nsource = {
    "key": source.key,
    "name": source.name,
    "type": source.type,
    "api": source.api,
    "searchable": getMyVar("m_source_searchable", ""),
    "quickSearch": getMyVar("m_source_quickSearch", ""),
    "filterable": getMyVar("m_source_filterable", ""),
    "click": source.click,
    "ext": source.ext
  };

  ["searchable", "quickSearch", "filterable"].forEach(key => {
    if (!nsource[key]) {
      delete nsource[key];
    } else {
      nsource[key] = Number(nsource[key]);
    }
  });
  if (!nsource.click) {
    delete nsource.click;
  }
  return nsource;
}

if (getMyVar("m_source_editing")) {
  let json = fetch("hiker://files/_cache/sourceCode.json");
  try {
    JSON.parse(json);
    listMyVarKeys().forEach(v => v.includes("m_source") && clearMyVar(v));
    putMyVar("m_source_tmpsource", json);
    refreshPage(false);
    toast("保存成功");
  } catch (e) {
    toast("格式错误");
  }
}

d.push({
  title: "全局编辑".small,
  url: $("#noLoading#").lazyRule(() => {
    writeFile("hiker://files/_cache/sourceCode.json", JSON.stringify(JSON.parse(getMyVar("m_source_tmpsource", "")), null, 2));
    var v = getAppVersion();
    log(v)
    //>=5167
    if (v >= 5167) {
      putMyVar("m_source_editing", "1");
      toast("保存后需要刷新");
    }

    return "editFile://hiker://files/_cache/sourceCode.json" + (v >= 5167 ? ("@js=" + $.toString(() => {
      let json = fetch("hiker://files/_cache/sourceCode.json");
      try {
        JSON.parse(json);
        listMyVarKeys().forEach(v => v.includes("m_source") && clearMyVar(v));
        putMyVar("m_source_tmpsource", json);
        refreshPage(false);
      } catch (e) {
        toast("格式错误");
      }
    })) : "");
  }),
  col_type: "text_4"
});


d.push({
  title: "测试".small,
  url: $("#noLoading#").lazyRule((builderRule, config) => {
    let source = builderRule(JSON.parse(getMyVar("m_source_tmpsource", "{}")));
    if (getMyVar("m_source_hasTmpExt", "")) {
      source.ext = "hiker://files/_cache/viewSourceCode.js";
    } else {
      if (typeof source.ext === "string" && config.path) {
        source.ext = joinUrl(config.path, source.ext);
      }
    }
    clearMyVar("links");
    clearMyVar("ruleTestcatei");
    return "hiker://page/ruleTest#noHistory##noRecordHistory#?rule=" + MY_RULE.title + "&source=" + base64Encode(JSON.stringify(source)) + "&page=fypage";
  }, builderRule, config),
  col_type: "text_4",
  extra: {
    newWindow: true,
    windowId: "DrpyRuleTest"
  }
});
if (MY_PARAMS.canSave && config.path) {
  d.push({
    title: "保存".small,
    url: $("#noLoading#").lazyRule((h, builderRule, sortObject, config, newSource) => {
      let hikerPop = $.require(h);
      let runtimeConfig = GM.defineModule("runtimeConfig");
      let configType = runtimeConfig.getConfigType(config);
      let isObject = getMyVar("m_source_extIsObject", "");
      let viewpath = "hiker://files/_cache/viewSourceCode.js";

      log(configType)
      //return "hiker://empty"

      let source = builderRule(JSON.parse(getMyVar("m_source_tmpsource", "{}")));
      let ext = source.ext;

      if (configType === "local_dir") {
        if (source.name == "") {
          return "toast://源名称不能为空";
        }
        if (!source.api.includes("drpy2")) {
          return "toast://当前配置加载模式支持保存drpy文件";
        }
        if (getMyVar("m_source_hasTmpExt", "")) {
          let path = config.path + "/" + source.name + ".js";
          let content = fetch(viewpath);
          if (content.length == 0) {
            return "toast://内容为空";
          }
          //log(path)
          if (fileExist(path) && ConfigManager.getGlobal("source_backup")) {
            return $("文件已经存在是否覆盖？").confirm((path, config, viewpath) => {
              let text = "yyyy-MM-dd_hhmmss";
              let s = $.dateFormat(new Date(), text);
              let exten = /(?:\.([^.]+))?$/.exec(path)[1];
              let backupath = joinUrl(config.path, "./source_backup/" + s + "." + exten);
              //log(backupath);
              let c = fetch(path);
              writeFile(backupath, c);
              let content = fetch(viewpath);
              writeFile(path, content);
              log("覆盖完成,备份文件路径:" + backupath);
              toast("覆盖完成,查看日志获取备份文件路径");
              back(true);
            }, path, config, viewpath);
          } else {
            writeFile(path, content);
            return "toast://保存成功";
          }
        } else {
          toast("未进行修改,不作保存");
        }

        //back(true);
        return "hiker://empty";
      } else if (configType === "local_index") {
        if (!source.key) {
          return "toast://key不能为空";
        }
        if (!source.name) {
          return "toast://name不能为空";
        }
        let myKey = getMyVar("m_source_myKey", "");
        let cJson = JSON.parse(toCorrectJSONString(fetch(config.path)));

        if (getMyVar("m_source_hasTmpExt", "") && typeof source.ext === "string") {
          let path;

          if (!isObject) {
            path = joinUrl(config.path, source.ext);
          } else {
            writeFile(viewpath, source.ext);
          }

          if (!source.ext) {
            if (source.api.includes("drpy2")) {
              path = joinUrl(config.path, "./drpy_js/" + source.name + ".js");
              source.ext = "./xbpq/" + source.name + ".js";
            } else if (source.api == "csp_XBPQ") {
              path = joinUrl(config.path, "./xbpq/" + source.name + ".json");
              source.ext = "./xbpq/" + source.name + ".json";
            }
          }

          writeFile(path, fetch(viewpath));
        }
        if (!newSource) {
          if (ConfigManager.getGlobal("source_backup")) {

          }
          let index = cJson.sites.findIndex(v => myKey === v.key);
          log(index)
          log(myKey)
          let nsource = sortObject(source);
          if (index !== -1) {
            cJson.sites.splice(index, 1, nsource);
          } else {
            cJson.sites.push(nsource);
          }

        } else {
          if (ConfigManager.getGlobal("source_backup")) {

          }
          if (cJson.sites.some(v => v.key === source.key)) {
            hikerPop.confirm({
              content: "是否覆盖",
              title: "已存在该Key",
              okTitle: "确定",
              cancelTitle: "取消",
              hideCancel: false, //隐藏取消按钮
              confirm() {
                let index = cJson.sites.findIndex(v => source.key === v.key);
                let nsource = sortObject(source);
                if (index !== -1) {
                  cJson.sites.splice(index, 1, nsource);
                }
                writeFile(config.path, JSON.stringify(cJson, null, 2));
                return "toast://保存成功";
              },
              cancel() {
                return "hiker://empty";
              }
            });
            return "hiker://empty";
          } else {
            let nsource = sortObject(source);
            cJson.sites.push(nsource);
          }
        }
        writeFile(config.path, JSON.stringify(cJson, null, 2));
        //back(true);
        return "toast://保存成功";
      } else if (configType === "local_index_js") {
        if (source.name == "") {
          return "toast://名称不能为空";
        }
        if (!source.api.includes("drpy2") && !source.api.includes("csp_XBPQ")) {
          return "toast://当前配置只支持drpy和xbpq保存";
        }
        let path;
        if (source.api.includes("drpy2")) {
          path = joinUrl(config.path, "./drpy_js/" + source.name + ".js");
        } else if (source.api == "csp_XBPQ") {
          path = joinUrl(config.path, "./xbpq/" + source.name + ".json");
          if (isObject) {
            writeFile(viewpath, JSON.stringify(source.ext))
          }
        }

        if (fileExist(path) && ConfigManager.getGlobal("source_backup")) {
          return $("文件已经存在是否覆盖？").confirm((path, config, viewpath) => {
            let text = "yyyy-MM-dd_hhmmss";
            let filen = /([^\/]+)(?=\.[^\/]+$)/.exec(path)[0];
            let exten = /(?:\.([^.]+))?$/.exec(path)[1];
            let s = filen + "-" + $.dateFormat(new Date(), text);
            let backupath = joinUrl(config.path, "./source_backup/" + s + "." + exten);
            //log(backupath);
            let c = fetch(path);
            let content = fetch(viewpath);
            if (content.length == 0) {
              return "toast://内容为空";
            }
            writeFile(backupath, c);
            writeFile(path, content);
            log("覆盖完成,备份文件路径:" + backupath);
            toast("覆盖完成,查看日志获取备份文件路径");
            //back(true);
          }, path, config, viewpath);
        } else {
          let content = fetch(viewpath);
          if (!fileExist(viewpath)) {
            content = fetch(path);
          }
          if (content.length == 0) {
            return "toast://文件内容为空";
          }
          writeFile(path, content);
        }
        //back(true);
        return "toast://保存成功";
      } else {
        return "toast://暂不支持保存";
      }
    }, hikpop, builderRule, sortObject, config, MY_PARAMS.newSource),
    col_type: "text_4",
    extra: {
      longClick: [{
        title: "文件备份:" + (!ConfigManager.getGlobal("source_backup") ? "关闭" : "开启"), js: $.toString(() => {
          const ConfigManager = $.require('./subpage/ConfigManager.js');
          ConfigManager.setGlobal("source_backup", !ConfigManager.getGlobal("source_backup"));
          refreshPage(false);
          return "toast://" + (!ConfigManager.getGlobal("source_backup") ? "关闭" : "开启");
        })
      }]
    }
  });
}

d.push({
  title: "复制".small,
  url: $("#noLoading#").lazyRule((builderRule, config) => {
    let source = builderRule(JSON.parse(getMyVar("m_source_tmpsource", "{}")));
    return "copy://" + JSON.stringify(source);
  }, builderRule, config),
  col_type: "text_4"
});
if (getMyVar("m_source_extIsObject", "xxx") === "xxx") {
  putMyVar("m_source_extIsObject", typeof source.ext === "object" ? "1" : "");
}
let isObject = getMyVar("m_source_extIsObject", "");

d.push({
  title: "确认返回",
  col_type: "avatar",
  img: "hiker://images/icon_select_fill",
  url: $("#noLoading#").lazyRule((s) => {
    let runtimeConfig = GM.defineModule("runtimeConfig");
    let DrpyManage = GM.defineModule("DrpyManage");
    if (s.by == "current") {
      //clearMyVar("ishome");
      //clearMyVar("links");
      let source = runtimeConfig.getCurrentSource();
      DrpyManage.del(source.key);
      //GM.clear("DrpyManage");
      if (!runtimeConfig.initDefault()) {
        toast("刷新失败");
      };
    }
    back(true);
    return "hiker://empty";
  }, source)
})

//if (configType !== "local_dir") {
d.push({
  col_type: "input",
  desc: "neme",
  extra: {
    onChange: $.toString(() => {
      putMyVar("m_source_name", input);
    }),
    defaultValue: getMyVar("m_source_name", String(source.name)),
    titleVisible: false
  }
});

d.push({
  col_type: "input",
  desc: "key",
  extra: {
    onChange: $.toString(() => {
      putMyVar("m_source_key", input);
    }),
    defaultValue: getMyVar("m_source_key", String(source.key)),
    titleVisible: false,
  }
});

function getTypemes(type) {
  let mes = "";
  switch (type) {
    case "0":
      mes = "CMS采集(xml)格式";
      break;
    case "1":
      mes = "CMS采集(json)格式";
      break;
    case "3":
      mes = "API本地端(T3)如drpy和xboq";
      break;
    case "4":
      mes = "API服务端(T4)只支持hipy服务器";
      break;
    default:
      mes = "未知类型";
      break;
  }
  return mes;
}

d.push({
  title: "type",
  col_type: "input",
  desc: "type",
  url: $.toString((h) => {
    const hikerPop = $.require(h);
    hikerPop.selectCenter({
      options: [0, 1, 3, 4],
      columns: 1,
      title: "type",
      //position: index,
      click(input, MY_INDEX) {
        putMyVar("m_source_type", input);
        refreshPage(false);
      }
    });
  }, hikpop),
  extra: {
    onChange: $.toString((gmes) => {
      putMyVar("m_source_type", input);
      let mes = gmes(input);
      updateItem("drpy_type", {
        title: "设置源类型:" + mes
      })
    }, getTypemes),
    defaultValue: getMyVar("m_source_type", String(source.type)),
    //titleVisible: false,
  }
});

let type = getMyVar("m_source_type", String(source.type));

d.push({
  col_type: "avatar",
  title: "设置源类型:" + getTypemes(type),
  img: "hiker://images/icon_info_fill",
  url: $("#noLoading#").lazyRule(() => {
    const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
    let pop = hikerPop.infoBottom({
      content: "详细",
      options: [
        "type:1 CMS采集(xml)格式\ntype:2 CMS采集(json)格式\ntype:3 API本地端(T3) 如drpy和xbpq\ntype:4 API服务端(T4) 只支持hipy服务器",
      ]
    });
    return "hiker://empty";
  }),
  extra: {
    id: "drpy_type"
  }
});

d.push({
  title: "api",
  col_type: "input",
  desc: "api",
  url: $.toString((h) => {
    const hikerPop = $.require(h);
    runtimeConfig = GM.defineModule("runtimeConfig");
    let adapteds = Array.from(new Set(runtimeConfig.getAdapted().map(function (item) {
      return item === "drpy2.min.js" || item === "drpy2.js" ? "DRPY" : item;
    })));
    adapteds.unshift(input);

    hikerPop.selectCenter({
      options: adapteds,
      columns: 1,
      title: "选择api",
      //position: index,
      click(input, MY_INDEX) {
        if (input == "DRPY") {
          input = "./drpy_libs/drpy2.min.js";
        }
        putMyVar("m_source_api", input);
        refreshPage(false);
      }
    });
  }, hikpop),
  extra: {
    onChange: $.toString(() => {
      putMyVar("m_source_api", input);
    }),
    defaultValue: getMyVar("m_source_api", String(source.api)),
    //titleVisible: false,
  }
});

if (getMyVar("m_source_api", String(source.api)) == "csp_XBPQ") {
  d.push({
    col_type: "input",
    desc: "click",
    extra: {
      type: "textarea",
      height: -1,
      onChange: $.toString(() => {
        putMyVar("m_source_click", input);
      }),
      defaultValue: getMyVar("m_source_click", String(source.click)),
      titleVisible: false,
    }
  });
}


d.push({
  col_type: "text_icon",
  title: "EXT是JSON对象",
  pic_url: isObject ? "http://123.56.105.145/img/drpy/on.svg" : "http://123.56.105.145/img/drpy/off.svg",
  url: $("#noLoading#").lazyRule(() => {
    putMyVar("m_source_extIsObject", getMyVar("m_source_extIsObject", "") ? "" : "1");
    refreshPage(false);
    return "hiker://empty";
  })
});
d.push({
  col_type: "text_3",
  title: "打开API文件",
  url: $("#noLoading#").lazyRule((config) => {
    let api = getMyVar("m_source_api");
    
    let path = joinUrl(config.path, api);
    if (path.startsWith("file://")) {
      return "editFile://" + path;
    } else {
      return "toast://没有本地文件";
    }
  }, config)
});
d.push({
  col_type: "text_3",
  title: "打开EXT文件",
  url: $("#noLoading#").lazyRule((config) => {
    let ext = getMyVar("m_source_ext");
    let isObject = getMyVar("m_source_extIsObject", "");

    if (isObject || !ext) {
      return "toast://ext不是路径";
    }
    let path = joinUrl(config.path, ext);
    if (path.startsWith("file://")) {
      return "editFile://" + path;
    } else {
      return "toast://没有本地文件";
    }
  }, config)
});

d.push({
  col_type: "text_3",
  title: "临时EXT文件",
  url: $("#noLoading#").lazyRule((config) => {
    let ext = getMyVar("m_source_ext");
    let isObject = getMyVar("m_source_extIsObject", "");
    let sourcepath = "hiker://files/_cache/viewSourceCode.js";
    if (isObject) {
      return "toast://ext不是路径";
    } else {
      if (!ext && !fileExist(sourcepath)) {
        writeFile(sourcepath, "");
        putMyVar("m_source_hasTmpExt", "1");
        return "editFile://" + sourcepath;
      }
    }
    if (!getMyVar("m_source_hasTmpExt", "")) {
      ext = ext.includes("?") ? ext.split("?")[0] : ext;
      let path = joinUrl(config.path, ext);
      let code = "";
      if (path.endsWith(".json")) {
        code = fetch(path);
      } else if (ext.endsWith(".js")) {
        let drpyEncrypt = $.require("drpyEncrypt");
        code = drpyEncrypt.tryDecrypt(fetch(path));
      }
      writeFile(sourcepath, code);
      putMyVar("m_source_hasTmpExt", "1");
    }
    return "editFile://" + sourcepath;
  }, config)
});

function Torf(key) {
  var b = getMyVar("m_source_" + key, "");
  if (b == "1") {
    return 'http://123.56.105.145/tubiao/messy/55.svg';
  }
  if (b == "" || b == "0") {
    return 'http://123.56.105.145/img/drpy/off.svg';
  }
}

var lazy = $('#noLoading#').lazyRule((k) => {
  var o = getMyVar("m_source_" + k, "");
  let t; t = o === "0" ? "1" : "0";
  putMyVar("m_source_" + k, t);
  refreshPage(false)
  return "hiker://empty";
  //return 'toast://' + (t == "1" ? "开启" : "关闭");
}, 'action')

if (configType == "local_index") {
  d.push({
    title: "searchable".small,
    col_type: "icon_3_fill",
    img: Torf("searchable"),
    url: lazy.replace("action", "searchable"),
  })

  d.push({
    title: "quickSearch".small,
    col_type: "icon_3_fill",
    img: Torf("quickSearch"),
    url: lazy.replace("action", "quickSearch"),
  })

  d.push({
    title: "filterable".small,
    col_type: "icon_3_fill",
    img: Torf("filterable"),
    url: lazy.replace("action", "filterable"),
  })
}

d.push({
  col_type: "input",
  desc: "ext",
  extra: {
    type: "textarea",
    height: 2,
    highlight: true,
    onChange: $.toString(() => {
      putMyVar("m_source_ext", input);
    }),
    defaultValue: getMyVar("m_source_ext", isObject ? JSON.stringify(source.ext, null, 2) : String(source.ext)),
    titleVisible: false,
  }
});

setResult(d);