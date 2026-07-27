const QuickJsEngine = $.require("./libs/QuickJsEngine.js", 'hiker://files/data/' + MY_RULE.title + "/plug")
const runtimeConfig = GM.defineModule("runtimeConfig");

function DrpyAdapter(source, proxyUrl) {
    this.ext = runtimeConfig.getAbsolutePath(source.ext);
    this.source = source;
    let key = source.key;
    this.quickJsEngine = new QuickJsEngine();
    this.quickJsEngine.setWrapMode(1);
    let loader = QuickJsEngine.getHikerModuleLoader();
    this.quickJsEngine.setModuleLoader(new QuickJsEngine.ModuleLoader({
        getModuleStringCode(moduleName) {
            return loader.getModuleStringCode(String(moduleName).replace("assets://js/lib/", "data://libs_hiker/cat/"));
        },
        moduleNormalizeName(moduleBaseName, moduleName) {
            return loader.moduleNormalizeName(moduleBaseName, moduleName);
        },
        isBytecodeMode() {
            return false;
        }
    }));
    let isDrpy2 = String(source.api).includes("drpy2.js") || String(source.api).includes("drpy2.min.js");
    this.isDrpy2 = isDrpy2;
    this.quickJsEngine.setConsole(function(args) {
        console.print(args[0], args[1], isDrpy2 ? "QuJs:DR2" : "QuJs:Cat");
    });
    this.quickJsEngine.registerJS(initGlobal(key, proxyUrl, this.quickJsEngine));
    this.quickJsEngine.registerJS("local", initLoc());
    this.isJsEvalReturn = false;
    if (isDrpy2) {
        this.drpy = this.quickJsEngine.getModule("data://libs_hiker/drpy/drpy2.min.js", true);
        this.drpyWarp = this.quickJsEngine.getWrapModule("data://libs_hiker/drpy/drpy2.min.js", true);
    } else {
    this.isJsEvalReturn = true;
        let api = runtimeConfig.getAbsolutePath(source.api);
        this.drpy = this.quickJsEngine.getModule(api, false);
        this.drpyWarp = this.quickJsEngine.getWrapModule(api, false);
        if (this.quickJsEngine.type(this.quickJsEngine.getByObject(this.drpy, "__jsEvalReturn")) != "Undefined") {
            this.drpy = this.quickJsEngine.callByObjectInWrap(4, this.drpy, "__jsEvalReturn");
            this.drpyWarp = this.drpyWarp.__jsEvalReturn();
            
        } else {
            this.drpy = this.quickJsEngine.getByObject(this.drpy, "default", true);
            this.drpyWarp = this.drpyWarp.default;

        }
    }
    this.rule = {
        name: source.name,
        host: "hiker://empty",
        一级: "true",
        推荐: "true",
        类型: "影视",
        //模板: "自动"
    };
    this.type = null;
}
Object.assign(DrpyAdapter.prototype, {
    init() {
        this.quickJsEngine.callByObject(this.drpy, "init", this.isJsEvalReturn ? this.source : this.ext);
    },
    homeVod(...args) {
        return this.quickJsEngine.getJSONObject(this.quickJsEngine.callByObject.apply(this.quickJsEngine, [this.drpy, "homeVod"].concat(args)));
    },
    home(...args) {
        let data = this.quickJsEngine.getJSONObject(this.quickJsEngine.callByObject.apply(this.quickJsEngine, [this.drpy, "home"].concat(args)));
        let data2 = JSON.parse(data);
        this.type = data2.type || null;
        return data;
    },
    category(tid, pg, filter, extend) {
        return this.quickJsEngine.getJSONObject(this.quickJsEngine.callByObject(this.drpy, "category", tid, pg, filter, extend));
    },
    detail(vod_url) {
        return this.quickJsEngine.getJSONObject(this.quickJsEngine.callByObject(this.drpy, "detail", vod_url));
    },
    play(flag, id) {
        return this.quickJsEngine.getJSONObject(this.quickJsEngine.callByObject(this.drpy, "play", flag, id));
    },
    search(wd, quick, pg) {
        return this.quickJsEngine.getJSONObject(this.quickJsEngine.callByObject(this.drpy, "search", wd, quick, pg));
    },
    proxy(param) {
        //return this.quickJsEngine.getJSONObject(this.quickJsEngine.callByObject(this.drpy, "proxy", param));
        return this.drpyWarp.proxy(param);
    },
    getRule(key) {
        if (key == "类型" && this.type) return this.type;
        if (this.isDrpy2) {
            let res = this.quickJsEngine.callByObject(this.drpy, "getRule", key || null);
            return this.quickJsEngine.getJSONObject(res);
        } else {
            return key ? this.rule[key] : this.rule;
        }
    },
    runMain(main_func_code, arg) {
        if (this.isDrpy2) {
            return this.quickJsEngine.getJSONObject(this.quickJsEngine.callByObject(this.drpy, "runMain", main_func_code, arg));
        } else {
            return "";
        }
    },
    action(actionId, value) {
        if (typeof this.drpyWarp.action == "function") {
            return $.log(this.quickJsEngine.getJSONObject(this.quickJsEngine.callByObject(this.drpy, "action", actionId, value)));
        }
        return "";
    },
    close() {
        this.quickJsEngine.close();
    }
});
$.exports = DrpyAdapter;


function initGlobal(skey, proxyUrl, qje) {
    const CryptoUtil = $.require("hiker://assets/crypto-java.js");
    let obj = {};
    obj.getProxy = function() {
        return proxyUrl + "?hikerSkey=" + encodeURIComponent(skey) + "&do=js";
    }
    let $request = request;
    let $post = post;
    obj.__siteKey = skey;

    function readFileToString(filePath) {
        const StringBuilder = java.lang.StringBuilder;
        const BufferedReader = java.io.BufferedReader;
        const File = java.io.File;
        const FileReader = java.io.FileReader;

        let file = new File(filePath);
        if (!file.exists()) return "";
        let fileContent = new StringBuilder();
        let br = null;
        try {
            br = new BufferedReader(new FileReader(file));
            let line;
            while ((line = br.readLine()) != null) {
                fileContent.append(line).append("\n");
            }
        } catch (e) {
            fileContent.append("");
        } finally {
            try {
                if (br != null) {
                    br.close();
                }
            } catch (e) {}
        }
        return String(fileContent.toString());
    }

    function hasPropertyIgnoreCase(obj, propertyName) {
        return Object.keys(obj).some(key =>
            key.toLowerCase() === propertyName.toLowerCase()
        );
    }

    function valueStartsWith(obj, propertyName, prefix) {
        const key = Object.keys(obj).find(key =>
            key.toLowerCase() === propertyName.toLowerCase()
        );
        return key !== undefined && obj[key].startsWith(prefix);
    }

    obj.req = function(url, cobj) {
        try {
            //cobj = JSON.parse(cobj.toJsonString());
            let res = {};
            let obj = Object.assign({}, cobj);
            if (obj.data) {
                obj.body = obj.data;
                if ((obj.postType && obj.postType == "form") || (hasPropertyIgnoreCase(obj.headers, "Content-Type") && valueStartsWith(obj.headers, "Content-Type", "application/x-www-form-urlencoded"))) {
                    let temp_obj = obj.data;
                    obj.body = Object.keys(temp_obj).map(key => {
                        return `${key}=${temp_obj[key]}`;
                    }).join('&');
                }
                delete obj.data;
            }

            if (obj.hasOwnProperty("redirect")) obj.redirect = !!obj.redirect;
            if (obj.buffer === 2 || obj.buffer === 1) {
                obj.toHex = true;
            }
            obj.headers = Object.assign({
                Cookie: "#noCookie#"
            }, obj.headers);
            if (url === "https://api.nn.ci/ocr/b64/text" && obj.headers) {
                obj.headers["Content-Type"] = "text/plain";
            }
            let isFile = url.startsWith("file://");
            if (isFile && (url.includes("?type=") || url.includes("?params="))) {
                url = url.slice(0, url.lastIndexOf("?"));
            }
            for (let key in obj.headers) {
                if (key.toLowerCase() == "user-agent") {
                    let v = obj.headers[key];
                    delete obj.headers[key];
                    obj.headers["User-Agent"] = String(v);

                } else if (typeof obj.headers[key] !== "string") {
                    obj.headers[key] = String(obj.headers[key]);
                }

            }
            let r = "";
            if (isFile) {
                r = readFileToString(url.replace("file://", ""));
            } else {
                r = $request(url, obj);
            }
            if (obj.withHeaders) {
                r = JSON.parse(r);
                res.content = r.body;
                res.headers = {};

                for (let [k, v] of Object.entries(r.headers || {})) {
                    if (k.toLowerCase() == "set-cookie") {
                        res.headers[k] = v;
                        continue;
                    }
                    res.headers[k] = v[0];
                }

            } else {
                res.content = r;
            }
            if (obj.buffer === 2) {
                res.content = CryptoUtil.Data.parseHex(res.content).toBase64(_base64.NO_WRAP);
            }
            if (obj.buffer === 1) {
                res.content = CryptoUtil.Data.parseHex(res.content).toBytes();
                res = qje.toJSObject(res);
            }

            return res;
        } catch (e) {
            log("Error:" + e.toString());
            //log(e.)
        }
    }

    obj.pdfa = _pdfa;
    obj.pd = _pd;
    obj.pdfh = _pdfh;
    obj.joinUrl = joinUrl;
    obj.batchFetch = function(list) {
        //list = JSON.parse(cobj.toJsonString());
        return batchFetch(list);
    }
    obj.rsaDecrypt = function(e, k, o) {
        let options = new java.util.HashMap();
        for (let key in o) {
            options.put(key, o[key]);
        }
        return rsaDecrypt(e, k, options);
    }
    obj.rsaEncrypt = function(m, k, o) {
        let options = new java.util.HashMap();
        for (let key in o) {
            options.put(key, o[key]);
        }
        return rsaEncrypt(m, k, options);
    }
    obj.getPromiseResult = function(promiseResult) {
        return promiseResult;
    }
    obj.fetchCodeByWebView = fetchCodeByWebView;
    const gkey = "global";
    const localKey = "drpy";
    obj.getCacheTypeNameValue = function(namespace, k, v) {
        return getItem(gkey + "@" + k, v || "");
    };
    obj.saveCacheTypeNameValue = function(namespace, k, v) {
        setItem(gkey + "@" + k, String(v));
    };
    obj.getCacheOrDefault = function(k, v) {
        return getItem(localKey + "@" + skey + "@" + k, v || "");
    };
    obj.saveCache = function(k, v) {
        return getItem(localKey + "@" + skey + "@" + k, String(v));
    };
    obj.clearCache = function(k) {
        return clearItem(localKey + "@" + skey + "@" + k);
    };
    obj.MD5 = md5;
    obj.getAddress = function() {
        return "https://127.0.0.1/";
    }
    obj.strExtract = function(str, pattern, groupIndex = 0) {
        // 将模式字符串转换为正则表达式对象（不使用全局标志，只匹配第一个）
        const regex = new RegExp(pattern);
        const match = regex.exec(str);
        // 如果匹配成功且请求的捕获组存在，则返回该组内容；否则返回 null
        return match && match.length > groupIndex ? match[groupIndex] : null;
    }
    obj.__sourceKey=md5(skey);
    return obj;
}

function initLoc() {
    const localKey = "drpy";

    let local = {
        set(rulekey, k, v) {
            setItem(localKey + "@" + rulekey + "@" + k, String(v));
        },
        get(rulekey, k, v) {
            return getItem(localKey + "@" + rulekey + "@" + k, v || "");
        },
        delete(rulekey, k) {
            clearItem(localKey + "@" + rulekey + "@" + k);
        },

    };
    return local;
}