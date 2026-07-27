// 文件路径：subpage/CategoryManager.js
// 职责：负责分类数据的网络拉取缓存、本地状态管理、以及纯粹的 UI 渲染（解耦版）

// 依赖模块
const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
const ThemeManager = $.require('./subpage/ThemeManager.js');
const ConfigManager = $.require('./subpage/ConfigManager.js');
const uiUtils = $.require('./subpage/uiUtils.js');
const getRangeColors = uiUtils.getRangeColors;
const removeDuplicatesByValue = $.require("hiker://page/methods").removeDuplicatesByValue;

/**
 * 获取指定 pageId 的分类状态对象，如果不存在则初始化默认结构
 * @param {string} pageId
 * @returns {Object} 分类状态对象
 */
function _getCategoryState(pageId) {
    let state = PageStateManager.getState(pageId);
    if (!state) {
        state = PageStateManager.initState(pageId, {});
    }
    // 确保 category 子对象存在
    if (!state.category) {
        state.category = {
            fl: [], // 当前筛选键值对 [{key, value, index}]
            homelist: [], // 首页推荐列表
            cate: '', // 当前选中的分类ID
            flkeys: [], // 筛选字段的key数组
            longPressActions: [], // 长按动作数组
            categorys: {}, // drpy.home() 的完整结果
            cates: [], // 分类数组（快捷引用）
            filters: {}, // 筛选配置
            cate_obj: {}, // 每个分类的筛选状态 { [cateId]: [选中索引] }
            tempcate: {}, // 临时分类历史
            isHome: '0', // 是否有推荐
            links: '0', // 核心标识：是否已成功加载过初始分类数据
            fold: '0', // 筛选折叠状态
            searchcfs: {} // 自定义搜索词
        };
    }
    return state.category;
}

/**
 * 更新分类状态（合并）
 * @param {string} pageId
 * @param {Object} updates
 */
function _updateCategoryState(pageId, updates) {
    let catState = _getCategoryState(pageId);
    for (let key in updates) {
        if (updates.hasOwnProperty(key)) {
            catState[key] = updates[key];
        }
    }
}

function updateFl(pageId, newItem) {
    let catState = _getCategoryState(pageId);
    if (newItem) {
        catState.fl.push(newItem);
    }
}

function resetFl(pageId, newArray) {
    let catState = _getCategoryState(pageId);
    catState.fl = newArray || [];
}

function setFlkey(pageId, index, value) {
    let catState = _getCategoryState(pageId);
    catState.flkeys[index] = value;
}

function getFlkeys(pageId) {
    return _getCategoryState(pageId).flkeys;
}

function setFold(pageId, newFold) {
    _updateCategoryState(pageId, {
        fold: newFold
    });
}

function setSearchCfs(pageId, newCfs) {
    _updateCategoryState(pageId, {
        searchcfs: newCfs
    });
}

// ---------- 对外核心方法 ----------

function setCateId(pageId, tid) {
    _updateCategoryState(pageId, {
        cate: tid
    });
    let catState = _getCategoryState(pageId);
    catState.tempcate = {};
}

function getFl(pageId) {
    let catState = _getCategoryState(pageId);
    let valid = [];
    for (let i = 0; i < catState.fl.length; i++) {
        let item = catState.fl[i];
        if (item.value && item.value !== 'undefined') {
            valid.push(item);
        }
    }
    let result = {};
    for (let j = 0; j < valid.length; j++) {
        result[valid[j].key] = valid[j].value;
    }
    return result;
}

function getCateList(pageId) {
    let catState = _getCategoryState(pageId);
    let effectiveCate = catState.cate;
    if (catState.tempcate && catState.tempcate.current) {
        effectiveCate = catState.tempcate.current;
    }

    return {
        cate: effectiveCate,
        homelist: catState.homelist,
        longPressActions: catState.longPressActions,
        categorys: catState.categorys
    };
}

function hasLoaded(pageId) {
    return _getCategoryState(pageId).links === '1';
}

function removeState(pageId) {
    PageStateManager.removeState(pageId);
}

// ==============================================================
// 模块解耦一：获取并初始化分类数据（只在初次加载时发生网络请求）
// ==============================================================
function loadCategoryData(pageId, drpy, hasHead) {
    let catState = _getCategoryState(pageId);
    if (catState.links === "1") return; // 拦截：若已加载过数据，直接返回不重新请求

    let rule = drpy.getRule();
    let runtimeConfig = GM.defineModule("runtimeConfig");
    let code = typeof drpy.runMain == "function" ? drpy.runMain("let main=" + $.toString(function(ext) {
        return function() {
            return getOriginalJs(request(ext, {
                method: 'GET'
            }));
        };
    }, runtimeConfig.getCurrentSourcePath())) : "";

    // 头部检查网络状态
    if (hasHead && /模板:\s+'自动'/.test(code)) {
        let result = JSON.parse(request(rule.homeUrl, {
            timeout: rule.timeout || 5000,
            headers: rule.headers || {},
            withHeaders: true
        }));
        if ((result.body == undefined || result.body == "") || (result.error != undefined) || /^(-1|404|502|503)$/.test(result.statusCode)) {
            throw new Error("网站访问异常");
        } else {
            let home = JSON.parse(drpy.home());
            if (home.class.length == 0) {
                throw new Error("访问正常,分类数据获取异常 可尝试刷新源");
            }
        }
    }

    if (Object.keys(rule).length === 0) {
        throw new Error("规则加载失败");
    }

    if ((rule.一级 == "" || rule.一级 == undefined) && !rule.推荐) {
        _updateCategoryState(pageId, {
            links: "1",
            isSearchS: true
        });
        return
        //throw new Error("该源为搜索源，仅能通过搜索访问数据");
    }

    // 核心拉取：请求分类信息与首页推荐
    let categorys = JSON.parse(drpy.home());
    let homeVod = JSON.parse(drpy.homeVod() || '{}');
    let homelist = homeVod.list || [];
    let isHome = (homelist.length && homelist[0].vod_id != "没有数据") ? "1" : "0";

    let cates = categorys.class || [];

    if (cates.length == 0 && homelist.length == 0) {
        _updateCategoryState(pageId, {
            links: "1"
        });
        throw new Error("分类获取失败可能网络问题\n详细查看日志");
    }

    // 将推荐分类插入到头部
    if (isHome === "1") {
        let hasHome = cates.some(c => c.type_id === 'home');
        if (!hasHome) {
            cates.unshift({
                type_name: '推荐',
                type_id: 'home'
            });
            categorys.class = cates;
        }
    }

    let initialCate = cates.length > 0 ? cates[0].type_id : "";

    // 写入统一状态库
    _updateCategoryState(pageId, {
        tempcate: {},
        categorys: categorys,
        homelist: homelist,
        isHome: isHome,
        cate: catState.cate || initialCate,
        links: "1" // 标记成功，后续只需读取此状态
    });
}

// ==============================================================
// 模块解耦二：纯 UI 渲染引擎（完全依赖本地 state，无网络操作）
// ==============================================================
function renderCategorys(pageId, d) {
    let catState = _getCategoryState(pageId);
    if (catState.links === "0") return; // 还没拉数据则不渲染
    let theme = ThemeManager.getCurrentTheme();
    let color = theme.yi.分类颜色;
    if (color == "random") {
        color = getRangeColors();
    }
    let categorys = catState.categorys || {};
    let cates = categorys.class || [];
    let filters = categorys.filters || {};
    let fold = catState.fold;

    let catei = 0;
    for (let idx = 0; idx < cates.length; idx++) {
        if (cates[idx].type_id == catState.cate) {
            catei = idx;
            break;
        }
    }

    // 1. 构建顶级分类按钮

    for (let i = 0; i < cates.length; i++) {
        let item = cates[i];
        let isActive = (catState.cate == item.type_id);
        let title = isActive ? "““””" + "<b>" + item.type_name.fontcolor(color) + "</b>" : item.type_name;
        d.push({
            title: title,
            url: $('#noLoading#').lazyRule(function(tid, pageId) {
                let mod = GM.defineModule('./subpage/CategoryManager.js');
                mod.setCateId(pageId, tid);
                refreshPage();
                return "hiker://empty";
            }, item.type_id, pageId),
            col_type: 'scroll_button',
            extra: {
                tid: item.type_id,
                active: isActive
            }
        });
    }


    // 2. 构建高级筛选条件
    if (catState.cate != 'home') {
        let homei = -1;
        for (let i = 0; i < d.length; i++) {
            if (d[i].extra && d[i].extra.tid == "home") {
                homei = i;
                break;
            }
        }
        let activeIdx = homei == -1 ? (function() {
            for (let j = 0; j < d.length; j++) {
                if (d[j].extra && d[j].extra.tid) {
                    return j - 1;
                }
            }
            return -1;
        })() : homei;

        if (filters && filters.hasOwnProperty(catState.cate)) {
            // 折叠/展开按钮
            if (homei != -1) {
                d.splice(homei + 1, 0, {
                    title: fold == "0" ? "““””<b>" + "∧".fontcolor("#1aad19") + "</b>" : "““””<b>" + "∨".fontcolor("#FF0000") + "</b>",
                    col_type: "scroll_button",
                    url: $("#noLoading#").lazyRule(function(fold, pageId) {
                        let mod = GM.defineModule('./subpage/CategoryManager.js');
                        mod.setFold(pageId, fold == "0" ? "1" : "0");
                        refreshPage();
                        return "hiker://empty";
                    }, fold, pageId),
                    extra: {
                        active: false
                    }
                });
            }

            // 清除筛选按钮
            let activei = -1;
            for (let i = 0; i < d.length; i++) {
                if (d[i].extra && d[i].extra.active) {
                    activei = i;
                    break;
                }
            }
            if (activei != -1) {
                d.splice(activei, 0, {
                    title: "““””" + '🌀',
                    col_type: 'scroll_button',
                    url: $('#noLoading#').lazyRule(function(c, pageId) {
                        let mod = GM.defineModule('./subpage/CategoryManager.js');
                        let catState = mod._getInternalState(pageId);
                        delete catState.cate_obj[c];
                        mod.resetFl(pageId);
                        catState.tempcate = {};
                        refreshPage();
                        return "hiker://empty";
                    }, catState.cate, pageId)
                });
            }

            let classify = filters[catState.cate];
            let init_cate = new Array(classify.length).fill("-1");
            if (!catState.cate_obj[catState.cate]) {
                catState.cate_obj[catState.cate] = init_cate.slice();
            }
            let cate_temp = catState.cate_obj[catState.cate];

            if (!Array.isArray(classify)) {
                classify = [classify];
            }

            for (let index = 0; index < classify.length; index++) {
                let x = classify[index];
                d.push({
                    col_type: 'blank_block'
                });
                setFlkey(pageId, index, x.key);

                for (let i = 0; i < x.value.length; i++) {
                    let it = x.value[i];
                    let t = it.n;
                    if (cate_temp[index] == i) {
                        t = "<b><font color=" + color + ">" + t + "</font></b>";
                        updateFl(pageId, {
                            key: x.key,
                            value: it.v,
                            index: index
                        });
                    }
                    if (cate_temp[index] == "-1") {
                        updateFl(pageId, {
                            key: x.key,
                            value: "undefined",
                            index: index
                        });
                    }

                    if (fold == "1") {
                        d.push({
                            title: '““””' + t,
                            url: $("#noLoading#").lazyRule(function(params, pageId) {
                                let mod = GM.defineModule('./subpage/CategoryManager.js');
                                mod._handleFilterClick(pageId, params);
                                refreshPage();
                                return "hiker://empty";
                            }, {
                                index: index,
                                i: i,
                                cate: catState.cate,
                                cate_temp: cate_temp
                            }, pageId),
                            col_type: 'scroll_button'
                        });
                    }
                }
            }
        } else {
            resetFl(pageId, []);
        }
    }

    // 3. 构建临时分类历史（文件夹逐层点击）
    let cobj = catState.tempcate;
    if (cobj.list) {
        d.push({
            col_type: "blank_block"
        });
        d.push({
            title: "““””<small>▲</small>",
            col_type: "scroll_button",
            url: $('#noLoading#').lazyRule(function(cobj, pageId) {
                let mod = GM.defineModule('./subpage/CategoryManager.js');
                mod._handleTempcateUp(pageId, cobj);
                refreshPage(false);
                return "hiker://empty";
            }, cobj, pageId)
        });
        for (let i = 0; i < cobj.list.length; i++) {
            let it = cobj.list[i];
            let title = it.name;
            if (cobj.current == it.id) {
                title = title.fontcolor(color);
            }
            d.push({
                title: "““””<small>" + title + "</small>",
                col_type: "scroll_button",
                url: $("#noLoading#").lazyRule(function(it, pageId) {
                    let mod = GM.defineModule('./subpage/CategoryManager.js');
                    mod._handleTempcateClick(pageId, it);
                    refreshPage(false);
                    return "hiker://empty";
                }, it, pageId)
            });
        }
    }

    // 4. 构建自定义搜索配置（CFS/CFPY）
    let type_flag = String(cates[catei] && cates[catei].type_flag || "");
    let cfs = catState.searchcfs;
    if (type_flag.includes("[CFS]") || type_flag.includes("[CFPY]")) {
        d.push({
            col_type: "blank_block"
        });
        if (type_flag.includes("[CFS]")) {
            d.push({
                title: "🔍搜索",
                col_type: "scroll_button",
                url: $(cfs.custom).input(function(it, pageId) {
                    let newCfs = {
                        custom: input
                    };
                    let mod = GM.defineModule('./subpage/CategoryManager.js');
                    mod.setSearchCfs(pageId, newCfs);
                    refreshPage(false);
                    return "hiker://empty";
                }, pageId)
            });
        }
        if (type_flag.includes("[CFPY]")) {
            d.push({
                title: "🔍拼音",
                col_type: "scroll_button",
                url: $(cfs.custom_pinyin).input(function(it, pageId) {
                    let newCfs = {
                        custom_pinyin: input.toUpperCase()
                    };
                    let mod = GM.defineModule('./subpage/CategoryManager.js');
                    mod.setSearchCfs(pageId, newCfs);
                    refreshPage(false);
                    return "hiker://empty";
                }, pageId)
            });
        }
        d.push({
            title: cfs.custom || cfs.custom_pinyin,
            col_type: "scroll_button",
            url: "hiker://empty"
        });
        for (let key in cfs) {
            if (cfs.hasOwnProperty(key)) {
                updateFl(pageId, {
                    key: key,
                    value: cfs[key]
                });
            }
        }
    }

    // 5. 更新长按事件指令解析
    let regex = /\[AN:(.*?)\]/g;
    let match = regex.exec(type_flag);
    if (match !== null) {
        _updateCategoryState(pageId, {
            longPressActions: match[1].split(",")
        });
    } else {
        _updateCategoryState(pageId, {
            longPressActions: []
        });
    }
}

/**
 * [为了向下兼容保留的旧入口] 自动判定执行拉取和渲染
 */
function getCategorys(pageId, d, drpy, hasHead) {
    if (!hasLoaded(pageId)) {
        loadCategoryData(pageId, drpy, hasHead);
    }
    renderCategorys(pageId, d);
}


// ---------- 内部处理函数（供 lazyRule 调用）----------
function _handleFilterClick(pageId, params) {
    let catState = _getCategoryState(pageId);
    let index = params.index;
    let i = params.i;
    let cate = params.cate;
    let flkeys = getFlkeys(pageId);
    let currentCateTemp = catState.cate_obj[cate] || new Array(flkeys.length).fill("-1");

    let sameKeyIndices = [];
    for (let idx = 0; idx < flkeys.length; idx++) {
        if (flkeys[idx] === flkeys[index] && idx !== index) {
            sameKeyIndices.push(idx);
        }
    }

    for (let j = 0; j < sameKeyIndices.length; j++) {
        currentCateTemp[sameKeyIndices[j]] = "-1";
    }

    let currentVal = currentCateTemp[index];
    if (currentVal == i) {
        currentCateTemp[index] = "-1";
    } else {
        currentCateTemp[index] = i + "";
    }

    catState.cate_obj[cate] = currentCateTemp;

    let newFl = [];
    for (let idx2 = 0; idx2 < flkeys.length; idx2++) {
        newFl.push({
            key: flkeys[idx2],
            value: currentCateTemp[idx2] !== "-1" ? currentCateTemp[idx2] : "undefined",
            index: idx2
        });
    }
    resetFl(pageId, newFl);
}

function _handleTempcateUp(pageId, cobj) {
    let catState = _getCategoryState(pageId);
    if (cobj.list.length == 1) {
        catState.tempcate = {};
        refreshPage(false);
        return;
    } else {
        let i = -1;
        for (let idx = 0; idx < cobj.list.length; idx++) {
            if (cobj.list[idx].id == cobj.current) {
                i = idx;
                break;
            }
        }
        if (i - 1 != -1) {
            cobj.current = cobj.list[i - 1].id;
            cobj.list = cobj.list.slice(0, i);
        } else {
            catState.tempcate = {};
            refreshPage(false);
            return;
        }
    }
    catState.tempcate = cobj;
}

function _handleTempcateClick(pageId, it) {
    let catState = _getCategoryState(pageId);
    let obj = catState.tempcate;
    if (obj.current == it.id) return;
    obj.current = it.id;
    let i = -1;
    for (let idx = 0; idx < obj.list.length; idx++) {
        if (obj.list[idx].id == obj.current) {
            i = idx;
            break;
        }
    }
    if (i > -1) {
        obj.list = obj.list.slice(0, i + 1);
    }
    catState.tempcate = obj;
}

// 供内部调试用
function _getInternalState(pageId) {
    return _getCategoryState(pageId);
}

// 临时分类项（用于文件夹点击）
function addTempcate(pageId, name, id) {
    let catState = _getCategoryState(pageId);
    let tempcateobj = catState.tempcate || {};
    tempcateobj.current = id;
    if (!tempcateobj.list) {
        tempcateobj.list = [];
    }
    tempcateobj.list.push({
        name: name,
        id: id
    });
    // 去重
    let removeDuplicatesByValue = $.require("hiker://page/methods").removeDuplicatesByValue;
    tempcateobj.list = removeDuplicatesByValue(tempcateobj.list, "id");
    catState.tempcate = tempcateobj;
}

function isSearchS(pageId) {
    let catState = _getCategoryState(pageId);
    return !!catState.isSearchS;
}
// 导出模块方法
$.exports = {
    setVkey: function(vkey) {
        /* 无操作 */
    },

    // 【新增导出的核心解耦接口】
    loadCategoryData: loadCategoryData,
    renderCategorys: renderCategorys,
    // 【保留兼容接口】
    getCategorys: getCategorys,

    getFl: getFl,
    resetFl,
    getCateList: getCateList,
    hasLoaded: hasLoaded,

    setCateId: setCateId,
    setFold: setFold,
    setSearchCfs: setSearchCfs,
    removeState: removeState,
    addTempcate: addTempcate,
    isSearchS,

    _handleFilterClick: _handleFilterClick,
    _handleTempcateUp: _handleTempcateUp,
    _handleTempcateClick: _handleTempcateClick,
    _getInternalState: _getInternalState,
    close: function(pageId) {
        removeState(pageId);
    }
};