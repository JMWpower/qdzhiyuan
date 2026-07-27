// ==================== UIManage.js (重构后 - 修复兼容性与路径) ====================
// 职责：仅负责提供"UI管理"界面的视图交互，所有数据读写全部委托给 ThemeManager 和 ConfigManager。

const { deepMerge, deepOmit, reorderArrayByOrder, getRangeColors, isValidColor } = $.require('./subpage/uiUtils.js');
const ThemeManager = $.require('./subpage/ThemeManager.js');
const ConfigManager = $.require('./subpage/ConfigManager.js');

if (getParam("mode", "") !== "") {
    addListener('onClose', $.toString(() => {
        clearMyVar("ui_navi");
        clearMyVar("uimode");
        if (getMyVar("isRefresh", "") === "1") {
            refreshPage();
            clearMyVar("isRefresh");
        }
    }));

    function toBoolean(text) {
        return text === "true" || text === true || text === "1";
    }

    function buttonImg(bool) {
        if (toBoolean(bool)) {
            return 'http://123.56.105.145/tubiao/messy/55.svg';
        }
        return 'http://123.56.105.145/img/drpy/off.svg';
    }

    setPageTitle("UI管理");
    let d = [];
    
    // ---------------- 顶部导航区 ----------------
    let ui_nav = ["一级", "二级"];
    let ui_navi = getMyVar("ui_navi", getParam("mode", "一级"));
    ui_nav.forEach(x => {
        d.push({
            title: '““””' + (x === ui_navi ? x.fontcolor("#20B2AA") : x),
            url: $('#noLoading#').lazyRule((it) => {
                putMyVar("ui_navi", it);
                refreshPage();
                return "hiker://empty";
            }, x),
            col_type: "text_3"
        });
    });

    // 读取当前完整配置与主题状态
    let currentThemeName = ThemeManager.getCurrentThemeName();
    let themeConfig = ThemeManager.getCurrentTheme();
    let appConfig = ConfigManager.get();

    d.push({
        title: "主题:" + currentThemeName,
        url: $('#noLoading#').lazyRule(() => {
            const ThemeManager = $.require('./subpage/ThemeManager.js');
            const ConfigManager = $.require('./subpage/ConfigManager.js');
            let ctheme = ThemeManager.getCurrentThemeName();
            let allThemeNames = ThemeManager.getAllThemeNames();
            let options = allThemeNames.map(x => x === ctheme ? '““””' + x.fontcolor("#20B2AA") : x);
            options.unshift("编辑主题", "重置所有主题");

            return $(options).select((options, ctheme) => {
                const ThemeManager = $.require('./subpage/ThemeManager.js');
                const ConfigManager = $.require('./subpage/ConfigManager.js');
                
                let name = options[MY_INDEX].replace(/<[^>]*>/g, '').replace(/[“”']/g, "");
                if (name === ctheme) return "hiker://empty";

                if (name === "编辑主题" && MY_INDEX === 0) {
                    return "hiker://page/ThemeEdit";
                } else if (name === "重置所有主题" && MY_INDEX === 1) {
                    return $("确认删除所有自定义主题？该操作不可逆。").confirm(() => {
                        deleteFile("hiker://files/rules/DrpyHiker/theme.json");
                        ConfigManager.reset();
                        clearItem("theme");
                        back();
                        return "toast://已清理所有自定义主题";
                    });
                }
                ThemeManager.setCurrentTheme(name);
                refreshPage();
            }, options, ctheme);
        }),
        col_type: "text_3",
        extra: {
            pageTitle: "主题编辑",
            longClick: [{
                title: "初始化当前主题",
                js: $.toString(() => {
                    return $("清除当前主题的用户修改并恢复默认？").confirm(() => {
                        const ThemeManager = $.require('./subpage/ThemeManager.js');
                        ThemeManager.resetCurrentTheme();
                        refreshPage();
                        return "toast://初始化完成";
                    });
                })
            }]
        }
    });

    d.push({ col_type: "blank_block" });

    // ---------------- 一级配置：首页与导航 UI ----------------
    if (ui_navi === "一级") {
        addListener('onRefresh', $.toString(() => {
            clearMyVar("ui_current");
        }));

        let uimode = getMyVar("uimode", "0") === "1";
        let uiOrder = ConfigManager.getUiOrder();
        
        let custObj = themeConfig.yi && themeConfig.yi.cust ? themeConfig.yi.cust : {};

        // 整理当前展示的UI配置队列
        let uis = JSON.parse(JSON.stringify(uiOrder));
        Object.keys(custObj).forEach(key => {
            let item = custObj[key];
            let exists = uis.find(x => x.key === key);
            if (!exists) {
                uis.push({ index: item.index !== undefined ? item.index : -1, key: key, cust: true });
            }
        });

        // 若队列发现新增自定义，先同步更新 ConfigManager
        if (uis.length > uiOrder.length) {
            ConfigManager.setUiOrder(uis);
            uiOrder = uis;
        }

        let uiobj = uis.map(item => {
            let k = item.key;
            if (k === "搜索模式") k = "搜索";
            if (k === "源名") k = "影视";

            let isCust = custObj.hasOwnProperty(item.key);
            let themeIcon = themeConfig.yi.icons[k];
            
            return {
                key: item.key,
                index: item.index,
                cust: isCust,
                title: isCust ? custObj[item.key].title : (item.title || item.key),
                img: isCust ? custObj[item.key].icon : (themeIcon || item.img),
                url: isCust ? "toast://当前为预览,链接不生效" : item.url,
                col_type: (isCust && custObj[item.key].style) ? custObj[item.key].style : appConfig.yi.col
            };
        });

        // 核心排序：调用 uiUtils
        
        uiobj = reorderArrayByOrder(uiobj, uiOrder);
        
        uiobj = uiobj.map((item, i) => {
            if (item.col_type === "input") item.col_type = "icon_1_search";
            if (/line|blank_block|rich_text|long|rich|big/.test(item.col_type)) {
                item.title = item.col_type;
                item.col_type = "text_1";
            }
            item.url="hiker://empty";
            if (uimode) {
                let originalTitle = item.title;
                item.title = item.key;
                
                item.url = $("#noLoading#").lazyRule((i) => {
                    const ConfigManager = $.require('./subpage/ConfigManager.js');
                    let current = storage0.getMyVar("ui_current", {});
                    let itemNode = findItem(MY_RULE.title + "_ui" + i);
                    //console.log(itemNode)
                    if (itemNode.title.includes("font") || itemNode.title.includes("➡️")) {
                        updateItem(itemNode.extra.id, {
                            title: itemNode.title.replace(/‘|’|“|”|<[^>]+>/g, "").replace("➡️", "")
                        });
                        clearMyVar("ui_current");
                        return "hiker://empty";
                    }

                    if (Object.keys(current).length > 0) {
                        let order = ConfigManager.getUiOrder();
                        let idx1 = order.findIndex(x => x.index === current.extra.index);
                        let idx2 = order.findIndex(x => x.index === itemNode.extra.index);
                        
                        if (idx1 !== -1 && idx2 !== -1) {
                        console.log(order)
                            let temp = order[idx1].index;
                            order[idx1].index = order[idx2].index;
                            order[idx2].index = temp;
                            ConfigManager.setUiOrder(order);
                            console.log(order)
                        }
                        clearMyVar("ui_current");
                        refreshPage();
                    } else {
                        let h = '““””';
                        let t = itemNode.title;
                        toast("选择移动的目标");
                        if (/text_icon|avatar|icon_small_3/.test(itemNode.type)) {
                            h = "";
                            t = t.fontcolor("#fff");
                        } else if (/icon_1_search/.test(itemNode.type)) {
                            h = "";
                            t = "➡️" + t;
                        } else {
                            t = t.fontcolor("#fff");
                        }
                        updateItem(itemNode.extra.id, { title: h + t });
                        storage0.putMyVar("ui_current", itemNode);
                    }
                    return "hiker://empty";
                }, i);

                let longclicks = [];
                if (item.key !== "设置") {
                    longclicks.push({
                        title: "删除移除",
                        js: $.toString((key) => {
                            const ConfigManager = $.require('./subpage/ConfigManager.js');
                            let items = ConfigManager.getUiOrder();
                            let idx = items.findIndex(x => x.key === key);
                            if (idx !== -1) items[idx].index = -1;
                            ConfigManager.setUiOrder(items);
                            refreshPage();
                        }, item.key)
                    });
                }
                if (!/源名/.test(item.key)) {
                    longclicks.push({
                        title: "配置图标",
                        js: $.toString((item) => {
                            return $(item.img || "").input((item) => {
                                const ThemeManager = $.require('./subpage/ThemeManager.js');
                                if (!item.cust) {
                                    let k = item.key === "搜索模式" ? "搜索" : item.key;
                                    ThemeManager.updateCurrentTheme("yi.icons." + k, input);
                                } else {
                                    ThemeManager.updateCurrentTheme("yi.cust." + item.key + ".icon", input);
                                }
                                refreshPage();
                            }, item);
                        }, item)
                    });

                    if (item.key !== "换源" && item.key !== "搜索模式") {
                        longclicks.push({
                            title: "配置名称",
                            js: $.toString((item) => {
                                return $(item.title || "").input((item) => {
                                    const ConfigManager = $.require('./subpage/ConfigManager.js');
                                    const ThemeManager = $.require('./subpage/ThemeManager.js');
                                    if (!item.cust) {
                                        let items = ConfigManager.getUiOrder();
                                        let idx = items.findIndex(x => x.key === item.key);
                                        if (idx !== -1) items[idx].title = input;
                                        ConfigManager.setUiOrder(items);
                                    } else {
                                        ThemeManager.updateCurrentTheme("yi.cust." + item.key + ".title", input);
                                    }
                                    refreshPage();
                                }, item);
                            }, item)
                        });
                    }
                }
                if (item.cust) {
                    longclicks.push({
                        title: "更改链接",
                        js: $.toString((key) => {
                            const ThemeManager = $.require('./subpage/ThemeManager.js');
                            let urlStr = ThemeManager.getCurrentTheme().yi.cust[key].url || "";
                            return $(urlStr).input((key) => {
                                const ThemeManager = $.require('./subpage/ThemeManager.js');
                                ThemeManager.updateCurrentTheme("yi.cust." + key + ".url", input);
                                toast("已修改链接: " + input);
                                refreshPage();
                            }, key);
                        }, item.key)
                    });
                    longclicks.push({
                        title: "更改样式",
                        js: $.toString((key) => {
                            const hikerPop = $.require('./libs/hikerPop.js');
                            let types = ['text_1', 'text_2', 'text_3', 'text_icon', 'icon_1_search', 'icon_small_3', 'icon_small_4', 'icon_4', 'icon_5', 'avatar'];
                            hikerPop.selectCenter({
                                options: [''].concat(types),
                                columns: 2,
                                title: "选择自定义组件样式",
                                click(s, i) {
                                    const ThemeManager = $.require('./subpage/ThemeManager.js');
                                    ThemeManager.updateCurrentTheme("yi.cust." + key + ".style", s);
                                    toast("已修改样式为: " + (s || "跟随全局"));
                                    refreshPage();
                                }
                            });
                        }, item.key)
                    });
                    longclicks.push({
                        title: "删除自定义组件",
                        js: $.toString((k) => {
                            const ThemeManager = $.require('./subpage/ThemeManager.js');
                            const ConfigManager = $.require('./subpage/ConfigManager.js');
                            let theme = ThemeManager.getCurrentTheme();
                            if (theme.yi && theme.yi.cust) {
                                delete theme.yi.cust[k];
                                ThemeManager.updateCurrentTheme("yi.cust", theme.yi.cust);
                            }
                            let items = ConfigManager.getUiOrder().filter(x => x.key !== k);
                            ConfigManager.setUiOrder(items);
                            refreshPage(false);
                        }, item.key)
                    });
                }
                
                item.extra = {
                    key: item.key, cust: item.cust, title: originalTitle,
                    id: MY_RULE.title + "_ui" + i, index: item.index,
                    LongClick: longclicks
                };
            } else {
                item.extra = { cust: item.cust, id: MY_RULE.title + "_ui" + i, cls: MY_RULE.title + "_ui" };
            }
            return item;
        });
        d = d.concat(uiobj);

        // 渲染已移除（index === -1）的按钮
        let removedItems = uiOrder.filter(x => x.index === -1);
        if (removedItems.length > 0 && uimode) {
            d.push({ title: "已移除", col_type: "text_1", url: "hiker://empty", extra: { lineVisible: false } });
            removedItems.forEach((item, i) => {
                d.push({
                    title: (item.cust ? "♾️" : "") + item.key,
                    col_type: "text_3",
                    url: $("").lazyRule((key) => {
                        const ConfigManager = $.require('./subpage/ConfigManager.js');
                        let items = ConfigManager.getUiOrder();
                        // 兼容性修复：避免使用展开运算符 ...items.map
                        let maxIndex = items.reduce((max, it) => Math.max(max, it.index), 0);
                        let idx = items.findIndex(x => x.key === key);
                        if (idx !== -1) items[idx].index = maxIndex + 1;
                        ConfigManager.setUiOrder(items);
                        refreshPage();
                        return "hiker://empty";
                    }, item.key),
                    extra: {
                        longClick: item.cust ? [{
                            title: "删除自定义",
                            js: $.toString((k) => {
                                const ThemeManager = $.require('./subpage/ThemeManager.js');
                                const ConfigManager = $.require('./subpage/ConfigManager.js');
                                let theme = ThemeManager.getCurrentTheme();
                                if (theme.yi && theme.yi.cust) {
                                    delete theme.yi.cust[k];
                                    ThemeManager.updateCurrentTheme("yi.cust", theme.yi.cust);
                                }
                                let items = ConfigManager.getUiOrder().filter(x => x.key !== k);
                                ConfigManager.setUiOrder(items);
                                refreshPage(false);
                            }, item.key)
                        }] : []
                    }
                });
            });
        }

        d.push({ col_type: "line" });
        
        d.push({
            title: '““””' + (uimode ? "修改模式 (开启中)".fontcolor("#20B2AA") : "开启修改模式"),
            url: $('#noLoading#').lazyRule(() => {
                let uimode = getMyVar("uimode", "0");
                putMyVar("uimode", uimode === "0" ? "1" : "0");
                refreshPage();
                return "toast://" + (uimode === "0" ? "修改开启: 点击按钮交换位置, 长按修改或者删除" : "修改关闭");
            }),
            col_type: "text_3",
        });

        d.push({
            title: "重置当前UI布局",
            col_type: "text_3",
            url: $('#noLoading#').lazyRule(() => {
                return $("是否恢复默认UI布局设置？").confirm(() => {
                    const ConfigManager = $.require('./subpage/ConfigManager.js');
                    ConfigManager.reset();
                    refreshPage(false);
                    return "toast://还原完成";
                });
            })
        });

        d.push({
            title: !uimode ? "确认返回" : "添加自定义按钮➕️",
            col_type: "text_3",
            url: !uimode ? $('#noLoading#').lazyRule(() => {
                back(true);
                return "hiker://empty";
            }) : $('#noLoading#').lazyRule(() => {
                const hikerPop = $.require('./libs/hikerPop.js');
                hikerPop.inputTwoRow({
                    titleHint: "键$显示名称$样式",
                    titleDefault: getMyVar("key$title", "新按钮$新按钮$icon_small_4"),
                    urlHint: "图标$链接",
                    urlDefault: getMyVar("icon$url", "hiker://empty$hiker://empty"),
                    noAutoSoft: true,
                    title: "新建按钮",
                    confirm(s1, s2) {
                        if (!s1.includes("$") || !s2.includes("$")) return "toast://请输入正确的格式";
                        
                        // 兼容性优化：常规拆分，避免使用ES6解构赋值引发报错
                        let arr1 = s1.split("$");
                        let arr2 = s2.split("$");
                        let key = arr1[0], title = arr1[1], style = arr1[2];
                        let icon = arr2[0], url = arr2[1];

                        const ConfigManager = $.require('./subpage/ConfigManager.js');
                        const ThemeManager = $.require('./subpage/ThemeManager.js');
                        
                        let keys = ConfigManager.getUiOrder().map(x => x.key);
                        if (keys.includes(key)) return "toast://已存在key:" + key;
                        
                        putMyVar("key$title", s1);
                        putMyVar("icon$url", s2);

                        ThemeManager.updateCurrentTheme("yi.cust." + key, { key: key, title: title, icon: icon, url: url, style: style, index: keys.length });
                        
                        let items = ConfigManager.getUiOrder();
                        items.push({ key: key, index: keys.length, cust: true });
                        ConfigManager.setUiOrder(items);

                        refreshPage(false);
                        return "toast://添加成功";
                    }
                });
                return "hiker://empty";
            })
        });

        d.push({
            title: "全局头部组件样式: " + appConfig.yi.col,
            col_type: "text_1",
            url: $('#noLoading#').lazyRule(() => {
                const ConfigManager = $.require('./subpage/ConfigManager.js');
                let all_cols = ['text_icon', 'icon_1_search', 'icon_small_3', 'icon_small_4', 'icon_4', 'icon_5', 'avatar'];
                let col = ConfigManager.getUiCol();
                let options = all_cols.map(it => it === col ? '➡️' + it : it);
                return $(options, 2, "请选择头部按钮全局兜底样式").select(() => {
                    input = input.replace("➡️", "");
                    const ConfigManager = $.require('./subpage/ConfigManager.js');
                    ConfigManager.setUiCol(input);
                    refreshPage();
                });
            })
        });

        // 图标与颜色配置
        let dobj = {};
        appConfig.yi.ui.filter(x => x.index !== -1).forEach(it => dobj[it.key] = true);
        Object.keys(themeConfig.yi.icons || {}).forEach(key => {
            if(!dobj.hasOwnProperty(key)) {
                let value = themeConfig.yi.icons[key];
                d.push({
                    title: key,
                    col_type: "icon_5",
                    img: value,
                    url: $(value).input((k) => {
                        const ThemeManager = $.require('./subpage/ThemeManager.js');
                        ThemeManager.updateCurrentTheme("yi.icons." + k, input);
                        refreshPage();
                        return "hiker://empty";
                    }, key)
                });
            }
        });

        d.push({
            title: "分类颜色",
            col_type: "input",
            url: $.toString(() => {
                const { isValidColor } = $.require('./subpage/uiUtils.js');
                if (input === "random" || isValidColor(input)) {
                    const ThemeManager = $.require('./subpage/ThemeManager.js');
                    ThemeManager.updateCurrentTheme("yi.分类颜色", input);
                    refreshPage();
                } else {
                    toast("请输入正确的颜色值或 random");
                }
                return "hiker://empty";
            }),
            extra: { defaultValue: themeConfig.yi.分类颜色 }
        });

        d.push({
            title: "换源颜色",
            col_type: "input",
            url: $.toString(() => {
                const { isValidColor } = $.require('./subpage/uiUtils.js');
                if (input === "random" || isValidColor(input)) {
                    const ThemeManager = $.require('./subpage/ThemeManager.js');
                    ThemeManager.updateCurrentTheme("yi.换源颜色", input);
                    refreshPage();
                } else {
                    toast("请输入正确的颜色值或 random");
                }
                return "hiker://empty";
            }),
            extra: { defaultValue: themeConfig.yi.换源颜色 }
        });

        d.push({
            title: "分类颜色预览",
            img: themeConfig.yi.分类颜色 === "random" ? getRangeColors() : themeConfig.yi.分类颜色,
            url: "toast://分类颜色",
            col_type: "icon_3_fill",
        });

        d.push({
            title: "换源颜色预览",
            img: themeConfig.yi.换源颜色 === "random" ? getRangeColors() : themeConfig.yi.换源颜色,
            url: "toast://换源颜色",
            col_type: "icon_3_fill",
        });
    }

    // ---------------- 二级配置：播放及详情 UI ----------------
    if (ui_navi === "二级") {
        let erConfig = appConfig.er;
        let erTheme = themeConfig.er;

        d.push({
            title: "每页数量",
            desc: "0则表示不分页",
            col_type: "input",
            url: $.toString(() => {
                if (String(input).length > 3) return "toast://请输入3位数字以内";
                const ConfigManager = $.require('./subpage/ConfigManager.js');
                ConfigManager.setErConfig("分页", parseInt(input, 10));
                refreshPage();
                return "toast://" + (input > 0 ? "每页数量设置为:" + input : "不分页");
            }),
            extra: { defaultValue: erConfig.分页, type: "number" }
        });

        d.push({
            title: "历史记录阈值",
            desc: "默认200",
            col_type: "input",
            url: $.toString(() => {
                if (String(input).length > 3) return "toast://请输入3位数字以内";
                const ConfigManager = $.require('./subpage/ConfigManager.js');
                ConfigManager.setErConfig("历史记录", parseInt(input, 10));
                refreshPage();
                return "toast://历史记录设置为:" + input;
            }),
            extra: { defaultValue: erConfig.历史记录, type: "number" }
        });

        d.push({
            title: "线路样式: " + erConfig.线路样式,
            col_type: "text_1",
            url: $("#noLoading#").lazyRule(() => {
                const ConfigManager = $.require('./subpage/ConfigManager.js');
                let col = ConfigManager.getErConfig().线路样式;
                let cols = ['scroll_button', 'text_1', 'text_2', 'text_3', 'icon_small_3', 'icon_small_4'];
                cols = cols.map(x => x === col ? "➡️" + x : x);
                return $(cols, 2).select(() => {
                    input = input.replace("➡️", "");
                    const ConfigManager = $.require('./subpage/ConfigManager.js');
                    ConfigManager.setErConfig("线路样式", input);
                    refreshPage(false);
                });
            }),
            extra: { lineVisible: false }
        });

        d.push({
            title: "线路显示模板",
            col_type: "input",
            url: $.toString(() => {
                const ThemeManager = $.require('./subpage/ThemeManager.js');
                ThemeManager.updateCurrentTheme("er.线路显示", input);
                refreshPage(false);
                return "toast://更新成功: " + input;
            }),
            extra: { defaultValue: erTheme.线路显示, type: "textarea", height: -1 }
        });

        Object.keys(erTheme.icons || {}).forEach(key => {
            let value = erTheme.icons[key];
            d.push({
                title: key,
                col_type: "icon_5",
                img: value,
                url: $(value).input((k) => {
                    const ThemeManager = $.require('./subpage/ThemeManager.js');
                    ThemeManager.updateCurrentTheme("er.icons." + k, input);
                    refreshPage();
                    return "hiker://empty";
                }, key)
            });
        });

        d.push({
            title: "线路颜色",
            col_type: "input",
            url: $.toString(() => {
                const { isValidColor } = $.require('./subpage/uiUtils.js');
                if (isValidColor(input)) {
                    const ThemeManager = $.require('./subpage/ThemeManager.js');
                    ThemeManager.updateCurrentTheme("er.线路颜色", input);
                    refreshPage(false);
                } else {
                    toast("请输入正确的颜色值");
                }
                return "hiker://empty";
            }),
            extra: { defaultValue: erTheme.线路颜色 }
        });

        d.push({
            title: "浅来源色",
            col_type: "input",
            desc: "格式：字体颜色;背景颜色",
            url: $.toString(() => {
                if (input.includes(";")) {
                    const ThemeManager = $.require('./subpage/ThemeManager.js');
                    ThemeManager.updateCurrentTheme("er.浅来源色", input);
                    refreshPage(false);
                } else {
                    toast("请输入正确数值，使用分号分隔");
                }
                return "hiker://empty";
            }),
            extra: { defaultValue: erTheme.浅来源色 }
        });

        d.push({
            title: "深来源色",
            col_type: "input",
            desc: "格式：字体颜色;背景颜色",
            url: $.toString(() => {
                if (input.includes(";")) {
                    const ThemeManager = $.require('./subpage/ThemeManager.js');
                    ThemeManager.updateCurrentTheme("er.深来源色", input);
                    refreshPage(false);
                } else {
                    toast("请输入正确数值，使用分号分隔");
                }
                return "hiker://empty";
            }),
            extra: { defaultValue: erTheme.深来源色 }
        });

        d.push({
            title: "简介样式: " + erTheme.简介样式,
            col_type: "text_3",
            url: $("#noLoading#").lazyRule(() => {
                const ThemeManager = $.require('./subpage/ThemeManager.js');
                let col = ThemeManager.getCurrentTheme().er.简介样式;
                let cols = ["0", "1"].map(x => x === col ? "➡️" + x : x);
                return $(cols, 2).select(() => {
                    input = input.replace("➡️", "");
                    const ThemeManager = $.require('./subpage/ThemeManager.js');
                    ThemeManager.updateCurrentTheme("er.简介样式", input);
                    refreshPage(false);
                });
            }),
            extra: { lineVisible: false }
        });

        d.push({ col_type: "blank_block" });

        // 布尔型开关遍历
        const boolSwitches = ["渐变", "线路上标", "选集优化", "分页逻辑", "分页导航", "二级刷新", "二级缓存"];
        boolSwitches.forEach(key => {
            d.push({
                title: key,
                img: buttonImg(erConfig[key]),
                col_type: "icon_small_3",
                url: $('#noLoading#').lazyRule((k) => {
                    const ConfigManager = $.require('./subpage/ConfigManager.js');
                    let current = ConfigManager.getErConfig()[k];
                    let val = (current === "1" || current === true) ? false : true;
                    if (k === "分页逻辑") {
                        val = (current === "1") ? "0" : "1";
                    }
                    ConfigManager.setErConfig(k, val);
                    refreshPage(false);
                    return "hiker://empty";
                }, key)
            });
        });

        d.push({ col_type: "line" });
        d.push({
            title: "确认返回",
            col_type: "text_2",
            url: $('#noLoading#').lazyRule(() => {
                back(true);
                return "hiker://empty";
            })
        });
    }

    setResult(d);
}
