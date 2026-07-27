const runtimeConfig = GM.defineModule("runtimeConfig");
const ConfigManager = $.require('./subpage/ConfigManager.js');
const drpyMap = new Map();
const GMkey = module.importParam;
//log("初始化DrpyManage");
const proxySemaphore = new java.util.concurrent.Semaphore(4);
const DrpyAdapter = $.require("DrpyAdapter");
const AdapterConfig = $.require("AdapterConfig");

const Proxy = $.require("LocalProxy");
let jarLoad;

function getJarLoad() {
    if (!jarLoad) {
        const JarLoad = $.require("./subpage/JarLoad.js");
        jarLoad = new JarLoad();
    }
    return jarLoad;

}

function sync(func, sp) {
    return new org.mozilla.javascript.Synchronizer(func, sp || {});
}

function createDrpy2T3(source) {
    let drpy = new DrpyAdapter(source, drpyMap, GMkey);
    drpy.init(runtimeConfig.getAbsolutePath(source.ext));
    try {
        if (drpy.getRule("proxy_rule")) {
            let Proxy = $.require("LocalProxy");
            let proxyUrl = Proxy.startProxy(MY_RULE.title, GM.getSelfKey());
            putMyVar("Proxy_Url", proxyUrl);
        }
    } catch (e) {}
    return drpy;
}

function createNewDrpy(source) {
    source = JSON.parse(JSON.stringify(source));

    if (ConfigManager.getGlobal("useJar") && String(source.api).startsWith("csp_") && (source.jar || runtimeConfig.getOtherConfig().spider)) {
        try {
            let JarSpiderAdapter = AdapterConfig.getJarAdapter();
            let adapter = new JarSpiderAdapter(source, getJarLoad());
            drpyMap.set(source.key, adapter);
            return adapter;
        } catch (e) {
            console.error("jar缺少相关爬虫，降级到适配器", e);
        }
    }
    let Adapter = AdapterConfig.findAdapter(source);
    if (Adapter) {
        let proxyUrl = Proxy.startProxy(MY_RULE.title, GM.getSelfKey());
        let adapter = new Adapter(source, proxyUrl);
        adapter.init(source.ext);
        drpyMap.set(source.key, adapter);
        return adapter;
    } else {
        throw new Error(`源<${source.name}>缺少相应适配器支持。`);
    }
}

function get(key) {
    return sync(() => {
        //log(drpyMap.size)
        if (drpyMap.has(key)) {
            return drpyMap.get(key);
        }
        if (drpyMap.size >= 5) {
            //log("请求:" + key)
            del(Array.from(drpyMap.keys()).at(0));
        }
        let source = runtimeConfig.getAllSources().find(v => v.key === key);
        let drpy = createNewDrpy(source);
        return drpy;
    }, this).call();
}

function has(key) {
    if (drpyMap.has(key)) {
        return drpyMap.get(key);
    } else {
        return null;
    }
}

//source.ext必须为绝对路径
function getBySource(source) {
    return sync(() => {
        let key = source.key;
        //log(drpyMap.size)
        if (drpyMap.has(key)) {
            return drpyMap.get(key);
        }
        if (drpyMap.size >= 5) {
            log("请求:" + key)
            del(Array.from(drpyMap.keys()).at(0));
        }
        let drpy = createNewDrpy(source);
        return drpy;
    }, this).call();
}

function put(key, drpy) {
    sync(() => drpyMap.set(key, drpy), this).call();
}

function runProxy(drpy, args) {
    if (typeof drpy.proxy === "function") {
        try {
            //let time1 = Date.now();
            proxySemaphore.acquire();
            //let time2 = Date.now();
            //log("1等待时间:" + (time2 - time1) + "ms");
            let res = drpy.proxy.apply(drpy, args);
            //let time3 = Date.now();
            //log("2执行代理耗时:" + (time3 - time2) + "ms");
            //log("3总耗时耗时:" + (time3 - time1) + "ms");

            return res;
        } finally {
            proxySemaphore.release();
        }
    }
}

function del(key) {
    sync(() => {
        //log("删除" + key);
        if (drpyMap.has(key)) {
            let drpy = drpyMap.get(key);
            if (typeof drpy.close == "function") drpy.close();
            drpyMap.delete(key);
        }
    }, this).call();
}
let isInitHome = false;
//let isInitSearch = false;
let isInitErPage = false;
//还没想好.
let closeEvents = [];

function initPage(type) {
    switch (type) {
        case "home":
            isInitHome = true;
            //case "search":
            //    isInitSearch = true;
        case "er":
            isIniterPage = true;
    }
    addListener("onClose", $.toString((GMkey, type) => {
        //log("onClose");
        GM.has("JianPianProxy", JianPianProxy => {
            JianPianProxy.release();
        });
        GM.has(GMkey, DrpyManage => {
            //log("有GMkey");
            //log(type)
            DrpyManage.clearByType(type);

            DrpyManage.getCloseEvents().forEach(v => {
                try {
                    v();
                } catch (e) {}
            });
        });

    }, GMkey, type));
}

function clearByType(type) {
    switch (type) {
        case "home":
            isInitHome = false;
            //case "search":
            //    isInitSearch = false;
        case "er":
            isIniterPage = false;
    }

    if (!isInitHome && !isInitErPage) {
        //log("开始清理");
        for (let [k, drpy] of drpyMap) {
            if (typeof drpy.close == "function") drpy.close();
        }
        drpyMap.clear();
        //GM.clear(GMkey);
        //runtimeConfig.clearNodejs();
        GM.clearAllAndClose();
    }
}

function clear() {
    sync(() => {
        drpyMap.clear();
        jarLoad&&jarLoad.clear();
    }, this).call();
}
let publicDrpyKey = String(Date.now());
let publicDrpyMark = void 0;

function getPublicDrpy(mark) {
    if (!mark) throw new Error("No mark");
    let omark = publicDrpyMark;
    publicDrpyMark = mark;
    if (drpyMap.has(publicDrpyKey)) {

        return [drpyMap.get(publicDrpyKey), omark];
    }
    createDrpy(publicDrpyKey);
    return [drpyMap.get(publicDrpyKey), omark];
}

function getCloseEvents() {
    return closeEvents;
}
$.exports = {
    getPublicDrpy,
    initPage,
    has,
    get,
    getBySource,
    del,
    clear,
    put,
    runProxy,
    clearByType,
    getCloseEvents
}