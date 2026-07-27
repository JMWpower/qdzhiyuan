let layout = [];
setPageTitle("创建配置");
const ConfigManager = $.require('./subpage/ConfigManager.js');
let runtimeConfig = GM.defineModule("runtimeConfig");
let currentconfig = runtimeConfig.getCurrentConfig();
let f = $.require("hiker://files/data/DrpyHiker/libs/fileSelection.js");
addListener("onClose", () => {
    clearMyVar("drpyHiker_config_name");
    clearMyVar("drpyHiker_config_path");
});

//历史配置记录

let cpath = "hiker://files/rules/DrpyHiker/" + "drpyconfig.json";
let oldpath = "hiker://files/cache/" + "drpyconfig.json"

let {
    drpyConfig,
} = $.require("hiker://page/methods");

if (!fileExist(cpath) && fileExist(oldpath)) {
    let content = JSON.parse(readFile(oldpath)) || [];
    saveFile(cpath, JSON.stringify(content));
}

let pathconfigs = drpyConfig.get();

let configs_obj = {
    path: cpath,
    configs: pathconfigs
}
//历史配置记录

layout.push({
    col_type: "avatar",
    title: "提示",
    pic_url: "http://123.56.105.145/tubiao/system/27.png",
    url: $("#noLoading#").lazyRule(() => {
        const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
        let pop = hikerPop.infoBottom({
            content: "详细",
            options: [
                "第一空(名称):方便下次找到",
                "第二空(路径)[填本地索引地址]:选择JSON/URL选项，点击旁边的选择可以浏览本地文件选择本地包的.json索引文件即可。\n(注意：使用此种方式，在本地文件夹内新增或删除.js源时需要自行配置.json文件)",
                "第二空(路径)[填本填远程地址]:直接填写远程链接即可一般是以http开头.json结尾，也可可以输入github仓库的文件夹地址。此种方式可以保持与远程配置者同步更新，但不如本地快。",
                "第二空(路径)[填本地文件夹地址]:选择文件夹选项，可以直接输入js源所在#文件夹!!!#的路径，也可以点击旁边选择浏览本地路径选择#文件夹!!!#，使用该种方法，在文件夹新增或删除源时，不用手动配置.json文件，自动读取。(注意：需要刷新配置或重启软件才能读取)",
                "[Q&A]为什么订阅链接有很多源，却只识别到了几个源？\n本小程序只支持道长的drpy[js]视频源，其他一概不支持。因此会自动过滤其他源",
                "[Q&A]打算支持其他tvbox的源吗？不支持不考虑。请看名字DrpyHiker，只支持drpy，要用其他源，建议删除本小程序，去用各种壳子。"
            ]
        });
        return "hiker://empty";
    }),
});
let runMode = ConfigManager.getGlobal("runMode") || 0;
if (runMode == 1) {
    layout.push({
        title: "❗当前使用本地配置管理❗",
        desc: "自定义配置现在已被禁用\n点击切换模式",
        url: $().lazyRule(() => {
            let {
                itemAciton
            } = $.require("settings");
            return itemAciton("运行模式");
        }),
        col_type: "text_center_1"
    });
}
layout.push({
    col_type: "input",
    desc: "名称(必填)",
    extra: {
        titleVisible: false,
        defaultValue: getMyVar("drpyHiker_config_name", ""),
        onChange: $.toString(() => {
            putMyVar("drpyHiker_config_name", input);
        }),
        id: "drpyHiker_config_name"
    }
});
//let select_mode="0";

let select_mode = ConfigManager.getGlobal("select_config_mode");
let nav = ["JSON/URL/JS", "文件夹"];

nav.forEach((x, i) => {
    layout.push({
        title: '““””' + (i == select_mode ? x.fontcolor("#15B76C") : x),
        url: $('#noLoading#').lazyRule((i) => {
            const ConfigManager = $.require('./subpage/ConfigManager.js');
            ConfigManager.setGlobal("select_config_mode", i + "");
            refreshPage();
            return "hiker://empty";
        }, i),
        col_type: 'scroll_button',
    })
})


let path = joinUrl(getPath("hiker://files/"), "../".repeat(5)).slice(7);

if (select_mode == "0") {
    layout.push({
        title: "选择",
        url: JSON.stringify(f.fileSelectionUri({
            callback: $.toString(() => {
                let target = findItem("drpyHiker_config_path").extra;
                updateItem("drpyHiker_config_path", {
                    extra: Object.assign(target, {
                        defaultValue: PATH
                    })
                });
                return true;
            }),
            rootDirPath: path,
            initialPath: path,
            pattern: 0,
            fileType: ".json|.js",
        })),
        col_type: "input",
        desc: "路径(URL/JSON/JS/Github)",
        extra: {
            defaultValue: "",
            onChange: $.toString(() => {
                putMyVar("drpyHiker_config_path", input);
            }),
            id: "drpyHiker_config_path"
        }
    });
}
if (select_mode == "1") {
    layout.push({
        title: "选择",
        url: JSON.stringify(f.fileSelectionUri({
            callback: $.toString(() => {
                let target = findItem("drpyHiker_config_folder").extra;
                updateItem("drpyHiker_config_folder", {
                    extra: Object.assign(target, {
                        defaultValue: PATH
                    })
                });
                return true;
            }),
            rootDirPath: path,
            initialPath: path,
            pattern: 1,
            //fileType: ".json",
        })),
        col_type: "input",
        desc: "路径(文件夹)",
        extra: {
            defaultValue: "",
            onChange: $.toString(() => {
                putMyVar("drpyHiker_config_path", input);
            }),
            id: "drpyHiker_config_folder"
        }
    });
}
layout.push({
    col_type: "line_blank"
});
layout.push({
    title: "确认",
    url: $("#noLoading#").lazyRule((cobj) => {
        const ConfigManager = $.require('./subpage/ConfigManager.js');
        let path = getMyVar("drpyHiker_config_path", "");
        let name = getMyVar("drpyHiker_config_name", "");
        if (!(path && name)) {
            return "toast://不可为空";
        }
        path = path.startsWith("http") ? path : path.startsWith("/") ? ("file://" + path) : path;
        //log(path)
        try {
            let runtimeConfig = GM.defineModule("runtimeConfig");
            if (path.startsWith("http") || path.startsWith("catvod://") || path.includes("#nodejsID=")) {
                showLoading("正在加载配置...");
            }
            let configc = {
                path,
                name,
            };
            if (runtimeConfig.setCurrentConfig(configc)) {
                cobj.configs.push({
                    path,
                    name,
                });
                ConfigManager.setGlobal("no_loading", false);
                saveFile(cobj.path, JSON.stringify(cobj.configs));

                let DrpyManage = GM.defineModule("DrpyManage");
                DrpyManage.clear();
                back(false);
                $.require("ChangeSourcePop").show(100);
                return "toast://设置成功";
            }
            return "toast://配置文件有误";
        } catch (e) {
            return "toast://" + e.toString();
        } finally {
            hideLoading();
        }
    }, configs_obj),
    col_type: "text_center_1",
});
let currentconfigPath = "";
if (currentconfig && currentconfig.hasOwnProperty("path")) {
    currentconfigPath = currentconfig.path;
    if (currentconfig.nodeID && !String(currentconfigPath).startsWith("catvod://")) {
        currentconfigPath += "#nodejsID=" + currentconfig.nodeID;
    }
}

if (pathconfigs.length) {
    layout.push({
        title: '““””' + "<small>历史配置记录 点我进行配置检验</small>",
        url: $('#noLoading#').lazyRule((p) => {
            //log(p)
            function unique(arr) {
                const res = new Map();
                return arr.filter((a) => !res.has(a) && res.set(a, 1))
            }
            var results = [];
            if (p.length == 0) {
                return "toast://无地址";
            }
            list = p.map(x => x.path);
            var task = function(obj) {
                let s = Date.now();
                let jsFiles = [];
                let count = 0;

                function filterOther(list) {
                    //log(list.map(x=>x.api))
                    return list.filter(it => (String(it.api).includes("drpy2.min.js") || String(it.api).includes("drpy2.js")) || String(it.api) === "csp_XBPQ" || /(0|1)/.test(it.type) || String(it.api) === "csp_AppYsV2")
                }
                if (obj.url.startsWith("file:")) {
                    let code = "no";
                    let path = obj.url.replace("file://", "");
                    let dir = new java.io.File(path);
                    if (dir.isDirectory()) {
                        let flist = dir.listFiles();
                        for (var f of flist) {
                            // 检查文件名是否以.js结尾
                            if (f.isFile() && f.getName().toLowerCase().endsWith(".js")) {
                                jsFiles.push(f);
                            }
                        }
                    }
                    if (dir.isFile() && fileExist(obj.url)) {
                        try {
                            json = JSON.parse(readFile(obj.url));
                            if (Array.isArray(json.sites) || json.sites.length) {
                                count = filterOther(json.sites).length;
                            }
                        } catch (e) {}
                        code = "ok";
                    }
                    if (jsFiles.length >= 5) {
                        count = jsFiles.length;
                        code = "ok";
                    }
                    return {
                        time: (Date.now() - s),
                        url: obj.url,
                        count: count,
                        code: code,
                        index: obj.i
                    }
                }
                var j = JSON.parse(fetch(obj.url, {
                    withHeaders: true,
                    timeout: 5000,
                }));
                let e = Date.now();
                let c = e - s;
                if (obj.url.includes("github.com") && j.statusCode == 200) {
                    try {
                        var html = j.body;
                        var json = JSON.parse(pdfh(html, "#repo-content-pjax-container&&script&&Html"));
                        let list = json.payload.tree.items;
                        count = list.filter(x => x.name.endsWith(".js")).length;
                    } catch {}
                }
                try {
                    let json = JSON.parse(toCorrectJSONString(j.body) || "{}");
                    if (Array.isArray(json.sites) || json.sites.length) {
                        count = filterOther(json.sites).length;
                    }
                } catch (e) {}

                return {
                    time: c,
                    url: j.url,
                    count: count,
                    code: j.statusCode,
                    index: obj.i,
                }
            };
            let tasks = list.map((x, i) => {
                i = i + 1;
                return {
                    func: task,
                    param: {
                        url: x,
                        i: i - 1,
                    },
                    id: 'taskid' + i
                }
            });
            var count = success = tasks.length;
            be(tasks, {
                func: function(obj, id, error, taskResult) {
                    obj.results.push(taskResult)
                    count = count - 1;
                    if (count > 0) {
                        showLoading("检测中...剩余地址：" + count)
                    } else {
                        hideLoading();
                    }
                },
                param: {
                    hi: 'ccc',
                    results: results
                }
            }, success);
            //log(results)
            results = results.filter(f => f);
            results.forEach((x, i) => {
                let item = findItem("path" + x.index);
                let regex = /(名称:.*?)(\s+)?\n/g;
                let title = "名称:" + p[x.index].name + " ";
                let url = p[x.index].path;
                let msg = "";
                let count = x.count != 0 ? " 源数量:" + x.count : "";
                if (/no/.test(x.code)) {
                    msg = item.title.replace(regex, title + "配置有误".fontcolor("red") + "\n");
                } else if (/^(-1|0|404)/.test(x.code)) {
                    msg = item.title.replace(regex, title + "无法访问".fontcolor("red") + "\n");
                } else if (/^200/.test(x.code)) {
                    msg = item.title.replace(regex, title + "通讯正常".fontcolor("#3CB371") + "  延迟:" + x.time + count + "\n");
                    //url = item.url;
                } else {
                    msg = item.title.replace(regex, title + "配置正确".fontcolor("#3CB371") + count + "\n");
                    //url = item.url;
                }
                updateItem(item.extra.id, {
                    title: msg,
                    //url: url,
                })
            });
            return "hiker://empty"
        }, pathconfigs),
        col_type: "text_center_1"
    });
    pathconfigs.forEach((item, i) => {
        let longC = [{
            title: "名称",
            js: $.toString((item, p, c) => {
                let i = c.findIndex(x => x.name == item.name);
                if (i != -1) {
                    return $(c[i].name, "输入新名称").input((c, p, i) => {
                        c[i].name = input;
                        saveFile(p, JSON.stringify(c));
                        refreshPage(false);
                    }, c, p, i)
                }
            }, item, cpath, pathconfigs)
        }, {
            title: "路径",
            js: $.toString((item, p, c) => {
                let i = c.findIndex(x => x.name == item.name);
                if (i != -1) {
                    return $(c[i].path, "输入新路径").input((c, p, i) => {
                        c[i].path = input;
                        saveFile(p, JSON.stringify(c));
                        refreshPage(false);
                    }, c, p, i)
                }
            }, item, cpath, pathconfigs)
        }, {
            title: "删除",
            js: $.toString((item, p, c) => {
                let i = c.findIndex(x => x.name == item.name);
                if (i != -1) {
                    c.splice(i, 1);
                    saveFile(p, JSON.stringify(c));
                    refreshPage(false);
                }
            }, item, cpath, pathconfigs)
        }];
        //log(item)

        if (!item.stype) {
            if (item.path.startsWith("http")) {
                item.stype = "web";
            } else {
                let dir = new java.io.File(item.path);
                if (dir.isDirectory()) {
                    item.stype = "folder";
                } else {
                    item.stype = "file";
                }
            }
            let i = pathconfigs.findIndex(x => x.name == item.name);
            //
            if (i != -1) {
                delete item.stype;
                pathconfigs[i] = item;
                //saveFile(cpath, JSON.stringify(pathconfigs));
            }
        }
        if (item.path.endsWith(".json")) {
            longC.push({
                title: "JSON编辑",
                js: $.toString((item) => {
                    let json = JSON.parse(toCorrectJSONString(fetch(item.path) || "{}"));
                    if (Object.keys(json).length == 0) return "toast://读取失败";
                    return 'hiker://page/interface#noRefresh##noHistory##noRecordHistory#?rule=JSON编辑器&Json=' + base64Encode(JSON.stringify(json));
                }, item)
            })
        }
        if (item.path.startsWith("http")) {
            longC.push({
                title: "访问",
                js: $.toString((item) => {
                    if (item.path.startsWith("http")) {
                        return "web://" + item.path;
                    }
                }, item)
            })
        }
        if (item.type && item.type == "folder") {

        }
        let current = "";

        if (item.path == currentconfigPath) {
            current = "➡️";
        }

        layout.push({
            title: '““””' + "<small>" + current + "名称:" + item.name + "\n路径:" + item.path + "</small>",
            url: $("#noLoading#").lazyRule(item => {
                const ConfigManager = $.require('./subpage/ConfigManager.js');
                ConfigManager.setGlobal("no_loading", false);
                let runtimeConfig = GM.defineModule("runtimeConfig");
                let {
                    path,
                    name
                } = item;
                if (path.startsWith("http") || path.startsWith("catvod://") || path.includes("#nodejsID=")) {
                    showLoading("正在加载配置...");
                }
                if (runtimeConfig.setCurrentConfig({
                        path,
                        name,
                    })) {

                    let DrpyManage = GM.defineModule("DrpyManage");
                    DrpyManage.clear();
                    back(false);
                    $.require("ChangeSourcePop").show(100);
                    hideLoading();
                    return "hiker://empty";
                } else {
                    hideLoading();
                    return "toast://切换失败";
                }
            }, item),
            col_type: "text_1",
            extra: {
                id: 'path' + i,
                longClick: longC
            }
        });
    });
}


setResult(layout);