const ConfigManager = $.require('./subpage/ConfigManager.js');

const PythonHiker = $.require(ConfigManager.pyPlug);
const runtimeConfig = GM.defineModule("runtimeConfig");



let moduleInstances = new Map();

function extractFileHeaderComment(source) {
    // 正则表达式解释：
    // ^          - 从字符串绝对开头开始
    // (['"]{3})  - 捕获三个单引号或双引号（第一组）
    // \*\*       - 匹配两个星号
    // [\s\S]*?   - 非贪婪匹配任意字符（包括换行）
    // \1         - 必须与开头引号类型相同
    const pattern = /^(['"]{3})\*\*([\s\S]*?)\1/;
    const match = source.match(pattern);
    return match ? match[2] : null;
}

function PyAdapter(source, proxyUrl) {

    this.api = source.api;
    this.ext = source.ext || "";
    let pyurl = runtimeConfig.getAbsolutePath(source.api);
    if (typeof source.ext == "object") {
        this.ext = JSON.stringify(source.ext);
    }
    this.redirect = !!source.redirect;
    if (pyurl.startsWith("file://")) {
        try {
            let head = extractFileHeaderComment(fetch(pyurl).trim()) || "";

            if (!head.startsWith("{")) head = "{" + head + "}";

            head = eval("(" + head + ")");

            this.ext = (typeof head.ext === "string" ? head.ext : JSON.stringify(head.ext)) || this.ext;
            this.api = head.api || this.api;
        } catch (e) {
            console.log(e.toString())
        }
        pyurl = pyurl.replace(/^(file\:\/\/)/, "");
    }
    this.PySpider = PythonHiker.runPy(pyurl, source.key, true).callAttr("Spider");
    this.PySpider.put("_HikerProxyUrl", String(proxyUrl + "?do=js&hikerSkey=" + source.key));
    this.pyurl = pyurl;
    this.rule = {
        name: source.name,
        host: "hiker://empty",
        一级: "true",
        推荐: "true",
        类型: "影视",
        //模板: "自动"
    };

}
Object.assign(PyAdapter.prototype, {
    init() {
        PythonHiker.callSyncFunc(this.PySpider, "setExtendInfo", this.ext || "");
        let mo = [];
        let loaddep = false;
        try {
            let depence = PythonHiker.callSyncFunc(this.PySpider, "getDependence");

            for (let de of depence) {
                loaddep = true;
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

        PythonHiker.callSyncFunc(this.PySpider, "init", loaddep ? mo : this.ext);
    },
    homeVod() {
        return JSON.stringify(PythonHiker.callSyncFunc(this.PySpider, "homeVideoContent") || {});
        
    },
    home() {
        let data = PythonHiker.callSyncFunc(this.PySpider, "homeContent", true);
        this.rule.类型 = data.type || "影视";
        return JSON.stringify(data);
    },
    category(tid, pg, filter, extend) {
        return JSON.stringify(PythonHiker.callSyncFunc(this.PySpider, "categoryContent", tid, PythonHiker.toInt(pg), filter, PythonHiker.toPyJson(extend || {})));
    },
    detail(vod_url) {
        return JSON.stringify(PythonHiker.callSyncFunc(this.PySpider, "detailContent", PythonHiker.toPyJson([vod_url])));
    },
    play(flag, id) {
        return JSON.stringify(PythonHiker.callSyncFunc(this.PySpider, "playerContent", flag, id, PythonHiker.toPyJson([])));
    },
    search(wd, quick, pg) {
        return JSON.stringify(PythonHiker.callSyncFunc(this.PySpider, "searchContent", wd, false, PythonHiker.toInt(pg)));
    },
    proxy(param) {
        return PythonHiker.callSyncFunc(this.PySpider, "localProxy", param || {});
    },
    action(actionId, value) {
        return JSON.stringify(PythonHiker.callSyncFunc(this.PySpider, "action", actionId, value));
    },
    getRule(key) {
        return key ? this.rule[key] : this.rule;
    },
    runMain() {
        return "";
    }
});
$.exports = PyAdapter;