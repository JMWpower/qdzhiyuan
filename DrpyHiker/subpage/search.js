// ==================== search.js ====================
(function() {
   
    const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
    const ThemeManager = $.require('./subpage/ThemeManager.js');
    const ConfigManager = $.require('./subpage/ConfigManager.js');
    const runtimeConfig = GM.defineModule("runtimeConfig");
    const DrpyManage = GM.defineModule("DrpyManage");
    const {  renderSearchList } = $.require('./subpage/sourceUI.js');
    const { removeHtmlTags } = $.require("methods");

    // 获取配置
    let smode = ConfigManager.getGlobal("smode");
    let temsmode = getMyVar("temsmode", "");
    let searchcfg = storage0.getMyVar("searchcfg", "");
    try {
        searchcfg = JSON.parse(searchcfg);
    } catch (e) {
        searchcfg = {};
    }
    let ruleTestCfg = GM.get("ruleTestCfg", {}); // 规则测试页传递的 source

    if (temsmode) {
        smode = Number(temsmode);
        clearMyVar("temsmode");
    }

    // 如果是从规则测试页来的，使用测试源
    if (ruleTestCfg && ruleTestCfg.path) {
        let source = ruleTestCfg;
        let drpy = DrpyManage.getBySource(source);
        renderSingleSource(drpy, source);
        return;
    }

    // 检查配置是否准备
    if (!runtimeConfig.isPrepared()) {
        setResult([{
            title: "请前往小程序主页设置源",
            url: "hiker://home@" + MY_RULE.title
        }]);
        return;
    }

    // 根据模式分发
    if (smode === 0) {
        // 单源搜索
        let source = runtimeConfig.getCurrentSource();
        if (!source.searchable) {
            setResult([{
                title: "当前源不支持搜索",
                url: "hiker://empty"
            }]);
            return;
        }
        let drpy = DrpyManage.get(source.key);
        renderSingleSource(drpy, source);
    } else {
        // 聚合搜索（包括按TAG和站内搜索）
        renderAggregateSearch();
    }

    // ---------- 单源搜索渲染函数 ----------
    function renderSingleSource(drpy, source) {
        let d = [];
        let pageId = PageStateManager.getOrCreatePageId(source.key + "search");

        // 获取搜索结果
        let listItems = renderSearchList(drpy, source, MY_KEYWORD, MY_PAGE, {
            skipEr: ConfigManager.getGlobal("skipEr"),
            homeListCol: ConfigManager.getGlobal("homeListCol") || drpy.getRule("hikerClassListCol") || "movie_3_marquee",
            mark: ThemeManager.getCurrentTheme().yi.mark,
            pageId: pageId
        });
        if (listItems && listItems.length) {
            Array.prototype.push.apply(d, listItems);
        } else {
            d.push({
                title: "没有搜索到相关内容",
                col_type: "text_center_1",
                url: "hiker://empty"
            });
        }

        // 注册页面关闭清理
        addListener('onClose', $.toString((pageId) => {
            PageStateManager.removeState(pageId);
        }, pageId));

        setResult(d);
    }

    // ---------- 聚合搜索渲染函数（返回委托搜索布局）----------
    function renderAggregateSearch() {
        let d = [{
            title: "点我开始聚合搜索 " + MY_KEYWORD,
            url: "hiker://search?s=" + MY_KEYWORD,
            extra: {
                delegateOnlySearch: true,
                rules: $.toString((mark, smode, searchcfg) => {
                    let rules = [];
                    const ConfigManager = $.require('./subpage/ConfigManager.js');
                    function moveElementToFront(array, index) {
                        if (index < 0 || index >= array.length) return array;
                        let element = array[index];
                        array.splice(index, 1);
                        array.unshift(element);
                        return array;
                    }

                    // 搜索处理函数（使用 renderSearchList）
                    let searchFunc = function(item, mark, keyword)
                    {
                    
                    
                        // 创建临时页面ID
                        const ConfigManager = $.require('./subpage/ConfigManager.js');
                        const { renderSearchList } = $.require('hiker://files/data/DrpyHiker/subpage/sourceUI.js');
                        let tempPageId = "polysearch_" + Date.now() + "_" + Math.random();
                        
                        let drpy = GM.defineModule("DrpyManage").get(item.key);
                        
                        // 调用 renderSearchList 获取布局数组
                        let listItems = renderSearchList(drpy, item, keyword||MY_KEYWORD, MY_PAGE, {
                            skipEr: ConfigManager.getGlobal("skipEr"),
                            homeListCol: ConfigManager.getGlobal("homeListCol") || drpy.getRule("hikerClassListCol") || "movie_3_marquee",
                            mark: mark,
                            pageId: tempPageId
                        });
                        
                        let d = [];
                        if (listItems && listItems.length) {
                            Array.prototype.push.apply(d, listItems);
                        } else {
                            d.push({
                                title: "没有搜索到相关内容",
                                col_type: "text_center_1",
                                url: "hiker://empty"
                            });
                        }
                        setResult(d);
                    };

                    try {
                        let runtimeConfig = GM.defineModule("runtimeConfig");
                        let list = runtimeConfig.getAllowSearchSource(smode === 2);
                        let source = runtimeConfig.getCurrentSource();

                        // 站内搜索 (smode == 3)
                        if (smode == 3) {
                            log("站内搜索");
                            let searchlist = moveElementToFront(searchcfg.list, searchcfg.i);
                            for (let j = 0; j < searchlist.length; j++) {
                                let item = searchlist[j];
                                let it = {
                                    name: item,
                                    key: source.key
                                };
                                rules.push({
                                    title: it.name,
                                    search_url: "hiker://empty?page=fypage&searchTerms=**",
                                    searchFind: "js:" + $.toString(searchFunc, it, mark, item)
                                });
                            }
                            return JSON.stringify(rules);
                        }

                        // 普通聚合搜索
                        let listi = -1;
                        for (let idx = 0; idx < list.length; idx++) {
                            if (list[idx].key == source.key) {
                                listi = idx;
                                break;
                            }
                        }
                        let searchsort = ConfigManager.getGlobal("searchsort");
                        let { naturalSort, usingSort } = $.require("methods");

                        if (searchsort > 0) {
                            if (searchsort == 1) {
                                naturalSort(list, "name");
                            } else if (searchsort == 2) {
                                usingSort.setkey("name");
                                usingSort.get(list);
                            }
                        }

                        function removeObjectWithPropertyName(list, sourceName) {
                            let result = [];
                            for (let i = 0; i < list.length; i++) {
                                if (list[i].name !== sourceName) {
                                    result.push(list[i]);
                                }
                            }
                            return result;
                        }

                        let name = source.name ? source.name : source;
                        log("name:" + name);
                        if (source.searchable && listi != -1) {
                            list = removeObjectWithPropertyName(list, name);
                            list.unshift(source);
                        }

                        for (let it of list) {
                            rules.push({
                                title: it.name,
                                search_url: "hiker://empty?page=fypage&searchTerms=**",
                                searchFind: "js:" + $.toString(searchFunc, it, mark)
                            });
                        }
                        return JSON.stringify(rules);
                    } catch (e) {
                        log(e.toString());
                    }
                }, ThemeManager.getCurrentTheme().yi.mark, smode, searchcfg)
            }
        }];

        setResult(d);
    }
})();