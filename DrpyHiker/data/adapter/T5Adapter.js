const NodeServerController = GM.defineModule('./src/javet/NodeServerController.js');
const runtimeConfig = GM.defineModule('./subpage/runtimeConfig.js');
const NanoServer = GM.defineModule('./src/server/NanoServer.js');
const TypeConverter = $.require("./src/utils/TypeConverter.js");

// Java 并发包，用于将异步 V8 转为同步阻塞
const CountDownLatch = java.util.concurrent.CountDownLatch;
const TimeUnit = java.util.concurrent.TimeUnit;

const Base64 = android.util.Base64;

/**
 * ====================================================
 * 构建全局环境变量 envMap
 * ====================================================
 * @param {String} siteKey 源的 key 或 解析器的 name
 * @param {Boolean} isProxyPath 是否启用特殊路径代理模式
 * @param {String} extendStr 扩展参数字符串
 * @returns {Object} 组装好的 envMap 字典
 */
function buildEnvMap(siteKey, isProxyPath, extendStr) {
    let envMap = {};
    let port = NanoServer.getPort();
    if (port === 0) port = NanoServer.start();

    let proxyBaseUrl = "http://127.0.0.1:" + port + "/proxy";
    let requestHost = "http://127.0.0.1:" + port;

    envMap["sitekey"] = siteKey;
    envMap["port"] = port;
    envMap["jsonUrl"] = requestHost + "/json/";
    envMap["publicUrl"] = requestHost + "/public/";
    envMap["requestHost"] = requestHost;

    if (isProxyPath) {
        envMap["proxyUrl"] = proxyBaseUrl + "/node/" + siteKey + "/?extend=" + (extendStr || "");
    } else {
        envMap["proxyUrl"] = proxyBaseUrl + "?do=node&siteKey=" + siteKey;
    }

    return envMap;
}

/**
 * ====================================================
 * 底层引擎执行与阻塞等待中心
 * ====================================================
 * 统一处理向 Node 单线程抛任务、传参转换、Promise 等待以及超时释放
 */
function runV8EngineTask(api, queryMap, envMap) {
    let latch = new CountDownLatch(1);
    let resultData = {};

    NodeServerController.submitTask(() => {
        try {
            let runtime = NodeServerController.getRuntime();
            let v8Func = runtime.getGlobalObject().get("getEngine");

            if (!v8Func || typeof v8Func.call !== 'function') {
                console.print(console.Level.e, "V8 环境中未找到全局函数 getEngine！", "node:T5");
                latch.countDown();
                return;
            }

            // 参数组装并穿透到 V8
            let args = TypeConverter.jsToJava([api, queryMap, envMap]);
            let v8Result = v8Func.call(null, args);

            let isPromise = v8Result && (typeof v8Result.isPromise === 'function' ? v8Result.isPromise() : NodeServerController.isPromise && NodeServerController.isPromise(v8Result));

            if (isPromise) {
                v8Result.register({
                    onFulfilled: function(v8Value) {
                        resultData = runtime.getConverter().toObject(v8Value);
                        latch.countDown();
                    },
                    onRejected: function(err) {
                        console.print(console.Level.e, "T5 规则执行拒绝(Reject): " + err, "node:T5");
                        latch.countDown();
                    },
                    onCatch(err){
                        console.print(console.Level.e, "T5 规则执行拒绝(Catch): " + err, "node:T5");
                        latch.countDown();
                    }
                });
            } else if (v8Result) {
                resultData = runtime.getConverter().toObject(v8Result);
                latch.countDown();
            } else {
                latch.countDown();
            }
        } catch (e) {
            console.print(console.Level.e, "T5 底层调用抛出异常: " + e, "node:T5");
            latch.countDown();
        }
    });

    try {
        latch.await(15, TimeUnit.SECONDS);
    } catch (e) {
        console.print(console.Level.e, "等待 T5 结果超时！", "node:T5");
    }

    return resultData;
}

/**
 * ====================================================
 * T5 影视源适配器构造函数
 * ====================================================
 */
function T5Adapter(source, proxyUrl) {
    this.TAG = "t5";
    this.source = source;
    // T5 的特征：api 字段通常是源的名字
    this.api = source.api || "";
    this.sourceKey = source.key;
    this.ext = typeof source.ext === 'object' ? JSON.stringify(source.ext) : (source.ext || "");
    this.proxyUrl = proxyUrl || "";

    this.queryMap = {};
    this.envMap = {};

    let otherConfig = runtimeConfig.getOtherConfig() || {};
    let localT5Path = otherConfig.localt5;

    if (localT5Path) {
        this.scriptPath = runtimeConfig.getAbsolutePath(localT5Path);
    } else {
        console.print(console.Level.e, "严重错误：当前配置文件的根节点缺少 localt5 字段！", "node:T5");
        this.scriptPath = "";
    }
    this.rule = {
        name: source.name,
        host: "hiker://empty",
        一级: "true",
        推荐: "true",
        类型: "影视",
    };
    this.init();
}

Object.assign(T5Adapter.prototype, {
    init: function() {
        if (!this.scriptPath) {
            console.print(console.Level.e, "T5 源核心脚本(localt5)路径为空，放弃初始化！", "node:T5");
            return;
        }

        try {
            let ddo = "ds";
            let refresh = false;
            let extendStr = this.ext;
            let isProxyPath = false;

            if (this.ext.startsWith("{")) {
                let json = JSON.parse(this.ext);
                extendStr = json.extend || "";
                ddo = json.do || "ds";
                refresh = !!json.refresh;
                isProxyPath = !!json.isProxyPath;
            }

            this.queryMap["do"] = ddo;
            if (refresh) this.queryMap["refresh"] = "";
            this.queryMap["extend"] = extendStr;


            this.envMap = buildEnvMap(this.sourceKey, isProxyPath, extendStr);
            console.log("envMap", this.envMap);

        } catch (e) {
            console.print(console.Level.e, "T5Adapter init 异常: " + e, "node:T5");
        }

        NodeServerController.startServer(this.scriptPath);
    },

    _callT5Engine: function(ac, params, noJson) {
        if (!NodeServerController.isRunning()) {
            console.print(console.Level.e, "T5 引擎未运行，操作已取消。", "node:T5");
            return noJson ? {} : "{}";
        }

        let queryMap = Object.assign({}, this.queryMap, {
            ac: ac
        }, params || {});
        let envMap = this.envMap;

        let resultData = runV8EngineTask(this.api, queryMap, envMap);

        if (!noJson) {
            return JSON.stringify(resultData || {});
        }
        return resultData;
    },

    homeVod: function() {
        return this._callT5Engine("home", {});
    },

    home: function() {
        let dataStr = this._callT5Engine("home", {});
        try {
            let data = JSON.parse(dataStr);
            this.source.类型 = data.class_name || data.type || "影视";
        } catch (e) {}
        return dataStr;
    },

    category: function(tid, pg, filter, extend) {
        return this._callT5Engine("category", {
            t: tid,
            pg: pg,
            filter: filter ? "true" : "false",
            ext: base64Encode(extend || "")
        });
    },

    detail: function(vod_url) {
        return this._callT5Engine("detail", {
            ids: [vod_url]
        });
    },

    play: function(flag, id) {
        return this._callT5Engine("play", {
            flag: flag,
            play: id,
            vipFlags: []
        });
    },

    search: function(wd, quick, pg) {
        return this._callT5Engine("search", {
            wd: wd,
            pg: pg
        });
    },

    proxy: function(param) {
        try {
            param = param || {};
            let proxyPathStr = param.proxyPath || param.url || "";
            this.envMap["proxyPath"] = proxyPathStr;

            delete param.url;
            delete param.proxyPath;
            delete param.mod;
            delete param.sourceKey;

            param.proxy = "proxy";

            let res = TypeConverter.javaToJs(this._callT5Engine("proxy", param, true));
            if (Array.isArray(res)) {
                return res;
            }
            return [500, "text/plain", "Node proxy return undefined"];
        } catch (e) {
            console.print(console.Level.e, "T5 Proxy 结果解析异常: " + e, "node:T5");
            return [500, "text/plain", e.toString()];
        }
    },
    executeParse(name, params) {
        let jsParams = TypeConverter.javaToJs(params) || {};
        let queryMap = Object.assign({}, jsParams);
        queryMap["parse"] = name;
        let resultData = this._callT5Engine("parse", queryMap, true);

        return TypeConverter.javaToJs(resultData);
    },
    action(actionId, value) {
        return JSON.parse(this._callT5Engine("action", {
            ac: actionId,
            action: actionId,
            value: value
        }));
    },
    getRule(key) {
        return key ? this.rule[key] : this.rule;
    },
    runMain() {
        return "";
    }


});
/*  
T5Adapter.executeParse = function(name, params) {
    let otherConfig = runtimeConfig.getOtherConfig() || {};
    let localT5Path = otherConfig.localt5;
    let scriptPath = localT5Path ? runtimeConfig.getAbsolutePath(localT5Path) : "";

    if (!scriptPath) {
        console.print(console.Level.e, "T5 源核心脚本(localt5)路径为空，无法执行解析！", "node:T5");
        return {};
    }

    NodeServerController.startServer(scriptPath);

    if (!NodeServerController.isRunning()) {
        console.print(console.Level.e, "T5 引擎未运行，解析操作已取消。", "node:T5");
        return {};
    }

    let jsParams = TypeConverter.javaToJs(params) || {};
    let queryMap = Object.assign({}, jsParams);
    queryMap["parse"] = name;
    
    
    let envMap = buildEnvMap(name, false, "");

    let resultData = runV8EngineTask(name, queryMap, envMap);

    return TypeConverter.javaToJs(resultData);
};
*/
$.exports = T5Adapter;