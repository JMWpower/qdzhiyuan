js:
var d = [];
let isimportlist = [];

let ACT = {
  fs() {
    let fs = $.require($.fsurl);
    return fs;
  },
  removefile(p) {
    return p.replace("file://", "");
  },
  override(it, index) {
    let fs = this.fs();
    let hashlist = $.hashFManager.get();
    let equality = storage0.getMyVar("equality", []);
    deleteFile(it.target);
    fs.copyFile(this.removefile(it.source), this.removefile(it.target));
    equality.splice(index, 1);
    storage0.putMyVar("equality", equality);
    let hi = hashlist.findIndex(x => x.name == it.name);
    if (hi > -1 && it.hasOwnProperty("smd5")) {
      hashlist[hi].md5 = it.smd5;
      $.hashFManager.set(hashlist);
    }
  },
  rename(it, index) {
    let fs = this.fs();
    let hashlist = $.hashFManager.get();
    let equality = storage0.getMyVar("equality", []);
    let [nname, ext] = it.name.split(".");
    let p = it.target.replace(it.name, "");
    let i = 1;
    while (true) {
      if (fileExist(p + nname + i + "." + ext)) {
        i++;
      } else {
        break;
      }
    }
    let n = p + nname + i + "." + ext;
    //log(n)
    fs.copyFile(this.removefile(it.source), this.removefile(n));
    equality.splice(index, 1);
    storage0.putMyVar("equality", equality);
    let hi = hashlist.findIndex(x => x.name == it.name);
    if (hi > -1 && it.hasOwnProperty("smd5")) {
      hashlist[hi].md5 = it.smd5;
      $.hashFManager.set(hashlist);
    }
  }
}

$.extend({
  fsurl: "http://hiker.nokia.press/hikerule/rulelist.json?id=7013",
  act: ACT,
  hashFManager: {
    path: $.listpath || "",
    json: {},
    hashlist: [],
    setPath(input) {
      this.path = input;
      return this;
    },
    get() {
      if (fileExist(this.path)) {
        this.json = JSON.parse(fetch(this.path));
        return this.json.list;
      } else {
        return [];
      }
    },
    set(list) {
      log(this.path)
      this.json.list = list;
      writeFile(this.path, JSON.stringify(this.json));
    }
  }
})

let {
  drpyConfig,
} = $.require("hiker://page/methods");

let runtimeConfig = GM.defineModule("runtimeConfig");

let share_dir = getParam("path", "");
if (share_dir) {
  function removefile(p) {
    p = p.replace("file://", "");
    //log(p)
    return p;
  }

  let fs = $.act.fs();
  let in_path = getPublicItem("DrpyHiker@input_path", "");
  if (!in_path || !fileExist(in_path)) {
    in_path = "hiker://files/data3/DrpyHiker/drpy_js/";
    if (!fileExist(in_path)) {
      fs.mkDir(removefile(getPath(in_path)));
      drpyConfig.set({
        name: "默认",
        path: getPath(in_path),
      }, 0)
      runtimeConfig.setCurrentConfig({
        name: "默认",
        path: getPath(in_path),
      })
      putMyVar("refreshconfig", "1");
      setPublicItem("DrpyHiker@input_path", in_path);
    }
  }
  let listpath = getPath(fs.combinPath(share_dir, "/清单.js"));
  //log(listpath)
  $.extend({
    listpath: listpath
  })
  $.hashFManager.setPath(listpath);

  if (!share_dir.includes("/drpy_js")) {
    share_dir += "/drpy_js/";
  }
  let list = $.hashFManager.get();

  let currentconfig = runtimeConfig.getCurrentConfig();
  currentconfig = {
    path: getPath(in_path)
  };
  //log(currentconfig)

  let currentlist = runtimeConfig.getSourceListByConfig(currentconfig).filter(f => f.api.includes("drpy2"));
  for (let i = 0; i < currentlist.length; i++) {
    let x = currentlist[i];
    let path = x.ext;
    if (currentconfig.path.endsWith(".js")) {
      path = joinUrl(currentconfig.path, path);
    }
    x.fullname = String(fs.getName(path));
    if (!path.startsWith("file")) {
      path = "file://" + path;
    }
    x.path = path;
  }
  //log(list)
  let difference = list.filter(a1 => !currentlist.find(a2 => a1.name === a2.fullname));

  if (difference.length) {
    difference.map(x => {
      let path;
      //log(currentconfig.path)
      if (currentconfig.path.endsWith(".js")) {
        path = joinUrl(currentconfig.path, "./drpy_js/" + x.name);
      } else {
        path = fs.combinPath(currentconfig.path, "/" + x.name);
      }
      let tpath = share_dir + x.name;
      // log(tpath)
      // log(path)
      isimportlist.push({
        name: x.name,
        path: getPath(tpath),
      });
      removefile(path)
      fs.copyFile(removefile(tpath), removefile(path));
    })
    toast("添加" + difference.length + "个源");
    //refreshPage(false);
  }
  let commonIndices = currentlist.reduce((indices, element1, index1) => {
    let index2 = list.findIndex(element2 => element2.name === element1.fullname);
    if (index2 !== -1) {
      //log(list[index2].md5)
      //if (!md5Set.has(list[index2].md5)) {
      indices.push([index1, index2]);
      //}
    }
    return indices;
  }, []);

  //log(commonIndices)
  let equality = [];
  if (commonIndices.length) {
    equality = commonIndices.map(x => {
      let path = currentlist[x[0]].path;
      //log(path)
      cmd5 = list[x[1]].md5;
      let hash_md5 = md5(currentlist[x[0]].path);
      let name = list[x[1]].name;
      if (cmd5 != hash_md5) {
        return {
          name: name,
          desc: "md5不相符",
          smd5: hash_md5,
          source: getPath(share_dir + name),
          target: path
        }
      }
    }).filter(e => e);
  }
  if (difference.length == 0 && equality.length == 0) {
    toast("没有需要更新");
    back();
  }

  if (equality.length) {
    storage0.putMyVar("equality", equality);
  }
}

let equality = storage0.getMyVar("equality", []);
//log(equality)
if (equality.length == 0) {
  equality = storage0.getVar("DrpyHiker@equality", []);
  storage0.putMyVar("equality", equality);
  clearVar("DrpyHiker@equality");
}

addListener("onClose", $.toString(() => {
  clearVar("DrpyHiker@equality");
  clearMyVar("equality");
}))

if (equality.length == 0) {
  //back();
}

d.push({
  title: "返回刷新",
  col_type: "text_3",
  url: $("#noLoading#").lazyRule(() => {
    if (getMyVar("refreshconfig")) {
      clearMyVar("refreshconfig");
      let runtimeConfig = GM.defineModule("runtimeConfig");
      if (!runtimeConfig.initDefault()) {
        toast("刷新失败");
        return;
      };
      putMyVar("isRefresh", "1");
    }
    back();
    return "hiker://empty"
  })
})

d.push({
  title: "覆盖原始",
  col_type: "text_3",
  url: $('#noLoading#').lazyRule((equality) => {
    equality.forEach((item) => {
      $.act.override(item, 0);
    })
    refreshPage(false);
    return "hiker://empty";
  }, equality)
})

d.push({
  title: "自动改名",
  col_type: "text_3",
  url: $('#noLoading#').lazyRule((equality) => {
    equality.forEach((item) => {
      $.act.rename(item, 0);
    })
    refreshPage(false);
    return "hiker://empty";
  }, equality)
})


if (isimportlist.length > 1) {
  d.push({
    title: "已导入" + isimportlist.length + "个规则",
    col_type: "text_1",
    url: "hiker://empty"
  })
}

isimportlist.forEach((item, index) => {
  d.push({
    title: "<s>" + item.name.fontcolor("grey") + "</s>",
    desc: "已自动导入",
    col_type: "avatar",
    img: "hiker://images/home_download",
    url: $("#noLoading#").lazyRule((it) => {
      let drpyEncrypt = $.require("drpyEncrypt");
      let tp = "hiker://files/_cache/tempCode.js";
      let decode = (path) => {
        code = drpyEncrypt.tryDecrypt(fetch(path));
        writeFile(tp, code);
        return tp;
      }
      return "editFile://" + decode(it.path)
    }, item)
  })
})


$.hashFManager.setPath($.hashfile);

equality.forEach((item, index) => {
  let lcs = [];
  let hashlist = $.hashFManager.get();
  let hi = hashlist.findIndex(x => x.name == item.name);
  if (hi > -1) {
    lcs.push({
      title: "忽略当前",
      js: $.toString((it, hashlist, hi) => {
        if (hi > -1) {
          hashlist[hi].ignore = true;
          $.hashFManager.set(hashlist);
          refreshPage(false)
        }
      }, item, hashlist, hi)
    })
  }

  d.push({
    title: item.name,
    desc: item.desc,
    col_type: "avatar",
    img: "hiker://images/home_tools",
    url: $('#noLoading#').lazyRule((it, index) => {
      let options = ["覆盖原始", "改名导入", "查看原始", "查看导入"];
      var v = getAppVersion();
      if (v >= 5167) {
        options[3] = "编辑导入"
      }

      showSelectOptions({
        "title": "选择操作", "options": options, col: 2,
        js: $.toString((it, index) => {
          let drpyEncrypt = $.require("drpyEncrypt");
          let tp = "hiker://files/_cache/tempCode.js";
          let decode = (path) => {
            code = drpyEncrypt.tryDecrypt(fetch(path));
            writeFile(tp, code);
            return tp;
          }
          let equality = storage0.getMyVar("equality", []);

          if (input == "覆盖原始") {
            $.act.override(it, index);
            refreshPage(false);
          }
          if (input == "改名导入") {
            let [nname, ext] = it.name.split(".");
            let p = it.target.replace(it.name, "");
            let i = 1;
            while (true) {
              if (fileExist(p + nname + i + "." + ext)) {
                i++;
              } else {
                break;
              }
            }
            return $(nname + i, "输入名称").input((o, index) => {
              let fs = $.fs();
              let n = o.p + input + "." + o.ext;
              let it = o.it;
              if (fileExist(n)) {
                return "toast://路径已经存在";
              } else {
                let equality = storage0.getMyVar("equality", []);
                let removefile = $.act.removefile;
                fs.copyFile(removefile(it.source), removefile(n));
                equality.splice(index, 1);
                storage0.putMyVar("equality", equality);
                let hashlist = $.hashFManager.get();
                let hi = hashlist.findIndex(x => x.name == it.name);
                if (hi > -1 && it.hasOwnProperty("smd5")) {
                  hashlist[hi].md5 = it.smd5;
                  $.hashFManager.set(hashlist);
                }
                refreshPage(false);
              }
            }, { p, ext, it }, index)
          }
          var v = getAppVersion();
          //v>=5167
          let js = "";
          if (v >= 5167) {
            js = "@js=" + $.toString((it, s, tp) => {
              let drpyEncrypt = $.require("drpyEncrypt");
              let content = fetch(tp);
              content = drpyEncrypt.encrypt(content, getItem("share_encode", "不编码"));
              writeFile(s, content);
              toast("修改完成");
              updateItem("import_" + it.name, {
                title: "✅" + it.name
              });
            }, it, it.source, tp)
          }

          if (input == "查看原始") {
            return "editFile://" + decode(it.target);
          }
          if (input == "查看导入" || input == "编辑导入") {
            return "editFile://" + decode(it.source) + js;
          }
        }, it, index)
      })
      return "hiker://empty";
    }, item, index),
    extra: {
      longClick: lcs,
      id: "import_" + item.name
    }
  })
})
setResult(d);