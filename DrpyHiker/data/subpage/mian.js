function load(d, drpy, source, hasHaed) {
    let {
        ui_config,
    } = $.require("UIManage");
    ui_config = ui_config.yi;
    let page = MY_PAGE;
    let categorys = $.require("categorys");
    categorys.getcategorys(d, drpy, page, hasHaed);
    let {
        cate,
        homelist,
        longPressActions
    } = categorys.getcatelist();
    if (getMyVar("links", "") == "1" && !hasHaed) {
        setPreResult(d);
        d.length = 0;
    }
    let cobj = storage0.getMyVar("tempcate", {});
    if (Object.keys(cobj).length) {
        cate = storage0.getMyVar("tempcate").current;
    }

    let fl = categorys.getfl();
    let skipEr = drpy.getRule("二级") === "*" && getItem("skipEr", "");
    /*let pextra = {};
    if (skipEr) {
        pextra = {}; //$.require("videoUrl").carryjs(JSON.parse(drpy.play()));
    }*/
    let deCol = drpy.getRule(cate == "home" ? "hikerListCol" : "hikerClassListCol");
    let homeListCol = getItem("homeListCol", "") || deCol || "movie_3_marquee";
    let stype = drpy.getRule("类型");
    let icon = ui_config.icons.影视;
    switch (stype) {
        case '漫画':
            icon = ui_config.icons.漫画;
            break;
        case '小说':
            icon = ui_config.icons.小说;
            break;
        default:
    }
    updateItem(MY_RULE.title + "sourcename", {
        img: icon,
    });

    let list = [];
    if (cate == "home") {
        if (page == 1) {
            list = homelist;
        }
        if (list === undefined) {
            list = [];
            clearMyVar("ishome");
        }
        if (list.length > 0 && !list.at(0).vod_pic && !list.at(-1).vod_pic && !deCol) {
            homeListCol = "text_1";
            if (!list.every(it => !it.vod_pic)) {
                homeListCol = "avatar";
            }
        }
    } else {
        try {
            list = JSON.parse(drpy.category(String(cate), page, true, fl)).list;
        } catch (e) {
            log(e.message);
        }
        if (list.every(it => !it.vod_pic)) {
            homeListCol = "text_1";
        }
    }
    $.require("LoadHomePage").loadHome(d, list, source, {
        skipEr,
        homeListCol,
        mark: ui_config.mark,
        longPressActions
    });
    deleteItem(MY_RULE.title + "load");
}

function setDrpyPath(d) {
    d.push({
        title: "缺少运行库\n该小程序不能通过云剪贴板分享，只能通过打包分享",
        desc: "将运行库放入" + getPath("hiker://files/data/" + MY_RULE.title + "/libs_hiker/drpy2.js"),
        col_type: "text_center_1",
        url: "hiker://empty"
    });
}

function setHied(d, name, config) {
    let {
        ui_config,
        ui_expand,
        reorderArrayByOrder
    } = $.require("UIManage");

    let {
        objectex
    } = $.require("methods");
    objectex();

    ui_config = ui_config.yi;
    let ui_indexs = ui_config.ui;
    ui_expand();

    let selects = [{
        title: "收藏",
        icon: ui_config.icons.收藏
    }, {
        title: "书架-小说",
        icon: ui_config.icons.书架小说
    }, {
        title: "书架-漫画",
        icon: ui_config.icons.书架漫画
    }]

    let favicons = {
        get(st) {
            st = st || selects;
            return $(st, 2, "我的").select(() => {
                if (input.includes("历史")) {
                    return "hiker://history?rule=" + MY_RULE.title;
                } else if (input.includes("书架-小说")) {
                    return 'hiker://page/Bookrack.view#noRecordHistory#?rule=本地资源管理&type=novel&ruleName=' + MY_RULE.title;
                } else if (input.includes("书架-漫画")) {
                    return 'hiker://page/Bookrack.view#noRecordHistory#?rule=本地资源管理&type=comic&ruleName=' + MY_RULE.title;
                } else if (input.includes("收藏")) {
                    return "hiker://collection?rule=" + MY_RULE.title;
                }
            })
        }
    };


    Object.defineProperty(favicons, 'select', {
        enumerable: false,
        configurable: true,
        get: function() {
            return selects;
        },
        set: function(value) {
            selects.push(value);
        }
    });
    GM.put("favicons", favicons);

    let smode = Number(getItem("smode", "0"));
    let searchsort = Number(getItem("searchsort", "0"));
    let uiobj = [];
    let runtimeConfig = GM.defineModule("runtimeConfig");
    let currentsource = runtimeConfig.getCurrentSource();
    let currentconifg = runtimeConfig.getCurrentConfig();
    let configname = currentconifg.name;

    uiobj.push({
        index: 0,
        key: "换源",
        title: "换源",
        col_type: ui_config.col,
        img: ui_config.icons.换源,
        url: $("#noLoading#").lazyRule(() => {
            return GM.get("itemAciton")("换源");
        }),
        extra: {
            cpath: config.path,
            longClick: [{
                title: "更换配置",
                js: JSON.stringify("hiker://page/createConfig#noRecordHistory##noHistory#")
            }, {
                title: "访问网站",
                js: $.toString(() => {
                    return GM.get("itemAciton")("访问网站");
                })
            }, {
                title: "全局动作",
                js: $.toString(() => {
                    return GM.get("itemAciton")("全局动作");
                })
            }, {
                title: "刷新源",
                js: $.toString(() => {
                    GM.get("itemAciton")("刷新源");
                })
            }, {
                title: "重载源",
                js: $.toString(() => {
                    GM.get("itemAciton")("重载源");
                })
            }, {
                title: "查看源代码",
                js: $.toString(() => {
                    return GM.get("itemAciton")("查看源代码");
                })
            }, {
                title: "PushAgent",
                js: $.toString(() => {
                    return GM.get("itemAciton")("PushAgent");
                })
            }].concat((config.type && config.type.includes("local")) ? [{
                title: "编辑当前配置",
                js: JSON.stringify("hiker://page/editLocalConfigList#noRecordHistory##noHistory#")
            }] : [])
        }
    });

    uiobj.push({
        index: 1,
        key: "搜索模式",
        title: ["选中", "聚合", config.sTag || "无TAG"][smode],
        url: $('#noLoading#').lazyRule(() => {
            let smode = Number(getItem("smode", "0"));
            return $(["选中", "聚合", "按TAG"], 1, "搜索模式", smode).select((t) => {
                if (MY_INDEX === 2) {
                    let runtimeConfig = GM.defineModule("runtimeConfig");
                    let tagClasses = runtimeConfig.getTagClasses();
                    let stag = runtimeConfig.getSearchTag();
                    let index = 0;
                    if (!tagClasses.length) return "toast://当前配置没有TAG哦。";
                    if (stag) {
                        index = tagClasses.indexOf(stag) + 1;
                    }
                    tagClasses.unshift("[无TAG]");
                    return $(tagClasses, 3, "搜索TAG[" + tagClasses.length + "]", index).select((t) => {
                        let runtimeConfig = GM.defineModule("runtimeConfig");
                        let tag = MY_INDEX === 0 ? "" : input;
                        if (runtimeConfig.setSearchTag(tag)) {
                            setItem("smode", "2");
                            updateItem(t + "@search_mode", {
                                title: tag || "无TAG",
                            });
                            //return "";
                        } else {
                            return "toast://设置失败";
                        }
                    }, t);
                }
                setItem("smode", "" + MY_INDEX);
                updateItem(t + "@search_mode", {
                    title: ["选中", "聚合"][MY_INDEX],
                });
                return "hiker://empty";
            }, MY_RULE.title)
        }),
        img: ui_config.icons.搜索,
        col_type: ui_config.col,
        extra: {
            id: MY_RULE.title + "@search_mode",
            longClick: [{
                title: "指定搜索源",
                js: $.toString(() => {
                    $.require("SearchAllowPop").show();
                })
            }, {
                title: "搜索排序:" + ["无", "自然", "使用"][searchsort],
                js: $.toString((searchsort) => {
                    return $(["不使用", "自然排序", "使用排序"], 1, "搜索排序", searchsort).select(() => {
                        setItem("searchsort", String(MY_INDEX));
                        refreshPage();
                    })
                }, searchsort)
            }]
        }
    });

    let {
        //settings,
        //getVaules,
        itemAciton
    } = $.require("settings");

    let disVisibles = ui_indexs.filter(x => x.index == -1);
    //getVaules(settings, disVisibles)


    GM.put("itemAciton", itemAciton)

    /*let setting = $(settings, 2, "设置").select(() => {
    return GM.get("itemAciton")(input);
    });*/

    let nsetting = $("#noLoading#").lazyRule((disVisibles, config, version) => {
        const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
        let SettingItem = hikerPop.selectBottomSettingMenu.SettingItem;
        let options = [
            SettingItem("解析管理"),
            SettingItem("UI管理"),
            SettingItem("更换配置", (GM.defineModule("runtimeConfig").getCurrentConfig() || {}).name),
            SettingItem("编辑当前配置"),
            SettingItem("切换列表样式", getItem("homeListCol", "") || "默认"),
            SettingItem("主题", getItem("theme", "默认")),
            SettingItem("支持作者", "(•ૢ⚈͒⌄⚈͒•ૢ)"),
            SettingItem("更新日志", "v" + version),
            SettingItem(),
            SettingItem("官方弹幕", !!getItem("useDanmu", ""), "仅官源有效"),
            SettingItem("跳过形式二级", !!getItem("skipEr", "")),
            SettingItem("调试日志", !!getItem("useLog", "")),
            SettingItem("启用push代理", !!getItem("pushProxy", "")),
            SettingItem(),
            SettingItem("创建订阅地址"),
            SettingItem("分享导入路径"),
            SettingItem("其他设置"),
        ];
        if (com.example.hikerview.ui.setting.model.SettingConfig.developerMode) {
            options.splice(2, 0, SettingItem("子页面管理"))
        }

        if (disVisibles.some(x => x.key == "我的")) {
            options.push(SettingItem("我的"));
        }
        let smode = Number(getItem("smode", "0"));
        let searchsort = Number(getItem("searchsort", "0"));
        if (disVisibles.some(x => x.key == "搜索模式")) {
            options.push(SettingItem());
            options.push(SettingItem("搜索模式", ["选中", "聚合", config.sTag || "无TAG"][smode]));
            options.push(SettingItem("搜索指定源"));
            options.push(SettingItem("搜索排序", ["不使用", "自然排序", "使用排序"][searchsort]));
        }
        let configExt = {};
        let pop = hikerPop.selectBottomSettingMenu({
            options: options,
            click(input, officeItem, change) {
                return GM.get("itemAciton")(input, officeItem, change, pop, configExt);
            },
            onDismiss() {
                if (configExt.isRefresh) {
                    refreshPage();
                }
            }
        });
        return "hiker://empty";
    }, disVisibles, config, MY_RULE.version);

    //let newset = ui_config.新设置 ? true : false;
    let newset = true;
    uiobj.push({
        key: "设置",
        index: 2,
        title: "设置",
        url: newset ? nsetting : setting,
        img: ui_config.icons.设置,
        col_type: ui_config.col,
        extra: {
            //newWindow: true
        }
    });

    uiobj.push({
        index: 3,
        key: "历史",
        title: "历史",
        col_type: ui_config.col,
        img: ui_config.icons.历史,
        url: "hiker://history?rule=" + MY_RULE.title,
    });
    uiobj.push({
        index: 4,
        key: "我的",
        title: "收藏",
        url: $('#noLoading#').lazyRule(() => {
            let favicons = GM.get("favicons");
            return favicons.get();
        }),
        img: ui_config.icons.我的,
        col_type: ui_config.col,
    });
    uiobj.push({
        index: 5,
        key: "源名",
        title: "当前源:" + (name || ""),
        col_type: "avatar",
        img: ui_config.icons.影视,
        url: "toast://点上面换源",
        extra: {
            id: MY_RULE.title + "sourcename",
        }
    });
    uiobj.push({
        index: 6,
        key: "搜索",
        title: '搜索',
        //desc: '',
        desc: '要搜点什么',
        url: $.toString(() => {
            GM.clear("ruleTestCfg");
            return 'hiker://search?rule=' + MY_RULE.title + "&s=" + input;
        }),
        col_type: 'input',
        extra: {
            defaultValue: getMyVar("keyword", ""),
            onChange: $.toString(() => {
                putMyVar("keyword", input)
            })
        }
    });
    storage0.putMyVar("uiobj", uiobj);

    var variables = {
        currentsource,
        currentconifg,
        configname,
        my_rule: MY_RULE
    };

    function formatTextWithVariables(text, variables) {
        return text.replace(/{([^\s{}]+)}/g, function(match, p1) {
            var parts = p1.split('.');
            var value = variables;
            for (var i = 0; i < parts.length; i++) {
                if (value !== undefined && value.hasOwnProperty(parts[i])) {
                    value = value[parts[i]];
                } else {
                    // 如果属性不存在，返回原始的占位符文本
                    return match;
                }
            }
            return value !== undefined ? value : match;
        });
    }

    let custobj = $.uiTheme.get()["yi"]["cust"] || {};

    if (!custobj.isEmpty) {
        Object.entries(custobj).forEach(([k, v]) => {
            let item = v;
            uiobj.push({
                key: k,
                index: item.index,
                title: formatTextWithVariables(item.title, variables),
                img: item.icon,
                url: $("#noLoading#").lazyRule((url) => {
                    if (url.includes("settings.")) {
                        u = url.split(".")[1];
                        if (u.includes(",")) {
                            u = u.split(",");
                            return GM.get("itemAciton")(u[0], u[1]);
                        }
                        //log(u)
                        return GM.get("itemAciton")(u)
                    }
                    if (url.startsWith("hiker://")) {
                        return url;
                    }
                }, item.url),
                col_type: item.style || ui_config.col,
            })
        })
    }


    suiobj = uiobj.slice();
    uiobj = reorderArrayByOrder(uiobj, ui_indexs);
    ui_indexs.map(item => {
        if (item.key == "换源" && item.index == -1) {
            let obji = suiobj.findIndex(x => x.key == "换源");
            let cobji = uiobj.findIndex(x => x.key == "源名");
            if (obji != 1 && cobji != -1) {
                uiobj[cobji].url = suiobj[obji].url;
                if (suiobj[obji].hasOwnProperty("extra")) {
                    uiobj[cobji].extra = suiobj[obji].extra;
                    uiobj[cobji].extra.id = MY_RULE.title + "sourcename";
                }
            }
        }
        if (item.key == "源名" && item.index == -1) {
            let obji = suiobj.findIndex(x => x.key == "源名");
            let cobji = uiobj.findIndex(x => x.key == "换源");
            if (obji != 1 && cobji != -1) {
                uiobj[cobji].title = name || "换源";
            }
        }
        if (item.key == "历史" && item.index == -1) {
            selects.unshift({
                "title": "历史",
                "icon": ui_config.icons.历史,
            })
        }
    });

    uiobj.forEach(item => {
        d.push(item)
    })



}
let d = [];

let runtimeConfig = GM.defineModule("runtimeConfig");
let DrpyManage = GM.defineModule("DrpyManage");
DrpyManage.initPage("home");
addListener("onClose", () => {
    clearMyVar("links");
    clearMyVar("tempcate");
    GM.clear("favicons")
});

try {
    if (android.os.Build.VERSION.SDK_INT >= 30 && !android.os.Environment.isExternalStorageManager()) {
        d.push({
            title: "‘‘提示’’",
            desc: "当前没有文件管理权限无法正常使用请打开海阔设置=>更多设置=>内部文件管理=>右上角",
            url: "hiker://empty",
            col_type: "text_center_1"
        });
    } else if (!runtimeConfig.isPrepared()) {
        let loadError = runtimeConfig.getLoadError();
        if (loadError) {
            d.push({
                title: "““配置文件加载失败””",
                desc: loadError.toString(),
                url: $().lazyRule(() => {
                    GM.defineModule("runtimeConfig").initDefault();
                    refreshPage();
                    return "hiker://empty";
                }),
                col_type: "text_center_1",
            });
            d.push({
                title: "更换配置",
                url: "hiker://page/createConfig#noRecordHistory##noHistory#",
                col_type: "text_center_1",
                extra: {
                    lineVisible: false
                }
            });
        } else {
            d.push({
                title: "还没有配置视频源",
                url: "hiker://page/createConfig#noRecordHistory##noHistory#",
                col_type: "text_center_1",
            });
        }
    } else if (fileExist("hiker://files/data/" + MY_RULE.title + "/libs_hiker/drpy2.js")) {

        let source = runtimeConfig.getCurrentSource();
        if (MY_PAGE === 1) {
            if (source == undefined) {
                setHied(d, "", {});
                throw new Error("当前没有选中任何视频源");
            } else {
                setHied(d, source.name, runtimeConfig.getCurrentConfig() || {});
            }
        }
        //log(DrpyManage.get(source.key))
        let hasHaed = false;
        if (getMyVar("links", "") == "") {
            d.push({
                title: '加载中...',
                col_type: 'text_center_1',
                url: "hiker://empty",
                extra: {
                    lineVisible: false,
                    id: MY_RULE.title + "load"
                }
            });
            setPreResult(d);
            d.length = 0;
            hasHaed = true;
        }
        if (source) {
            load(d, DrpyManage.get(source.key), source, hasHaed);
        }
    } else {
        setDrpyPath(d);
    }

} catch (e) {
    d.push({
        title: "““" + e.toString() + "””",
        desc: e.lineNumber,
        url: "hiker://empty",
        col_type: "text_center_1",
        extra: {
            longClick: [{
                title: "清除ui设置",
                js: $.toString(() => {
                    let {
                        ui_clear,
                    } = $.require("UIManage");
                    ui_clear("yi");
                    refreshPage();
                })
            }]
        }
    });
    d.push({
        title: "更换配置",
        url: "hiker://page/createConfig#noRecordHistory##noHistory#",
        col_type: "text_center_1",
        extra: {
            lineVisible: false
        }
    });
    deleteItem(MY_RULE.title + "load");
}

setResult(d);