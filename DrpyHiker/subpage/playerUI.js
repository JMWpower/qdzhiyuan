const {
    findIcon
} = $.require("methods_er");
const {
    fontstyle,
    toSuperscript,
    findLongestElement,
    countTotalBytes,
} = $.require("methods");

function getLineShowFromTheme(themeEr, ef) {
    let obj = {
        s: ef,
        line: ef.from.indexOf(ef.from[ef.line]),
        lines: ef.from.length,
        from: ef.from[ef.line],
        plays: ef.plays[ef.line],
        spage: ef.spagenum,
        max: ef.max[ef.line]
    };

    function Template(template, data) {
        function evaluateExpression(expr) {
            try {
                with(data) {
                    return eval(expr);
                }
            } catch (e) {
                return expr;
            }
        }
        return template.replace(/{(.*?)}/g, function(match, expr) {
            return evaluateExpression(expr);
        });
    }
    return Template(themeEr.线路显示, obj);
}

function renderLines(erConfig, themeEr, state, pageId, vodId) {
    let lineStyle = erConfig.线路样式;
    let fromList = state.fromList;
    let currentLine = state.line;
    let result = [];

    if (lineStyle === "select") {
        let ci = currentLine;
        let from = fromList;
        let max = state.totalLists.map(list => list.length);
        let tfrom = from.map(function(x, i) {
            return ci == i ? fontstyle(x + "[" + max[i] + "]", { c: themeEr.线路颜色, tags: "small" }) : fontstyle(x + "[" + max[i] + "]", { tags: "small" });
        });
        result.push({
            title: from[ci],
            desc: from.length + "条线路",
            url: $("#noLoading#").lazyRule((pageId, vodId) => {
                let playerState = GM.defineModule('./subpage/PlayerStateManager.js');
                let state = playerState.getState(pageId);
                if (!state) return "hiker://empty";
                let from = state.fromList;
                let max = state.totalLists.map(list => list.length);
                let ci = state.line;
                let tfrom = from.map(function(x, i) {
                    return ci == i ? fontstyle(x + "[" + max[i] + "]", { c: themeEr.线路颜色, tags: "small" }) : fontstyle(x + "[" + max[i] + "]", { tags: "small" });
                });

                let show = 1;
                let num = tfrom.length;
                if (num < 8) show = 1;
                else if (num > 8 && num <= 12) show = 2;
                else show = 3;
                
                return $(tfrom, show).select((ci, from, pageId, vodId) => {
                    let i = MY_INDEX;
                    if (i == ci) return "hiker://empty";
                    
                    let playerState = GM.defineModule('./subpage/PlayerStateManager.js');
                    playerState.setLine(pageId, i);
                    playerState.refreshPlaylist(pageId, true);
                    
                    // 记录历史
                    let state = playerState.getState(pageId);
                    if (state && state.extra && state.extra.vodName) {
                        $.require("methods").historylog("set", state.extra.source.key, md5(state.extra.vodId), {
                            title: state.extra.vodName,
                            page: state.page,
                            date: new Date().getTime()
                        });
                    }
                    return "hiker://empty";
                }, ci, from, pageId, vodId);
            }, pageId, vodId),
            img: findIcon(from[ci], themeEr),
            col_type: 'avatar',
            extra: { id: "location@" + pageId }
        });
    } else {
        for (let i = 0; i < fromList.length; i++) {
            let t = fromList[i];
            let iconimg = lineStyle.includes("icon") ? findIcon(t) : "";
            // 修复：改为判断配置里的线路上标开关
            if (erConfig.线路上标) {
                t = t + toSuperscript(state.totalLists[i].length);
            }
            let title = (i == currentLine) ? fontstyle(t, { c: themeEr.线路颜色, tags: "small" }, lineStyle) : fontstyle(t, { tags: "small" }, lineStyle);
            
            result.push({
                title: title,
                url: $("#noLoading#").lazyRule((i, pageId, vodId) => {
                    let playerState = GM.defineModule('./subpage/PlayerStateManager.js');
                    let state = playerState.getState(pageId);
                    if (state && state.line == i) return "hiker://empty";
                    
                    playerState.setLine(pageId, i);
                    playerState.refreshPlaylist(pageId, true); 
                    
                    // 记录历史
                    state = playerState.getState(pageId);
                    if (state && state.extra && state.extra.vodName) {
                        $.require("methods").historylog("set", state.extra.source.key, md5(state.extra.vodId), {
                            title: state.extra.vodName,
                            page: state.page,
                            date: new Date().getTime()
                        });
                    }
                    return "hiker://empty";
                }, i, pageId, vodId),
                extra: { cls: "location@", id: "line_" + pageId + "_" + i },
                img: iconimg,
                col_type: lineStyle
            });
        }
    }
    return result;
}

function renderPages(erConfig, themeEr, state, pageId, vodId) {
    let line = state.line;
    let page = state.page;
    let totalCount = state.totalLists[line].length;
    
    // 修复：解析为整型，处理 0 的极端情况
    let pageSize = parseInt(erConfig.分页, 10);
    if (isNaN(pageSize)) pageSize = 40;
    
    let pageCount = pageSize === 0 ? 1 : Math.ceil(totalCount / pageSize);

    // 修复：分页逻辑判别
    let showPagination = false;
    if (erConfig.分页逻辑 == "1" || erConfig.分页逻辑 === true) {
        showPagination = pageCount > 1; // 仅当前线路
    } else {
        // 任意线路需要分页即可
        showPagination = state.totalLists.some(list => {
            let p = pageSize === 0 ? 1 : Math.ceil(list.length / pageSize);
            return p > 1;
        });
    }

    if (!showPagination) return [];

    let result = [];

    // 上一页
    result.push({
        title: fontstyle('上一页', { c: page == 0 ? "grey" : "" }),
        col_type: "text_4",
        url: $("#noLoading#").lazyRule((pageId) => {
            let playerState = GM.defineModule('./subpage/PlayerStateManager.js');
            let state = playerState.getState(pageId);
            if (!state) return "hiker://empty";
            let line = state.line;
            let pageCount = state.playPages[line].length;
            let newPage = state.page - 1;
            if (newPage < 0) newPage = pageCount - 1;
            
            playerState.setPage(pageId, newPage);
            playerState.refreshPlaylist(pageId);
            
            // 记录历史
            if (state.extra && state.extra.vodName) {
                $.require("methods").historylog("set", state.extra.source.key, md5(state.extra.vodId), {
                    title: state.extra.vodName,
                    page: newPage,
                    date: new Date().getTime()
                });
            }
            return "hiker://empty";
        }, pageId),
        extra: { cls: "playpage_"+pageId, id: "playpage@up_" + pageId }
    });

    // 当前页码
    let start = page * pageSize + 1;
    let end = pageSize === 0 ? totalCount : Math.min((page + 1) * pageSize, totalCount);
    let currentPageText = start + '-' + end;
    result.push({
        title: fontstyle(currentPageText, { c: page == 0 ? "grey" : "" }),
        col_type: "text_2",
        url: $("#noLoading#").lazyRule((pageId, themeEr) => {
            let playerState = GM.defineModule('./subpage/PlayerStateManager.js');
            let state = playerState.getState(pageId);
            if (!state) return "hiker://empty";
            let line = state.line;
            let totalCount = state.totalLists[line].length;
            let extra = state.extra;
            
            let pageSize = parseInt(extra.erConfig.分页, 10);
            if (isNaN(pageSize)) pageSize = 40;
            
            let pageCount = state.playPages[line].length;
            let pageArr = [];
            for (let i = 0; i < pageCount; i++) {
                let s = i * pageSize + 1;
                let e = pageSize === 0 ? totalCount : Math.min((i + 1) * pageSize, totalCount);
                let text = s + '-' + e;
                pageArr.push(i == state.page ? '““””' + text.fontcolor(themeEr.线路颜色) : text);
            }
            
            return $(pageArr, 3).select((pageId) => {
                let playerState = GM.defineModule('./subpage/PlayerStateManager.js');
                playerState.setPage(pageId, MY_INDEX);
                playerState.refreshPlaylist(pageId);
                
                // 记录历史
                let state = playerState.getState(pageId);
                if (state && state.extra && state.extra.vodName) {
                    $.require("methods").historylog("set", state.extra.source.key, md5(state.extra.vodId), {
                        title: state.extra.vodName,
                        page: MY_INDEX,
                        date: new Date().getTime()
                    });
                }
                return "hiker://empty";
            }, pageId);
        }, pageId, themeEr),
        extra: { cls: "playpage_"+pageId, id: "playpage@page_" + pageId }
    });

    // 下一页
    result.push({
        title: fontstyle('下一页', { c: page == (pageCount > 0 ? pageCount - 1 : 0) ? "grey" : "" }),
        col_type: "text_4",
        url: $("#noLoading#").lazyRule((pageId) => {
            let playerState = GM.defineModule('./subpage/PlayerStateManager.js');
            let state = playerState.getState(pageId);
            if (!state) return "hiker://empty";
            let line = state.line;
            let pageCount = state.playPages[line].length;
            let newPage = state.page + 1;
            if (newPage >= pageCount) newPage = 0;
            
            playerState.setPage(pageId, newPage);
            playerState.refreshPlaylist(pageId);
            
            // 记录历史
            if (state.extra && state.extra.vodName) {
                $.require("methods").historylog("set", state.extra.source.key, md5(state.extra.vodId), {
                    title: state.extra.vodName,
                    page: newPage,
                    date: new Date().getTime()
                });
            }
            return "hiker://empty";
        }, pageId),
        extra: { cls: "playpage_"+pageId, id: "playpage@next_" + pageId }
    });

    // 分页导航数字渲染
    if (erConfig.分页导航) {
        for (let i = 0; i < pageCount; i++) {
            let s = i * pageSize + 1;
            let e = pageSize === 0 ? totalCount : Math.min((i + 1) * pageSize, totalCount);
            let text = s + '-' + e;
            result.push({
                title: '““””' + (i == page ? text.fontcolor(themeEr.线路颜色) : text),
                col_type: "scroll_button",
                url: $("#noLoading#").lazyRule((i, pageId) => {
                    let playerState = GM.defineModule('./subpage/PlayerStateManager.js');
                    playerState.setPage(pageId, i);
                    playerState.refreshPlaylist(pageId);
                    
                    let state = playerState.getState(pageId);
                    if (state && state.extra && state.extra.vodName) {
                        $.require("methods").historylog("set", state.extra.source.key, md5(state.extra.vodId), {
                            title: state.extra.vodName,
                            page: i,
                            date: new Date().getTime()
                        });
                    }
                    return "hiker://empty";
                }, i, pageId),
                extra: { cls: "pagenav_"+pageId, id: "pagenum_" + pageId + "_" + i }
            });
        }
    }
    return result;
}

function renderPlaylist(themeEr, state, source, vodId, pageId, playLazy) {
    let items = state.currentPageItems;
    if (!items || !items.length) return [];
    let col = "text_4";
    let textalign = "";
    let ts = items.map(v => v.name);
    let tc = countTotalBytes(findLongestElement(ts));

    let result = [];
    for (let i = 0; i < items.length; i++) {
        let img = "";
        if (tc > 24) {
            col = "text_1";
            img = MY_PARAMS.img || "http://123.56.105.145/tubiao/movie/146.svg";
        } else if (tc >= 12 && tc < 15) {
            col = "text_3";
        } else if (tc >= 15) {
            col = "text_2";
            textalign = "left";
        }
        let item = items[i];
        let title = item.name || "第" + (i + 1) + "集";
        let extra = {
            from: state.fromList[state.line],
            blockRules: ['bb.*.png', '.jpg', "hm\.baidu\.com\/hm.js"],
            videoExcludeRules: ['?url='],
            textAlign: textalign,
            source: source,
            id: item.id,
            lineVisible: false,
            cls: "playlist@" + source.key + " detail",
            longClick: [{
                title: "推送",
                js: $.toString((source, id, flag, index) => {
                    $.require("TvPushPop").show(source, id, flag, index);
                    return "hiker://empty";
                }, source, vodId, state.fromList[state.line], i)
            }]
        };
        result.push({
            title: fontstyle(title, { tags: "small" }),
            url: item.url + "#" + state.fromList[state.line] + playLazy,
            col_type: col,
            extra: extra
        });
    }
    return result;
}

function updatePlaylist(pageId, state, extra, forceRebuildPages) {
    let {
        erConfig,
        themeEr,
        source,
        vodId,
        playLazy
    } = extra;
    if (!erConfig || !themeEr || !source || !vodId) return;

    // 1. 重新生成播放列表并替换
    let newItems = renderPlaylist(themeEr, state, source, vodId, pageId, playLazy);
    deleteItemByCls("playlist@" + source.key + " detail");
    let containers = findItemsByCls("playlistContainer");
    if (containers && containers.length > 0) {
        let containerId = containers[0].extra.id;
        addItemAfter(containerId, newItems);
    }

    // 2. 更新排序按钮
    let ef = {
        from: state.fromList,
        line: state.line,
        plays: state.totalLists.map(list => list.length),
        spagenum: state.page + 1,
        max: state.playPages.map(pages => pages.length)
    };
    let lineShow = getLineShowFromTheme(themeEr, ef);
    let sortDesc = `<small><span style="color:${themeEr.线路颜色}">${state.fromList[state.line].slice(0, 16)}</span></small>`;
    let sortIcon = state.sort == 0 ? themeEr.icons.正序 : themeEr.icons.倒序;
    updateItem("@sort_" + pageId, {
        title: lineShow,
        desc: sortDesc,
        img: sortIcon
    });

    // 3. 更新线路按钮的高亮
    let lineStyle = erConfig.线路样式;
    let fromList = state.fromList;
    let currentLine = state.line;

    if (lineStyle === "select") {
        let max = state.totalLists.map(list => list.length);
        let lineShowText = fromList[currentLine] + " [" + max[currentLine] + "]";
        let lineDesc = fromList.length + "条线路";
        updateItem("location@" + pageId, {
            title: fontstyle(lineShowText, { c: themeEr.线路颜色, tags: "small" }),
            desc: lineDesc,
            img: findIcon(fromList[currentLine], themeEr)
        });
    } else {
        for (let i = 0; i < fromList.length; i++) {
            let t = fromList[i];
            let iconimg = lineStyle.includes("icon") ? findIcon(t) : "";
            if (erConfig.线路上标) {
                t = t + toSuperscript(state.totalLists[i].length);
            }
            let title = (i == currentLine) ? fontstyle(t, { c: themeEr.线路颜色, tags: "small" }, lineStyle) : fontstyle(t, { tags: "small" }, lineStyle);
            updateItem("line_" + pageId + "_" + i, {
                title: title,
                img: iconimg
            });
        }
    }

    // 4. 分页导航处理
    let line = state.line;
    let page = state.page;
    let totalCount = state.totalLists[line].length;
    let pageSize = parseInt(erConfig.分页, 10);
    if (isNaN(pageSize)) pageSize = 40;
    let pageCount = pageSize === 0 ? 1 : Math.ceil(totalCount / pageSize);

    let showPagination = false;
    if (erConfig.分页逻辑 == "1" || erConfig.分页逻辑 === true) {
        showPagination = pageCount > 1;
    } else {
        showPagination = state.totalLists.some(list => {
            let p = pageSize === 0 ? 1 : Math.ceil(list.length / pageSize);
            return p > 1;
        });
    }

    if (forceRebuildPages) {
        deleteItemByCls("playpage_"+pageId);
        deleteItemByCls("pagenav_"+pageId);
        if (showPagination) {
            let newPages = renderPages(erConfig, themeEr, state, pageId, vodId);
            if (newPages.length > 0) {
                let lineElem = findItem("playpageline_" + pageId);
                if (lineElem) {
                    addItemAfter(lineElem.extra.id, newPages);
                }
            }
        }
    } else {
        if (!showPagination) {
            deleteItemByCls("playpage_"+pageId);
            deleteItemByCls("pagenav_"+pageId);
            return;
        }
        
        updateItem("playpage@up_" + pageId, { title: fontstyle('上一页', { c: page == 0 ? "grey" : "" }) });
        updateItem("playpage@next_" + pageId, { title: fontstyle('下一页', { c: page == (pageCount > 0 ? pageCount - 1 : 0) ? "grey" : "" }) });
        
        let start = page * pageSize + 1;
        let end = pageSize === 0 ? totalCount : Math.min((page + 1) * pageSize, totalCount);
        let currentPageText = start + '-' + end;
        updateItem("playpage@page_" + pageId, { title: fontstyle(currentPageText, { c: page == 0 ? "grey" : "" }) });
        
        if (erConfig.分页导航) {
            for (let i = 0; i < pageCount; i++) {
                let s = i * pageSize + 1;
                let e = pageSize === 0 ? totalCount : Math.min((i + 1) * pageSize, totalCount);
                let text = s + '-' + e;
                let title = (i == page) ? '““””' + text.fontcolor(themeEr.线路颜色) : text;
                updateItem("pagenum_" + pageId + "_" + i, { title: title });
            }
        }
    }
}

$.exports = {
    getLineShowFromTheme,
    renderLines,
    renderPages,
    renderPlaylist,
    updatePlaylist
};
