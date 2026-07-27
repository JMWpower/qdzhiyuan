let libs = module.importParam || 'hiker://files/data2/' + MY_RULE.title;

function importClass(clsname) {
    return new org.mozilla.javascript.NativeJavaClass(this, findJavaClass(clsname));
}
//QuickJS
const QuickJSLoader = loadJavaClass(`${libs}/quarkjs-wrapper/classes.dex`, 'com.whl.quickjs.android.QuickJSLoader', `${libs}/quarkjs-wrapper/${getCpuAbi()}`);
QuickJSLoader.init();
const QuickJSContext = importClass("com.whl.quickjs.wrapper.QuickJSContext");
const JSCallFunction = importClass("com.whl.quickjs.wrapper.JSCallFunction");
const JSUtils = importClass("com.whl.quickjs.wrapper.JSUtils");
const QuickJSFunction = importClass("com.whl.quickjs.wrapper.QuickJSFunction");
const JSObject = importClass("com.whl.quickjs.wrapper.JSObject");
const UriUtil = importClass("com.whl.quickjs.wrapper.UriUtil");
const ModuleLoader = importClass("com.whl.quickjs.wrapper.ModuleLoader");
const RequireUtils = com.example.hikerview.ui.rules.service.require.RequireUtils;
const JSArray = importClass("com.whl.quickjs.wrapper.JSArray");
const QuickJSObject = importClass("com.whl.quickjs.wrapper.QuickJSObject");
const QuickJSArray = importClass("com.whl.quickjs.wrapper.QuickJSArray");
const QuickJSException = importClass("com.whl.quickjs.wrapper.QuickJSException")
const Thread = java.lang.Thread;
let title = "";
if (typeof MY_RULE !== "undefined" && MY_RULE != null) {
    title = MY_RULE.title;
} else if (typeof MY_TITLE !== "undefined") {
    title = MY_TITLE;
}

function QuickJsEngine() {
    this.executor = java.util.concurrent.Executors.newSingleThreadExecutor();
    this.executor.submit(new java.lang.Runnable(() => {
        this.threadId = Thread.currentThread().getId();
    })).get();
    this.moduleObjects = {};
    this.wrapMode = 0;
    this._init_();
}

function getCurrentThreadId(context) {
    let cz = context.getClass();
    let currentThreadId = cz.getDeclaredField("currentThreadId");
    currentThreadId.setAccessible(true);
    return currentThreadId.get(context);
}

function getTypeName(obj) {
    return Object.prototype.toString.call(obj);
}

function wrapRhinoJs(value, quickJsEngine, useWrapMode) {
    let type = $.type(value);

    if (["object", "array"].includes(type) && !(value instanceof java.lang.Object)) {
        return quickJsEngine.context.parseJSON(JSON.stringify(value));
    } else if ("function" == type) {
        return JSCallFunction((args) => wrapRhinoJs(value.apply(null, args.map(v => unwrapQjs(v, quickJsEngine, useWrapMode))), quickJsEngine, useWrapMode));
    }

    return value;
}

function wrapQJsObject(value, quickJsEngine) {
    let newobj = {};
    if (!(value instanceof QuickJSObject)) return newobj;

    let keys = Array.from(quickJsEngine.context.getKeys(value));

    keys.forEach(key => {
        Object.defineProperty(newobj, key, {
            enumerable: true,
            get() {
                return quickJsEngine.submitCallable(() => {
                    let obj = value.get(key);
                    if (obj instanceof QuickJSFunction) {
                        return function(...args) {
                            return quickJsEngine.callByObjectInWrap.apply(quickJsEngine, [2, value, key].concat(args))
                        }
                    }
                    return unwrapQjs(obj, quickJsEngine, 2);
                });
            },
            set(key, val) {
                newobj[key] = val;
            }
        });
    })

    return Object.freeze(newobj);
}

function unwrapQjs(value, quickJsEngine, useWrapMode) {
    let wrapMode = useWrapMode || quickJsEngine.wrapMode;
    if (value instanceof QuickJSObject && wrapMode < 3) {
        let type;
        let _typeReturn2 = quickJsEngine.getGlobalThis().getJSFunction("_typeReturn2");

        try {
            type = _typeReturn2.call(value);
        } finally {
            _typeReturn2 && _typeReturn2.release();
        }

        if (type == "TypedArray") {
            return JSUtils.toBytes(value.get("buffer"));
        } else if (type == "ArrayBuffer") {
            return JSUtils.toBytes(value);
        }

        if (wrapMode === 2) {
            if (type == "Object" || type == "Module") {
                return wrapQJsObject(value, quickJsEngine);
            } else if (type == "Array") {
                let arr = [],
                    length = value.length();
                for (let i = 0; i < length; i++) {
                    arr.push(unwrapQjs(value.get(i), quickJsEngine, 2));
                }
                value.release();
                return arr;
            } else if (type == "Function") {
                value.hold();
                return function(...args) {
                    return quickJsEngine.callByFuncInWrap.apply(quickJsEngine, [2, value].concat(args));
                }
            }
        } else if (wrapMode === 1) {
            if (type == "Promise") {
                let r;
                let then = value.getJSFunction("then");

                if (then != null) {

                    then.call(JSCallFunction(v => {
                        r = v[0];
                        return v[0];
                    }));
                    then.release();
                }

                value.release();
                return unwrapQjs(r, quickJsEngine, wrapMode);
            }
            try {
                return JSON.parse(value.toJsonString());
            } catch (e) {
                return {};
            }
        } else if (wrapMode === 0) {
            if (type == "Array") {
                return Array.from(value.toArray());
            }
        }
    }
    if (value instanceof java.lang.String) {
        return String(value);
    }

    return value;
}

function fixPath(path) {
    if (!fileExist(path) && !path.split("/").at(-1).includes(".")) {
        return path + ".js";
    }
    return path;
}

function getModuleStringCode(moduleName) {
    //log("解析模块:" + moduleName)
    let code = "";
    if (moduleName.startsWith("page://")) {
        let codeObject = request(moduleName.replace("page://", "hiker://page/"));
        if (!codeObject) return null;
        code = JSON.parse(codeObject).rule;
    } else if (moduleName.startsWith("data://") || moduleName.startsWith("file://") || moduleName.startsWith("data2://")) {
        code = request(fixPath(moduleName.replace("data://", "hiker://files/data/" + title + "/").replace("data2://", "hiker://files/data2/" + title + "/")));
    } else if (moduleName.startsWith("https://") || moduleName.startsWith("http://")) {
        let [url, time] = moduleName.split("$");
        let cache = getPath("hiker://files/libs/" + md5(moduleName) + ".js").slice(7);

        if (time && !Number.isNaN((time = Number(time)))) {
            code = fetchCache(url, time);
        } else {
            code = request(url);
        }
        RequireUtils.generateRequireMap(title, url, "", cache);
    }

    return code;
}

function moduleNormalizeName(moduleBaseName, moduleName, paths) {
    for (let [alias, path] of paths) {
        if (moduleName.startsWith(alias)) {
            return path + moduleName.slice(alias.length);
        }
    }
    return UriUtil.resolve(moduleBaseName, moduleName);
}
QuickJsEngine.Console = QuickJSContext.Console;
QuickJsEngine.ModuleLoader = ModuleLoader;
QuickJsEngine.getHikerModuleLoader = function(paths) {
    paths = paths || {};
    paths = Object.entries(paths);
    return new ModuleLoader({
        getModuleStringCode,
        moduleNormalizeName(moduleBaseName, moduleName) {
            //log("解析模块路径:" + moduleBaseName + "," + moduleName)
            //log(UriUtil.resolve(moduleBaseName, moduleName))
            return moduleNormalizeName(moduleBaseName, moduleName, paths);
        },
        isBytecodeMode() {
            return false;
        }
    });
}
QuickJsEngine.getHikerByteModuleLoader = function(context, paths) {
    paths = paths || {};
    paths = Object.entries(paths);
    return new ModuleLoader({
        getModuleBytecode(moduleName) {
            return context.compileModule(getModuleStringCode(moduleName), moduleName);
        },
        moduleNormalizeName(moduleBaseName, moduleName) {
            //log("解析模块路径:" + moduleBaseName + "," + moduleName)
            //log(UriUtil.resolve(moduleBaseName, moduleName))
            return moduleNormalizeName(moduleBaseName, moduleName, paths);
        },
        isBytecodeMode() {
            return true;
        }
    });
}
QuickJsEngine.getHikerConsole = function() {
    return function(args) {
        args = Array.from(args, String);
        /*if (!["error", "assert"].includes(args[0])) {
            args = args.slice(0, 2);
        }*/
        log(args.join("->"));
    }
}
Object.assign(QuickJsEngine.prototype, {
    JSUtils: JSUtils,
    getCtx() {
        return this.context;
    },
    setWrapMode(b) {
        this.wrapMode = Number(b) || 0;
    },
    submitCallable(callable) {
        if (Thread.currentThread().getId() == this.threadId) return callable();
        return this.executor.submit(new java.util.concurrent.Callable(callable)).get();
    },
    submit(runnable) {
        if (Thread.currentThread().getId() == this.threadId) return runnable();
        this.executor.submit(new java.lang.Runnable(runnable)).get();
    },
    getGlobalThis() {
        if (this.context)
            return this.context.getGlobalObject();
        else
            return null;
    },
    setConsole(stdout) {
        this.submit(() => {
            if (typeof stdout === "function") {
                this.context.getGlobalObject().get("console").set("stdout", JSCallFunction(stdout));
            } else if (stdout instanceof QuickJSContext.Console) {
                this.context.setConsole(stdout);
            }
        });
    },
    setModuleLoader(moduleLoader) {
        this.submit(() => {
            this.context.setModuleLoader(moduleLoader);
        });
    },
    evaluate(script, fileName) {
        return this.submitCallable(() => {
            if (typeof fileName == "string") {
                return unwrapQjs(this.context.evaluate(script, fileName), this);
            } else {
                return unwrapQjs(this.context.evaluate(script), this);
            }
        });
    },
    evaluateModule(script, fileName) {
        this.submit(() => {
            try {
                let promise = this.context.evaluateModule(script, fileName || "unknown.js");

                if (promise) {
                    let then = promise.getJSFunction("then");
                    if (then != null) {
                        then.call(JSCallFunction(v => 0))
                    }
                }
            } catch (e) {
                //log(e.toString());
                throw e;
            }
        });
    },
    _init_() {
        this.submit(() => {
            this.context = QuickJSContext.create();

            this.getGlobalThis().set("_log_hiker", JSCallFunction((a) => log(a[0])));
            this.getGlobalThis().set("_returnModule", JSCallFunction((a, b) => {
                this.moduleObjects[a[0]] = a[1];
            }));

            this.getGlobalThis().set("_hikerfiles_", getPath("hiker://files/").slice(7));
            this.getGlobalThis().set("_datafiles_", libs);
            this.context.evaluate($.toString(() => {
                globalThis.log = function(...args) {
                    _log_hiker(args.map(v => format(v)).join(','))
                }
                globalThis._typeReturn = function(object) {
                    return Object.prototype.toString.call(object).slice(8, -1);
                }
                globalThis._instanceof = function(object, name) {
                    try {
                        return object instanceof globalThis[name];
                    } catch {
                        return false;
                    }
                }

                function isTypedArray(value) {
                    return ArrayBuffer.isView(value) && !(value instanceof DataView);
                }
                globalThis._typeReturn2 = function(object) {
                    if (isTypedArray(object)) {
                        return "TypedArray";
                    }
                    return Object.prototype.toString.call(object).slice(8, -1);
                }
                globalThis._bytesToBuffer = function(data) {
                    return Buffer.from(data);
                }
            }));
            //this.timers = new Timers(this);

            /*this.registerJS({
                setTimeout: this.timers.setTimeout.bind(this.timers),
                clearTimeout: this.timers.clearTimeout.bind(this.timers),
                setInterval: this.timers.setInterval.bind(this.timers),
                clearInterval: this.timers.clearInterval.bind(this.timers)
            }, null, 2)*/

        });
    },
    toJSObject(data) {
        return this.submitCallable(() => {
            if (Array.isArray(data)) {
                let arr = [];
                let jsArray = this.context.createJSArray();
                for (let i = 0; i < data.length; i++) {
                    jsArray.push(this.toJSObject(data.at(i)));
                }
                return arr;
            } else if (getTypeName(data) === "[object Object]") {
                let object = this.context.createJSObject();
                for (let key in data) {
                    object.set(key, this.toJSObject(data[key]));
                }
                return object;
            }
            return data;
        });
    },

    callByObjectInWrap(useWrapMode, object, name, ...args) {
        return this.submitCallable(() => {
            let func, then;
            try {
                if (!(object instanceof QuickJSObject)) throw Error("参数0需要qjs对象或模块");
                func = object.getJSFunction(name);
                if (func == null) throw Error("找不到函数:" + name);

                let result = func.call(args.map(v => wrapRhinoJs(v, this, useWrapMode)));
                if (!(result instanceof JSObject)) return result;
                let promise = result;
                then = promise.getJSFunction("then");
                if (then != null) {
                    then.call(JSCallFunction(arg => {
                        result = arg;
                    }));
                    promise.release();
                }
                return unwrapQjs(result, this, useWrapMode);
            } finally {
                func && func.release();
                then && then.release();
            }
        });
    },
    callByObject(...args) {
        return this.submitCallable(() => {
            args.unshift(null);
            return this.callByObjectInWrap.apply(this, args);
        });
    },
    call(...args) {
        this.submit(() => {
            args.unshift(this.getGlobalThis());
        });
        return this.callByObject.apply(this, args);
    },
    callByFuncInWrap(useWrapMode, func, ...args) {
        return this.submitCallable(() => {
            return unwrapQjs(func.call(args.map(v => wrapRhinoJs(v, this))), this, useWrapMode);
        });
    },
    callByFunc(func, ...args) {
        return this.submitCallable(() => {
            return unwrapQjs(func.call(args.map(v => wrapRhinoJs(v, this))), this);
        });
    },
    getModule(p, isGetDefault) {
        let module = null;

        if (this.moduleObjects[p]) {
            module = this.moduleObjects[p];
        } else {
            let k = JSON.stringify(p);
            this.evaluateModule(`import ${isGetDefault?"moduleObject":"* as moduleObject"} from ${k};_returnModule(${k},moduleObject)`);
            module = this.moduleObjects[p];
        }
        return module;
    },
    getWrapModule(p, isGetDefault) {
        let module = this.getModule(p, isGetDefault);
        this.submit(() => {
            module = unwrapQjs(module, this, 2);
        });
        return module;

    },
    throwJSException(error) {
        if (error instanceof Error) {
            this.submit(() => {
                this.context.evaluate(`throw new ${error.name}(${JSON.stringify(String(error.message))});`)
            });
        } else {
            this.submit(() => {
                this.context.evaluate(`throw ${JSON.stringify(String(error))};`)
            });
        }
    },
    type(object) {
        return this.call("_typeReturn", object);
    },
    instanceof(object, classname) {
        return this.call("_instanceof", object, classname);
    },
    close() {
        this.releaseModule();
        this.submit(() => {
            this.context.destroy();
        });
        //this.timers.release();
        this.executor.shutdownNow();
    },
    releaseObject(object) {
        this.submit(() => {
            if (object instanceof JSObject) {
                object.release();
            }
        });
    },
    releaseModule(p) {
        this.submit(() => {
            if (this.moduleObjects[p]) {
                this.moduleObjects[p].release();
                delete this.moduleObjects[p];
            }
        });
    },
    getMemoryUsedSize() {
        return this.submitCallable(() => {
            return Number(this.context.getMemoryUsedSize());
        });
    },
    initModule: function*() {
        let res = yield ["CALLBACK_KEY", "MY_TICKET"];
        //res
    },
    registerJS(object, bindObject, useWrapMode) {
        this.submit(() => {
            if (bindObject == undefined) {
                bindObject = object;
                object = this.getGlobalThis();
            }
            if (typeof object === "string") {
                let key = object;
                object = this.context.createJSObject();
                this.getGlobalThis().set(key, object);
            }
            if (object instanceof JSObject) {
                for (let key in bindObject) {
                    object.set(key, wrapRhinoJs(bindObject[key], this, useWrapMode));
                }
            }
        });
    },
    getByObject(object, name, retRaw) {
        if (!(object instanceof JSObject)) return null;
        return this.submitCallable(() => {
            if (retRaw) return object.get(name);
            return unwrapQjs(object.get(name), this);
        });
    },
    get(name, retRaw) {
        return this.submitCallable(() => {
            if (retRaw) return this.getGlobalThis().get(name);
            return unwrapQjs(this.getGlobalThis().get(name), this);
        });
    },
    getJSONObject(object) {
        if (!(object instanceof JSObject)) return object;
        return this.submitCallable(() => {
            return JSON.parse(object.toJsonString());
        });
    }
});

$.exports = QuickJsEngine;
/*
$.exports = new QuickJsEngine();

$.exports.setModuleLoader(QuickJsEngine.getHikerModuleLoader());

$.exports.setConsole(QuickJsEngine.getHikerConsole());

*/
function Timers(engine) {
    this.engine = engine;
    this.timerExecutorService = java.util.concurrent.Executors.newScheduledThreadPool(1);

    this.timers = new Map();
    this.lastId = 0;
}
Object.assign(Timers.prototype, {
    setTimeout(func, delay) {
        if (arguments.length === 0) {
            this.engine.throwJSException("Expected function parameter");
            return;
        }
        if (!(typeof func === "function")) {
            this.engine.throwJSException("Expected first argument to be a function");
            return;
        }
        let id = String(++this.lastId);

        let timer = this.timerExecutorService.schedule(new java.lang.Runnable(() => {
            try {
                func();
            } catch (e) {
                //this.engine.throwJSException(e);
            } finally {
                this.timers.delete(id);
            }

        }), delay, java.util.concurrent.TimeUnit.MILLISECONDS);

        this.timers.set(id, timer);
        return id;
    },
    clearTimeout(id) {
        id = String(id);
        let timer = this.timers.get(id);
        this.timers.delete(id);
        if (timer) {
            timer.cancel(false);
        }
    },
    setInterval(func, delay) {
        if (arguments.length === 0) {
            this.engine.throwJSException(new TypeError("Expected function parameter"));
            return;
        }
        if (!(typeof func === "function")) {
            this.engine.throwJSException(new TypeError("Expected first argument to be a function"));
            return;
        }
        let id = String(++this.lastId);
        let timer = this.timerExecutorService.scheduleAtFixedRate(new java.lang.Runnable(() => {
            try {
                func();
            } catch (e) {
                //console.log(e.toString() + e.stack);
                //this.engine.throwJSException(e);
            }
        }), delay, delay, java.util.concurrent.TimeUnit.MILLISECONDS);
        this.timers.set(id, timer);
        return id;
    },
    clearInterval(id) {
        this.clearTimeout(id);
    },
    release() {
        this.timers.clear();
        this.timerExecutorService && this.timerExecutorService.shutdown();
    }
});