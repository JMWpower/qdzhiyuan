js:
function jsimport() {
  try {
    let n = input.split("/").at(-1);
    let name = n.split(".")[0];
    let ext = n.split(".")[1];
    let directory = "drpy_js/";
    let runtimeConfig = GM.defineModule("runtimeConfig");
    let config = runtimeConfig.getCurrentConfig();

    let {
      drpyConfig,
    } = $.require("hiker://page/methods");

    let path = getPublicItem("DrpyHiker@input_path", "");
    if (!path) {
      toast("未指定默认保存目录，使用默认存储位置");
      path = "hiker://files/data3/DrpyHiker/" + directory;
      drpyConfig.set({
        name: "默认",
        path: getPath(path),
      }, 0)
    }

    let rules = fetch("file://" + input);
    let temppath = "hiker://files/_cache/drpysourcetemp.js";
    if (!rules) {
      toast("内容为空，导入失败");
    } else {
      path = path.endsWith("/") ? path : (path + "/");
      let tpath = path + input.split("/").at(-1);
      if (tpath.startsWith("/")) {
        tpath = "file://" + tpath;
      }
      // log(tpath)
      // log(fileExist(tpath))
      if (fileExist(tpath)) {
        writeFile(temppath, rules);
        storage0.putMyVar("equality", [{
          "name": name + "." + ext,
          "desc": "同名文件",
          "source": getPath(temppath),
          "target": tpath
        }])
        return "hiker://page/difference#noRecordHistory##noHistory#";
      } else {
        writeFile(tpath, rules);
      }
      toast("导入成功请刷新配置");
    }
  } catch (e) {
    toast(e.toString());
  }
}
$.exports = jsimport();