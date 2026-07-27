function _buildUrl(url, o) {
    let oo = {};
    for (let key in o) {
        oo[key] = encodeURIComponent(typeof o[key]==="object"?JSON.stringify(o[key]):o[key]);
    }
    return buildUrl(url, oo);
}

function T4Adapter(source) {
    this.api = source.api;
    this.TAG = "T4Adapter";
    this.ext = source.ext || "";
    this.rule = {
        name: source.name,
        host: "hiker://empty",
        一级: "true",
        推荐: "true",
        类型: "影视",
        //模板: "自动"
    };
    this.cacheClass = null;
    this.vodCount = 0;
}
Object.assign(T4Adapter.prototype, {
    init() {
        this.cacheClass = null;
        let data = this.getHomeData();
        this.rule.类型 = data.type || "影视";
        this.rule.hikerClassListCol = data.hikerClassListCol;
        this.rule.hikerListCol = data.hikerListCol;
        if(data.hikerSkipEr){
            this.rule.二级="*";
        }
        if (Array.isArray(data.list) && data.list.length === 1 && data.list[0].vod_name === "测试") {
            delete this.rule.推荐;
            data.list = [];
        }
    },
    getHomeData() {
        if (this.cacheClass) return this.cacheClass;
        let home = JSON.parse(fetch(_buildUrl(this.api, {
            extend: this.ext,
            filter: "true"
        }), {
            headers: {
                "User-Agent": "okhttp/4.12.0"
            }
        }));
        this.cacheClass = home;

        return home;
    },
    homeVod() {
        /*if(this.vodCount){
            this.init();
        }*/
        let data = this.getHomeData();
        return JSON.stringify({
            list: data.list || []
        });
        this.vodCount++;
    },
    home() {
        return JSON.stringify(this.getHomeData());
    },
    category(tid, pg, filter, extend) {
        return fetch(_buildUrl(this.api, {
            ac: getParam("platform", "", this.api) ? "detail" : "videolist",
            t: tid,
            pg: "" + pg,
            extend: this.ext,
            ext: extend ? base64Encode(JSON.stringify(extend)) : ""
        }), {
            headers: {
                "User-Agent": "okhttp/4.12.0"
            }
        });
    },
    detail(vod_url) {
        return fetch(_buildUrl(this.api, {
            ac: "detail",
            ids: vod_url,
            extend: this.ext,
        }), {
            headers: {
                "User-Agent": "okhttp/4.12.0"
            }
        });
    },
    play(flag, id) {
        return fetch(_buildUrl(this.api, {
            //ac: "detail",
            flag: flag,
            play: id,
            extend: this.ext
        }), {
            headers: {
                "User-Agent": "okhttp/4.12.0"
            }
        });
    },
    getPlayApi() {
        return _buildUrl(this.api, {
            extend: this.ext
        });
    },
    search(wd, quick, pg) {
        return fetch(_buildUrl(this.api, {
            wd: wd,
            extend: this.ext,
            pg: pg
        }), {
            headers: {
                "User-Agent": "okhttp/4.12.0"
            }
        });
    },
    action(actionId, value, timeout) {
        return fetch(_buildUrl(this.api, {
            ac: "action",
            action: actionId,
            value: value
        }), {
            timeout: (timeout || 15) * 1000,
            headers: {
                "User-Agent": "okhttp/4.12.0"
            }
        });
    },
    getRule(key) {
        return key ? this.rule[key] : this.rule;
    },
    runMain() {
        return "";
    }
});
$.exports = T4Adapter;