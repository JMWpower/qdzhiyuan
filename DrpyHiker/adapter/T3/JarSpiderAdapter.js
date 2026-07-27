const runtimeConfig = GM.defineModule("runtimeConfig");



/**
 * 将 JSON 数据转换为 Java 的 List 和 HashMap
 * @param {string|object} input - JSON 字符串或 JavaScript 对象
 * @returns {java.util.List|java.util.HashMap|object} - 转换后的 Java 集合或基本类型
 */
function jsonToJava(obj) {
    // 处理 null 或 undefined
    if (obj === null || obj === undefined) {
        return null;
    }

    // 处理数组 -> Java ArrayList
    if (Array.isArray(obj)) {
        var list = new java.util.ArrayList();
        for (var i = 0; i < obj.length; i++) {
            list.add(jsonToJava(obj[i])); // 递归转换元素
        }
        return list;
    }

    // 处理普通对象 -> Java HashMap
    if (typeof obj === 'object') {
        var map = new java.util.HashMap();
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                map.put(key, jsonToJava(obj[key])); // 递归转换属性值
            }
        }
        return map;
    }

    // 基本类型（字符串、数字、布尔）直接返回，Rhino 会自动适配为对应的 Java 类型
    return obj;
}

function JarSpiderAdapter(source, jarLoad) {
    this.api = source.api;
    this.ext = (typeof source.ext == "object" ? JSON.stringify(source.ext) : source.ext) || ""

    if (this.ext.startsWith("./") || this.ext.startsWith("../")) {
        this.ext = runtimeConfig.getAbsolutePath(this.ext);
    }

    if (this.ext.endsWith(".json")) {
        try {
            let jsons = fetch(this.ext, {
                headers: {
                    "User-Agent": "okhttp/4.12.0"
                }
            });
            let cjson = toCorrectJSONString(jsons);
            this.ext = (cjson == "null" ? jsons : cjson) || this.ext;
        } catch (e) {}
    }
    //console.log(this.ext)
    this.spider = jarLoad.getSpider(source.key, this.api, this.ext, runtimeConfig.getAbsolutePath(source.jar || runtimeConfig.getOtherConfig().spider));


    this.rule = {
        name: source.name,
        host: "hiker://empty",
        一级: "true",
        推荐: "true",
        类型: "影视",
        //模板: "自动"
    };

}
Object.assign(JarSpiderAdapter.prototype, {
    init() {},
    homeVod() {
        return String(this.spider.homeVideoContent() || {});
    },
    home() {
        try {
            let data = this.spider.homeContent(true);
            this.rule.类型 = data.type || "影视";
            //console.log(data)
            return String(data);
        } catch (e) {
            console.error("Jar:home:", e);
        }
    },
    category(tid, pg, filter, extend) {
        return String(this.spider.categoryContent(tid, pg, !filter, jsonToJava(extend || {})));
    },
    detail(vod_url) {
        try {
            return String(this.spider.detailContent(jsonToJava([vod_url])));
        } catch (e) {
            console.error(e);
        }
    },
    play(flag, id) {
        return String(this.spider.playerContent(flag, id, jsonToJava([])));
    },
    search(wd, quick, pg) {
        return String(this.spider.searchContent(wd, false, pg));
    },
    proxy(param) {
        return this.spider("proxyLocal", jsonToJava(param || {}));
    },
    action(actionId, value) {
        if (typeof this.spider.action == "function") {
            return String(this.spider.action(actionId));
        } else {
            return "";
        }
    },
    getRule(key) {
        return key ? this.rule[key] : this.rule;
    },
    runMain() {
        return "";
    }
});
$.exports = JarSpiderAdapter;