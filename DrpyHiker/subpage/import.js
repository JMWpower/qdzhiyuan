js:
function saveCache(json) {
  writeFile("hiker://files/_cache/jiexiSimpleImport.json", JSON.stringify(json));
}

function importParse(pass) {
  try {
    let [_, rule, type] = pass.split("$");
    if (type === "b") {
      rule = parsePaste(rule);
    }
    let rules = JSON.parse(base64Decode(rule));
    if (!Array.isArray(rules)) {
      rules = [rules];
    }
    //rules.reverse();
    MY_URL = module.id;
    let ruleTitle = getParam("rule");
    let arr = $.require("configs?rule=" + ruleTitle).getJson();
    let newI = 0;
    for (let rule of rules) {
      let index = arr.findIndex(v => v.name === rule.name);
      if (index > -1) {
        rule = Object.assign(arr[index], rule);
        arr.splice(index, 1, rule);
        if (rules.length === 1) {
          saveCache(rule);
          return "hiker://page/ruleEdit#noHistory##noRecordHistory#?isImport=true&index=" + index + "&rule=" + ruleTitle;
          //toast("已更新规则：" + rule.name);
        } else {
          log("已更新规则：" + rule.name)
        }
      } else {
        newI++;
        arr.push(rule);
        if (rules.length === 1) {
          saveCache(rule);
          return "hiker://page/ruleEdit#noHistory##noRecordHistory#?isImport=true&rule=" + ruleTitle;
          //toast("已导入规则：" + rule.name);
        } else {
          log("已导入规则：" + rule.name)
        }
      }
    }
    if (rules.length > 1) {
      $.require("configs?rule=" + ruleTitle).saveJson(arr);
      toast("新增：" + newI + " 覆盖更新：" + (rules.length - newI));
    }
  } catch (e) {
    log(e.toString());
    toast("导入失败");
  }
}

function importRule(pass) {
  let fs = $.require("hiker://files/data/DrpyHiker/libs/Fs.js");
  const hkpop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
  let ruleTitle;
  try {
    let api;
    let [_, rule, pname] = pass.split("$");
    let path = getPublicItem("DrpyHiker@input_path", "");
    MY_URL = module.id;
    if (!path) {
      MY_URL = module.id;
      ruleTitle = getParam("rule");
      toast("未指定默认保存目录，请先设置保存目录");
      return "hiker://page/sharedefaultpath#noRecordHistory##noHistory#?rule=" + ruleTitle;
    }
    let func = (r) => {
      if (rule.startsWith("base64:")) {
        return r.replace("base64:", "");
      } else {
        return parsePaste(r);
      }
    }
    let drpyEncrypt = $.require("drpyEncrypt?rule=" + getParam("rule"));
    [pname, api] = pname.split("#");
    //log("导入记录");
    //log(pname)
    //log(api)
    let rules = base64Decode(func(rule));
    if (!rules) toast("内容为空，导入失败");
    path = path.endsWith("/") ? path : (path + "/");
    if (api == "XBPQ") {
      path = fs.combinPath(path, "../XBPQ") + "/";
    }
    let tpath = path + pname;
    if (tpath.startsWith("/")) {
      tpath = "file://" + tpath;
    }
    //log(tpath)
    //log("--------")
    if (pname.includes(".json")) {
      rules = drpyEncrypt.tryDecrypt(rules);
    }
    if (fileExist(tpath)) {
      let temppath = "hiker://files/_cache/drpysourcetemp.js";
      let n = tpath.split("/").at(-1);
      let name = n.split(".")[0];
      let ext = n.split(".")[1];
      //toast("文件已存在");
      writeFile(temppath, rules);
      storage0.putVar("DrpyHiker@equality", [{
        "name": name + "." + ext,
        "desc": "同名文件",
        "source": getPath(temppath),
        "target": tpath
      }])
      return "hiker://page/difference#noRecordHistory##noHistory#?rule=" + getParam("rule");
    }
    hkpop.chefSnackbarMake({
      content: "点我跳转规则",
      duration: 1000, //显示时长
      confirm() {
        return "hiker://home" + "@" + "DrpyHiker";
      }
    });
    writeFile(tpath, rules);
    toast("导入成功请刷新配置");
    
  } catch (e) {
    toast("导入失败:" + e.toString())
  }
}
$.exports = function (pass, mode) {
  if (mode) {
    return importRule(pass);
  } else {
    return importParse(pass);
  }
}