// 文件路径：subpage/recommend.js
// 职责：渲染各大搜索引擎的热搜榜单组件 (完全保留原版 avatar 布局与动态无感刷新，适配外部 pId 与 page)

const RecommendUI = {
    hotClass: {
        "百度": { "电视剧": "teleplay", "电影": "movie" },
        "夸克": { "电视剧": "电视剧", "电影": "电影", "动漫": "动漫", "综艺": "综艺" },
        "360": { "电视剧": "2", "电影": "1", "动漫": "4", "综艺": "3" }
    },

   

    /**
     * 动态获取并组装下方的列表数据数组
     */
    getSd: function(pId, ruleTitle) {
        let dataobj = storage0.getItem("dataobj", { "dataSource": "百度", "hotkey": "电视剧" });
        let selectsource = dataobj.dataSource;
        let selectkey = dataobj.hotkey;
        
        // 容错处理
        if (!this.hotClass[selectsource]) { 
            selectsource = "百度"; 
            dataobj.dataSource = selectsource; 
        }
        if (!this.hotClass[selectsource][selectkey]) { 
            selectkey = Object.keys(this.hotClass[selectsource])[0]; 
            dataobj.hotkey = selectkey; 
        }
        storage0.setItem("dataobj", dataobj);

        let tabkey = this.hotClass[selectsource][selectkey];
        let sd = [];

        // 内部补齐原有的 getTitle 编号方法
        const getTitle = (i, name) => (i + 1) + ". " + name;

        try {
            switch (selectsource) {
                case "百度": {
                    let json = request(`https://top.baidu.com/api/board?from=home&new_home_style=1&platform=wise&tab=${tabkey}&tag=%7B%7D&chart_option=`, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Mobile Safari/537.36',
                            'Host': 'top.baidu.com',
                            'Accept': 'application/json, text/plain, */*',
                            'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'Referer': 'https://top.baidu.com/board?tab=novel',
                        }
                    });
                    //console.log(JSON.stringify(JSON.parse(json).data.cards[0].content[0]))
                    let list = JSON.parse(json).data.cards[0].content[0].content;
                    //console.log(JSON.stringify(list, null,4))
                    for (let i = 0; i < list.length; i++) {
                        let item = list[i];
                        let name = item.title;
                        let des = item.desc.join("\n");
                        sd.push({
                            title: getTitle(i, name),
                            url: $("").lazyRule((word, rule) => {
                                putMyVar("temsmode", "0");
                                return "hiker://search?rule=" + rule + "&s=" + word;
                            }, item.title, ruleTitle),
                            desc: des,
                            img: item.imgInfo.src,
                            col_type: "movie_1_vertical_pic",
                            extra: {
                                cls: "hotitem",
                                id: "hotitem_" + pId + "_" + i,
                                // 原汁原味的纯字符串长按事件拼接
                                longClick: [{
                                    title: "聚合搜索",
                                    js: "putMyVar('temsmode', '1');'hiker://search?rule=' + MY_RULE.title + '&s=" + item.word + "';"
                                }]
                            }
                        });
                    }
                    break;
                }
                case "夸克": {
                    let json = request("https://news.myquark.cn/v2/toplist/movie?&channel=" + tabkey + "&rank_type=%E6%9C%80%E7%83%AD");
                    let xmlData = (JSON.parse(json).data || "").replace(/title>/g, "h_title>").replace(/src>/g, "h_src>").replace(/area>/g, "h_area>");
                    let list = pdfa(xmlData, "body&&item");
                    let trend = ["ㄧ", "↑", "↓"];
                    for (let i = 0; i < list.length; i++) {
                        let item = list[i];
                        let name = pdfh(item, "h_title&&Text");
                        let hotTrendIdx = parseInt(pdfh(item, "hot_trend&&Text")) || 0;
                        // 兼容 rhino 引擎无 .at() 的问题，使用 []
                        let des = "热度：" + pdfh(item, "hot_score&&Text") + " " + (trend[hotTrendIdx] || "") +
                            "\n评分：" + pdfh(item, "score_avg&&Text").replace(/^0$/, "暂无评分") +
                            "\n" + pdfh(item, "year&&Text") + "·" + pdfh(item, "h_area&&Text") + "·" + pdfh(item, "category&&Text").replace(",", "·");
                        sd.push({
                            title: getTitle(i, name),
                            url: $("").lazyRule((name, rule) => {
                                putMyVar("temsmode", "0");
                                return "hiker://search?rule=" + rule + "&s=" + name;
                            }, name, ruleTitle),
                            desc: des,
                            img: pdfh(item, "h_src&&Text"),
                            col_type: "movie_1_vertical_pic",
                            extra: {
                                cls: "hotitem",
                                id: "hotitem_" + pId + "_" + i,
                                longClick: [{
                                    title: "聚合搜索",
                                    js: "putMyVar('temsmode', '1');'hiker://search?rule=' + MY_RULE.title + '&s=" + name + "';"
                                }]
                            }
                        });
                    }
                    break;
                }
                case "360": {
                    let json = request(`https://api.web.360kan.com/v1/filter/list?catid=${tabkey}&size=20&rank=rankhot&pageno=1`, {
                        headers: { referer: "https://www.360kan.com/" }
                    });
                    let list = JSON.parse(json).data.movies;
                    for (let i = 0; i < list.length; i++) {
                        let item = list[i];
                        let name = item.title;
                        let total = item.total ? ` [${item.total}]` : "";
                        let des = item.pubdate ? "<small>更新时间:" + item.pubdate + "</small>" : (item.tag ? "<small>更新时间:" + item.tag + "</small>" : "");
                        let ac = item.actor ? "主演:" + (Array.isArray(item.actor) ? item.actor.slice(0, 5).join(" ") : item.actor) : "";
                        let dc = item.description ? "简介:" + item.description : (item.lasttitle ? "" + item.lasttitle + "" : "");
                        sd.push({
                            title: "““””"+getTitle(i, name) + total + "\n" + des,
                            desc: ac + "\n" + dc,
                            img: "https:" + item.cover,
                            col_type: "movie_1_vertical_pic",
                            url: $("").lazyRule((name, rule) => {
                                putMyVar("temsmode", "0");
                                return "hiker://search?rule=" + rule + "&s=" + name;
                            }, name, ruleTitle),
                            extra: {
                                cls: "hotitem",
                                id: "hotitem_" + pId + "_" + i,
                                longClick: [{
                                    title: "聚合搜索",
                                    js: "putMyVar('temsmode', '1');'hiker://search?rule=' + MY_RULE.title + '&s=" + name + "';"
                                }]
                            }
                        });
                    }
                    break;
                }
            }
        } catch (e) {
            console.error("加载热搜异常:", e);
            sd.push({ title: "加载热搜异常: " + e.message, col_type: "text_center_1", extra: { cls: "hotitem" } });
        }
        return sd;
    },

    
    /**
     * 核心渲染函数
     * @param {string} pId - 外部传入的 pageId (替代原 Date.now() + MY_RULE.title)
     * @param {number} pageNum - 外部传入的当前页码 (替代原 MY_PAGE)
     * @param {string} ruleTitle - 外部传入的当前规则标题 (替代原 MY_RULE.title)
     */
    render: function(pId, ruleTitle) {
        let d = [];
        let page = 1;
        let id = pId;

        let dataobj = storage0.getItem("dataobj", { "dataSource": "百度", "hotkey": "电视剧" });
        let selectsource = dataobj.dataSource;
        let selectkey = dataobj.hotkey;
        
        if (page == 1) {
            d.push({
                title: '<span style="color:#ff6601"><b>' + selectsource + selectkey + '热搜</b></span>',
                // 【完全还原】：短按切换分类，使用局部无感刷新
                url: $("#noLoading#").lazyRule((pId, ruleTitle) => {
                    const RecommendUI = $.require('./subpage/recommend.js');
                    let hotclass = RecommendUI.hotClass;
                    let dataobj = storage0.getItem("dataobj", { "dataSource": "百度", "hotkey": "电视剧" });
                    let hotkeys = Object.keys(hotclass[dataobj.dataSource]);
                    
                    return $(hotkeys, 1, "切换热搜").select((pId, ruleTitle) => {
                        let dataobj = storage0.getItem("dataobj", { "dataSource": "百度", "hotkey": "电视剧" });
                        dataobj["hotkey"] = input;
                        storage0.setItem("dataobj", dataobj);
                        
                        const RecommendUI = $.require('./subpage/recommend.js');
                        let sd = RecommendUI.getSd(pId, ruleTitle);
                        
                        deleteItemByCls("hotitem");
                        addItemAfter(pId + ":hotkey", sd);
                        updateItem(pId + ":hotkey", {
                            title: '<span style="color:#ff6601"><b>' + dataobj.dataSource + dataobj.hotkey + '热搜</b></span>'
                        });
                        return "toast://已切换为" + input;
                    }, pId, ruleTitle);
                }, pId, ruleTitle),
                
                // 【完全还原】：原始属性
                col_type: "avatar",
                pic_url: "hiker://images/icon_fire",
                extra: {
                    id: id + ":hotkey",
                    // 【完全还原】：长按切换数据源，使用局部无感刷新
                    longClick: [{
                        title: "切换数据源",
                        js: $.toString((pId, ruleTitle) => {
                            const RecommendUI = $.require('./subpage/recommend.js');
                            let dataSource = Object.keys(RecommendUI.hotClass);
                            
                            return $(dataSource, 1, "切换数据源").select((pId, ruleTitle) => {
                                const RecommendUI = $.require('./subpage/recommend.js');
                                let dataobj = storage0.getItem("dataobj", { "dataSource": "百度", "hotkey": "电视剧" });
                                dataobj["dataSource"] = input;
                                
                                let hotkeys = Object.keys(RecommendUI.hotClass[dataobj["dataSource"]]);
                                if (!RecommendUI.hotClass[input].hasOwnProperty(dataobj.hotkey)) {
                                    dataobj["hotkey"] = hotkeys[0];
                                }
                                storage0.setItem("dataobj", dataobj);
                                
                                let sd = RecommendUI.getSd(pId, ruleTitle);
                                
                                deleteItemByCls("hotitem");
                                addItemAfter(pId + ":hotkey", sd);
                                updateItem(pId + ":hotkey", {
                                    title: '<span style="color:#ff6601"><b>' + dataobj.dataSource + dataobj.hotkey + '热搜</b></span>'
                                });
                                return "toast://已切换为" + input;
                            }, pId, ruleTitle);
                        }, pId, ruleTitle)
                    }]
                }
            });
        }

        // 获取列表数据并合并，供主页面组装
        let sd = this.getSd(pId, ruleTitle);
        return d.concat(sd);
    }
};

$.exports = RecommendUI;