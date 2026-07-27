// ==================== ThemeEdit.js (重构后) ====================
// 职责：提供主题配置的导出、导入、克隆、重命名和删除功能，完全对接 ThemeManager。

const ThemeManager = $.require('./subpage/ThemeManager.js');
let d = [];

let allThemes = ThemeManager.getAllThemes();
let currentActiveName = ThemeManager.getCurrentThemeName();

// 当前选中的编辑项，默认选中正在使用的主题
let nk = getMyVar(MY_RULE.title + "_edit_theme", currentActiveName);
if (!allThemes[nk]) {
    nk = "默认";
    putMyVar(MY_RULE.title + "_edit_theme", nk);
}
let item = allThemes[nk];

// 新增了“复制”功能替代原有的“当前”存储逻辑
let action = ["导出", "导入", "复制", "改名", "删除", "JSON"];
action.forEach(x => {
    d.push({
        title: x,
        col_type: "text_5",
        url: $("#noLoading#").lazyRule((x, nk, item) => {
            if (x === "导出") {
                return $(nk).input((item) => {
                    let obj = {};
                    obj[input] = item;
                    copy(JSON.stringify(obj, null, 2));
                    return "toast://已复制到剪贴板";
                }, item);
            }
            
            if (x === "导入") {
                return $("{{clipboard}}", "请输入主题json").input(() => {
                    try {
                        const ThemeManager = $.require('./subpage/ThemeManager.js');
                        let obj = JSON.parse(input);
                        let success = false;
                        Object.keys(obj).forEach(k => {
                            if (!ThemeManager.hasTheme(k)) {
                                ThemeManager.setTheme(k, obj[k]);
                                success = true;
                            } else {
                                toast("主题名称: " + k + " 已经存在,已跳过");
                            }
                        });
                        if (success) {
                            refreshPage();
                            return "toast://导入成功";
                        } else {
                            return "hiker://empty";
                        }
                    } catch (e) {
                        return "toast://JSON格式错误";
                    }
                });
            }

            if (x === "复制") {
                return $("新主题名称").input((nk, item) => {
                    if (!input) return "hiker://empty";
                    const ThemeManager = $.require('./subpage/ThemeManager.js');
                    if (ThemeManager.hasTheme(input)) return "toast://名称已存在";
                    ThemeManager.setTheme(input, item);
                    putMyVar(MY_RULE.title + "_edit_theme", input);
                    refreshPage();
                    return "toast://复制成功";
                }, nk, item);
            }
            
            if (x === "改名") {
                if (nk === "默认") {
                    return "toast://默认主题不能改名";
                } else {
                    return $("新名称").input((nk, item) => {
                        if (!input || input === nk) return "hiker://empty";
                        const ThemeManager = $.require('./subpage/ThemeManager.js');
                        if (ThemeManager.hasTheme(input)) return "toast://名称已存在";
                        
                        ThemeManager.setTheme(input, item);
                        ThemeManager.deleteTheme(nk);
                        
                        putMyVar(MY_RULE.title + "_edit_theme", input);
                        // 如果改名的是当前正在使用的主题，同步更新使用的主题名称
                        if (ThemeManager.getCurrentThemeName() === nk) {
                            ThemeManager.setCurrentTheme(input);
                        }
                        refreshPage();
                        return "toast://改名成功";
                    }, nk, item);
                }
            }
            
            if (x === "删除") {
                if (nk === "默认") {
                    return "toast://默认主题不能删除";
                } else {
                    return $("确认删除该主题？").confirm((nk) => {
                        const ThemeManager = $.require('./subpage/ThemeManager.js');
                        ThemeManager.deleteTheme(nk);
                        
                        // 如果删除的是当前正在使用的主题，重置回默认
                        if (ThemeManager.getCurrentThemeName() === nk) {
                            ThemeManager.setCurrentTheme("默认");
                        }
                        
                        putMyVar(MY_RULE.title + "_edit_theme", "默认");
                        refreshPage();
                        return "toast://删除成功";
                    }, nk);
                }
            }

            if (x === "JSON") {
                let obj = {};
                obj[nk] = item;
                if (fetch("hiker://home@JSON编辑器") == null) {
                    return '海阔视界首页频道规则【JSON编辑器】￥home_rule_url￥http://hiker.nokia.press/hikerule/rulelist.json?id=3424';
                } else {
                    return 'hiker://page/interface#noRefresh##noHistory##noRecordHistory#?rule=JSON编辑器&Json=' + base64Encode(JSON.stringify(obj));
                }
            }
        }, x, nk, item)
    });
});

d.push({ col_type: "big_blank_block" });

// 渲染所有存在的主题
Object.keys(allThemes).forEach(k => {
    let longclicks = [];
    if (k !== "默认") {
        longclicks.push({
            title: "改名",
            js: $.toString((k) => {
                return $("新名称").input((oldName) => {
                    if (!input || input === oldName) return "hiker://empty";
                    const ThemeManager = $.require('./subpage/ThemeManager.js');
                    if (ThemeManager.hasTheme(input)) return "toast://名称已存在";
                    
                    let data = ThemeManager.getTheme(oldName);
                    ThemeManager.setTheme(input, data);
                    ThemeManager.deleteTheme(oldName);
                    
                    if (ThemeManager.getCurrentThemeName() === oldName) {
                        ThemeManager.setCurrentTheme(input);
                    }
                    putMyVar(MY_RULE.title + "_edit_theme", input);
                    refreshPage();
                    return "toast://改名成功";
                }, k);
            }, k)
        });
    }
    
    d.push({
        title: nk === k ? '““””' + k.fontcolor("#20B2AA") : k,
        col_type: "scroll_button",
        url: $("#noLoading#").lazyRule((k) => {
            putMyVar(MY_RULE.title + "_edit_theme", k);
            refreshPage();
            return "hiker://empty";
        }, k),
        extra: {
            LongClick: longclicks
        }
    });
});

d.push({
    title: "““””" + "<small>应用此主题并返回</small>",
    col_type: "text_center_1",
    url: $("#noLoading#").lazyRule((nk) => {
        const ThemeManager = $.require('./subpage/ThemeManager.js');
        ThemeManager.setCurrentTheme(nk);
        back(true);
        return "toast://已应用主题：" + nk;
    }, nk),
    extra: {
        lineVisible: false,
    }
});

d.push({
    title: "",
    col_type: "input",
    // 为输入框补充 URL 事件，使用户在文本框内直接手写修改 JSON 也能实时生效保存
    url: $.toString((nk) => {
        try {
            let obj = JSON.parse(input);
            const ThemeManager = $.require('./subpage/ThemeManager.js');
            ThemeManager.setTheme(nk, obj);
            return "toast://JSON 保存成功";
        } catch(e) {
            return "toast://JSON格式错误，无法保存";
        }
    }, nk),
    extra: {
        defaultValue: JSON.stringify(item, null, 2),
        Highlight: true,
        type: "textarea",
        height: -1
    }
});

setResult(d);
