const ConfigManager = $.require('./subpage/ConfigManager.js');

// 1. 获取扩展包路径
const dexPath = ConfigManager.t5DexPath;
const soDir = ConfigManager.t5SoDir;

// 2. 触发 Dex 和 SO 的加载环境
console.log(dexPath, soDir)
loadJavaClass(dexPath, 'com.caoccao.javet.interop.V8Host', soDir);

// 3. 封装 importClass 以支持 new 实例化
function importClass(clsname) {
    return new org.mozilla.javascript.NativeJavaClass(this, findJavaClass(clsname));
}

// 4. 导入 Java 并发与线程核心库
const Thread = java.lang.Thread;
const Runnable = java.lang.Runnable;
const LinkedBlockingQueue = java.util.concurrent.LinkedBlockingQueue;
const AtomicBoolean = java.util.concurrent.atomic.AtomicBoolean;
const File = java.io.File;
// 5. 导入 Javet 引擎核心及日志拦截类
const V8Host = importClass("com.caoccao.javet.interop.V8Host");
const NodeRuntimeOptions = importClass("com.caoccao.javet.interop.options.NodeRuntimeOptions");
const JavetProxyConverter = importClass("com.caoccao.javet.interop.converters.JavetProxyConverter");
const V8AwaitMode = importClass("com.caoccao.javet.enums.V8AwaitMode");
const V8ValuePromise = importClass("com.caoccao.javet.values.reference.V8ValuePromise");
const JSRuntimeType = importClass("com.caoccao.javet.enums.JSRuntimeType");
const MyConsoleInterceptor = importClass("com.caoccao.javet.interception.logging.MyConsoleInterceptor");
const IJavetLogger = importClass("com.caoccao.javet.interfaces.IJavetLogger");
const JavetBridge = $.require('./src/javet/JavetBridge.js');
const nodeGlobalFuncs = $.require('./src/javet/NodeGlobal.js');
const NodeModuleModule = importClass("com.caoccao.javet.node.modules.NodeModuleModule");
const NodeModuleProcess = importClass("com.caoccao.javet.node.modules.NodeModuleProcess");
const NodeRuntime = importClass("com.caoccao.javet.interop.NodeRuntime");
const CountDownLatch = java.util.concurrent.CountDownLatch;
const TimeUnit = java.util.concurrent.TimeUnit;

// 6. 全局单例状态（常驻海阔底层 Java 内存）
let nodeRuntime = null;
let taskQueue = new LinkedBlockingQueue();
let daemonThread = null;
let isWorking = new AtomicBoolean(false);

/**
 * 初始化并启动 V8/Node.js 引擎
 * @param {string} projectPath T5影视源的 localt5.js 绝对路径
 */
function startServer(projectPath) {

    if (isWorking.get() || nodeRuntime != null) {
        console.print(console.Level.w, "服务运行中或尚未完全停止，跳过初始化。", "node:T5");
        return true;
    }

    try {
        console.print(console.Level.i, "开始创建 V8 Runtime 单例...", "node:T5");
        isWorking.set(true);

        // A. 配置 V8 参数 (防 OOM 及特性设置)
        let opt = new NodeRuntimeOptions();
        opt.V8_FLAGS.setUseStrict(false);
        NodeRuntimeOptions.V8_FLAGS.setUseStrict(false);
        NodeRuntimeOptions.NODE_FLAGS.setExperimentalSqlite(true);
        NodeRuntimeOptions.NODE_FLAGS.setJsFloat16Array(true);
        NodeRuntimeOptions.NODE_FLAGS.setNoWarnings(true);
        opt.NODE_FLAGS.setCustomFlags([
            "--max-old-space-size=1536",
            "--max-semi-space-size=48",
            "--stack-size=2048",
            "--experimental-vm-modules",
            "--experimental-wasm-modules",
            "--turbo",
            "--no-lazy"
        ]);

        // B. 实例化全局唯一的 NodeRuntime
        //nodeRuntime = V8Host.getNodeInstance().createV8Runtime(opt);

        nodeRuntime = V8Host.getInstance(JSRuntimeType.Node).createV8Runtime(opt);
        nodeRuntime.allowEval(true);
        nodeRuntime.setStopping(true);
        nodeRuntime.setConverter(new JavetProxyConverter());

        let projectFile = new File(projectPath.replace("file://", ""));
        let localRelativePath = projectFile.getParent() + "/";
        nodeRuntime.getGlobalObject().setProperty(NodeRuntime.PROPERTY_DIRNAME, localRelativePath);
        nodeRuntime.getGlobalObject().setProperty(NodeRuntime.PROPERTY_FILENAME, projectFile.getAbsolutePath());
        nodeRuntime.getNodeModule(NodeModuleModule.__javaObject__).setRequireRootDirectory(localRelativePath);
        nodeRuntime.getNodeModule(NodeModuleProcess.__javaObject__).setWorkingDirectory(localRelativePath);

        // C. 挂载控制台日志拦截器
        let myLog = new IJavetLogger($.require("./src/javet/NodeConsole.js").CreateJavetLogger("node:T5"));
        let myConsoleInterceptor = new MyConsoleInterceptor(nodeRuntime, myLog);
        myConsoleInterceptor.register(nodeRuntime.getGlobalObject());
        nodeRuntime.setLogger(myLog);
        /* // 挂载 Promise 拒绝拦截器，对接至原生 Error 输出
         nodeRuntime.setPromiseRejectCallback((event, promise, value) => {
             console.print(console.Level.e, "未捕获的 Promise Reject: " + value, "node:T5");
         });*/

        // D. 注入跨环境桥接 API

        JavetBridge.bindAndUnstructure2(nodeRuntime, nodeGlobalFuncs, false);

        // E. 执行前置沙箱补丁
        let patchCode = fetch("hiker://files/data/DrpyHiker/src/javet/node_patch.js") || "";
        if (patchCode) {
            nodeRuntime.getExecutor(patchCode).executeVoid();
        } else {
            console.print(console.Level.e, "严重警告: 未找到 node_patch.js，环境可能异常！", "node:T5");
            throw new Error("T5:严重警告: 未找到 node_patch.js，环境可能异常！");
        }

        // F. 动态 Import T5 源的核心脚本
        let initScript = `
            delete globalThis.__dirname;
            delete globalThis.__filename;
            (async () => {
                await globalThis.globalImport('${projectPath}');
            })();
        `;
        let v8Result = nodeRuntime.getExecutor(initScript).setModule(true).execute();
        //确保初始化完毕
        nodeRuntime.await(V8AwaitMode.RunTillNoMoreTasks);
        console.print(console.Level.i, "V8 Runtime 初始化完毕，已加载模块: " + projectPath, "node:T5");

        //console.log(v8Result)

        // G. 启动守护线程 (Event Loop) - 动态空闲等待优化
        daemonThread = new Thread(new Runnable(() => {
            console.print(console.Level.d, "守护线程已启动...", "node:T5");

            // 状态与阈值配置
            const BASE_WAIT_TIME = 50; // 基础等待时间
            const OUTER_TIMER_INTERVAL = 1000; // 外层定时器参考间隔
            const MAX_CONSECUTIVE_IDLE = 50; // 最大连续空闲周期阈值

            let consecutiveIdleCycles = 0; // 连续空闲次数
            let lastWorkTimestamp = Date.now(); // 上次工作时间戳

            while (isWorking.get()) {
                try {
                    // 1. 消费任务队列 (排空当前所有任务)
                    let task;
                    while ((task = taskQueue.poll()) != null) {
                        try {
                            task();
                        } catch (taskErr) {
                            console.print(console.Level.e, "任务执行异常: " + taskErr, "node:T5");
                        }
                    }

                    // 2. 检查 V8 运行时状态并触发 Event Loop
                    let hasPendingTasks = false;
                    if (nodeRuntime != null) {
                        // 返回 true 表示 V8 内部还有微任务/Promise需要处理
                        hasPendingTasks = nodeRuntime.await(V8AwaitMode.RunNoWait);
                    }

                    // 3. 动态计算等待时长
                    let waitTime = BASE_WAIT_TIME;

                    if (!hasPendingTasks) {
                        // 【无任务闲置状态】
                        consecutiveIdleCycles++;
                        let idleDuration = Date.now() - lastWorkTimestamp;

                        if (idleDuration > OUTER_TIMER_INTERVAL * 2) {
                            // 深度空闲：等待时间随闲置时间延长，最高限制到 1000ms
                            waitTime = Math.min(1000, Math.floor(idleDuration / 100));
                        } else if (consecutiveIdleCycles > MAX_CONSECUTIVE_IDLE) {
                            // 超过最大空闲周期：适度增加等待时间
                            consecutiveIdleCycles = 0;
                            waitTime = BASE_WAIT_TIME * 2;
                        } else {
                            // 正常空闲：使用基础等待时间
                            waitTime = BASE_WAIT_TIME;
                        }
                    } else {
                        // 【有任务活跃状态】
                        // 重置空闲状态，缩短等待时间以提高事件吞吐率
                        consecutiveIdleCycles = 0;
                        lastWorkTimestamp = Date.now();
                        waitTime = Math.max(10, Math.floor(BASE_WAIT_TIME / 2));
                    }

                    // 4. 执行等待
                    //console.log("v8休眠", waitTime)
                    Thread.sleep(waitTime);

                } catch (e) {
                    console.print(console.Level.e, "守护线程循环异常: " + e, "node:T5");
                    // 异常退避：出错后休眠 1 秒防止死循环 CPU 满载
                    try {
                        Thread.sleep(1000);
                    } catch (ie) {
                        isWorking.set(false);
                        break;
                    }
                }
            }
            console.print(console.Level.d, "守护线程已退出。", "node:T5");
        }));
        daemonThread.start();


        return true;
    } catch (e) {
        console.print(console.Level.e, "V8 引擎启动失败: " + e, "node:T5");
        isWorking.set(false);
        nodeRuntime = null;
        return false;
    }
}

function submitTask(callableFunc) {
    if (!isWorking.get() || nodeRuntime == null) {
        console.print(console.Level.e, "引擎未启动，无法提交任务！", "node:T5");
        return;
    }
    taskQueue.put(callableFunc);
}

function stopServer() {
    isWorking.set(false);
    if (nodeRuntime != null) {
        try {
            console.print(console.Level.i, "正在释放 V8 内存并关闭引擎...", "node:T5");
            nodeRuntime.lowMemoryNotification();
            nodeRuntime.close();
            console.print(console.Level.i, "V8引擎已关闭", "node:T5");
        } catch (e) {
            console.print(console.Level.e, "引擎关闭异常: " + e, "node:T5");
        } finally {
            nodeRuntime = null;
        }
    }
}

function isPromise(r) {
    return r instanceof V8ValuePromise;
}
$.exports = {
    startServer: startServer,
    submitTask: submitTask,
    stopServer: stopServer,
    getRuntime: () => nodeRuntime,
    isRunning: () => isWorking.get(),
    isPromise,
    close() {
        log("关闭NODE引擎");
        stopServer();
    }
};