const PythonHiker = $.require("hiker://files/plugins/chaquopy/PythonHiker.js");



let moduleInstances = new Map();

function PyAdapter(source, pyurl, proxyUrl) {
    this.api = source.api;
    this.ext = source.ext || "";
    this.redirect = !!source.redirect;
    pyurl = pyurl.replace(/^(file\:\/\/)/, "");
    
    this.PySpider = PythonHiker.runPy(pyurl, source.key, true).callAttr("Spider");
    this.PySpider.put("_HikerProxyUrl", String(proxyUrl + "?do=js&hikerSkey=" + source.key))
    this.pyurl = pyurl;
    this.rule = {
        name: source.name,
        host: source.ext,
        一级: "true",
        推荐: "true",
        类型: "影视",
        //模板: "自动"
    };
}
Object.assign(PyAdapter.prototype, {
    init() {
        PythonHiker.callFunc(this.PySpider, "setExtendInfo", this.ext || "");
        let mo = [];
        try {
            let depence = PythonHiker.callFunc(this.PySpider, "getDependence");
            for (let de of depence) {
                let url = de;
                if (!url.startsWith("http")) {
                    url = this.pyurl.replace(/([^\/]*?)$/, de + ".py");
                }
                if (!moduleInstances.has(de)) {
                    moduleInstances.set(de, PythonHiker.runPy(url).callAttr("Spider"));
                }
                mo.push(moduleInstances.get(de))
            }
        } catch (e) {
            log("py依赖加载失败:" + e.toString());
        }

        PythonHiker.callFunc(this.PySpider, "init", mo);
    },
    homeVod() {
        return $.log(JSON.stringify(PythonHiker.callFunc(this.PySpider, "homeVideoContent") || {}));
    },
    home() {
        return JSON.stringify(PythonHiker.callFunc(this.PySpider, "homeContent", true));
    },
    category(tid, pg, filter, extend) {
        return JSON.stringify(PythonHiker.callFunc(this.PySpider, "categoryContent", tid, PythonHiker.toInt(pg), filter, PythonHiker.toPyJson(extend || {})));
    },
    detail(vod_url) {
        return JSON.stringify(PythonHiker.callFunc(this.PySpider, "detailContent", PythonHiker.toPyJson([vod_url])));
    },
    play(flag, id) {
        return JSON.stringify(PythonHiker.callFunc(this.PySpider, "playerContent", flag, id, PythonHiker.toPyJson([])));
    },
    search(wd, quick, pg) {
        return JSON.stringify(PythonHiker.callFunc(this.PySpider, "searchContent", wd, false, PythonHiker.toInt(pg)));
    },
    proxy(param) {
        return PythonHiker.callFunc(this.PySpider, "localProxy", param || {});
    },
    getRule(key) {
        return key ? this.rule[key] : this.rule;
    },
    runMain() {
        return "";
    }
});
$.exports = PyAdapter;