const ConfigManager = $.require('./subpage/ConfigManager.js');
let runtimeConfig = GM.defineModule("runtimeConfig");

let config;

config = MY_PARAMS.config || runtimeConfig.getCurrentConfig();

let scname = config.name;

let temp_config = storage0.getMyVar("temp_config", {});
if (temp_config.name) {
    config = temp_config;
}

let sourceList = [];
try {
    [sourceList] = runtimeConfig.getSourceListByConfig(config);
} catch (e) {
    log(e.toString())
    toast("加载失败");
}

let source = runtimeConfig.getCurrentSource();
setPageTitle("配置:" + config.name || "编辑配置");
addListener("onClose", $.toString(() => {
    // clearMyVar("batshare");
    //clearMyVar("share_duoselect");
    clearMyVar("temp_config");
    clearMyVar("share_configpath");
}))


let d = [];

if (config.path.startsWith("file")) {
    d.push({
        title: "新增",
        col_type: "icon_small_4",
        img: "hiker://images/home_icon_add",
        url: "hiker://page/editSources#noRecordHistory##noHistory#",
        extra: {
            newSource: true,
            config,
            canSave: true
        }
    });
}
let adapteds = Array.from(new Set(runtimeConfig.getAdapted().map(function(item) {
    return item === "drpy2.min.js" || item === "drpy2.js" ? "drpy2" : item;
})));

let apis = ["全部"].concat(adapteds);


let apiCounts = {};
apis.forEach(api => {
    apiCounts[api] = 0;
});

// 遍历 sourceList 并统计每个 api 出现的次数

sourceList.forEach(source => {
    if (source.api.includes('drpy2')) {
        apiCounts['drpy2']++;
    } else if (source.api.includes('csp_XYQHiker')) {
        apiCounts['csp_XYQHiker']++;
    } else {
        if (apiCounts.hasOwnProperty(source.api)) {
            apiCounts[source.api]++;
        }
    }
});

//多选模块
let MultiSelectMode = {
    sname: "multis",
    cls: "sources",
    target: "share",
    unique: function(arr) {
        const res = new Map()
        return arr.filter((a) => !res.has(a.id) && res.set(a.id, 1))
    },
    getAbsPath: function(path) {
        let spath = storage0.getMyVar("share_configpath", {});
        if (spath.type == "local_index_js" || spath.ctype == "local_index_js") {
            path = joinUrl(spath.path, path);
        }
        if (path.includes(".js?")) {
            path = "";
        }
        return path;
    },
    color: `<span style="color:#FF5733">`,
    Button: function(arr) {
        arr.push(this.selectAll());
        arr.push(this.invertSel());
        arr.push(this.zip());
    },
    Select: function(obj, shsort, type) {
        return $('#noLoading#').lazyRule((obj, shsort, type, sname) => {
            let {
                datatitle,
                dataid
            } = obj;
            var htmlst = ["avatar"].includes(type) ? "" : '““””';
            let duoselect = storage0.getMyVar(shsort + "_duoselect", []);
            //log(duoselect)
            if (duoselect.findIndex(x => x.id === dataid) == -1) {
                let temp = {
                    title: datatitle,
                    id: dataid,
                    path: $[sname].getAbsPath(obj.datapath)
                }
                duoselect.push(temp);
                var color = this.color ? this.color : $[sname].color;
                duoselect = $[sname].unique(duoselect)
                updateItem(dataid, {
                    title: htmlst + color + datatitle,
                });
            } else {
                function removeByValue(arr, val) {
                    for (var i = 0; i < arr.length; i++) {
                        if (arr[i]['id'] == val) {
                            arr.splice(i, 1);
                            break;
                        }
                    }
                }
                removeByValue(duoselect, dataid)
                updateItem(dataid, {
                    title: datatitle
                });
            }
            storage0.putMyVar(shsort + "_duoselect", duoselect);
            updateItem("share_zip", {
                title: "分享(" + duoselect.length + ")"
            })
            return "hiker://empty"
        }, obj, shsort, type, this.sname)
    },
    selectAll: function() {
        return {
            title: '全选',
            col_type: 'scroll_button',
            url: $("#noLoading#").lazyRule((cls, shsort, sname) => {
                var plays = findItemsByCls(cls).filter(x => x.extra.id != "source_length");
                let duoselect = storage0.getMyVar(shsort + "_duoselect", []);
                plays.map((x) => {
                    var htmlst = ["avatar"].includes(x.type) ? "" : '““””';
                    duoselect.push({
                        title: x.title,
                        id: x.extra.id,
                        path: $[sname].getAbsPath(x.extra.source.ext)
                    })
                    updateItem(x.extra.id, {
                        title: htmlst + $[sname].color + x.title,
                    })
                })
                duoselect = $[sname].unique(duoselect);
                updateItem("share_zip", {
                    title: "分享(" + duoselect.length + ")"
                })
                storage0.putMyVar(shsort + "_duoselect", duoselect);
                return 'toast://全选'
            }, this.cls, this.target, this.sname),
            extra: {
                cls: "shares_selects",
            }
        }
    },
    invertSel: function() {
        return {
            title: '反选',
            col_type: 'scroll_button',
            url: $("#noLoading#").lazyRule((cls, shsort, sname) => {
                var plays = findItemsByCls(cls).filter(x => x.extra.id != "source_length");
                let duoselect = storage0.getMyVar(shsort + "_duoselect") ? storage0.getMyVar(shsort + "_duoselect") : [];

                var splays = plays.filter(x => duoselect.some(y => y.id == x.extra.id));
                var fplays = plays.filter(x => !duoselect.some(y => y.id == x.extra.id));

                splays.map((x) => {
                    updateItem(x.extra.id, {
                        title: x.extra.stitle
                    })
                    duoselect.forEach((item, i) => {
                        if (x.extra.id == item.id) {
                            duoselect.splice(i, 1);
                        }
                    });
                })
                fplays.map((x) => {
                    var htmlst = ["avatar"].includes(x.type) ? "" : '““””';
                    duoselect.push({
                        title: x.extra.stitle,
                        id: x.extra.id,
                        path: $[sname].getAbsPath(x.extra.source.ext)
                    })
                    updateItem(x.extra.id, {
                        title: htmlst + $[sname].color + x.title,
                    })
                })
                updateItem("share_zip", {
                    title: "分享(" + duoselect.length + ")"
                })
                //log(duoselect)
                //duoselect = unique(duoselect);
                storage0.putMyVar(shsort + "_duoselect", duoselect);
                return 'toast://反选';
            }, this.cls, this.target, this.sname),
            extra: {
                cls: "shares_selects",
            }
        }
    },
    zip: function() {
        let duoselect = storage0.getMyVar("share" + "_duoselect", []);
        return {
            title: "分享(" + duoselect.length + ")",
            col_type: 'scroll_button',
            url: $("#noLoading#").lazyRule((cls, shsort, sname) => {
                let duoselect = storage0.getMyVar(shsort + "_duoselect", []);
                let targetPath = "hiker://files/_cache/DrpyHiker/drpy_js/";

                function findMd5ByName(array, nameToFind) {
                    const item = array.find(item => item.name === nameToFind);
                    return item;
                }
                let fs = $.fs();

                let drpyEncrypt = $.require("drpyEncrypt");

                function getRandomItem(array) {
                    let randomIndex = Math.floor(Math.random() * array.length);
                    return array[randomIndex];
                }

                fs.removeDir($.removefile(getPath("hiker://files/_cache/DrpyHiker/drpy_js")));
                //log(duoselect)

                let paths = [];
                if (duoselect.length) {
                    let list = [];
                    let hashfile = "hiker://files/_cache/DrpyHiker/清单.js";
                    if (fileExist(hashfile)) {
                        list = JSON.parse(fetch(hashfile)).list;
                    }
                    duoselect.map((x) => {
                        let path = x.path;
                        if (!path) {
                            return;
                        }
                        let name = fs.getName(path);

                        if (fileExist(targetPath + name)) {}

                        let hash_md5;

                        let npath = getPath(targetPath + name);
                        // log(path)
                        // log(npath)
                        fs.copyFile($.removefile(path), $.removefile(npath));
                        let entype = ["Gzip", "Base64", "AES"];
                        //let random = getRandomItem(entype);
                        let encodeMode = ConfigManager.getGlobal("share_encode");
                        if (encodeMode) {
                            if (duoselect.length > 100) {
                                showLoading("请稍等...");
                            }
                            let rule = fs.readFile(npath.replace("file://", ""));
                            if (/var rule|[\u4E00-\u9FA5]+|function|let |var |const |\(|\)|"|'/.test(rule)) {
                                let encode = drpyEncrypt.encrypt(rule, encodeMode);
                                writeFile(npath, encode);
                                hash_md5 = md5(npath);
                            } else {
                                hash_md5 = md5(path);
                            }
                        }
                        paths.push({
                            name,
                            md5: hash_md5
                        });
                    })
                    hideLoading();
                    //log(paths);
                    let shellpath = $.removefile(getPath("hiker://files/_cache/DrpyHiker/"));
                    let json = {
                        total: paths.length,
                        list: paths
                    }
                    fs.listDir(shellpath, true).filter(x => {
                        return x.toJson().name.includes(".hkshell")
                    }).forEach(f => {
                        deleteFile(f.toJson().path);
                    })

                    writeFile(hashfile, JSON.stringify(json));

                    let shellfile = "hiker://files/_cache/DrpyHiker/" + "点击导入" + paths.length + "个源.hkshell";
                    if (!fileExist(shellfile)) {
                        writeFile(shellfile, "js:\n" +
                            '"hiker://page/difference#noRecordHistory##noHistory#?rule=DrpyHiker&path="+MY_DIR')
                        //writeFile(shellfile, "COPY drpy_js hiker://files/data3/DrpyHiker/" + "\n" + "COPY index hiker://files/data3/DrpyHiker/");
                    }
                    if (paths.length) {
                        return $("", "请输入名称 自动名称drpydata").input(() => {
                            if (input == "") {
                                input = "drpydata.hkpkg";
                            } else {
                                input += ".hkpkg";
                            }
                            shareDirectory("hiker://files/_cache/DrpyHiker/", input);
                        })
                    } else {
                        toast("无分享内容");
                    }
                } else {
                    toast("请先选择要分享的源");
                }
                return "hiker://empty";
            }, this.cls, this.target, this.sname),
            extra: {
                id: "share_zip",
                cls: "shares_selects",
            }
        }
    }
}


$.extend({
    fsurl: "http://hiker.nokia.press/hikerule/rulelist.json?id=7013",
    fs: function() {
        let fs = $.require($.fsurl);
        //const fs = $.require("file:///storage/emulated/0/Download/web/src/fs.js");
        Object.defineProperties(fs, {
            getInfo: {
                value: function(path) {
                    path = path.replace('file://', '');
                    let c = fs.stat(path).toJson();
                    return {
                        fullpath: path,
                        path: fs.getParentPath(path),
                        fileName: c.name,
                        extension: c.etype,
                        name: c.woename
                    }
                },
                writable: true,
                enumerable: true,
                configurable: true
            },
            copyDirList: {
                value: function(source, target, force, list) {
                    //自定义的 filter 函数
                    source = getPath(source).replace("file://", "");
                    target = getPath(target).replace("file://", "");
                    // log(source)
                    // log(target)
                    function filterFunc(list) {
                        return function(source, target) {
                            // log(source)
                            // log(target)
                            //true 可以复制, false 不可以复制
                            let result = list.some(path => source.includes(path));
                            if (result) {
                                //log(target)
                            }
                            return result;
                        };
                    }
                    fs.copyDir(source, target, force, filterFunc(list))
                },
                writable: true,
                enumerable: true,
                configurable: true
            },
        });

        return fs;
    },
    removefile: function(p) {
        return p.replace("file://", "");
    },
    multis: MultiSelectMode,
    refreshText: function(text) {
        let item = findItem("source_search");
        let extra = item.extra;
        let def = text;
        if (text == undefined) {
            def = getMyVar("source_keyword", "")
        }
        updateItem("source_search", {
            extra: Object.assign({}, extra, {
                defaultValue: def
            })
        })
    },
    refreshCls: function(cls, target) {
        findItemsByCls(cls).map(it => {
            let ex = it.extra;
            let title = it.title.replace(/<.*?>|[“”]/g, "");
            let t = title;
            if (ex.stitle) {
                t = ex.stitle;
            }
            updateItem(ex.id, {
                title: t == target ? ("““””" + title.fontcolor("#449F50")) : title,
                extra: Object.assign({}, ex, {
                    backgroundColor: t == target ? "#FFDFF1E3" : ""
                })
            })
        })
    }
})

// 输出结果
//console.log(apiCounts);

let configType = runtimeConfig.getConfigType(config);

if (configType === "local_dir") {
    d.push({
        title: "编辑参数映射表",
        img: "hiker://images/home_icon_code",
        col_type: "icon_small_4",
        url: $().lazyRule((path) => {
            path += "/.mapping.txt";
            if (fileExist(path)) {
                toast("保存后刷新配置或重启才会生效");
                return "editFile://" + path;
            } else {
                return $("不存在映射文件是否创建？").confirm(path => {
                    writeFile(path, "");
                    toast("保存后刷新配置或重启才会生效");
                    return "editFile://" + path;
                }, path);
            }
        }, config.path)
    });
    d.push({
        title: "本地管理",
        col_type: "icon_small_4",
        img: "hiker://images/home_icon_bookmark_group",
        url: 'hiker://page/LocalDir#noRecordHistory##noHistory#',
        extra: {
            cpath: config.path
        }
    });
}

d.push({
    title: "配置",
    col_type: "scroll_button",
    url: $('#noLoading#').lazyRule((scn, c) => {
        let {
            drpyConfig,
        } = $.require("hiker://page/methods");
        let lc = drpyConfig.get();
        const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
        let runtimeConfig = GM.defineModule("runtimeConfig");
        let lcs = Object.assign([], lc);
        let ctypes = {
            "local_dir": "本地文件夹",
            "local_index": "本地JSON",
            "local_index_js": "本地JS",
            "http_index": "远程JSON",
            "http_github_dir": "git文件夹"
        }
        let spath = getPath(getPublicItem("DrpyHiker@input_path", ""));
        //log(spath);

        //log(lcs)

        lcs.forEach(function(item) {
            item.ctype = runtimeConfig.getConfigType(item);
            //log(item.ctype)
            item.sp = ctypes[item.ctype];
        });
        //log(lcs)

        hikerPop.selectCenter({
            options: lcs.map(x => "““””<small>" + (x.name == scn ? ">>" + x.name + "[" + x.sp + "]" : x.name + "[" + x.sp + "]") + "</small>"),
            columns: 2,
            title: "此选择不会变更默认配置",
            position: lc.findIndex(x => x.name == c.name),
            click(a, i) {
                hikerPop.runOnNewThread(() => {
                    delete lc[i].type;
                    storage0.putMyVar("temp_config", lc[i]);
                    toast("加载配置:" + lc[i].name);
                    refreshPage(false);
                });
            },
            longClick(a) {
                return "toast://长按了" + a;
            }
        });
        return "hiker://empty";
    }, scname, config),
    extra: {
        longClick: [{
            title: "清除临时配置",
            js: $.toString(() => {
                clearMyVar("temp_config");
                refreshPage(false);
                return "toast://清除临时配置完成"
            })
        }]
    }
})

for (let api of apis) {
    let show_api = getMyVar("show_api", "全部");
    if (api == "全部" || apiCounts[api] > 0) {
        let t = api == "全部" ? (api + "(" + sourceList.length + ")") : api + "(" + apiCounts[api] + ")";
        if (api == show_api) {
            t = t.fontcolor("#449F50");
        }
        d.push({
            title: "““””" + t,
            col_type: "scroll_button",
            img: "hiker://images/home_icon_code",
            url: $("#noLoading#").lazyRule((api) => {
                if (getMyVar("show_api", "全部") == api) {
                    return "hiker://empty";
                }
                if (getMyVar("batshare", "0") == "1") {
                    clearMyVar("batshare");
                    refreshPage(false);
                }
                if (api == "全部") {
                    clearMyVar("show_api");
                } else {
                    putMyVar("show_api", api);
                }
                //refreshPage(false);
                $.refreshCls("source_apis", api);
                $.refreshText();
                return "hiker://empty";
            }, api),
            extra: {
                stitle: api,
                cls: "source_apis",
                id: "apis_" + api,
                backgroundColor: getMyVar("show_api", "全部") == api ? "#FFDFF1E3" : ""
            }
        });
    }
}
d.push({
    col_type: "blank_block",
});

let tagClasses = runtimeConfig.getTagClasses(sourceList);

if (tagClasses.length) {
    tagClasses.unshift("全部");
}
tagClasses.map(x => {
    let tag = getMyVar("source_keyword", "").replace(/[\[\]]/g, "");
    if (tag == "") {
        tag = "全部";
    }
    d.push({
        title: x == tag ? ("““””" + x.fontcolor("#449F50")) : x,
        col_type: "scroll_button",
        img: "hiker://images/home_icon_code",
        url: $("#noLoading#").lazyRule((x) => {
            if (x == "全部") {
                clearMyVar("source_keyword");
            } else {
                putMyVar("source_keyword", `[${x}]`);
            }
            $.refreshText(x == "全部" ? "" : `[${x}]`);

            let tag = getMyVar("source_keyword", "").replace(/[\[\]]/g, "");
            if (tag == "") {
                tag = "全部"
            }
            $.refreshCls("source_tags", tag);
            return "hiker://empty";
        }, x),
        extra: {
            cls: "source_tags",
            id: "tags_" + x,
            backgroundColor: tag == x ? "#FFDFF1E3" : ""
        }
    })
})


let batshare = getMyVar("batshare", "0") == "0" ? false : true;

if (configType === "local_dir" || configType == "local_index_js") {

    storage0.putMyVar("share_configpath", config);
    d.push({
        col_type: "blank_block",
    })

    d.push({
        title: "批量分享:" + (batshare ? "开启" : "关闭"),
        col_type: "scroll_button",
        url: $("#noLoading#").lazyRule(() => {
            let batshare = getMyVar("batshare", "0") == "0" ? false : true;
            var playlist = findItemsByCls("sources").filter(x => x.extra.id != "source_length");
            deleteItemByCls("shares_selects");
            if (!batshare) {
                putMyVar("batshare", "1");
                putMyVar("show_api", "drpy2");
                $.refreshCls("source_apis", "drpy2");
                $.refreshText();
                addItemAfter("shares_button", [$.multis.selectAll(), $.multis.invertSel(), $.multis.zip()]);
            } else {
                for (let i = 0; i < playlist.length; i++) {
                    let item = playlist[i];
                    var title = item.title;
                    updateItem(item.extra.id, {
                        title: title.replace(/<.*?>|[“”]/g, ""),
                        url: "hiker://page/editSources#noRecordHistory##noHistory#",
                    });
                }
                putMyVar("batshare", "0");
                //$.refreshCls("source_apis","全部");
                //$.refreshText();
                //clearMyVar("show_api");
                clearMyVar('share_duoselect');
            }
            updateItem("shares_button", {
                title: "批量分享:" + (getMyVar("batshare", batshare) == "1" ? "开启" : "关闭"),
            })
            return "hiker://empty"
        }),
        extra: {
            id: "shares_button",
            longClick: [{
                title: "过滤标签",
                js: $.toString(() => {
                    return $("").input(() => {
                        if (input != "") {
                            let c = "[" + input + "]";
                            if (input.includes("|")) {
                                c = "(" + input + ")";
                            }
                            $.refreshText(String.raw`?^(?!.*([【\[])${c}([\]】])).*$`.toString())
                        }
                    })
                })
            }]
        }
    })
    if (batshare) {
        $.multis.Button(d)
    }

    d.push({
        title: "编码:" + (ConfigManager.getGlobal("share_encode") == "不编码" ? "无" : ConfigManager.getGlobal("share_encode")),
        col_type: "scroll_button",
        url: $("#noLoading#").lazyRule(() => {
            showSelectOptions({
                title: "编码类型",
                options: ["不编码", "Gzip", "Base64", "AES"],
                col: 1,
                js: $.toString(() => {
                    const ConfigManager = $.require('./subpage/ConfigManager.js');
                    if (MY_INDEX === 0) {
                        ConfigManager.setGlobal("share_encode", "");
                    } else {
                        ConfigManager.setGlobal("share_encode", input);
                    }
                    updateItem("share_encode", {
                        title: "编码:" + (ConfigManager.getGlobal("share_encode") == "不编码" ? "无" : ConfigManager.getGlobal("share_encode")),
                    })
                    return "toast://" + input;
                })
            });
            return "hiker://empty"
        }),
        extra: {
            id: "share_encode"
        }
    })
}

d.push({
    title: "源名",
    desc: "?开头使用正则处理",
    col_type: "input",
    url: $.toString(() => {
        refreshPage(false);
        return "hiker://empty";
    }),
    extra: {
        id: "source_search",
        onChange: $.toString((sl, s, cfg, ct) => {
            if (getMyVar("show_api")) {
                sl = sl.filter(x => x.api.includes(getMyVar("show_api")));
            }
            let batshare = getMyVar("batshare", "0") == "0" ? false : true;

            function getList(list, s) {
                let d = [];
                let lc = false;
                if (cfg.path.startsWith("file")) {
                    lc = true;
                }
                for (let source of list) {
                    let longclick = [];
                    if (lc) {
                        longclick.push({
                            title: "删除",
                            js: $.toString((c, s, ct) => {
                                let k = s.key;
                                if (ct == "local_index") {
                                    let cJson = JSON.parse(toCorrectJSONString(fetch(c.path)));
                                    let index = cJson.sites.findIndex(v => k === v.key);
                                    if (index != 1) {
                                        let backupath = joinUrl(c.path, "./source_backup/" + s.name + ".json");
                                        writeFile(backupath, JSON.stringify(cJson.sites[index], null, 2));
                                        cJson.sites.splice(index, 1);
                                        writeFile(c.path, JSON.stringify(cJson, null, 2));
                                        deleteItem("sources_" + k);
                                    }
                                }
                                if (ct == "local_dir") {
                                    let backupath = joinUrl(c.path + "/source_backup/", s.name + ".js");
                                    //log(backupath)
                                    let content = fetch(getPath(s.ext));
                                    writeFile(backupath, content);
                                    deleteFile(s.ext);
                                    deleteItem("sources_" + k);
                                }
                                if (ct == "local_index_js") {
                                    let filen = /[^/]+(?=\?|$)/.exec(s.ext)[0];
                                    let path = joinUrl(c.path, s.ext);
                                    let backupath = joinUrl(c.path, "./source_backup/" + filen);
                                    //log(backupath)
                                    //log(s)
                                    let content = fetch(getPath(path));
                                    writeFile(backupath, content);
                                    //log(path)
                                    deleteFile(path);
                                    deleteItem("sources_" + k);
                                }
                            }, cfg, source, ct)
                        })

                        if (ct == "local_index_js" || ct == "local_dir") {
                            longclick.push({
                                title: "改名",
                                js: $.toString((c, s, ct) => {
                                    let ginfo = (p) => {
                                        return $.fs().getInfo(p);
                                    }
                                    if (ct == "local_dir") {
                                        let path = s.ext;
                                        let info = ginfo(path);
                                        return $(info.name, "输入新名称").input((s, info, p) => {
                                            let k = s.key;
                                            let nname = input + "." + info.extension;

                                            $.fs().rename($.removefile(p), nname);
                                            toast("修改完成");
                                            refreshPage(false);
                                            // let item = findItem("sources_" + s.key);
                                            // let sif = item.title.includes("(") ? "(" + item.title.split("(")[1].split(")")[0] + ")" : "";
                                            // let title = item.title.replace(item.title, input) + sif;
                                            // updateItem("sources_" + s.key, {
                                            //   title: title
                                            // })
                                        }, s, info, path)
                                    }
                                    if (ct == "local_index_js") {
                                        let path = joinUrl(c.path, s.ext);
                                        let info = ginfo(path);
                                        //log(path)
                                        return $(info.name, "输入新名称").input((s, info, p) => {
                                            let k = s.key;
                                            let nname = input + "." + info.extension;
                                            $.fs().rename($.removefile(p), nname);
                                            toast("修改完成");
                                            refreshPage(false);
                                            // let item = findItem("sources_" + s.key);
                                            // let sif = item.title.includes("(") ? "(" + item.title.split("(")[1].split(")")[0] + ")" : "";
                                            // let title = item.title.replace(item.title, input) + sif;
                                            // updateItem("sources_" + s.key, {
                                            //   title: title
                                            // })
                                        }, s, info, path)
                                    }
                                }, cfg, source, ct)
                            })
                        }
                    }
                    let t = source.name;
                    let id = source.key;
                    if (t == s.name) {
                        source.by = "current";
                    }
                    let sd = storage0.getMyVar("share_duoselect", []);
                    t = t == s.name ? "➡️" + t : t;
                    let st = t;
                    if (batshare && sd.findIndex(x => x.title == t) > -1) {
                        st = '““””' + $.multis.color + t;
                    }
                    d.push({
                        title: st,
                        col_type: "text_1",
                        url: batshare ? $.multis.Select({
                            datatitle: t,
                            dataid: "sources_" + source.key,
                            datapath: source.ext
                        }, "share", "text_1") : "hiker://page/editSources#noRecordHistory##noHistory#",
                        extra: {
                            id: "sources_" + source.key,
                            cls: "sources",
                            stitle: source.name == s.name ? "➡️" + source.name : source.name,
                            config: cfg,
                            source,
                            canSave: true,
                            longClick: longclick,
                        }
                    });
                }
                return d;
            }
            putMyVar("source_keyword", input);
            let d = [];
            deleteItemByCls("sources");
            deleteItem("source_length");
            let list = [];
            if (input != "") {
                //deleteItemByCls("sources");
                input = input.toLowerCase();
                let flist = sl.filter(x => {
                    if (input.startsWith('?')) {
                        let regex;
                        try {
                            regex = new RegExp(input.substring(1), 'i');
                        } catch {}
                        if (regex) {
                            return regex.test(x.name);
                        }
                    } else {
                        return x.name.toLowerCase().includes(input);
                    }
                });
                list = flist.slice();
                let d = getList(flist, s);
                d.unshift({
                    title: "““””<small>显示数量:" + d.length + "</small>",
                    col_type: "text_center_1",
                    url: "hiker://empty",
                    extra: {
                        cls: "sources",
                        id: "source_length"
                    }
                })
                addItemAfter("source_search", d);
            } else {
                list = sl.slice();
                let d = getList(sl, s);
                d.unshift({
                    title: "““””<small>显示数量:" + d.length + "</small>",
                    col_type: "text_center_1",
                    url: "hiker://empty",
                    extra: {
                        cls: "sources",
                        id: "source_length",
                    }
                })
                addItemAfter("source_search", d);
            }
        }, sourceList, source, config, configType),
        defaultValue: getMyVar("source_keyword", "")
    }
})


setResult(d);