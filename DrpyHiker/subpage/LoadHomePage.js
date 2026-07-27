const ConfigManager = $.require('./subpage/ConfigManager.js');

function loadHome(d, list, source, pageConfig, vkey) {
    let {homeListCol,mark, skipEr, longPressActions}=Object.assign({
        homeListCol: ConfigManager.getGlobal("homeListCol") || "movie_3_marquee",
        mark:"",
        skipEr:true,
        longPressActions:[]
    }, pageConfig)
    let url = "hiker://page/detailed" + mark;
    let tag;
    if (list.length) {
        for (let [ix, it] of list.entries()) {
            let id = it.vod_id ? String(it.vod_id) : "msearch:";
            let cid;
            let name = it.vod_name;
            let extra = {
                img: it.vod_pic,
                vodId: id,
                cls: "playlist@" + source.key,
                sname: source.name,
                skey: source.key,
                id: "type_" + id,
                longClick: [{
                    title: "聚合搜索",
                    js: "putMyVar('temsmode', '1');'hiker://search?rule=' + MY_RULE.title + '&s=" + name + "';"
                }, {
                    title: "推送",
                    js: $.toString((source, id) => {
                        $.require("TvPushPop").show(source, id);
                        return "hiker://empty";
                    }, source, id)
                }]
            }
            if (MY_RULE.title.includes("Test") && id.startsWith("http")) {
                extra.longClick.push({
                    title: "查看",
                    js: $.toString((id) => {
                        return "hiker://debug?url=" + (id.includes("@@") ? id.split("@@")[0] : id);
                    }, id)
                });
            }
            for(let action of longPressActions){
                extra.longClick.push({
                    title: action,
                    js: $.toString((action, value) => {
                        return $.require("action").checkOptions2(action, "", value);
                    }, action,name+"$"+id)
                });
            }
            tag = it.vod_tag;
            if (tag == "folder") {
                // 使用模块管理 tempcate
                url = $('#noLoading#').lazyRule((name, id, vkey) => {
                    const mod = GM.defineModule('categorys');
                    mod.addTempcate(vkey, name, id);
                    refreshPage(false);
                    return "hiker://empty";
                }, name, id, vkey)
            } else if (tag === "action") {
                url = $("#noLoading#").lazyRule((id) => {
                    return $.require("action").checkOptions(id);
                }, id);
            } else if (id === "no_data") {
                url = "toast://没有数据";
            } else if (typeof id === "string" && id.includes("msearch:") || id == undefined) {
                url = $("").lazyRule((name) => {
                    putMyVar("temsmode", "1");
                    return "hiker://search?rule=" + MY_RULE.title + "&s=" + name;
                }, name);
            }else if(it.action){
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
                extra["id"] = id;
            } else if (skipEr) {
                url = $().lazyRule((source, id) => {
                    let url;
                    try {
                        let DrpyManage = GM.defineModule("DrpyManage");
                        let drpy = DrpyManage.getBySource(source);
                        let list=JSON.parse(drpy.detail(id)).list;
                        url = list[0].vod_play_url.split("$")[1]||list[0].vod_play_url;
                    } catch (e) {
                        url = id.split("@@")[0];
                    }
                    return $.require("videoUrl").parse(url, id, source);
                }, source, id);
                extra["id"] = id;
            } else if (id.startsWith("push://")) {
                url = $("#noLoading#").lazyRule((id) => {
                    return $.require("videoUrl").parsePush(id);
                }, id);
            } else {
                url = "hiker://page/detailed" + mark;
            }
            d.push({
                title: name,
                desc: it.vod_remarks,
                url: url,
                img: it.vod_pic || name,
                col_type: homeListCol,
                extra: extra
            });
        }
    }
}
$.exports.loadHome = loadHome;