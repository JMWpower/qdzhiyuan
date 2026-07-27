const OpenMode=$.require("OpenModeEditor");
const ConfigManager = $.require('./subpage/ConfigManager.js');
function isofficial(url) {
    let flag = new RegExp('qq\.com|iqiyi\.com|youku\.com|mgtv\.com|bilibili\.com|sohu\.com|ixigua\.com|pptv\.com|miguvideo\.com|le\.com|1905\.com|fun\.tv');
    return flag.test(url);
}

function getDefaultFlag(url) {
    return String(String(url.split("/").at(2)).split(".").at(-2));
}

function assignAndDelete(target) {
    // 从第二个参数开始复制所有参数到一个新的数组
    var sources = Array.prototype.slice.call(arguments, 1);
    // 复制源对象的属性到目标对象
    sources.forEach(source => {
        for (let key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
    });
    // 删除源对象中值为 undefined 或 null 的属性
    sources.forEach(source => {
        for (let key in source) {
            if (source.hasOwnProperty(key) && (source[key] === undefined || source[key] === null)) {
                delete target[key];
            }
        }
    });
    return target;
}

function prepareParses(parses, url, playlist, isTest, flag) {
    const aliasMap = new Map([
        ['腾讯', new Set(['腾讯', '腾讯视频'])],
    ]);

    function getOriginalByAlias(key) {
        for (let [k, v] of aliasMap) {
            for (let it of v) {
                if (it instanceof RegExp) {
                    //正则表达;
                    if (it.test(key)) {
                        return k;
                    }
                } else {
                    //字符串;
                    if (it == key) {
                        return k;
                    }
                }
            }
        }
        return key; // 原始值
    }
    flag = getOriginalByAlias(flag) || flag;
    playlist = playlist || {
        urls: [],
        names: [],
        headers: [],
        is: "#isVideo=true#",
    };
    let Proxy = $.require("LocalProxy");
    let proxyUrl = Proxy.startProxy(MY_RULE.title, GM.getSelfKey());
    let each = (v, i) => {
        if (!isTest && (v.forbidden || !String(v.flag).split("|").includes(flag))) return;
        playlist.names.push(v.name);
        if (v.headers) {
            playlist.headers.push(v.headers);
        }
        if (v.runType === "JSON") {
            let param = {
                //url: v.url,
                method: v.method,
                headers: v.headers,
                jsonPath: v.jsonPath
            };
            playlist.urls.push(proxyUrl + "?runType=JSON&url=" + encodeURIComponent(base64Encode(v.url + url)) + "&param=" + encodeURIComponent(base64Encode(JSON.stringify(param))));
        } else if (v.runType === "JS") {
            playlist.urls.push(proxyUrl + "?runType=JS&url=" + encodeURIComponent(base64Encode(url)) + (isTest ? "&param=" + encodeURIComponent(base64Encode(JSON.stringify(v))) : "&index=" + i));
        } else {
            playlist.urls.push("video://" + v.url + url);
        }
    };
    parses.forEach(each);
    if (!playlist.urls.length) {
        flag = getDefaultFlag(url).replace("iqiyi", "qiyi");
        parses.forEach(each);
    }
    if (!playlist.urls.length) {
        if (isofficial(url) && (!url.includes(".m3u8") || url.includes(".mp4"))) {
            return "web://" + url;
        } else {
            return url;
        }
    }
    return JSON.stringify(playlist);
}

function useParses(url, flag, danmu) {
    let parses =[];
    if(ConfigManager.getGlobal("useConfigParse")){
        parses=getConfigParse();
    }else{
        parses=$.require("configs").getJson();
    }
    if (!parses.length) return "web://" + url;
    let playlist = {
        urls: [],
        names: [],
        headers: [],
        is: "#isVideo=true#",
    };
    try {
        let useDanmu = ConfigManager.getGlobal("useDanmu");
        if (danmu) {
            playlist.danmu = danmu;
        } else if (useDanmu) {
            playlist.danmu = $.require('dmFun?rule=dm盒子').dmRoute(url);
        }
    } catch {}
    flag = String(flag).replace(/\s/g, "");
    return prepareParses(parses, url, playlist, false, flag);
}

function getConfigParse() {
    const runtimeConfig = GM.defineModule("runtimeConfig");
    let parses = (runtimeConfig.getOtherConfig() || {}).parses || [];
    let hikerParses = [];
    for (let jxItem of parses) {
        let ext=jxItem.ext||{};
        hikerParses.push({
            "name": jxItem.name,
            "url": jxItem.url,
            "flag": Array.isArray(ext.flag)?ext.flag.join("|"):"qiyi|imgo|爱奇艺|奇艺|qq|qq 预告及花絮|腾讯|youku|优酷|pptv|PPTV|letv|乐视|leshi|mgtv|芒果|sohu|xigua|fun|风行",
            "headers":ext.headers||{},
            "runType": jxItem.type==0?"WEB":"JSON",
            "method": "GET",
            "jsonPath": "url"
        });
    }
    return hikerParses;
}

function carryJs(play, obj) {
    var extra = {
        "ua": MOBILE_UA
    }
    let id = obj.key;
    let parse = play;
    let parse_obj = {
        defRules: ["*.mp4", "*.m3u8"],
        exclueRule: ["?url="],
    };
    if (parse.hasOwnProperty("parse_extra")) {
        let parse_extra = decodeURIComponent(parse.parse_extra);
        parse_obj = Object.assign(parse_obj, parseQuery(parse_extra));
        if (parse_obj.hasOwnProperty("init_script")) {
            parse_obj["init_script"] = base64Decode(parse_obj["init_script"]);
        }
    }
    if (parse_obj.hasOwnProperty("is_pc") && parse_obj["is_pc"] == "1") {
        extra["ua"] = PC_UA;
    }
    if (parse.hasOwnProperty("header")) {
        extra["ua"] = parse["header"]["User-Agent"];
        extra["referer"] = parse["header"]["Referer"];
        //extra["redirect"]=false;
        /*extra["js"] = $.toString((js) => {
          eval(js)
          fba.log(navigator.userAgent)
          fba.log(location.href)
        }, $.toString(() => {
          Object.defineProperty(navigator, 'userAgent', {
            get: function () {
              return 'My-Custom-UA-String';
            }
          });
        }))*/
    }
    extra["videoRules"] = parse_obj["defRules"];
    if (parse_obj.hasOwnProperty("custom_regex")) {
        let current = []; //parse_obj["defRules"];
        extra["videoRules"] = current.concat(parse_obj.custom_regex.split(/\|/g).filter(e => e));
    }
    if (parse_obj.hasOwnProperty("sniffer_exclude")) {
        let current = []; //parse_obj["exclueRule"];
        extra["videoExcludeRules"] = current.concat(parse_obj.sniffer_exclude.split(/\|/g).filter(e => e))
    }

    if (parse.hasOwnProperty("click")) {
        parse["js"] = parse.click;
    }

    let rules = assignAndDelete({}, extra, {
        ua: null,
        referer: null,
        videoRule: extra.videoRule,
        videoExcludeRules: extra.videoExcludeRules || parse_obj["exclueRule"],
    })

    //log(rules)
    //if (parse.hasOwnProperty("js") && parse.js != "") {
    let ruleTitle = obj.ruleTitle || MY_RULE.title;

    extra["js"] = $.toString((js, parse, t, islog) => {
        try {
            let methods = $$$.require("hiker://page/videoConfig?rule=" + t);
            return methods.vs(js, parse, t, islog);
        } catch (e) {
            fba.log(JSON.stringify(e.message))
        }
    }, parse.js, rules, ruleTitle, ConfigManager.getGlobal("videolog") ? true : false)
    //}

    try {
        let cls = findItemsByCls("playlist@" + id);
        //log(cls.length)
        cls.forEach(item => {
            if (!item.extra.hasOwnProperty("up") || !extra.up) {
                extra["up"] = true;
                updateItem(item.extra.id, {
                    extra: Object.assign({}, item.extra, extra)
                });
            }
        })
    } catch (e) {}
    //log(extra)
    return {};
    return extra;
}
$.exports.carryjs = carryJs;

function parseQuery(query) {
    var obj = {};
    query.split("&").filter(e => e).forEach(function(item) {
        var parts = item.split("=");
        obj[parts[0]] = parts[1];
    });
    return obj;
}
$.exports.pushAgent = function(url) {
    let runtimeConfig = GM.defineModule("runtimeConfig");
    if (!runtimeConfig.findSource("push_agent")) return;
    return buildUrl("hiker://page/detailed#immersiveTheme#", {
        vodId: encodeURIComponent(String(url)),
        skey: encodeURIComponent("push_agent"),
    });

}
$.exports.parsePush = function(url, nopush) {
    if (url.startsWith("push://")) {
        url = url.replace("push://", "");

        if (ConfigManager.getGlobal("pushProxy") && !nopush) {
            let res = $.exports.pushAgent(url);
            if (res) return res;
        }
    }
    let curl;
    if((curl=OpenMode.matchOpenMode(url))) return curl;
    return nopush ? null : "hiker://page/detailed#immersiveTheme#";
}

function getRealUrl(url) {
    if (url.startsWith("http://127.0.0.1:5575/proxy")) {
        let threads = Number(getParam("thread", "", url)) || 8;
        let turl = decodeURIComponent(getParam("url", "", url));
        if (turl) {
            url = turl + `#fastPlayMode##threads=${threads}#`
        }
    }
    return url;
}
$.exports.parse = function(input, _, source) {
    let drpy;
    originamyurl = MY_URL;
    MY_URL = module.id;
    let ruleTitle = getParam("rule");
    MY_URL = originamyurl;
    if (source.hasOwnProperty("getRule")) {
        drpy = source;
        source = drpy.source;
    } else {
        drpy = GM.defineModule("DrpyManage").getBySource(source);
    }

    input = input.split("#");
    if (input[0].startsWith("magnet")) {
        return input[0];
    }
    let splay;
    if (input[0].startsWith("push://")) {
        splay = {
            url: input[0]
        };
    } else {
        splay = JSON.parse(drpy.play(input[1], input[0].replace("tvbox-xg:", ""), [])||"{}");
    }
    //log("splay")
    //log(splay)

    let play = splay;

    let mark = drpy.getRule("类型") === "听书" || (drpy.getRule("title") && drpy.getRule("title").includes("[听]")) ? "#isMusic=true#" : "#isVideo=true#";
    if (typeof play !== "object" || !play.url) {
        play = {
            url: input[0],
            parse: 1
        };
        if (!play.url.startsWith("http")) {
            return "toast://连接为空";
        }
    }
    play = Object.assign(play, splay);
    let originalUrl = play.url;
    //log(play)
    if (typeof play.url == "object" && !Array.isArray(play.url)) {
        return JSON.stringify(play.url);
    }
    play.url = String(play.url);
    if ((play.url.includes("proxy?do") || play.url.includes("proxy?hikerSkey")) && ["drive.uc.cn", "pan.quark.cn", "www.aliyundrive.com"].some(v => play.url.includes(v))) {
        MY_URL = play.url;
        play.url = decodeURIComponent(getParam("url", ""));
    }

    if (play.url.startsWith("push://")) {
        play.url = play.url.replace("push://", "");
        let runtimeConfig = GM.defineModule("runtimeConfig");
        if (ConfigManager.getGlobal("pushProxy") && runtimeConfig.findSource("push_agent")) {
            let currentActivity = getCurrentActivity();
            const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
            hikerPop.runOnNewThread(() => {
                java.lang.Thread.sleep(100);
                currentActivity.finish();
            });
            return buildUrl("hiker://page/detailed#immersiveTheme#", {
                vodId: encodeURIComponent(String(play.url)),
                skey: encodeURIComponent("push_agent"),
            });
        }
    }
    let curl;
    if((curl=OpenMode.matchOpenMode(play.url))) return curl;
    if (play.url.startsWith("pics://") || play.url.startsWith("magnet:") || play.url.startsWith("thunder://")) {
        return play.url;
    }
    if (play.url.startsWith("ftp://a.gbl.114s.com:")) {
        let JianPianProxy = GM.defineModule("./src/videoProxy/JianPianProxy.js");
        JianPianProxy.release();
        return JianPianProxy.play(play.url) + "#isVideo=true#";
    }
    
    //适配dash格式播放链接
    if (play.url.startsWith("data:application/dash+xml;base64")) {
        let mpd = window0.atob(play.url.split(";base64,")[1]);
        if (!mpd.includes("BaseURL")) return "toast://连接为空，请重试";
        let mpdPath = getPath("hiker://files/_cache/dash.mpd");
        writeFile(mpdPath.replace("file://", ""), mpd);
        return mpdPath + '#isVideo=true#';
    }
    //油管视频解析
    let YouTubeProxy = GM.defineModule("./src/videoProxy/YouTubeProxy.js");
    if (YouTubeProxy.match(play.url)) {
        try {
            let dash = String(YouTubeProxy.fetch(play.url));
            if (dash.startsWith("data:application/dash+xml;base64")) {
                let mpd = window0.atob(dash.split(";base64,")[1]);
                if (!mpd.includes("BaseURL")) return "toast://连接为空，请重试";
                let mpdPath = getPath("hiker://files/_cache/youtube.mpd");
                writeFile(mpdPath.replace("file://", ""), mpd);
                return mpdPath + '#isVideo=true#';
            }
            return dash;
        } catch (e) {
            log('油管代理错误:' + e.message);
            return "toast://遇到错误，请重试";
        }
    }
    
    if (play.url.startsWith("novel://")) {
        return $("hiker://empty#readTheme#").rule((data) => {
            let data = JSON.parse(data);
            let layout = [];
            let content = "　　" + data.content.split(/(\n|\r)+/).filter(it => it.trim().length > 1).map(it => it.trim()).join("<br>　　");
            layout.push({
                col_type: "rich_text",
                title: ("<strong>" + data.title + "</strong>").big(),
            });

            layout.push({
                title: content,
                col_type: 'rich_text',
                extra: {
                    textSize: 18,
                    click: true
                }
            });
            setResult(layout);
        }, play.url.replace("novel://", ""));
    }
    if (play.parse === 1 || play.jx === 1) {
        carryJs(play, {
            key: source.key,
            ruleTitle: ruleTitle
        });
        //id && carryJs(play, id);
        if (play.jx === 1 || (isofficial(play.url) && (play.flag || input[1]))) {
            return useParses(play.url, play.flag || input[1], play.danmaku);
        }
        return "video://" + play.url;

    } else if (play.parse === 0) {
        var playobj = {};
        play.url = originalUrl;
        playobj.is = mark;
        if (typeof play.header === "string") {
            try {
                play.header = JSON.parse(play.header);
            } catch (e) {

            }
        }
        if (Array.isArray(play.url)) {
            playobj.urls = [];
            playobj.names = [];
            play.url.forEach((v, i) => (i % 2 ? playobj.urls.push(getRealUrl(v)) : playobj.names.push(v)));
            if (play.hasOwnProperty("header")) {
                playobj.headers = new Array(playobj.urls.length).fill(play.header);
            }

        } else {
            playobj.urls = [getRealUrl(play.url) + mark];
            if (play.hasOwnProperty("header")) {
                playobj["headers"] = [play.header];
            }
        }

        if (play.hasOwnProperty("danmaku")) {
            playobj["danmu"] = play.danmaku;
        }
        playobj["lyric"] = play.lyric;
        return JSON.stringify(playobj);
    } else {
        return play.url;
    }
}
$.exports.prepareParses = prepareParses;