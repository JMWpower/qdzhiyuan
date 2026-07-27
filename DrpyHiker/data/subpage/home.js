(function() {
    const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
    const ThemeManager = $.require('./subpage/ThemeManager.js');
    const ConfigManager = $.require('./subpage/ConfigManager.js');

    const CategoryManager = GM.defineModule('./subpage/CategoryManager.js');
    const {
        renderSearchInput,
        renderPageContent,
        renderError,
        renderLoadingAndCategory,
        deleteLoading
    } = $.require('./subpage/sourceUI.js');
    const {
        reorderArrayByOrder
    } = $.require('./subpage/uiUtils.js');

    const runtimeConfig = GM.defineModule("runtimeConfig");
    const DrpyManage = GM.defineModule("DrpyManage");
    DrpyManage.initPage("home");

    let pageId = PageStateManager.getOrCreatePageId("home");

    let d = [];

    if (MY_PAGE === 1) {
        if (!runtimeConfig.isPrepared()) {
            let loadError = runtimeConfig.getLoadError();
            if (loadError) {
                d.push({
                    title: "““配置文件加载失败””",
                    desc: loadError.toString(),
                    url: $().lazyRule(() => {
                        runtimeConfig.initDefault();
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
            setResult(d);
            return;
        }

        let source = runtimeConfig.getCurrentSource();
        if (!source) {
            d.push({
                title: "请先选择视频源",
                url: "hiker://page/createConfig#noRecordHistory##noHistory#",
                col_type: "text_center_1",
            });
            setResult(d);
            return;
        }

        buildHeader(d, source, runtimeConfig.getCurrentConfig() || {});
    }

    let source;
    let drpy;
    try {
        if (MY_PAGE == 1) {
            renderLoadingAndCategory(d, pageId);
            setPreResult(d);
            d.length = 0;
        }
        source = runtimeConfig.getCurrentSource();

        drpy = DrpyManage.get(source.key);

        // 调用公共渲染函数
        renderPageContent({
            d: d,
            hasHead: true,
            pageId: pageId,
            drpy: drpy,
            source: source,
            page: MY_PAGE,
            extra: {}
        });


        let theme = ThemeManager.getCurrentTheme();
        let stype = drpy.getRule("类型");
        let icon = theme.yi.icons.影视;
        if (stype === '漫画') icon = theme.yi.icons.漫画;
        else if (stype === '小说') icon = theme.yi.icons.小说;
        updateItem(MY_RULE.title + "sourcename", {
            img: icon
        });
    } catch (e) {
        deleteLoading(pageId);
        renderError(d, e);

    }
    addListener('onClose', $.toString((pageId) => {
        const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
        const CategoryManager = GM.defineModule('./subpage/CategoryManager.js');

        PageStateManager.removeState(pageId);
        CategoryManager.close(pageId);
    }, pageId));

    setResult(d);

    // ---------- 辅助函数：构建头部按钮 ----------
    function buildHeader(d, source, config) {
        let theme = ThemeManager.getCurrentTheme();

        let ui_config_yi = theme.yi;
        let uiConfig = ConfigManager.get();

        let ui_indexs = uiConfig.yi.ui;

        let selects = [{
                title: "收藏",
                icon: ui_config_yi.icons.收藏
            },
            {
                title: "书架-小说",
                icon: ui_config_yi.icons.书架小说
            },
            {
                title: "书架-漫画",
                icon: ui_config_yi.icons.书架漫画
            }
        ];

        let uiobj = [];

        // 换源
        uiobj.push({
            key: "换源",
            title: source.name || "换源",
            col_type: uiConfig.yi.col,
            img: source.logo || (source.lang === "hipy" ? "hiker://files/data/DrpyHiker/icon/hipy_round_logo.png" : ui_config_yi.icons.换源),
            url: $("#noLoading#").lazyRule(() => {
                let settings = $.require("settings");
                return settings.itemAciton("换源");
            }),
            extra: {
                cpath: config.path,
                longClick: [{
                        title: "更换配置",
                        js: JSON.stringify("hiker://page/createConfig#noRecordHistory##noHistory#")
                    },
                    {
                        title: "访问网站",
                        js: $.toString(() => {
                            return $.require("settings").itemAciton("访问网站");
                        })
                    },
                    {
                        title: "全局动作",
                        js: $.toString(() => {
                            return $.require("settings").itemAciton("全局动作");
                        })
                    },
                    {
                        title: "刷新源",
                        js: $.toString(() => {
                            $.require("settings").itemAciton("刷新源");
                        })
                    },
                    {
                        title: "重载源",
                        js: $.toString(() => {
                            $.require("settings").itemAciton("重载源");
                        })
                    },
                    {
                        title: "查看源代码",
                        js: $.toString(() => {
                            return $.require("settings").itemAciton("查看源代码");
                        })
                    },
                    {
                        title: "PushAgent",
                        js: $.toString(() => {
                            return $.require("settings").itemAciton("PushAgent");
                        })
                    }
                ].concat((config.type && config.type.includes("local")) ? [{
                    title: "编辑当前配置",
                    js: JSON.stringify("hiker://page/editLocalConfigList#noRecordHistory##noHistory#")
                }] : [])
            }
        });

        // 搜索模式
        let smode = ConfigManager.getGlobal("smode");
        uiobj.push({
            key: "搜索模式",
            title: ["选中", "聚合", config.sTag || "无TAG"][smode],
            url: $('#noLoading#').lazyRule(() => {
                let ConfigManager = $.require('./subpage/ConfigManager.js');
                let smode = ConfigManager.getGlobal("smode");
                return $(["选中", "聚合", "按TAG"], 1, "搜索模式", smode).select((t) => {
                    if (MY_INDEX === 2) {
                        let runtimeConfig = GM.defineModule("runtimeConfig");
                        let tagClasses = runtimeConfig.getTagClasses();
                        let stag = runtimeConfig.getSearchTag();
                        let index = 0;
                        if (!tagClasses.length) return "toast://当前配置没有TAG哦。";
                        if (stag) index = tagClasses.indexOf(stag) + 1;
                        tagClasses.unshift("[无TAG]");
                        return $(tagClasses, 3, "搜索TAG[" + tagClasses.length + "]", index).select((t) => {
                            let runtimeConfig = GM.defineModule("runtimeConfig");
                            let tag = MY_INDEX === 0 ? "" : input;
                            if (runtimeConfig.setSearchTag(tag)) {
                                let ConfigManager = $.require('./subpage/ConfigManager.js');
                                ConfigManager.setGlobal("smode", 2);
                                updateItem(t + "@search_mode", {
                                    title: tag || "无TAG"
                                });
                                return "hiker://empty";
                            } else return "toast://设置失败";
                        }, t);
                    }
                    let ConfigManager = $.require('./subpage/ConfigManager.js');
                    ConfigManager.setGlobal("smode", MY_INDEX);
                    updateItem(t + "@search_mode", {
                        title: ["选中", "聚合"][MY_INDEX]
                    });
                    return "hiker://empty";
                }, MY_RULE.title)
            }),
            img: ui_config_yi.icons.搜索,
            col_type: uiConfig.yi.col,
            extra: {
                id: MY_RULE.title + "@search_mode",
                longClick: [{
                        title: "指定搜索源",
                        js: $.toString(() => {
                            $.require("SearchAllowPop").show();
                        })
                    },
                    {
                        title: "搜索排序:" + ["无", "自然", "使用"][ConfigManager.getGlobal("searchsort")],
                        js: $.toString((searchsort) => {
                            return $(["不使用", "自然排序", "使用排序"], 1, "搜索排序", searchsort).select(() => {
                                let ConfigManager = $.require('./subpage/ConfigManager.js');
                                ConfigManager.setGlobal("searchsort", MY_INDEX);
                                refreshPage();
                            });
                        }, ConfigManager.getGlobal("searchsort"))
                    }
                ]
            }
        });

        // 设置（长按菜单）
        let disVisibles = ui_indexs.filter(x => x.index == -1);
        let version = MY_RULE.version || "?";
        uiobj.push({
            key: "设置",
            title: "设置",
            url: $("#noLoading#").lazyRule((disVisibles, config, version) => {
                const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
                const ThemeManager = $.require('./subpage/ThemeManager.js');
                const ConfigManager = $.require('./subpage/ConfigManager.js');

                let SettingItem = hikerPop.selectBottomSettingMenu.SettingItem;
                let options = [
                    SettingItem("解析管理"),
                    SettingItem("UI管理"),
                    SettingItem("更换配置", (GM.defineModule("runtimeConfig").getCurrentConfig() || {}).name),
                    SettingItem("编辑当前配置"),
                    SettingItem("编辑内部配置"),
                    SettingItem("编辑打开方式"),
                    SettingItem("切换列表样式", ConfigManager.getGlobal("homeListCol") || "默认"),
                    SettingItem("运行模式", ["外部自定义配置", "内置本地配置"][ConfigManager.getGlobal("runMode") || 0]),
                    SettingItem("主题", ThemeManager.getCurrentThemeName()),
                    SettingItem("支持作者", "(•ૢ⚈͒⌄⚈͒•ૢ)"),
                    SettingItem("更新日志", "v" + version),
                    SettingItem(),
                    SettingItem("官方弹幕", ConfigManager.getGlobal("useDanmu"), "仅官源有效"),
                    SettingItem("跳过形式二级", ConfigManager.getGlobal("skipEr")),
                    SettingItem("调试日志", ConfigManager.getGlobal("useLog")),
                    SettingItem("悬浮日志窗口", ConfigManager.getGlobal("useCFloatingWindow")),
                    SettingItem("启用push代理", ConfigManager.getGlobal("pushProxy")),

                    SettingItem("使用配置自带解析", ConfigManager.getGlobal("useConfigParse")),
                    SettingItem("使用Jar加载器", ConfigManager.getGlobal("useJar")),
                    SettingItem(),
                    SettingItem("创建订阅地址"),
                    SettingItem("其他设置"),
                ];
                if (console.isFloating) {
                    options.push(SettingItem("打开悬浮日志窗口"), SettingItem("销毁悬浮日志窗口"));
                }
                if (com.example.hikerview.ui.setting.model.SettingConfig.developerMode) {
                    options.splice(2, 0, SettingItem("子页面管理"))
                }
                if (disVisibles.some(x => x.key == "我的")) options.push(SettingItem("我的"));
                let smode = ConfigManager.getGlobal("smode");
                let searchsort = ConfigManager.getGlobal("searchsort");
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
                        let itemAciton = $.require("settings").itemAciton;
                        return itemAciton(input, officeItem, change, pop, configExt);
                    },
                    onDismiss() {
                        if (configExt.isRefresh) refreshPage();
                    }
                });
                return "hiker://empty";
            }, disVisibles, config, version),
            img: ui_config_yi.icons.设置,
            col_type: uiConfig.yi.col,
            extra: {}
        });

        // 历史
        uiobj.push({
            key: "历史",
            title: "历史",
            col_type: uiConfig.yi.col,
            img: ui_config_yi.icons.历史,
            url: "hiker://history?rule=" + MY_RULE.title,
        });

        // 我的（收藏）
        uiobj.push({
            key: "我的",
            title: "收藏",
            url: $('#noLoading#').lazyRule((selects, myRuleTitle) => {
                return $(selects, 2, "我的").select((myRuleTitle) => {
                    if (input.includes("历史")) return "hiker://history?rule=" + myRuleTitle;
                    else if (input.includes("书架-小说")) return 'hiker://page/Bookrack.view#noRecordHistory#?rule=本地资源管理&type=novel&ruleName=' + myRuleTitle;
                    else if (input.includes("书架-漫画")) return 'hiker://page/Bookrack.view#noRecordHistory#?rule=本地资源管理&type=comic&ruleName=' + myRuleTitle;
                    else if (input.includes("收藏")) return "hiker://collection?rule=" + myRuleTitle;
                }, myRuleTitle);
            }, selects, MY_RULE.title),
            img: ui_config_yi.icons.我的,
            col_type: uiConfig.yi.col,
        });

        // 源名
        uiobj.push({
            key: "源名",
            title: "当前源:" + (source.name || ""),
            col_type: "avatar",
            img: ui_config_yi.icons.影视,
            url: "toast://点上面换源",
            extra: {
                id: MY_RULE.title + "sourcename"
            }
        });

        // 重排按钮（排除搜索框，搜索框单独添加）
        let buttonArray = uiobj.filter(item => item.key !== "搜索");
        
        let reordered = reorderArrayByOrder(buttonArray, ui_indexs);
        
        for (let i = 0; i < reordered.length; i++) d.push(reordered[i]);

        // 添加搜索输入框
        d.push(renderSearchInput({
            defaultValue: getMyVar("keyword", ""),
            onChange: $.toString(() => {
                putMyVar("keyword", input);
            }),
            onSearch: $.toString(() => {
                GM.clear("ruleTestCfg");
                return 'hiker://search?rule=' + MY_RULE.title + "&s=" + input;
            }),
            placeholder: '要搜点什么'
        }));

        //storage0.putMyVar("uiobj", uiobj); // 临时兼容
    }
})();