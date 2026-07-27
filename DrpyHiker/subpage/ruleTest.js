(function() {
    const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
    const ThemeManager = $.require('./subpage/ThemeManager.js');
    const ConfigManager = $.require('./subpage/ConfigManager.js');
    const CategoryManager = GM.defineModule('./subpage/CategoryManager.js');
    const DrpyManage = GM.defineModule("DrpyManage");
    const {
        renderSearchInput,
        renderPageContent,
        renderLoadingAndCategory
    } = $.require('./subpage/sourceUI.js');


    // 解析参数
    var path = getParam("path", "") || MY_PARAMS.path;
    var s = getParam("source", "");
    if (s) {
        s = base64Decode(s);
        try {
            s = JSON.parse(s);
        } catch (e) {}
    } else {
        s = MY_PARAMS.source;
    }
    if (!path && s) {
        path = s.ext;
    }
    // 获取或创建 pageId
    let pageId = PageStateManager.getOrCreatePageId("ruleTest@" + s.key);

    let d = [];

    // 加载函数
    function load(path) {
        if (typeof path === "string" && path.startsWith("hiker://files/")) {
            path = getPath(path);
        }

        let ss = {
            ext: path
        };
        if (s) {
            ss = Object.assign({}, ss, {
                api: s.api,
                name: s.name,
                type: s.type,
                key: s.key
            });
            if (s.hasOwnProperty("click") && s.click) {
                ss.click = s.click;
            }
            if (s.api.startsWith("http")) {
                delete ss.ext;
            }
        }

        log(ss);

        if (ss.type == 3 && typeof ss.ext == "object" && Object.keys(ss.ext).length == 0) {
            throw new Error("规则内容为空");
        }

        // 获取 drpy 实例
        let drpy = DrpyManage.getBySource(ss);
        let sname = drpy.getRule("title") || drpy.getRule("name");

        let source = {
            name: ss.name || "测@" + sname,
            key: ss.key || "ruleTest",
            path: path
        };
        setPageTitle(source.name);
        source = Object.assign({}, ss, source);

        // 如果是测试页特殊 URL，添加返回按钮
        if (MY_PAGE == 1 && MY_URL.includes("DrpyHikerTest")) {
            d.push({
                title: '““””' + "<b>≣</b>",
                col_type: "flex_button",
                url: $("#noLoading#").lazyRule((pageId) => {

                    const CategoryManager = GM.defineModule('./subpage/CategoryManager.js');
                    const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
                    CategoryManager.close(pageId);
                    PageStateManager.removeState(pageId);
                    let runtimeConfig = GM.defineModule("runtimeConfig");
                    let source = runtimeConfig.getCurrentSource();
                    let DrpyManage = GM.defineModule("DrpyManage");
                    DrpyManage.del(source.key);
                    if (!runtimeConfig.initDefault()) {
                        toast("刷新失败");
                    }
                    refreshPage();
                    return "hiker://empty";
                }, pageId)
            });
        }

        // 添加搜索框
        d.push(renderSearchInput({
            defaultValue: getMyVar("test_keyword", ""),
            onChange: $.toString(() => {
                putMyVar("test_keyword", input);
            }),
            onSearch: $.toString((source) => {
                GM.put("ruleTestCfg", source); // 供搜索页使用
                return 'hiker://search?rule=' + MY_RULE.title + "&s=" + input;
            }, source),
            placeholder: '要搜点什么'
        }));
        if (MY_PAGE == 1) {
        
            renderLoadingAndCategory(d, pageId);
            setPreResult(d);
            d.length = 0;
        }
        // 调用公共渲染函数
        renderPageContent({
            d: d,
            pageId: pageId,
            drpy: drpy,
            source: source,
            page: MY_PAGE,
            hasHead: true,
            extra: {
                skipEr: ConfigManager.getGlobal("skipEr"),
                homeListCol: ConfigManager.getGlobal("homeListCol") || drpy.getRule("hikerClassListCol") || "movie_3_marquee",
                mark: ThemeManager.getCurrentTheme().yi.mark
            }
        });
    }

    try {
        load(path);
    } catch (e) {
        d.push({
            title: '““””' + e.toString().fontcolor("red"),
            desc: e.lineNumber || "",
            col_type: 'text_center_1',
            extra: {
                lineVisible: false
            }
        });
    }


    // 页面关闭清理
    addListener('onClose', $.toString((pageId) => {
        GM.clear("ruleTestCfg");
        GM.clear("ruleTestCfg@dpry");
        const CategoryManager = GM.defineModule('./subpage/CategoryManager.js');
        const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
        CategoryManager.close(pageId);
        PageStateManager.removeState(pageId);
    }, pageId));

    setResult(d);
})();