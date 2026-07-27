const NanoServer = GM.defineModule('./src/server/NanoServer.js');
const DrpyRoutes = $.require('./src/server/DrpyRoutes.js');

// 初始化 T5 的专属代理路由
DrpyRoutes.init();

const NodeGlobal = {
    /**
     * V8 端调用 getProxy 时，按需唤醒微型服务器并返回动态地址
     */
    appLog(t,s) {
        log(t+","+s)
    },
    getProxy: function(local) {
        let port = NanoServer.getPort();
        if (port === 0) {
            port = NanoServer.start();
        }
        console.log("$getProxy被调用")
        // 生成的 URL 会被 T5 源内部的 JS 拿到并请求
        return "http://127.0.0.1:" + port + "/proxy?do=node";
    },
    javaOnUnhandledRejection(t, m) {

        console.print(console.Level.e, "未捕获的 Promise Reject: " + t + m, "node:T5");

    },
    fetchByHiker: function(url, options) {
        try {
            return fetch(url, options || {});
        } catch (e) {
            console.print(console.Level.e, "fetchByHiker 异常: " + e, "node:T5");
            return null;
        }
    },
    getProxyUrl() {
        let port = NanoServer.getPort();
        if (port === 0) {
            port = NanoServer.start();
        }
        console.log("$getProxyUrl被调用")
        // 生成的 URL 会被 T5 源内部的 JS 拿到并请求
        return java.lang.String("http://127.0.0.1:" + port + "/proxy?do=node");
    },
    md5: function(str) {
        return md5(String(str));
    },
    base64Encode: function(str) {
        return base64Encode(String(str));
    },
    base64Decode: function(str) {
        return base64Decode(String(str));
    },
    toast: function(msg) {
        toast(String(msg));
    }
};

$.exports = NodeGlobal;