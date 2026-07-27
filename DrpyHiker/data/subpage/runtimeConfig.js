const searchAllowPath = "hiker://files/rules/DrpyHiker/searchAllow.json";
const configCache = "hiker://files/rules/DrpyHiker/configCache";
const AdapterConfig = $.require("AdapterConfig");
const ConfigManager = GM.defineModule("./subpage/ConfigManager.js");
let catIndex = getPath(configCache + "/cat/index.js").slice(7);
let isPrepare = false;
let configs, currentConfig = {},
    otherConfig = {},
    sourceList, currentSource, searchAllow = [];
let nodeCache = {};
let tagClasses;
let sTag = "";
let loadError;
let adapted = AdapterConfig.getT3Types();
let supportType = [0, 1, 4];

if (ConfigManager.checkT5Environment()) {
    supportType.push(5);
} else {
    console.log("T5 环境未就绪，已静默过滤 type: 5 源");
}
if (!ConfigManager.checkPYEnvironment()) {
    adapted = adapted.filter(v => !v.includes(".py"));
}

function getSourceType(source) {
    let t = Number(source.type);
    let api = String(source.api);
    switch (t) {
        case 0:
            return "xmlcms";
        case 1:
            return "cms";
        case 3:
            if (api.includes("drpy2.min.js") || api.includes("drpy2.js")) {
                return "drpy";
            } else if (adapted.some(v => api.includes(v))) {
                return api.replace("csp_", "");
            } else {
                return api;
            }
        case 4:
            return "t4";
        case 5:
            return "t5";
        case -2:
            return "catvod";
        default:
            return "";
    }
}

function getAdapted() {
    return adapted;
}

function getConfigType(config) {
    if (!config || !config.path) return "unknown";
    let file;
    let path = String(config.path);
    if (path.startsWith("file://") && (file = new java.io.File(path.replace("file://", ""))).isDirectory()) {
        return "local_dir";
    } else if (path.startsWith("file://") && path.endsWith(".js") && file && file.isFile()) {
        return "local_index_js";
    } else if (path.startsWith("file://") && path.endsWith(".json") && file && file.isFile()) {
        return "local_index";
    } else if (path.startsWith("https://github.com") && !path.endsWith(".json")) {
        return "http_github_dir";
    } else if (path.startsWith("catvod://")) {
        return "http_catvod";
    } else {
        return "http_index";
    }
}

function defaultFilter(list) {
    let filterWords = [".mapping.txt"];
    return list.filter(item =>
        !filterWords.some(filterWord => String(item.name).includes(filterWord))
    );
}

function getDirFiles(hikerPath) {
    let realPath = getPath(hikerPath);
    if (realPath.startsWith("file://")) realPath = realPath.replace("file://", "");
    let dir = new java.io.File(realPath);
    let names = [];
    if (dir.exists() && dir.isDirectory()) {
        let list = dir.listFiles();
        for (let i = 0; i < list.length; i++) {
            names.push(String(list[i].getName()));
        }
    }
    return names;
}

function generateConfigByBuiltin() {
    let sourceList = [];
    let baseDir = "hiker://files/rules/DrpyHiker/builtin_sources/";

    let allDirs = ["t0", "t1", "t3_xyq", "t3_xbpq", "t3_appmumo", "t4", "t3_drpy2", "t3_cat", "t3_py"];

    allDirs.forEach(dir => {
        let path = baseDir + dir + "/";
        let files = getDirFiles(path);

        let loadedNames = new Set();

        files.forEach(file => {
            if (file.endsWith(".json")) {
                try {
                    let src = JSON.parse(fetch(path + file));
                    sourceList.push(src);
                    loadedNames.add(file.replace(".json", ""));
                } catch (e) {
                    console.error("解析内置JSON失败:", path + file, e);
                }
            }
        });

        if (["t3_drpy2", "t3_cat", "t3_py"].includes(dir)) {
            let extType = dir === "t3_py" ? ".py" : ".js";
            let isExt = dir === "t3_drpy2";
            let localRules = [];

            files.forEach(file => {
                if (file.endsWith(extType)) {
                    let name = file.replace(extType, "");
                    if (loadedNames.has(name)) return;

                    let filepath = path + file;
                    let rule = {
                        key: dir + "_" + name,
                        name: name,
                        type: 3,
                        searchable: 1,
                        quickSearch: 1,
                        filterable: 1
                    };
                    if (isExt) {
                        rule.api = "drpy2.min.js";
                        rule.ext = "file://" + getPath(filepath);
                    } else {
                        rule.api = "file://" + getPath(filepath);
                    }
                    localRules.push(rule);
                }
            });

            let mappingTxt = fetch(path + ".mapping.txt");
            if (mappingTxt && localRules.length > 0) {
                let mapping = [];
                mappingTxt.split("\n").forEach(v => {
                    let [key, params, tokey, type] = v.split("@");
                    if (!key) return;
                    if (type === "base64") params = base64Decode(params);
                    else if (type === "uri") params = decodeURIComponent(params);
                    mapping.push({
                        key,
                        params,
                        tokey: tokey || key
                    });
                });

                mapping.forEach(m => {
                    let index = localRules.findIndex(v => v.name === m.key);
                    if (index !== -1) {
                        let ruleItem = localRules[index];
                        let newRule = Object.assign({}, ruleItem, {
                            key: dir + "_" + m.tokey,
                            name: m.tokey,
                            del: void 0
                        });
                        if (isExt) newRule.ext = ruleItem.ext + "?" + m.params;
                        else newRule.api = ruleItem.api + "?" + m.params;

                        localRules.splice(index, 0, newRule);
                        ruleItem.del = true;
                    }
                });
                localRules = localRules.filter(v => !v.del);
            }

            sourceList = sourceList.concat(localRules);
        }
    });

    return sourceList;
}

function getSourceListByConfig(config) {
    let runMode = ConfigManager.getGlobal("runMode") || 0;


    if (runMode === 1) {
        let sourceList = generateConfigByBuiltin();
        sourceList.forEach((v) => {
            v.name = v.name || v.key;
            v._configPath = config.path || "builtin://local";
        });
        sourceList = defaultFilter(sourceList);

        let localOtherConfig = {
            localt5: ConfigManager.getGlobal("localt5") || "",
            t4ServerPath: ConfigManager.getGlobal("t4ServerPath") || ""
        };
        return [sourceList, localOtherConfig];
    }

    let sourceList = [];
    let otherConfig = {};
    let type = config.type || getConfigType(config);
    let json = {}; // 统一在此声明标准 JSON 容器

    if (config.path && (config.path.includes("#nodejsID=") || config.nodeID) && type !== "http_catvod") {
        let s = config.path.split("#nodejsID=");
        config.path = s[0];
        config.nodeID = s[1] || config.nodeID;
        let isControllableMode = 0;
        if (config.nodeID.endsWith("#")) {
            isControllableMode = 1;
        }
        try {
            let ts = $.require("thirdstart?rule=nodejs");
            if (!ts.isRunning(config.nodeID)) {
                ts.start(config.nodeID.replace("#", ""), isControllableMode, {
                    stdout(name, msg, level) {
                        console.print(console.Level.i, msg, "node:DS");
                    }
                });
            }
            let c = 0;
            do {
                java.lang.Thread.sleep(500);
                c++;
            } while (!fetch(config.path) && c < 20);
        } catch (e) {
            throw new Error("node服务启动失败:" + e.toString());
        }
    }

    // 1. 数据获取层：通过各种方式获取标准化 JSON 对象 { sites: [...] }
    switch (type) {
        case "local_dir":
            json = generateConfigByLocal(config.path.replace("file://", ""));
            break;
        case "local_index_js":
            json = generateConfigByJs(config.path);
            break;
        case "http_github_dir":
            json = generateConfigByGithub(config.path);
            break;
        case "http_catvod":
            json = generateConfigByCatVod(config);
            break;
        case "local_index":
        case "http_index":
            let httpjson = fetch(config.path, {
                headers: {
                    "User-Agent": "okhttp/4.12.0"
                }
            }) || "{}";
            try {
                json = JSON.parse(httpjson);
            } catch (e) {
                try {
                    json = JSON.parse(toCorrectJSONString(httpjson));
                } catch (err) {
                    json = {};
                }
            }
            break;
    }

    if (!json) json = {};

    // 2. 结构标准化处理层 (移到 switch 外面，所有源生效)
    if (!Array.isArray(json.sites)) {
        if (json.hasOwnProperty("sites") && json.sites && json.sites.hasOwnProperty("data")) {
            json.sites = json.sites.data;
        } else {
            throw new Error("从网络或本地获取的配置文件为空/格式异常，请检查");
        }
    }

    // 统一调用过滤机制
    sourceList = filterOther(json.sites);
    otherConfig = json;
    otherConfig.localt5 = otherConfig.localt5 || ConfigManager.getGlobal("localt5") || "";
    otherConfig.t4ServerPath = otherConfig.t4ServerPath || ConfigManager.getGlobal("t4ServerPath") || "";

    // 统一处理缺少 key 但存在 id 的兼容情况
    if (sourceList.length && sourceList[0].hasOwnProperty("id")) {
        sourceList = sourceList.map(item => {
            if (item.hasOwnProperty("id") && !item.hasOwnProperty("key")) {
                item["key"] = item["id"];
            }
            return item;
        })
    }

    // 统一注入配置来源路径
    sourceList.forEach((v) => {
        v.name = v.name || v.key;
        v._configPath = config.path;
    });

    sourceList = defaultFilter(sourceList);
    return [sourceList, otherConfig];
}

function generateConfigByCatVod(config) {
    let [indexMd5Url, parma] = config.path.replace("catvod://", "").split("?");
    parma = parma ? "?" + parma : "";
    let auth = indexMd5Url.split("@")[0].split(/https?:\/\//)[1];

    let headers = {};
    if (auth) {
        headers["Authorization"] = 'Basic ' + window0.btoa(auth);
    }
    let indexConfigMd5Url = indexMd5Url.replace(/(\.js\.md5)$/, ".config.js.md5");

    let httpIndexMd5 = fetch(indexMd5Url + parma, {
        headers
    });
    let localIndexMd5 = fetch(configCache + "/cat/index.js.md5");

    let httpIndexConfigMd5 = fetch(indexConfigMd5Url + parma, {
        headers
    });
    let localIndexConfigMd5 = fetch(configCache + "/cat/index.config.js.md5");
    const ts = $.require("thirdstart?rule=nodejs");
    let path = catIndex;
    if (httpIndexMd5 && (httpIndexMd5 !== localIndexMd5)) {
        writeFile(configCache + "/cat/index.js.md5", httpIndexMd5);
        writeFile(configCache + "/cat/index.js", fetch(indexMd5Url.replace(/(.md5)$/, "") + parma, {
            headers
        }));
        try {
            ts.stop(md5(path));
        } catch (e) {}
    } else if (!httpIndexMd5) {
        throw new Error("catvod无法访问该配置：" + indexMd5Url);
    }
    if (localIndexMd5 && (httpIndexConfigMd5 !== localIndexConfigMd5)) {
        writeFile(configCache + "/cat/index.config.js.md5", httpIndexConfigMd5);
        writeFile(configCache + "/cat/index.config.js", fetch(indexConfigMd5Url.replace(/(.md5)$/, "") + parma, {
            headers
        }));
    }

    config.nodeID = md5(path);
    let cport = 0;
    let c = 0;
    let nodeError;
    if (!ts.isRunning(md5(path))) {
        let port = getAvailablePort();
        cport = port;
        try {
            ts.startNew(path, 1, {
                init: $.toString(port => {
                    let {
                        createServer
                    } = require('http');
                    process.env['DEV_HTTP_PORT'] = port;
                    globalThis.catServerFactory = (handle) => {
                        const server = createServer((req, res) => handle(req, res));
                        server.on('listening', () => {
                            port = server.address().port;
                        });
                        return server;
                    };
                    globalThis.catDartServerPort = () => {
                        return 0;
                    };
                }, port),
                end: $.toString((configpath) => {
                    gimport(configpath).then(config => {
                        input.start(config.default);
                    });
                }, joinUrl(path, "./index.config.js")),
                error(msg, e) {
                    nodeError = new Error(msg);
                    log(msg);
                    c = 99;
                },
                stdout(name, msg, level) {
                    console.print(console.Level.i, msg, "node:Cat");
                }
            }, port);
        } catch (e) {}
    } else {
        cport = ts.getProject(md5(path)).ext;
    }

    let httpjson = "";
    let url = "http://localhost:" + cport;
    do {
        httpjson = fetch(url + "/config", {
            headers: {
                "User-Agent": "okhttp/4.12.0"
            }
        });
        java.lang.Thread.sleep(500);
        c++;
    } while (!httpjson && c < 19);

    if (nodeError) throw nodeError;

    let json = {};
    try {
        json = JSON.parse(httpjson);
    } catch (e) {
        json = JSON.parse(toCorrectJSONString(httpjson));
    }

    if (!Object.keys(json).length) {
        ts.stop(config.nodeID);
    }

    let sourceList = [];
    for (let key in json) {
        if (["video", "read", "comic"].includes(key) && json[key].sites) {
            json[key].sites.forEach(v => {
                let type = v.type;
                v.type = -2;
                v.medType = type;
                v.api = url + v.api;
                v.searchable = 1;
                sourceList.push(v);
            });
        }
    }
    // 返回标准 JSON 结构
    return Object.assign({}, json, {
        sites: sourceList
    });
}

function generateConfigByLocal(filePath) {
    let dirFile = new java.io.File(filePath);
    if (!dirFile.exists()) return {
        sites: []
    }; // 返回标准结构
    let list = dirFile.listFiles();
    let rules = [];

    for (let it of list) {
        let name = String(it.getName());
        let path = it.getPath();
        if (!name.endsWith(".js") && !name.endsWith(".py") || it.isDirectory()) continue;

        if (name.endsWith(".js")) {
            name = name.slice(0, name.lastIndexOf("."));
            rules.push({
                'key': `hipy_js_${name}`,
                'name': `${name}`,
                'type': 3,
                'searchable': 1,
                'quickSearch': 1,
                'api': 'drpy2.js',
                'filterable': 1,
                'ext': `${path}`,
            });
        } else {
            name = name.slice(0, name.lastIndexOf("."));
            rules.push({
                'key': `py_${name}`,
                'name': `${name}`,
                'type': 3,
                'searchable': 1,
                'quickSearch': 1,
                'api': `${path}`,
                'filterable': 1,
            });
        }
    }
    try {
        let mapping = getLoaclMapping(String(dirFile.getPath()));
        if (mapping.length) {
            for (let it of mapping) {
                let index = rules.findIndex(v => v.name === it.key);
                if (index === -1) continue;
                let item = rules[index];
                rules.splice(index, 0, Object.assign({}, item, {
                    'key': `hipy_js_${it.tokey}`,
                    'name': `${it.tokey}`,
                    'ext': item.ext + "?" + it.params,
                    del: void 0
                }));
                item.del = true;
            }
            rules = rules.filter(v => !v.del);
        }
    } catch (e) {}

    return {
        sites: rules
    };
}

function generateConfigByJs(jsPath) {
    let main = evalJs(request(jsPath).replace(/async\s*?function\s*?main/g, "function main") + "\n;main;", {
        GZIP: $.require("GZIP"),
        pathLib: {
            join(dr, ...ps) {
                let f = String(dr);
                for (let p of ps) {
                    if (f.at(-1) !== "/") {
                        f += "/";
                    }
                    f = joinUrl(f, p);
                }
                return f;
            },
            readFile(path) {
                path = path.startsWith("file://") ? path : ("file://" + path);
                return fetch(path);
            },
            readDir(path) {
                let names = [];
                let file = new java.io.File(path.replace("file://", ""));
                if (!(file.exists() && file.isDirectory())) return names;
                for (let it of file.listFiles()) {
                    names.push(String(it.getName()));
                }
                return names;
            },
            dirname(pa) {
                let path = joinUrl(jsPath, pa);
                let names = [];
                let file = new java.io.File(path);
                if (!(file.exists() && file.isDirectory())) return names;
                for (let it of file.listFiles()) {
                    if (it.isDirectory()) {
                        names.push(String(it.getName()));
                    }
                }
                return names;
            },
            stat() {
                return true;
            }
        },
        log: log,
        path: jsPath,
        path_dir: joinUrl(jsPath, "./")
    });
    let jsonText = main();
    let json = JSON.parse(jsonText);

    if (Array.isArray(json)) {
        return {
            sites: json
        };
    } else if (json.sites && Array.isArray(json.sites)) {
        if (json.sites.length) {
            writeFile(jsPath.replace(/.js$/, ".json"), jsonText);
        }
        return json;
    }
    return {
        sites: []
    };
}

function generateConfigByGithub(url) {
    let prefix = ConfigManager.getGlobal("githubraw") || "https://raw.gitmirror.com";
    let rope = url.split("/").slice(3, 5).join("/");
    let html = fetch(url);
    let jsonText = pdfh(html, "#repo-content-pjax-container&&script&&Html");
    let json = JSON.parse(jsonText);
    let list = json.payload.tree.items;
    let rules = [];
    for (let it of list) {
        let name = it.name;
        let path = it.path;
        if (!name.endsWith(".js")) continue;
        name = name.slice(0, name.lastIndexOf("."));
        rules.push({
            'key': `hipy_js_${name}`,
            'name': `${name}`,
            'type': 3,
            'api': 'drpy2.js',
            'searchable': 1,
            'quickSearch': 1,
            'filterable': 1,
            'ext': `${prefix}/${rope}/master/${path}`,
        });
    }
    // 返回标准 JSON 结构
    return {
        sites: rules
    };
}
///

function clearNodejs(id) {
    try {
        id = id || currentConfig.nodeID;
        if (id) {
            $.require("thirdstart?rule=nodejs").stop(id);
        }
    } catch (e) {
        log("node关闭失败：" + e.toString());
    }
}

function init(config) {
    let runMode = ConfigManager.getGlobal("runMode") || 0;
    if (runMode === 0 && (!config || !config.path)) return null;
    if (!config) config = {};

    try {
        config.type = getConfigType(config);
        let [sourceList, otherConfig] = getSourceListByConfig(config);

        let currentSource, searchAllow;
        if (config.cKey) {
            currentSource = sourceList.find(v => v.key === config.cKey);
            if (!currentSource) {
                currentSource = sourceList[0];
            }
        } else {
            currentSource = sourceList[0];
        }

        try {
            searchAllow = JSON.parse(fetch(searchAllowPath) || "[]");
        } catch (e) {
            deleteFile(searchAllowPath);
            searchAllow = [];
        }

        loadError = void 0;
        if (currentConfig.nodeID !== config.nodeID) {
            clearNodejs();
        }

        return {
            currentSource,
            searchAllow,
            sourceList,
            otherConfig
        };
    } catch (e) {
        log(e.toString());
        loadError = e;
    }

    return null;
}

function copyObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    return JSON.parse(JSON.stringify(obj));
}


function getLoaclMapping(dirFile) {
    let mappingPath = "file://" + joinUrl(dirFile, "./") + "/.mapping.txt";
    let mapping = [];
    if (!fileExist(mappingPath)) return mapping;
    try {
        let mappingTxt = fetch(mappingPath);
        mappingTxt.split("\n").forEach(v => {
            let [key, params, tokey, type] = v.split("@");
            if (type === "base64") {
                params = base64Decode(params);
            } else if (type === "uri") {
                params = decodeURIComponent(params);
            }
            mapping.push({
                key,
                params,
                tokey: tokey || key
            });
        });
    } catch (e) {}
    return mapping;
}

function evalJs(code, global) {
    let Context = org.mozilla.javascript.Context;
    let cx = Context.getCurrentContext();
    global = global || {};
    return org.mozilla.javascript.ScriptRuntime.evalSpecial(cx, global, global, [String(code)], "eval code", 1);
}


function prepare(config) {
    let data = init(config);
    if (!data) return false;
    currentSource = data.currentSource;
    searchAllow = data.searchAllow;
    sourceList = data.sourceList;
    otherConfig = data.otherConfig;
    currentConfig = config;
    sTag = config.sTag || "";

    return true;
}

function filterOther(list) {
    return list.filter(it => adapted.some(c => String(it.api).includes(c)) || supportType.includes(it.type));
}

function getCurrentConfig() {
    return copyObject(currentConfig || {});
}

function setCurrentConfig(config) {
    let runMode = ConfigManager.getGlobal("runMode") || 0;

    let cpath = (currentConfig || {}).path;
    if (!runMode && prepare(config)) {
        storage0.setItem("currentConfig", config);
        if (cpath != config.path) {
            deleteFile(searchAllowPath);
            searchAllow = [];
            tagClasses = void 0;
        }
        isPrepare = true;
        return true;
    } else {
        return false;
    }
}

function findSource(key) {
    let s = sourceList.find(v => v.key === key);
    if (s) {
        s.ext = getAbsolutePath(s.ext);
    }
    return s;
}

function getCurrentSource() {
    return copyObject(currentSource);
}

function getCurrentSourcePath() {
    if (typeof currentSource.ext == "object") {
        return currentSource.ext;
    }
    let path = String(currentSource.ext || "");
    return getAbsolutePath(path);
}

function getAbsolutePath(path) {
    if (typeof path === "object") return path;
    path = String(path);
    if (path.startsWith("http") || path.startsWith("file://")) {
        return path;
    } else {
        return joinUrl(currentConfig.path, path);
    }
}

function setCurrentSource(key) {
    let source = sourceList.find(v => v.key === key);
    if (source) {
        currentConfig.cKey = key;
        storage0.setItem("currentConfig", currentConfig);
        currentSource = source;
        return true;
    }
    return false;
}

function getCanSearchSource() {
    let list = sourceList.filter(v => v.searchable === undefined || v.searchable);
    if (getLeach()) {
        list = leachList(list);
    }
    return list;
}

function getLeach() {
    let leach;
    let gleach = ConfigManager.getGlobal("leach");
    let tleach = getMyVar("tempLeach", "");
    if (tleach != "") {
        leach = false;
        return leach;
    }
    if (gleach) {
        leach = true;
    }
    return leach || false;
}

function leachList(list) {
    var reg = /([\[【])[密]([】\]])/;
    return list.filter(v => !reg.test(v.name));
}

function getAllSource() {
    let list = sourceList.slice();
    if (getLeach()) {
        list = leachList(list);
    }
    return list;
}

function getAllSources() {
    return sourceList;
}

function getSearchAllow() {
    return searchAllow;
}

function setSearchAllow() {
    if (Array.isArray(searchAllow)) {
        saveFile(searchAllowPath, JSON.stringify(searchAllow));
    }
}

function getTagClasses(sList) {
    let list = sourceList;
    if (sList && sList.length) {
        tagClasses = "";
        list = sList;
    }
    if (Array.isArray(tagClasses)) return tagClasses.slice();
    tagClasses = [];
    if (isPrepare && list) {
        list.forEach((v) => {
            let tag = String(v.name).split("]")[0].split("[")[1];
            if (tag && !tagClasses.includes(tag)) {
                tagClasses.push(tag);
            }
        });
    }
    return tagClasses.slice();
}

function setSearchTag(tag) {
    if (tagClasses && tagClasses.includes(tag) || (typeof tag === "string" && !tag)) {
        currentConfig.sTag = tag;
        storage0.setItem("currentConfig", currentConfig);
        sTag = tag;
        return true;
    }
    return false;
}

function getSearchTag() {
    return sTag;
}

function getAllowSearchSource(useSTag) {
    let slist;
    if (searchAllow.length && !useSTag) {
        slist = sourceList.filter(v => searchAllow.includes(v.key));
    } else {
        slist = sourceList.filter(v => v.searchable);
    }
    if (useSTag) {
        if (sTag) {
            slist = slist.filter(v => String(v.name).includes("[" + sTag + "]"));
        } else {
            slist = slist.filter(v => !/\[.*?\]/.test(String(v.name)));
        }
    }
    if (slist.length == 0) {
        slist = sourceList.slice();
    }
    if (getLeach()) {
        slist = leachList(slist);
    }
    return slist;
}

function getOtherConfig() {
    return otherConfig;
}

function isPrepared() {
    return isPrepare;
}

function getLoadError() {
    return loadError;
}

function initDefault() {
    let runMode = ConfigManager.getGlobal("runMode") || 0;

    let startConfig;
    if (runMode === 1) {
        startConfig = {
            name: "内置本地配置",
            path: "builtin://local",
            type: "builtin"
        };
    } else {
        startConfig = currentConfig.path ? currentConfig : storage0.getItem("currentConfig", {});
    }

    return prepare(startConfig);
}


function initAndFilter() {
    isPrepare = initDefault();
    if (!getMyVar("tempLeach", "") && ConfigManager.getGlobal("leach") && currentSource) {
        if (currentSource.name.includes("[密]")) {
            currentSource = null;
        }
    }
}

initAndFilter();

function getAvailablePort() {
    let ss = null;
    try {
        ss = new java.net.ServerSocket(0);
        let port = ss.getLocalPort();
        ss.close();
        return port;
    } catch (e) {
        log(e.toString());
        return -1;
    } finally {
        if (ss != null) {
            try {
                ss.close();
            } catch (e) {
                log(e.toString());
            }
        }
    }
}

function clearCurrentConfigCache() {
    clearItem("currentConfig");
    currentSource = void 0;
}
$.exports = {
    init,
    prepare,
    getAdapted,
    getCurrentConfig,
    setCurrentConfig,
    getCurrentSource,
    getCurrentSourcePath,
    setCurrentSource,
    getCanSearchSource,
    getSearchAllow,
    setSearchAllow,
    getAllSource,
    getAllowSearchSource,
    isPrepared,
    getAbsolutePath,
    getAllSources,
    findSource,
    getTagClasses,
    setSearchTag,
    getSearchTag,
    getLoadError,
    initDefault,
    getConfigType,
    getSourceListByConfig,
    getSourceType,
    getOtherConfig,
    clearNodejs,
    clearCurrentConfigCache
};