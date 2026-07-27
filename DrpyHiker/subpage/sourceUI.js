const {
    removeDuplicatesByValue
} = $.require("hiker://page/methods");

const CategoryManager = GM.defineModule('./subpage/CategoryManager.js');
const ThemeManager = $.require('./subpage/ThemeManager.js');
const ConfigManager = $.require('./subpage/ConfigManager.js');

/**
 * 内部函数：渲染单个列表项数组
 * @param {Array} items 从 drpy 获取的列表数据
 * @param {Object} source 源对象（包含 key、name 等）
 * @param {Object} options 选项
 * @returns {Array} 布局对象数组
 */
function _renderItems(items, source, options) {
    const {
        skipEr,
        homeListCol,
        mark,
        longPressActions,
        pageId
    } = options;
    const result = [];

    if (!items || !items.length) return result;

    for (let i = 0; i < items.length; i++) {
        let it = items[i];
        let id = it.vod_id ? String(it.vod_id) : "msearch:";
        let name = it.vod_name || "";
        let extra = {
            img: it.vod_pic,
            vodId: id,
            cls: "playlist@" + source.key,
            sname: source.name,
            skey: source.key,
            id: "type_" + id,
            longClick: []
        };

        // 处理长按动作
        if (longPressActions && longPressActions.length) {
            for (let j = 0; j < longPressActions.length; j++) {
                let action = longPressActions[j];
                extra.longClick.push({
                    title: action,
                    js: $.toString((action, value) => {
                        return $.require("action").checkOptions2(action, "", value);
                    }, action, name + "$" + id)
                });
            }
        }

        // 额外调试功能（如果规则名包含 Test 且 id 以 http 开头）
        if (MY_RULE && MY_RULE.title && MY_RULE.title.includes("Test") && id.startsWith("http")) {
            extra.longClick.push({
                title: "查看",
                js: $.toString((id) => {
                    return "hiker://debug?url=" + (id.includes("@@") ? id.split("@@")[0] : id);
                }, id)
            });
        }

        let url;
        let tag = it.vod_tag;

        if (tag == "folder") {
            url = $('#noLoading#').lazyRule((name, id, pageId) => {
                const CategoryManager = GM.defineModule('./subpage/CategoryManager.js');
                CategoryManager.addTempcate(pageId, name, id);
                refreshPage(false);
                return "hiker://empty";
            }, name, id, pageId);
        } else if (tag === "action") {
            url = $("#noLoading#").lazyRule((id) => {
                return $.require("action").checkOptions(id);
            }, id);
        } else if (id === "no_data") {
            url = "toast://没有数据";
        } else if (typeof id === "string" && (id.includes("msearch:") || id == undefined)) {
            url = $("").lazyRule((name) => {
                putMyVar("temsmode", "1");
                return "hiker://search?rule=" + MY_RULE.title + "&s=" + name;
            }, name);
        } else if (it.action) {
            url = $().lazyRule((source, action) => {
                let tip;
                try {
                    let DrpyManage = GM.defineModule("DrpyManage");
                    let drpy = DrpyManage.getBySource(source);
                    tip = drpy.action(action);
                } catch (e) {
                    tip = e.toString();
                }
                return "hiker://empty";
            }, source, it.action);
            extra.id = id;
        } else if (id.startsWith("tab:id:")) {
            url = $("#noLoading#").lazyRule((id, pageId) => {
                let tid = id.replace("tab:id:", "");
                let mod = GM.defineModule('./subpage/CategoryManager.js');
                mod.setCateId(pageId, tid);
                refreshPage();
                return "hiker://empty";
            }, id, pageId);
        } else if (id.startsWith("push://")) {
            url = $("#noLoading#").lazyRule((id) => {
                return $.require("videoUrl").parsePush(id);
            }, id);
        } else if (skipEr) {
            url = $().lazyRule((source, id, mark) => {
                let url;
                try {
                    let DrpyManage = GM.defineModule("DrpyManage");
                    let drpy = DrpyManage.getBySource(source);
                    let list = JSON.parse(drpy.detail(id)).list;
                    let playList = list[0].vod_play_url.split("#");
                    if (playList.length > 1) {
                        return "hiker://page/detailed" + (mark || "");

                    }
                    url = list[0].vod_play_url.split("$")[1] || list[0].vod_play_url;
                } catch (e) {
                    url = id.split("@@")[0];
                }
                return $.require("videoUrl").parse(url, id, source);
            }, source, id, mark);
            extra.id = id;
        } else {
            url = "hiker://page/detailed" + (mark || "");
        }

        result.push({
            title: name,
            desc: it.vod_remarks || "",
            url: url,
            img: it.vod_pic || name,
            col_type: homeListCol || "movie_3_marquee",
            extra: extra
        });
    }
    return result;
}

/**
 * 渲染分类列表
 * @param {Object} drpy drpy 实例
 * @param {Object} source 源对象
 * @param {string} cateId 分类ID
 * @param {number} page 页码
 * @param {Object} filter 筛选对象
 * @param {Object} options 选项 { skipEr, homeListCol, mark, longPressActions, pageId }
 * @returns {Array} 布局对象数组
 */
function renderCategoryList(drpy, source, cateId, page, filter, options) {
    try {
        let list = JSON.parse(drpy.category(String(cateId), page, true, filter)).list;
        if (!list || !list.length) return [];
        return _renderItems(list, source, options);
    } catch (e) {
        log("渲染分类列表出错：" + e.message);
        return [];
    }
}

/**
 * 渲染搜索列表
 * @param {Object} drpy drpy 实例
 * @param {Object} source 源对象
 * @param {string} keyword 搜索关键词
 * @param {number} page 页码
 * @param {Object} options 选项 { skipEr, homeListCol, mark, pageId }
 * @returns {Array} 布局对象数组
 */
function renderSearchList(drpy, source, keyword, page, options) {
    try {
        let list = JSON.parse(drpy.search(keyword, false, page)).list || [];

        if (!list.length) return [];
        return _renderItems(list, source, options);
    } catch (e) {
        console.log("渲染搜索列表出错：" + e.message);
        return [];
    }
}

/**
 * 渲染搜索输入框
 * @param {Object} options 选项
 * @param {string} options.defaultValue 初始值
 * @param {string} options.onChange onChange 回调的 JS 字符串
 * @param {string} options.onSearch 搜索回调的 JS 字符串
 * @param {string} options.placeholder 占位符
 * @returns {Object} 布局对象
 */
function renderSearchInput(options) {
    const {
        defaultValue,
        onChange,
        onSearch,
        placeholder
    } = options;
    return {
        title: placeholder || '搜索',
        desc: '',
        url: onSearch || "hiker://empty",
        col_type: 'input',
        extra: {
            defaultValue: defaultValue || '',
            onChange: onChange || "hiker://empty"
        }
    };
}

/**
 * 渲染页面主要内容（分类栏 + 列表）
 * @param {Object} options
 * @param {Array} options.d 目标布局数组（会直接修改）
 * @param {string} options.pageId 页面ID
 * @param {Object} options.drpy drpy实例
 * @param {Object} options.source 源对象
 * @param {number} options.page 当前页码
 * @param {boolean} options.hasHead 是否已显示头部（用于加载状态判断）
 * @param {Object} options.extra 额外配置 { skipEr, homeListCol, mark }（可选，longPressActions 由 CategoryManager 提供）
 */
function renderPageContent(options) {
    const {
        d,
        pageId,
        drpy,
        source,
        hasHead,
        page,
        extra
    } = options;
    try {

        // 如果已经加载完成且之前未显示头部，则重新设置预结果
        if (page == 1) {
            if (!CategoryManager.hasLoaded(pageId)) {
                CategoryManager.getCategorys(pageId, d, drpy, page, hasHead);
            } else if (!hasHead && !CategoryManager.isSearchS(pageId)) {
                CategoryManager.renderCategorys(pageId, d, page);
            }
            if (CategoryManager.isSearchS(pageId)) {
                renderRecommend(d, pageId);

                deleteLoading(pageId);
                return;
            }
        }
        if (CategoryManager.isSearchS(pageId)) {
            deleteLoading(pageId);
            return;
        }
        // 获取当前分类和筛选
        let {
            cate,
            homelist,
            longPressActions,
            categorys
        } = CategoryManager.getCateList(pageId);

        let fl = CategoryManager.getFl(pageId);

        // 获取配置
        let skipEr = extra.skipEr !== undefined ? extra.skipEr : (drpy.getRule("二级") === "*" && ConfigManager.getGlobal("skipEr"));
        let deCol = drpy.getRule(cate == "home" ? "hikerListCol" : "hikerClassListCol");

        let homeListCol = extra.homeListCol || ConfigManager.getGlobal("homeListCol") || deCol || "movie_3_marquee";
        let mark = extra.mark !== undefined ? extra.mark : ThemeManager.getCurrentTheme().yi.mark;

        // 获取列表数据
        let list = [];
        if (cate == "home") {
            if (page == 1) list = homelist;
            if (list === undefined) list = [];
            // 自动判断列表样式
            if (list.length > 0 && !list[0].vod_pic && !list[list.length - 1].vod_pic && !deCol) {
                homeListCol = "text_1";
                if (!list.every(it => !it.vod_pic)) homeListCol = "avatar";
            }
        } else {
            list = JSON.parse(drpy.category(String(cate), page, true, fl)).list;
            if (list.every(it => !it.vod_pic)) homeListCol = "text_1";
        }

        // 渲染列表
        let listItems;
        listItems = _renderItems(list, source, {
            skipEr: skipEr,
            homeListCol: homeListCol,
            mark: mark,
            longPressActions: longPressActions,
            pageId: pageId
        });

        Array.prototype.push.apply(d, listItems);
        deleteLoading(pageId);
    } catch (e) {
        if (!hasHead) {
            setPreResult(d);
            d.length = 0;
        }
        deleteLoading(pageId);


        renderError(d, e);

    }
}

function renderError(d, e) {
    d.push({
        title: e.toString(),
        url: "hiker://empty",
        col_type: "text_center_1"
    });
    d.push({
        title: e.stack,
        col_type: "long_text"
    })
}

function renderLoadingAndCategory(d, pageId) {
    if (CategoryManager.hasLoaded(pageId) && !CategoryManager.isSearchS(pageId)) {
        CategoryManager.renderCategorys(pageId, d);
    }
    
    d.push({
        title: '加载中...',
        col_type: 'pic_1_center',
        pic_url: "hiker://files/data/DrpyHiker/icon/loading.gif",
        url: "hiker://empty",
        extra: {
            lineVisible: false,
            id: pageId + MY_RULE.title + "load"
        }
    });

}

function deleteLoading(pageId) {
    deleteItem(pageId + MY_RULE.title + "load");
}

function renderList(d, list, source, op) {
    Array.prototype.push.apply(d, _renderItems(list, source, op));
}

function renderRecommend(d, pageId) {

    try {
        const RecommendUI = $.require('./subpage/recommend.js');
        let recEls = RecommendUI.render(pageId, MY_RULE.title);
        Array.prototype.push.apply(d, recEls);
    } catch (err) {
        d.push({
            title: "热搜组件加载异常: " + err.message,
            col_type: "text_center_1"
        });
    }

}
$.exports = {
    renderCategoryList,
    renderSearchList,
    renderSearchInput,
    renderPageContent,
    renderError,
    renderLoadingAndCategory,
    deleteLoading,
    renderList

};