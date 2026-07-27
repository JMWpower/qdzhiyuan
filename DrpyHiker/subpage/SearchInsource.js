(function() {
    // 1. 统一引入现代模块管理器，彻底淘汰 LoadHomePage
    const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
    const ThemeManager = $.require('./subpage/ThemeManager.js');
    const ConfigManager = $.require('./subpage/ConfigManager.js');
    // 引入 sourceUI.js 里的错误渲染和列表渲染组件
    const { renderError, renderList } = $.require('./subpage/sourceUI.js');
    
    const runtimeConfig = GM.defineModule("runtimeConfig");
    const DrpyManage = GM.defineModule("DrpyManage");

    // 2. 解析参数
    let skey = decodeURIComponent(getParam("skey", ""));
    let tid = decodeURIComponent(getParam("tid", ""));
    
    // 初始化页面级状态管理，保证内存生命周期受控
    let pageKey = "SearchInsource_" + (skey || "default") + "_" + tid;
    let pageId = PageStateManager.getOrCreatePageId(pageKey);

    let d = [];

    try {
        let source;
        if (skey) {
            source = runtimeConfig.findSource(skey);
        } else {
            source = runtimeConfig.getCurrentSource();
        }

        // 空源拦截
        if (!source) {
            d.push({
                title: "未找到指定的视频源",
                col_type: "text_center_1",
            });
            setResult(d);
            return;
        }

        let drpy = DrpyManage.getBySource(source);
        
        // 核心：请求具体分类/搜索结果的数据列表
        let list = JSON.parse(drpy.category(tid, MY_PAGE, true, {})).list;

        // 获取主题与UI配置
        let theme = ThemeManager.getCurrentTheme();
        let ui_config_yi = theme.yi;
        
        let skipEr = drpy.getRule("二级") === "*" && ConfigManager.getGlobal("skipEr");
        let deCol = drpy.getRule("hikerClassListCol");
        let homeListCol = ConfigManager.getGlobal("homeListCol") || deCol || "movie_3_marquee";

        // 3. 核心替换：使用 sourceUI.js 的 renderList 组件进行渲染
        if (typeof renderList === 'function') {
            renderList(d, list, source, {
                skipEr: skipEr,
                homeListCol: homeListCol,
                mark: ui_config_yi.mark
            });
        } else {
            // 防呆容错：万一 sourceUI.js 导出的不是 renderList
            d.push({ title: "UI模块加载异常：未找到 renderList 组件", col_type: "text_center_1" });
        }

    } catch (e) {
        // 4. 统一容错处理，接轨 home.js 的渲染机制
        if (typeof renderError === 'function') {
            renderError(d, e);
        } else {
            d.push({
                title: "““解析失败””",
                desc: e.toString(),
                col_type: "text_center_1"
            });
        }
    }

    // 5. 生命周期管理：关闭页面时清理分配的状态内存
    addListener('onClose', $.toString((pageId) => {
        const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
        PageStateManager.removeState(pageId);
    }, pageId));

    setResult(d);
})();   