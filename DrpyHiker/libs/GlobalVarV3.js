const JavaMap = java.util.HashMap;
const globalMapSymbol = Symbol("globalMap");
const mapSymbol = Symbol("myJavaMap");
const selfSymbol = Symbol("selfKey");

function getTypeName(obj) {
    return Object.prototype.toString.call(obj);
}

function dealWithVal(val) {
    let typeName = getTypeName(val);
    let errorName;
    if (val instanceof java.lang.String) {
        return String(val);
    } else if (val instanceof java.lang.Double) {
        return Number(val);
    } else if (val instanceof java.lang.Boolean) {
        if (String(val) === "true") {
            val = true;
        } else {
            val = false;
        }
        return val;
    }
    return val;
}

function isString(str) {
    return typeof(str) === "string" || str instanceof java.lang.String;
}

function GlobalVar(javaMap, selfKey) {
    this[globalMapSymbol] = javaMap;
    this[selfSymbol] = selfKey;
    this.raw = false;
}

Object.assign(GlobalVar.prototype, {
    getHashMap(symbol) {
        if (symbol !== mapSymbol) return null;
        if (this[mapSymbol]) return this[mapSymbol];
        let selfKey = this[selfSymbol];
        if (!selfKey) {
            throw Error("当前没有全局环境，请使用setSelfKey指定规则名");
        }
        this[mapSymbol] = this[globalMapSymbol];
        return this[mapSymbol];
    },
    setSelfKey(key) {
        //if (!this[selfSymbol]) this[selfSymbol] = key;
        this[selfSymbol] = key;
    },
    getSelfKey() {
        return this[selfSymbol];
    },
    getMapKey(key) {
        return String(this[selfSymbol] + key);
    },
    _getMapKey(key) {
        return String("##" + this[selfSymbol] + key);
    },
    _addPageReference(Gkey) {
        if (this.isAddReference) return this;
        if (typeof MY_TYPE !== "undefined" && ["home", "search"].includes(MY_TYPE)) {
            let hashMap = this.getHashMap(mapSymbol);
            let key = this._getMapKey("ReferenceConut");
            let val = 0;
            if (hashMap.containsKey(key)) {
                val = Number(hashMap.get(key)) || 0;
            }
            hashMap.put(key, ++val);

            this.isAddReference = true;
            //log("添加引用:" + MY_TYPE);
            addListener("onClose", $.toString((Gkey) => {
                //log("离开")
                this[Gkey]._removeReference();
            }, Gkey));
            addListener("onRefresh", $.toString((Gkey) => {
                //log("刷新")
                this[Gkey]._removeReference(true);
            }, Gkey));
        }
        return this;
    },
    _removeReference(isR) {
        let hashMap = this.getHashMap(mapSymbol);
        let key = this._getMapKey("ReferenceConut");
        let val = 0;
        if (hashMap.containsKey(key)) {
            val = Number(hashMap.get(key)) || 0;
        }
        //log("ReferenceConuta:" + val);

        if (isR) {
            if (val > 0)
                hashMap.put(key, --val);
        } else {
            hashMap.put(key, --val);
        }
        //log("ReferenceConutb:" + val);
        if (val <= 0 && !isR) {
            //log("开始处理")
            let key2 = this._getMapKey("ReferenceKeys");
            let val2 = hashMap.get(key2) || new Set();
            //log(val2)
            val2.forEach(key => {
                try {
                    //log("正在释放模块:"+key);
                    this.clear(key, module => {
                        //log("正在释放模块:"+module.close.toString());
                        module.close()
                    });
                } catch (e) {
                    log("模块" + key + "释放失败@" + e.toString());
                }
            });

            //log("ReferenceKeys:" + Array.from(val2));
            hashMap.remove(key);
            hashMap.remove(key2);
        }
    },
    get(key, def) {
        key = this.getMapKey(key);
        let hashMap = this.getHashMap(mapSymbol);
        if (!hashMap.containsKey(key)) return def;
        let val = hashMap.get(key);
        if (this.raw) {
            return val;
        } else {
            return dealWithVal(val);
        }
    },
    getRaw(key, def) {
        key = this.getMapKey(key);
        let hashMap = this.getHashMap(mapSymbol);
        if (!hashMap.containsKey(key)) return def;
        return hashMap.get(key);
    },
    useRaw(noUseRaw) {
        this.raw = !noUseRaw;
        return this;
    },
    put(key, val) {
        if (val === void 0) return;
        let hashMap = this.getHashMap(mapSymbol);
        hashMap.put(this.getMapKey(key), val);
        return val;
    },

    clearAll() {
        let self = this[selfSymbol];
        let hashMap = this.getHashMap(mapSymbol);
        this.getHashMap(mapSymbol).forEach((key, value) => {
            if (isString(key) && String(key).startsWith(self)) {
                hashMap.remove(key);
            }
        });
    },
    clearAllAndClose() {
        let self = this[selfSymbol];
        let hashMap = this.getHashMap(mapSymbol);
        this.getHashMap(mapSymbol).forEach((key, value) => {
            if (isString(key) && String(key).startsWith(self)) {
                if (typeof value.close == "function") {
                    try {
                        value.close();
                    } catch (e) {}
                }
                hashMap.remove(key);
            }
        });
    },
    clear(key, call) {
        if (this.hasButNoCall(key)) {
            let hashMap = this.getHashMap(mapSymbol);
            if (typeof call === "function") {
                call(this.get(key));
            }
            hashMap.remove(this.getMapKey(key));
        }
    },
    has(key, call) {
        let mapKey = this.getMapKey(key);
        let hashMap = this.getHashMap(mapSymbol);
        let res = !!hashMap.containsKey(mapKey);
        if (res && typeof call === "function") {
            call(this.get(key));
        }
        return res;
    },
    hasButNoCall(key) {
        let mapKey = this.getMapKey(key);
        let hashMap = this.getHashMap(mapSymbol);
        return !!hashMap.containsKey(mapKey);
    },
    define(key, val) {
        if (this.hasButNoCall(key)) {
            return this.get(key);
        }
        return this.put(key, val);
    },
    defineLazy(key, lazy) {
        if (this.hasButNoCall(key)) {
            return this.get(key);
        }
        return this.put(key, lazy());
    },
    defineModule(key, path, isNew) {

        if (path === undefined) {
            path = key;
        }
        if (isNew) return this.put(key, $.require(path, key));
        return this.defineLazy(key, () => $.require(path, key));
    },
    defineModuleAndAutoClose(...args) {

        let module = this.defineModule.apply(this, args);
        if (typeof module !== "object" || typeof module.close !== "function") {
            throw new TypeError("Module must be Object, and module.close is a function.");
        }

        let hashMap = this.getHashMap(mapSymbol);
        let key = this._getMapKey("ReferenceKeys");
        let val;
        if (hashMap.containsKey(key)) {
            val = hashMap.get(key)
        } else {
            val = new Set();
            hashMap.put(key, val);
        }
        val.add(args[0]);

        return module;
    },
    listKeys() {
        let entrySet = this.getHashMap(mapSymbol).entrySet();
        let selfKey = this[selfSymbol];
        let keys = [];

        for (let entry of entrySet) {
            let key = entry.getKey();
            if (isString(key) && key.startsWith(selfKey)) {
                keys.push(String(key).replace(selfKey, ""));
            }
        }
        return keys;
    },
    toJSON() {
        let object = {};
        let hashMap = this.getHashMap(mapSymbol);
        let selfKey = this[selfSymbol];
        hashMap.forEach((key, value) => {
            if (!isString(key)) {
                return;
            }
            let keyString = String(key);
            if (keyString.startsWith(selfKey)) {
                object[keyString.replace(selfKey, "")] = hashMap.get(key);
            }
        });
        return object;
    }
});
GlobalVar.prototype[Symbol.iterator] = function() {
    let hashMap = this.getHashMap(mapSymbol);
    let selfKey = this[selfSymbol];
    let iterator = hashMap.entrySet().iterator();
    return (function*() {
        while (iterator.hasNext()) {
            let me = iterator.next();
            let key = me.getKey();
            if (!isString(key)) {
                continue;
            }
            key = String(key);
            if (key.startsWith(selfKey)) {
                yield [key.replace(selfKey, ""), dealWithVal(me.getValue())];
            }
        }
    })();
}
const GlobalMap = _globalMap;
//_globalMap = void 0;
let RuleGlobalMapKey = (typeof MY_RULE !== "undefined" && MY_RULE) ? MY_RULE.title : "";
let AppGlobalMapKey = "AppGlobalMap";
if (RuleGlobalMapKey === AppGlobalMapKey) {
    let randomKey = "";
    if (GlobalMap.containsKey(0)) {
        randomKey = String(GlobalMap.get(0));
    } else {
        randomKey = String(Date.now());
        GlobalMap.put(0, randomKey);
    }
    RuleGlobalMapKey = RuleGlobalMapKey + randomKey;
}
$.exports = {
    GA: new GlobalVar(GlobalMap, AppGlobalMapKey),
    GM: new GlobalVar(GlobalMap, RuleGlobalMapKey)
}
let $setResult = setResult;
let $refreshPage = refreshPage;
let $setPreResult = setPreResult;
let cx = org.mozilla.javascript.Context.getCurrentContext();
let isAddPageReference = false;
$.hiker.refreshPage = function(...args) {
    GM._removeReference(true);
    GA._removeReference(true);
    $refreshPage.apply($refreshPage, args);

}
$.hiker.setResult = function(...args) {
    if (!isAddPageReference) {
        GM._addPageReference("GM");
        GA._addPageReference("GA");
        isAddPageReference = true;
    }
    $setResult.apply($setResult, args);
}
$.hiker.setPreResult = function(...args) {
    if (!isAddPageReference) {
        GM._addPageReference("GM");
        GA._addPageReference("GA");
        isAddPageReference = true;
    }
    $setPreResult.apply($setPreResult, args);
}
cx.enqueueMicrotask(() => {
    let context = getCurrentActivity();
    if (typeof MY_TYPE !== "undefined" && ["home", "search"].includes(MY_TYPE) && !isAddPageReference && (context instanceof com.example.hikerview.ui.home.MainActivity || context instanceof com.example.hikerview.ui.home.RuleWindowActivity)) {
        GM._removeReference();
        GA._removeReference();
    }
});