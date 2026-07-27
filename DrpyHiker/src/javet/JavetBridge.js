
// 利用 Rhino 特性加载 Javet 的上下文回调类
const JavetCallbackContext = new org.mozilla.javascript.NativeJavaClass(this, findJavaClass("com.caoccao.javet.interop.callback.JavetCallbackContext"));

/**
 * 内部通用方法：将 Rhino 对象包装为 Java 对象
 */
function createJavaProxy(obj, hasVarArgs) {
    let varArgsNames = [];
    let newObject = {};
    if (hasVarArgs && obj) {
        Object.keys(obj).forEach(n => {
            let originalName = n;
            if (n.startsWith("_")) {
                n = n.replace("_", "");
                varArgsNames.push(n);
            }
            newObject[n] = obj[originalName];
        });
    } else {
        newObject = obj || {};
    }
    // 使用 JavaAdapter 伪装为纯正的 Java Object
    let javaObject = new JavaAdapter(java.lang.Object, newObject);
    return { javaObject, varArgsNames };
}

/**
 * 【安全模式】通过反射和深拷贝绑定 (对应原版带 2 的方法)
 */
function bindSafe(nodeRuntime, targetName, obj, hasVarArgs, isUnstructure) {
    let proxy = createJavaProxy(obj, hasVarArgs);
    const tempName = isUnstructure ? `$javet_${String(Date.now()).slice(-7, -1)}` : targetName;
    
    nodeRuntime.getGlobalObject().set(tempName, proxy.javaObject);

    nodeRuntime.getExecutor($.toString((tempName, targetName, varArgsNames, isUnstructure) => {
        const nJava = globalThis[tempName];
        let target = isUnstructure ? globalThis : (globalThis[targetName] = {});

        if (isUnstructure) delete globalThis[tempName];

        const methods = nJava.getClass().getDeclaredMethods();
        for (let m of methods) {
            let mName = String(m.getName());
            if (['wait', 'equals', 'toString', 'hashCode', 'getClass', 'notify', 'notifyAll'].includes(mName)) continue;
            
            let isVarArgs = varArgsNames.includes(mName);

            target[mName] = function(...args) {
                // 【护城河】强制序列化复杂对象
                const processed = args.map(v =>
                    Object.prototype.toString.call(v) === "[object Object]" ?
                    JSON.parse(JSON.stringify(v)) : v
                );
                const invokeArgs = isVarArgs ? [nJava, processed] : [nJava].concat(processed);
                return m.invoke.apply(nJava, invokeArgs);
            };
        }
    }, tempName, targetName, proxy.varArgsNames, isUnstructure)).executeVoid();
}

/**
 * 【极速模式】通过 JavetCallbackContext 底层直接绑定 (对应原版不带 2 的方法)
 */
function bindDirect(nodeRuntime, targetName, obj, hasVarArgs, isUnstructure) {
    let proxy = createJavaProxy(obj, hasVarArgs);
    
    // 如果是解构，直接挂在全局；否则创建一个 V8 Object 挂在目标名下
    let nodeObject = isUnstructure ? nodeRuntime.getGlobalObject() : nodeRuntime.createV8ValueObject();
    if (!isUnstructure) {
        nodeRuntime.getGlobalObject().set(targetName, nodeObject);
    }

    let clz = proxy.javaObject.getClass();
    for (let method of clz.getMethods()) {
        let mName = String(method.getName());
        if (['wait', 'equals', 'toString', 'hashCode', 'getClass', 'notify', 'notifyAll'].includes(mName)) continue;
        
        if (method.getDeclaringClass() === clz) {
            // 底层回调绑定，性能极高
            nodeObject.set(mName, nodeRuntime.createV8ValueFunction(new JavetCallbackContext(mName, proxy.javaObject, method)));
        }
    }

    // 处理可变参数形式 (V8 内部重写一层解包)
    if (proxy.varArgsNames.length > 0) {
        nodeRuntime.getExecutor($.toString((varArgsNames, targetName, isUnstructure) => {
            let sepObj = isUnstructure ? globalThis : (globalThis[targetName] || {});
            varArgsNames.forEach(k => {
                let f = sepObj[k];
                if (typeof f === "function") {
                    sepObj[k] = function(...arg) {
                        return f(arg);
                    };
                }
            });
        }, proxy.varArgsNames, targetName, isUnstructure)).executeVoid();
    }
}

$.exports = {
    /**
     * 【极速模式】作为一个整体挂载 (如 globalThis.HikerUtils.xxx)
     * 适用场景：全基础类型传参、不涉及大对象的工具类。
     */
    bind: function(nodeRuntime, name, obj, hasVarArgs) {
        bindDirect(nodeRuntime, name, obj, hasVarArgs, false);
    },
    
    /**
     * 【极速模式】打散直接挂载 (如 globalThis.xxx)
     */
    bindAndUnstructure: function(nodeRuntime, obj, hasVarArgs) {
        bindDirect(nodeRuntime, null, obj, hasVarArgs, true);
    },

    /**
     * 【安全模式】作为一个整体挂载 (对应 bind2)
     * 适用场景：V8 可能会回传复杂 Object/JSON，需要彻底斩断内存引用。
     */
    bind2: function(nodeRuntime, name, obj, hasVarArgs) {
        bindSafe(nodeRuntime, name, obj, hasVarArgs, false);
    },

    /**
     * 【安全模式】打散直接挂载 (对应 bindAndUnstructure2)
     */
    bindAndUnstructure2: function(nodeRuntime, obj, hasVarArgs) {
        bindSafe(nodeRuntime, null, obj, hasVarArgs, true);
    }
};