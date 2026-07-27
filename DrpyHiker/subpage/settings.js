// ==================== settings.js ====================

// 统一引入配置与主题管理器
const ConfigManager = $.require('./subpage/ConfigManager.js');
const ThemeManager = $.require("./subpage/ThemeManager.js");

// 0跳转
// 1跳转并关闭菜单
// 2开关
// 3弹窗
// 4自定义方法
let settingsMode = new Map([
    ["解析管理", [0, "hiker://page/ruleManage#noRecordHistory##noHistory#"]],
    ["支持作者", [0, "hiker://page/Donate.v#noRecordHistory##noHistory#"]],
    ["UI管理", [1, "hiker://page/UIManage?mode=一级#noRecordHistory##noHistory#"]],
    ["创建订阅地址", [0, "hiker://page/createSubscription#noRecordHistory##noHistory#"]],
    ["更换配置", [1, "hiker://page/createConfig#noRecordHistory##noHistory#"]],
    ["编辑当前配置", [0, "hiker://page/editLocalConfigList#noRecordHistory##noHistory#"]],
    ["编辑内部配置", [0, "hiker://page/builtinSourceManage#noRecordHistory##noHistory#"]],

    ["编辑打开方式", [0, "hiker://page/OpenModeEditor#noRecordHistory##noHistory#"]],
    ["子页面管理", [0, "hiker://page/subPageManage#noRecordHistory##noHistory#"]],

    // 1退出刷新
    ["官方弹幕", [2, "useDanmu", 1]],
    ["调试日志", [2, "useLog", (officeItem, change, pop) => {
        if (pop) { GM.clearAll(); pop.dismiss(); }
        return 1;
    }]],
    ["使用配置自带解析", [2, "useConfigParse", 0]],
    ["使用Jar加载器", [2, "useJar", () => { toast("重启软件生效"); }]],
    ["悬浮日志窗口", [2, "useCFloatingWindow", (officeItem, change, pop) => {
        if (pop) { GM.clearAll(); pop.dismiss(); }
        return 1;
    }]],
    ["跳过形式二级", [2, "skipEr", 1]],
    ["启用push代理", [2, "pushProxy"]],

    // ==========================================
    // 【新增】运行模式切换
    // ==========================================
    ["运行模式", [4, (officeItem, change, pop) => {
        const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
        let runMode = ConfigManager.getGlobal("runMode") || 0;
        let options = ["外部自定义配置", "内置本地配置"];
        
        hikerPop.selectCenter({
            options: options, 
            columns: 1, 
            title: "选择系统运行模式", 
            position: runMode,
            click(a, MY_INDEX) {
                ConfigManager.setGlobal("runMode", MY_INDEX);
                
                if (officeItem) { 
                    officeItem.setDesc(a); 
                    change(); 
                } else { 
                    refreshPage(); 
                }
                
                // 切换模式后，强制重新初始化底层配置源并刷新主页
                let runtimeConfig = GM.defineModule("runtimeConfig");
                
                runtimeConfig.clearCurrentConfigCache();
                
                runtimeConfig.initDefault();
                
                
                toast("✅ 已成功切换为：" + a);
            },
        });
        return "hiker://empty";
    }]],
    // ==========================================

    ["换源", [3, "ChangeSourcePop"]],
    ["全局动作", [3, "GlobalactionPop"]],
    ["搜索指定源", [3, "SearchAllowPop"]],

    ["搜索模式", [4, (officeItem, change, pop) => {
        const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
        let smode = ConfigManager.getGlobal("smode");
        let options = ["选中", "聚合", "按TAG"];
        hikerPop.selectCenter({
            options: options, columns: 1, title: "搜索模式", position: smode,
            click(a, index) {
                if (index === 2) {
                    let runtimeConfig = GM.defineModule("runtimeConfig");
                    let tagClasses = runtimeConfig.getTagClasses();
                    let stag = runtimeConfig.getSearchTag();
                    let t_index = 0;
                    if (!tagClasses.length) return "toast://当前配置没有TAG哦。";
                    if (stag) t_index = tagClasses.indexOf(stag) + 1;
                    
                    tagClasses.unshift("[无TAG]");
                    hikerPop.selectCenter({
                        options: tagClasses, columns: 3, title: "搜索TAG[" + tagClasses.length + "]", position: t_index,
                        click(input, MY_INDEX) {
                            let tag = MY_INDEX === 0 ? "" : input;
                            if (GM.defineModule("runtimeConfig").setSearchTag(tag)) {
                                ConfigManager.setGlobal("smode", 2);
                                if (officeItem) { officeItem.setDesc(tag || "无TAG"); change(); }
                                refreshPage();
                            } else {
                                return "toast://设置失败";
                            }
                        }
                    });
                } else {
                    ConfigManager.setGlobal("smode", index);
                }
                if (officeItem) { officeItem.setDesc(a); change(); } 
                else { refreshPage(); }
            },
        });
    }]],
    ["其他设置", [4, (officeItem, change, pop) => {
        showSelectOptions({
            "title": "其他设置",
            "options": ["GitHubRaw地址", "Videolog:" + (ConfigManager.getGlobal("videolog") ? "开启" : "关闭")],
            col: 1,
            js: $.toString(() => {
                const ConfigManager = $.require('./subpage/ConfigManager.js');
                if (input === "GitHubRaw地址") {
                    const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
                    let def = "https://raw.githubusercontent.com";
                    hikerPop.inputConfirm({
                        title: "输入地址", hint: "为空默认", content: "默认:" + def,
                        defaultValue: ConfigManager.getGlobal("githubraw"),
                        confirm(text) {
                            ConfigManager.setGlobal("githubraw", text === "" ? def : text);
                            if (!GM.defineModule("runtimeConfig", "runtimeConfig").initDefault()) {
                                toast("刷新失败");
                            };
                            putMyVar("isRefresh", "1");
                            toast("已保存");
                        }
                    });
                }
                if (input.includes("Videolog")) {
                    let currentLog = ConfigManager.getGlobal("videolog");
                    ConfigManager.setGlobal("videolog", !currentLog);
                    refreshPage();
                    toast("已" + (!currentLog ? "开启" : "关闭") + "视频日志");
                }
            })
        });
        return "hiker://empty";
    }]],
    ["我的", [4, (officeItem, change, pop) => {
        let favicons = GM.get("favicons");
        return favicons.get();
    }]],
    ["搜索排序", [4, (officeItem, change, pop) => {
        const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
        let searchsort = ConfigManager.getGlobal("searchsort");
        let options = ["不使用", "自然排序", "使用排序"];
        hikerPop.selectCenter({
            options: options, columns: 1, title: "搜索排序", position: searchsort,
            click(a, MY_INDEX) {
                ConfigManager.setGlobal("searchsort", MY_INDEX);
                if (officeItem) { officeItem.setDesc(a); change(); } 
                else { refreshPage(); }
            },
        });
    }]],
    ["主题", [4, (officeItem, change, pop) => {
        const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
        const ThemeManager = $.require("./subpage/ThemeManager.js");
        let ctheme = ThemeManager.getCurrentThemeName();
        let s = ThemeManager.getAllThemes();
        let keys = Object.keys(s);
        if (keys.length < 2) return "toast://没有其他主题";
        
        if (keys.length == 2) {
            let name = (ctheme == keys[0]) ? keys[1] : keys[0];
            ThemeManager.setCurrentTheme(name);
            if (officeItem) { officeItem.setDesc(name); change(); }
            refreshPage();
            return "hiker://empty";
        }
        
        let ts = Object.keys(s);
        let themes = ts.map(x => (x == ctheme ? '““””' + x.fontcolor("red") : x));
        hikerPop.selectCenter({
            options: themes, columns: 1, title: "请选择主题",
            click(a, MY_INDEX) {
                let name = ts[MY_INDEX];
                ThemeManager.setCurrentTheme(name);
                if (officeItem) { officeItem.setDesc(name); change(); }
                refreshPage();
            }
        });
    }]],
    ["切换列表样式", [4, (officeItem, change, pop) => {
        const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
        let runtimeConfig = GM.defineModule("runtimeConfig");
        let cate = $.require("categorys").cate;
        let source = runtimeConfig.getCurrentSource();

        let collist = ["默认", "movie_3_marquee", "movie_3", "movie_2", "movie_1", "text_1", "avatar", "text_icon", "card_pic_3", "card_pic_3_center", "pic_1_card", "pic_2_card", "movie_1_vertical_pic", "movie_1_left_pic", "icon_1_left_pic"];
        let homeListCol = ConfigManager.getGlobal("homeListCol");
        let index = homeListCol ? collist.indexOf(homeListCol) : 0;
        let deCol;
        try {
            let drpy = GM.defineModule("DrpyManage").get(source.key);
            deCol = drpy.getRule(cate == "home" ? "hikerListCol" : "hikerClassListCol");
        } catch (e) {}
        
        hikerPop.selectCenter({
            options: collist, columns: 2, title: "选择样式", position: index,
            click(input, MY_INDEX) {
                let n = "默认";
                if (MY_INDEX === 0) {
                    ConfigManager.setGlobal("homeListCol", "");
                } else {
                    ConfigManager.setGlobal("homeListCol", input);
                    n = input;
                }
                if (officeItem) { officeItem.setDesc(n); change(); }
                let viewItem = findItemsByCls("playlist@" + source.key);
                if (viewItem) {
                    viewItem.forEach(item => {
                        updateItem(item.extra.id, {
                            col_type: n == "默认" ? (deCol ? deCol : "movie_3_marquee") : input
                        });
                    });
                }
            }
        });
        return "hiker://empty";
    }]],
    ["访问网站", [4, () => {
        let source = GM.defineModule("runtimeConfig").getCurrentSource();
        let rule = GM.defineModule("DrpyManage").get(source.key).getRule();
        if (rule.host == "hiker://empty") return "toast://获取地址失败";
        return "web://" + rule.host;
    }]],
    ["刷新源", [4, () => {
        clearMyVar("links");
        let runtimeConfig = GM.defineModule("runtimeConfig");
        let source = runtimeConfig.getCurrentSource();
        GM.defineModule("DrpyManage").get(source.key).init(runtimeConfig.getAbsolutePath(source.ext));
        refreshPage();
        return "toast://已刷新";
    }]],
    ["重载源", [4, () => {
        clearMyVar("links");
        let source = GM.defineModule("runtimeConfig").getCurrentSource();
        GM.defineModule("DrpyManage").del(source.key);
        refreshPage();
        return "toast://已重载";
    }]],
    ["查看源代码", [4, () => $.require("methods").viewSourse()]],
    ["PushAgent", [4, () => $("", "输入推送地址").input(() => $.require("videoUrl").pushAgent(input) || "toast://该配置没有设置push_gaent")]],
    ["重载", [4, () => {
        clearMyVar("ishome");
        clearMyVar("links");
        let runtimeConfig = GM.defineModule("runtimeConfig");
        let source = runtimeConfig.getCurrentSource();
        GM.clear("DrpyManage");
        if (!runtimeConfig.initDefault()) toast("刷新失败");
        GM.defineModule("DrpyManage").del(source.key);
        refreshPage();
        return "toast://已重载";
    }]],
    ["更新日志", [4, () => {
        $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js").updateRecordsBottom($.require("updateRecords"));
        return "hiker://empty";
    }]],
    ["打开悬浮日志窗口", [4, () => { if (console.isFloating) console.show(); }]],
    ["销毁悬浮日志窗口", [4, () => { if (console.isFloating) console.destroy(); }]],
]);

// 【核心修改】：将“运行模式”添加到前端UI展示列表中
let settings = ["解析管理", "运行模式", "官方弹幕", "支持作者", "UI管理", "调试日志", "跳过形式二级", "分享导入路径", "创建订阅地址", "切换列表样式", "其他设置", "主题", "更换配置", "编辑当前配置", "启用push代理"];

let exsettings = new Map([
    ["子页面管理", ["子页面管理"]],
    [["搜索模式"], ["搜索模式:", "搜索指定源", "搜索排序:"]],
    ["我的", ["我的"]],
    ["访问网站", "访问网站"],
    ["换源", "换源"],
    ["刷新源", "刷新源"],
    ["重载源", "重载源"],
    ["查看源代码", "查看源代码"],
    ["重载", "重载"]
]);

let hikerRoutes = [
    ["home", "hiker://home"], ["书签", "hiker://bookmark"], ["插件", "hiker://js"],
    ["下载", "hiker://download"], ["历史", "hiker://history"], ["收藏", "hiker://collection"],
    ["跳转拦截", "hiker://adUrl"], ["元素拦截", "hiker://adRule"], ["设置", "hiker://setting"],
    ["更多设置", "hiker://settingMore"], ["搜索", "hiker://search"], ["webDav", "hiker://webdav"],
    ["Web编辑", "hiker://webRule"], ["debug", "hiker://debug"], ["ai助理", "hiker://ai"],
    ["文件管理", "hiker://explore"], ["本地媒体", "hiker://localMedia"], ["网页搜索", "hiker://webSearch"]
];

function getVaules(settings, disVisibles) {
    if (com.example.hikerview.ui.setting.model.SettingConfig.developerMode) {
        settings.push.apply(settings, exsettings.get("子页面管理"));
    }
    if (disVisibles.some(x => x.key == "搜索模式")) {
        settings.push.apply(settings, exsettings.get("搜索模式"));
    }
    if (disVisibles.some(x => x.key == "我的")) {
        settings.push.apply(settings, exsettings.get("我的"));
    }
}

let allSettings = [].concat(settings);
exsettings.forEach(value => { allSettings.push.apply(allSettings, typeof value != "object" ? [value] : value); });

let options = allSettings.map(x => ({ "title": "settings." + x.split(":")[0], "url": "settings." + x.split(":")[0] }));
options = options.concat(hikerRoutes.map(x => ({ "title": "海阔" + x[0], "url": x[1] })));

function itemAciton(itemkey, officeItem, change, pop, configExt) {
    let setSwitch = () => {
        if (typeof officeItem == "object") {
            officeItem.setSelected(officeItem.getSelected() === 1 ? -1 : 1) || change();
        } else {
            refreshPage();
        }
    };
    if (!settingsMode.has(itemkey)) return "toast://无效选项";
    
    let item = settingsMode.get(itemkey);
    if (item[0] === 0) {
        return item[1];
    } else if (item[0] === 1) {
        pop && pop.dismissWith(() => {});
        $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js").runOnNewThread(() => {
            java.lang.Thread.sleep(100);
            return item[1];
        });
        return "hiker://empty";
    } else if (item[0] === 2) {
        // [重构核心] 使用标准 Boolean 类型读写
        let condition = ConfigManager.getGlobal(item[1]);
        ConfigManager.setGlobal(item[1], !condition);
        
        if (officeItem) {
            setSwitch();
            let isr = item.at(2);
            if (typeof isr === "function") isr = isr(officeItem, change, pop);
            if (isr && configExt) configExt.isRefresh = true;
        }
        return "toast://" + (condition ? "已关闭" : "已开启");
    } else if (item[0] === 3) {
        $.require(item[1]).show();
        return "hiker://empty";
    } else if (item[0] === 4) {
        return item[1](officeItem, change, pop);
    }
}

$.exports = {
    getVaules, itemAciton, hikerRoutes, options, allSettings
};
