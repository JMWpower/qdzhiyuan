(function() {
    const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
    const ThemeManager = GM.defineModule('./subpage/ThemeManager.js');
    const ConfigManager = GM.defineModule('./subpage/ConfigManager.js');
    const PlayerStateManager = GM.defineModule('./subpage/PlayerStateManager.js');
    const DrpyManage = GM.defineModule("DrpyManage");
    const playerUI = $.require('./subpage/playerUI.js');
    
    const {
        isDarkMode,
        cacheManage,
        fontstyle,
        backColor,
        objectex,
        stringex,
        arrayex,
        erOptions,
        historylog   // 新增：历史记录方法
    } = $.require("methods");
    const {
        setDesc,
        findIcon
    } = $.require("methods_er");

    // 扩展方法
    objectex();
    stringex();
    arrayex();

    // ---------- 参数解析 ----------
    if (!MY_PARAMS.vodId) {
        MY_PARAMS.vodId = decodeURIComponent(getParam("vodId", ""));
    }
    MY_PARAMS.skey = decodeURIComponent(getParam("skey", "")) || MY_PARAMS.skey;
    if (MY_PARAMS.source && MY_PARAMS.source.key !== MY_PARAMS.skey) {
        MY_PARAMS.source = undefined;
        java.lang.Thread.sleep(200);
    }

    let id = MY_PARAMS.vodId;
    let pageId = PageStateManager.getOrCreatePageId(MY_PARAMS.sname + id + getParam("pageId", ""));

    // 获取源信息
    let source = {};
    if (MY_PARAMS.source) {
        source = MY_PARAMS.source;
    } else {
        const runtimeConfig = GM.defineModule("runtimeConfig");
        source = runtimeConfig.findSource(MY_PARAMS.skey);
        MY_PARAMS.source = source;
        setPageParams(MY_PARAMS);
        MY_PARAMS.sname = source.name;
    }
    erOptions.set("source", source);

    // 获取 drpy 实例与配置主题
    let drpy = DrpyManage.getBySource(source);
    let stype = drpy.getRule("类型") || "";
    let erConfig = ConfigManager.getErConfig(); 
    let theme = ThemeManager.getCurrentTheme();
    let themeEr = theme.er;

    // ---------- 获取详情数据 (实现：二级缓存) ----------
    let info = cacheManage.get(MY_PARAMS.sname + id);
    if (Object.keys(info).length == 0) {
        try {
            info = JSON.parse(drpy.detail(String(id))).list[0];
            if (erConfig.二级缓存) {
                cacheManage.set(MY_PARAMS.sname + id, info);
            }
        } catch (e) {
            log("加载drpy二级出错:" + e.message);
            log("行数:" + e.lineNumber);
        } finally {
            hideLoading();
        }
    }

    if (MY_PARAMS.img == undefined || MY_PARAMS.img == "") {
        if (info.vod_pic != "") {
            setPagePicUrl(info.vod_pic);
            MY_PARAMS.img = info.vod_pic;
            setPageParams(MY_PARAMS);
        }
    }

    // ---------- 处理艺术字----------
    const artmes = {};
    function formatString(str, prefix) {
        if (!str) return "";
        if (typeof str != 'string') str = String(str);
        if (str && str.includes("a=cr:")) {
            try {
                const regex = /\[a=cr:(\{.*?\})\/\](.*?)\[\/a\]/g;
                let match;
                while ((match = regex.exec(str)) !== null) {
                    let jsonPart = JSON.parse(match[1]);
                    if (!artmes[prefix]) artmes[prefix] = [];
                    artmes[prefix].push({
                        id: jsonPart.id,
                        name: jsonPart.name,
                        text: match[2]
                    });
                }
                return prefix + ":" + artmes[prefix].map(x => x.name).join(' ');
            } catch (e) {}
        }
        str = str.replace(/\//g, ' ').replace(/\s+/g, " ");
        if (/[:：]/g.test(str)) str = str.replace(/[:：]/g, ':');
        return /[:：]/.test(str) ? str : prefix + ":" + str;
    }

    let {
        vod_director: 导演,
        vod_actor: 主演,
        vod_name: 名称,
        vod_remarks: 备注,
        vod_area: 地区,
        vod_year: 年份
    } = info;
    let _导演 = (stype == "小说") ? "作者" : "导演";
    导演 = formatString(导演, _导演);
    主演 = formatString(主演, "主演");
    备注 = formatString(备注, "备注");
    地区 = formatString(地区, "地区");
    年份 = formatString(年份, "年份");

    let titles = [名称, 备注];
    let descs = [导演, 主演];
    if (titles.filter(e => e && e != "").length == 0) {
        titles = [地区, 年份];
    } else {
        descs = descs.concat([地区, 年份]);
    }

    let [lfc, lbc] = themeEr.浅来源色.split(/;/).filter(e => e);
    let [nfc, nbc] = themeEr.深来源色.split(/;/).filter(e => e);
    let darkmode = isDarkMode();
    let cs = darkmode ? { fc: nfc, bc: nbc } : { fc: lfc, bc: lbc };
    titles.splice(1, 0, '““””' + fontstyle(fontstyle("来源: ", { tags: "b" }) + backColor(source.name, cs), { tags: "small" }));

    let cover_col = "movie_1_vertical_pic_blur";
    let head_img = "";
    if (MY_URL.includes("#gameTheme#")) {
        cover_col = "movie_1_vertical_pic";
        head_img = "http://123.56.105.145/img/top.png";
    }

    // ---------- 构建初始布局数组 ----------
    let d = [];

    if (head_img != "") {
        d.push({ pic_url: head_img, url: "hiker://empty", col_type: "pic_1_full" });
    }

    // 视频卡片
    d.push({
        title: "““””" + (titles.filter(e => e).map((x, i) => i > 1 ? fontstyle(x, { tags: "small" }) : x).join("\n")).replaceAll("““””", ""),
        desc: descs.filter(e => e && e != "undefined").join("\n"),
        url: MY_RULE.title.includes("Test") ? info.vod_id : "hiker://empty",
        img: MY_PARAMS.img || info.vod_pic,
        col_type: cover_col,
        extra: {
            gradient: (erConfig.渐变 === true || erConfig.渐变 === "1"),
            id: "detail_info",
            lineVisible: false,
            longClick: [{
                    title: "二级设置",
                    js: $.toString(() => "hiker://page/UIManage?mode=二级#noRecordHistory##noHistory#")
                },
                {
                    title: "视频日志:" + (ConfigManager.getGlobal("videolog") ? "开启" : "关闭"),
                    js: $.toString(() => {
                        let ConfigManager = $.require('./subpage/ConfigManager.js');
                        let v = ConfigManager.getGlobal("videolog");
                        ConfigManager.setGlobal("videolog", !v);
                        refreshPage();
                        clearMyVar("playlist_ready");
                        toast("已" + (!v ? "开启" : "关闭") + "视频日志");
                    })
                },
                {
                    title: "调试:" + (ConfigManager.getGlobal("useLog") ? "开启" : "关闭"),
                    js: $.toString(() => {
                        let { itemAciton } = $.require("settings");
                        clearMyVar("playlist_ready");
                        return itemAciton("调试日志", true);
                    })
                },
                {
                    title: "重载",
                    js: $.toString(() => {
                        let { itemAciton } = $.require("settings");
                        clearMyVar("playlist_ready");
                        return itemAciton("重载");
                    })
                }
            ]
        }
    });

    if (Object.keys(artmes).length > 0) {
        d.push({ col_type: "big_blank_block" });
        for (let key in artmes) {
            let value = artmes[key];
            d.push({ col_type: "blank_block" });
            d.push({ title: fontstyle(key + ":", { tags: "small|b" }), col_type: "scroll_button" });
            for (let i = 0; i < value.length; i++) {
                let x = value[i];
                d.push({
                    title: fontstyle(x.name, { tags: "small" }),
                    url: $("").lazyRule((x, v, i, s) => {
                        putMyVar("temsmode", "3");
                        clearMyVar("playlist_ready");
                        storage0.putMyVar("searchcfg", { list: v.map(x => x.text), i: i });
                        return 'hiker://search?rule=' + MY_RULE.title + "&s=" + s.name + "站内搜索";
                    }, x, value, i, source),
                    col_type: "scroll_button"
                });
            }
        }
    }
    setDesc(d, info.vod_content);

    // ---------- 处理播放列表 (实现：选集优化) ----------
    let from = [];
    if (info.vod_play_from != undefined) {
        from = info.vod_play_from.split("$$$");
    }
    let playUrlList = [];
    let isNovel = stype === "小说";

    let pt = info.vod_name || "";
    if (erConfig.选集优化 && pt) {
        if (/第\d+季/.test(pt)) {
            pt = pt.replace(/第\d+季/, "").trim();
        }
    }

    if (info.vod_play_url && info.vod_play_url != "" && info.vod_play_url.split("$$$").filter(e => e).length > 0) {
        playUrlList = info.vod_play_url.split("$$$").map((t, i) => {
            let items = t.split("#").map((j, ii) => {
                let k = j.split("$");
                let pname = k[0];
                if (erConfig.选集优化 && pt && new RegExp(pt).test(pname)) {
                    pname = pname.replace(pt, "").replace(/^播放/, "");
                    if (pname.startsWith("_")) {
                        pname = pname.substring(1);
                    }
                }
                pname = (pname !== "") ? pname : String(ii + 1);

                return {
                    name: pname,
                    url: k[1] || k[0],
                    id: k[1] || k[0]
                };
            });
            return items;
        });
    } else if (info.novelMatchUrl) {
        d.push({ col_type: "line" }, { title: "使用智能识别章节", col_type: "text_center_1", url: "hiker://page/AiMatchinNovel?p=fypage", extra: { novelMatchUrl: info.novelMatchUrl } });
        setResult(d);
        return;
    } else {
        d.push({ col_type: "line" }, { title: "暂无播放源或播放列表定位错误", col_type: "text_center_1", url: info.vod_id });
        setResult(d);
        return;
    }

    let totalLists = playUrlList.map(lineItems => lineItems.map(item => ({
        name: item.name,
        url: item.url,
        id: item.id
    })));

    let playLazy = $("").lazyRule((source) => {
        return $.require("videoUrl").parse(input, input.split("#")[0], source);
    }, source);

    // ---------- 获取历史记录并初始化状态 ----------
    let his = historylog("get", MY_PARAMS.skey, md5(id));
    let initialPage = Number(his) || 0;

    let extra = {
        erConfig: erConfig,
        themeEr: themeEr,
        source: source,
        vodId: id,
        vodName: info.vod_name, // 传递给 playerUI 记录历史
        playLazy: playLazy
    };
    
    PlayerStateManager.initState(pageId, from, totalLists, erConfig.分页, extra);
    let state = PlayerStateManager.getState(pageId);
    
    // 若初始化创建时为0，但历史记录存在进度，则跳转到历史进度页
    if (state.page === 0 && initialPage > 0) {
        PlayerStateManager.setPage(pageId, initialPage);
        state = PlayerStateManager.getState(pageId);
    }
    
    // 首次进入记录历史，维持历史记录数组的新鲜度
    historylog("set", source.key, md5(id), {
        title: info.vod_name,
        page: state.page,
        date: new Date().getTime()
    });

    // ---------- 构建播放相关 UI ----------
    let sortobj = [
        { title: fontstyle("↿", { h: false, c: "#1AAD19", tags: "b" }) + fontstyle("⇂", { h: false, tags: "b" }) + "\t", img: themeEr.icons.正序 },
        { title: fontstyle("↿", { h: false, tags: "b" }) + fontstyle("⇂", { h: false, c: "#FF0000", tags: "b" }) + "\t", img: themeEr.icons.倒序 }
    ];
    
    d.push({
        title: playerUI.getLineShowFromTheme(themeEr, {
            from: from,
            line: state.line,
            plays: state.totalLists.map(list => list.length),
            spagenum: state.page + 1,
            max: state.playPages.map(pages => pages.length)
        }),
        desc: `<small><span style="color:${themeEr.线路颜色}">${from[state.line].slice(0, 16)}</span></small>`,
        img: sortobj[state.sort].img,
        url: $("#noLoading#").lazyRule((pageId) => {
            let playerState = GM.defineModule('./subpage/PlayerStateManager.js');
            let state = playerState.getState(pageId);
            if (!state) return "hiker://empty";
            let newSort = state.sort == 0 ? 1 : 0;
            playerState.setSort(pageId, newSort);
            playerState.refreshPlaylist(pageId);
            return "hiker://empty";
        }, pageId),
        col_type: 'avatar',
        extra: { id: "@sort_" + pageId }
    });

    d.push({ col_type: "big_blank_block" });

    // TVBOX推送
    d.push({
        title: "TVBOX推送", col_type: 'scroll_button',
        url: $("#noLoading#").lazyRule((source, id) => {
            $.require("TvPushPop").show(source, id);
            return "hiker://empty";
        }, source, id)
    });
    // 网盘链接
    if (info.vod_play_pan) {
        let pushPan = () => $.require("videoUrl").parsePush(input, true) || "toast://不支持该网盘链接";
        let pans = String(info.vod_play_pan).split("$$$");
        d.push({
            title: "网盘链接", col_type: 'scroll_button',
            url: pans.length === 1 ? $(pans[0] + "#noLoading#").lazyRule(pushPan) : $(pans, 1, "选择网盘链接").select(pushPan)
        });
    }

    if (stype === "小说" || stype === "漫画") {
        var downloadlazy = $.toString((key, skey, title) => {
            let drpy;
            if ($.hiker["__drpy__"]) {
                drpy = $.hiker["__drpy__"];
            } else {
                let { GM } = $.require("hiker://files/data/DrpyHiker/libs/GlobalVarV3.js");
                GM.setSelfKey(key);
                let DrpyManage = GM.defineModule("DrpyManage", "DrpyManage?rule=" + title);
                drpy = DrpyManage.get(skey);
                $.hiker["__drpy__"] = drpy;
                $.hiker["__test__"] = [];
            }
            input = input.split("#");
            let result = JSON.parse(drpy.play(input[1], input[0]));
            if (result.url.startsWith("pics://")) return result.url;
            else if (result.url.startsWith("novel://")) {
                let content = JSON.parse(result.url.replace("novel://", "")).content;
                let cmd5 = md5(content);
                let index = 0;
                if ((index = $.hiker["__test__"].indexOf(cmd5)) !== -1) log("重复：" + input + "=>" + index);
                $.hiker["__test__"].push(cmd5);
                return content;
            }
            throw new Error("漫画或正文获取失败");
        }, GM.getSelfKey(), MY_PARAMS.skey, MY_RULE.title);

        d.push({
            title: "下载" + stype, col_type: 'scroll_button',
            url: $("#noLoading#").lazyRule((pageId) => {
                const PlayerStateManager = GM.defineModule('./subpage/PlayerStateManager.js');
                let state = PlayerStateManager.getState(pageId);
                let from = state.fromList;
                let totalLists = state.totalLists;
                let selectedLine = 0;
                if (from.length > 1) {
                    let lineNames = from.map((name, idx) => { return name + " (" + totalLists[idx].length + "集)"; });
                    let result = $(lineNames, 2, "请选择下载线路").selectSync();
                    if (result === undefined || result === null) return "hiker://empty"; 
                    selectedLine = Number(result); 
                }
                let lineItems = totalLists[selectedLine] || [];
                let chapterList = lineItems.map(item => ({ url: item.url, title: item.name }));
                let tempFile = "hiker://files/_cache/dr_dow_list.json";
                writeFile(tempFile, JSON.stringify(chapterList));
                return 'hiker://page/download.view#noRecordHistory##noRefresh#?rule=本地资源管理&chapterList=' + encodeURIComponent(tempFile);
            }, pageId),
            extra: {
                chapterList: "hiker://files/_cache/dr_dow_list.json",
                info: {
                    bookName: info.vod_name, ruleName: MY_RULE.title, bookTopPic: info.vod_pic, parseCode: downloadlazy, bookId: MY_PARAMS.sname, type: stype === "漫画" ? "comic" : "novel"
                },
                defaultView: "1"
            }
        });

        d.push({
            title: "本地书架", url: 'hiker://page/Bookrack.view#noRecordHistory#?rule=本地资源管理&ruleName=' + MY_RULE.title, col_type: 'scroll_button',
            extra: { type: stype === "漫画" ? "comic" : "novel" }
        });
    }

    let actions = (info.vod_action || "").split(",").filter(Boolean);
    for (let actionId of actions) {
        d.push({
            title: actionId,
            url: $("#noLoading#").lazyRule((id, actionId) => { return $.require("action").checkOptions2(actionId, "", JSON.stringify({ id })); }, id, actionId),
            col_type: 'scroll_button',
        });
    }
    d.push({ col_type: "blank_block" });

    // 线路选择
    let lineItems = playerUI.renderLines(erConfig, themeEr, state, pageId, id);
    Array.prototype.push.apply(d, lineItems);

    d.push({ col_type: "blank_block", extra: { id: "playpageline_" + pageId } });
    d.push({ col_type: "line", extra: { id: "playlists_" + pageId, cls: "playlistContainer" } });
    
    let playlistItems = playerUI.renderPlaylist(themeEr, state, source, id, pageId, playLazy);
    Array.prototype.push.apply(d, playlistItems);
    
    d.push({ col_type: "blank_block", extra: { id: "playlistsEND_" + pageId } });

    let pages = playerUI.renderPages(erConfig, themeEr, state, pageId, id);
    if (pages.length > 0) {
        for (let i = 0; i < d.length; i++) {
            if (d[i].extra && d[i].extra.id === "playpageline_" + pageId) {
                Array.prototype.splice.apply(d, [i + 1, 0].concat(pages));
                break;
            }
        }
    }

    let mes = [fontstyle('以上数据来源于网络，如您喜欢，请支持官方！', { c: "grey", tags: "small" })];
    if (cacheManage.exist(MY_PARAMS.sname + id)) {
        mes.unshift(fontstyle("当前为缓存,点我刷新", { c: themeEr.线路颜色, tags: "small" }));
    }
    d.push({
        title: mes.join("\n"),
        url: $("#noLoading#").lazyRule((sname, id, pageId) => {
            const ConfigManager = GM.defineModule('./subpage/ConfigManager.js');
            let cacheManage = $.require("methods").cacheManage;
            if (cacheManage.exist(sname + id)) cacheManage.del(sname + id);
            
            // 手动点击统一刷新界面
            const PlayerStateManager = GM.defineModule('./subpage/PlayerStateManager.js');
            PlayerStateManager.close(pageId);
            refreshPage();
            showLoading("正在刷新");
            return "hiker://empty";
        }, MY_PARAMS.sname, id, pageId),
        col_type: 'text_center_1',
        extra: { cls: "playlist2" }
    });

    // ---------- 页面关闭清理 ----------
    addListener('onClose', $.toString((pageId) => {
        const PlayerStateManager = GM.defineModule('./subpage/PlayerStateManager.js');
        PlayerStateManager.close(pageId);
    }, pageId));

    setResult(d);
})();
