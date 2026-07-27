// ==================== 导入Java类 ====================

function importClass(clsname) {
    return new org.mozilla.javascript.NativeJavaClass(this, findJavaClass(clsname));
}

const File = java.io.File;
const FileInputStream = java.io.FileInputStream;
const MessageDigest = java.security.MessageDigest;
const BigInteger = java.math.BigInteger;
const ConcurrentHashMap = java.util.concurrent.ConcurrentHashMap;
const DexClassLoader = Packages.dalvik.system.DexClassLoader;
const Context = android.content.Context;
const JSONObject = org.json.JSONObject;
const LinkedHashMap = java.util.LinkedHashMap;
const HashMap = java.util.HashMap;
const Map = java.util.Map;
const TextUtils = android.text.TextUtils;
const Array = java.lang.reflect.Array;
const libs='hiker://files/data/' + MY_RULE.title ;
const QuickJsEngine = $.require("./libs/QuickJsEngine.js", libs+"/plug")


const SpiderClass = findJavaClass(libs + "/plug/jarLoad/classes_merge.dex", "com.github.catvod.crawler.Spider");
const AppApplication = importClass("com.hiker.AppApplication");

const Spider = importClass("com.github.catvod.crawler.Spider");
const SpiderNull = importClass("com.github.catvod.crawler.SpiderNull");

const LogAdapter = importClass("com.orhanobut.logger.LogAdapter");
const Logger = importClass("com.orhanobut.logger.Logger");

Logger.clearLogAdapters();

Logger.addLogAdapter(new LogAdapter({
    isLoggable(priority, tag) {
        return true;
    },
    log(priority, tag, message) {
        console.print("log", message, tag)
    }
}));
// ==================== 工具函数 ====================


/**
 * 计算文件的MD5
 */
function md5File(file) {
    try {
        const digest = MessageDigest.getInstance("MD5");
        const fis = new FileInputStream(file);
        const bytes = Array.newInstance(java.lang.Byte.TYPE, 4096);
        let count;
        while ((count = fis.read(bytes)) !== -1) {
            digest.update(bytes, 0, count);
        }
        fis.close();
        const sb = new java.lang.StringBuilder();
        const digestBytes = digest.digest();
        for (let i = 0; i < digestBytes.length; i++) {
            const b = digestBytes[i];
            sb.append(new java.lang.Integer.toString((b & 0xff) + 0x100, 16).substring(1));
        }
        return sb.toString();
    } catch (e) {
        console.setTag("jarLoad").error("md5 file error", e);
        return "";
    }
}

/**
 * 根据jar字符串（可能为url、file://）获取对应的本地File对象
 */
function getJarFile(jar) {
    if (jar.startsWith("http")) {
        const cachePath = 'hiker://files/cache/DrpyHiker/' + md5(jar) + '.jar';
        let realPath = getPath(cachePath);
        if (realPath.startsWith('file://')) realPath = realPath.substring(7);
        return new File(realPath);
    } else if (jar.startsWith("file://")) {
        return new File(jar.substring(7));
    } else {
        // 可能是绝对路径
        return new File(jar);
    }
}

// ==================== JarLoader 类 ====================

function JarLoader() {
    this.loaders = new ConcurrentHashMap();
    this.methods = new ConcurrentHashMap();
    this.spiders = new ConcurrentHashMap();
    this.recent = null;
}

Object.assign(JarLoader.prototype, {
    clear: function() {
        const spiders = this.spiders;
        const it = spiders.values().iterator();
        while (it.hasNext()) {
            const spider = it.next();
            if (spider && spider.destroy) spider.destroy();
        }
        this.loaders.clear();
        this.methods.clear();
        this.spiders.clear();
        console.setTag("jarLoad").log("JarLoader cleared");
    },

    setRecent: function(recent) {
        this.recent = recent;
    },

    // 私有方法：从File加载dex
    _load: function(key, file) {
        try {
            if (!file.setReadOnly()) return;
            this.loaders.put(key, this._dexFromFile(file));
            this._invokeInit(key);
            this._putProxy(key);
            console.setTag("jarLoad").log("Loaded jar for key: " + key);
        } catch (e) {
            console.setTag("jarLoad").error("Failed to load jar for key: " + key, e);
        }
    },

    // 私有方法：从File创建DexClassLoader
    _dexFromFile: function(file) {
        const optimizedDirPath = getPath('hiker://files/cache/DrpyHiker/');
        const optimizedDir = new File(optimizedDirPath);
        if (!optimizedDir.exists()) optimizedDir.mkdirs();
        const parentLoader = SpiderClass.getClassLoader();
        return new DexClassLoader(file.getAbsolutePath(), optimizedDir.getAbsolutePath(), null, parentLoader);
    },

    // 私有方法：调用Init.init(Context)
    _invokeInit: function(key) {
        try {
            const loader = this.loaders.get(key);
            const clz = loader.loadClass("com.github.catvod.spider.Init");
            const method = clz.getMethod("init", Context.__javaObject__);

            //method.invoke(null, AppApplication.getApp());
            AppApplication.initJar(method);
        } catch (e) {
            console.setTag("jarLoad").error(" error for key: " + key, e);
        }
    },

    // 私有方法：获取Proxy.proxy(Map)方法并缓存
    _putProxy: function(key) {
        try {
            const loader = this.loaders.get(key);
            const clz = loader.loadClass("com.github.catvod.spider.Proxy");
            const method = clz.getMethod("proxy", Map.__javaObject__);
            this.methods.put(key, method);
        } catch (e) {
            console.setTag("jarLoad").error("Proxy method not found for key: " + key, e);
        }
    },

    // 私有方法：下载jar到缓存并返回File（使用环境提供的requireDownload）
    _download: function(url) {
        try {
        console.setTag("jarLoad").log("Download jar: " + url);
            let cachePath = 'hiker://files/cache/DrpyHiker/' + md5(url) + '.jar';
            requireDownload(url, cachePath, {
                "User-Agent": "okhttp/4.12.0"
            });
            let realPath = getPath(cachePath);
            if (realPath.startsWith('file://')) realPath = realPath.substring(7);
            return new File(realPath);
        } catch (e) {
            console.setTag("jarLoad").error("Download jar failed: " + url, e);
            // 尝试返回缓存中可能已存在的文件
            let cachePath = 'hiker://files/cache/DrpyHiker/' + md5(url) + '.jar';
            let realPath = getPath(cachePath);
            if (realPath.startsWith('file://')) realPath = realPath.substring(7);
            return new File(realPath);
        }
    },

    // 公有方法：解析jar字符串并加载
    parseJar: function(key, jar) {
        try {
            if (this.loaders.containsKey(key)) return;
            const texts = jar.split(";md5;");
            let md5Str = texts.length > 1 ? texts[1].trim() : "";
            if (md5Str.startsWith("http")) {
                try {
                    // 使用环境提供的同步fetch函数获取md5文本
                    md5Str = fetch(md5Str).trim();
                } catch (e) {
                    console.setTag("jarLoad").error("fetch md5 failed: " + md5Str, e);
                    md5Str = "";
                }
            }
            jar = texts[0];
            console.setTag("jarLoad").log("jar",jar, md5Str);
            if (md5Str) {
                let jarFile = getJarFile(jar);
                if (md5File(jarFile) === md5Str) {
                    this._load(key, jarFile);
                    return;
                }
            }
            console.setTag("jarLoad").log("jar",jar);
            if (jar.startsWith("http")) {
                this._load(key, this._download(jar));
            } else if (jar.startsWith("file")) {
                let path = jar;
                if (path.startsWith('file://')) path = path.substring(7);
                this._load(key, new File(path));
            } else {
                console.setTag("jarLoad").error("Unsupported jar path: " + jar);
            }
        } catch (e) {
            console.setTag("jarLoad").error("Failed to parse jar for key: " + key + ", jar: " + jar, e);
        }
    },

    // 公有方法：根据jar字符串获取DexClassLoader（若未加载则先解析）
    dex: function(jar) {
        try {
            const jaKey = md5(jar);
            if (!this.loaders.containsKey(jaKey)) this.parseJar(jaKey, jar);
            return this.loaders.get(jaKey);
        } catch (e) {
            console.setTag("jarLoad").error("dex error for jar: " + jar, e);
            return null;
        }
    },

    // 公有方法：获取Spider实例
    getSpider: function(key, api, ext, jar) {
        //try {
            const jaKey = md5(jar);
            const spKey = jaKey + key;
            if (this.spiders.containsKey(spKey)) return this.spiders.get(spKey);
            if (!this.loaders.containsKey(jaKey)) this.parseJar(jaKey, jar);
            const loader = this.loaders.get(jaKey);
            const spiderClass = loader.loadClass("com.github.catvod.spider." + api.split("csp_")[1]);
            const spider = spiderClass.newInstance();
            //console.log(spider, ext)
            spider.init(getCurrentActivity(), ext);
            this.spiders.put(spKey, spider);
            return spider;
        /*} catch (e) {
            console.setTag("jarLoad").error("getSpider error: key=" + key + ", api=" + api, e, e.stack);
            return new SpiderNull();
        }*/ 
    },

    // 公有方法：调用解析器（Json）
    jsonExt: function(key, jxs, url) {
        try {
            const clz = this.loaders.get(this.recent).loadClass("com.github.catvod.parser.Json" + key);
            const method = clz.getMethod("parse", LinkedHashMap.__javaObject__, String);
            return method.invoke(null, jxs, url);
        } catch (e) {
            console.setTag("jarLoad").error("jsonExt error", e);
            throw e;
        }
    },

    // 公有方法：调用混合解析器（Mix）
    jsonExtMix: function(flag, key, name, jxs, url) {
        try {
            const clz = this.loaders.get(this.recent).loadClass("com.github.catvod.parser.Mix" + key);
            const method = clz.getMethod("parse", LinkedHashMap.__javaObject__, String, String, String);
            return method.invoke(null, jxs, name, flag, url);
        } catch (e) {
            console.setTag("jarLoad").error("jsonExtMix error", e);
            throw e;
        }
    },

    // 公有方法：代理调用
    proxyInvoke: function(params) {
        const result = this._proxyInvokeMethod(this.methods.get(this.recent), params);
        return result !== null ? result : this._tryOthers(params);
    },

    // 私有方法：尝试其他代理
    _tryOthers: function(params) {
        const entries = this.methods.entrySet().iterator();
        while (entries.hasNext()) {
            const entry = entries.next();
            if (entry.getKey() === this.recent) continue;
            const result = this._proxyInvokeMethod(entry.getValue(), params);
            if (result !== null) return result;
        }
        return null;
    },

    // 私有方法：执行具体代理方法
    _proxyInvokeMethod: function(method, params) {
        try {
            return method.invoke(null, params);
        } catch (e) {
            console.setTag("jarLoad").error("proxy invoke error", e);
            return null;
        }
    }
});

// ==================== 模块导出 ====================
$.exports = JarLoader;