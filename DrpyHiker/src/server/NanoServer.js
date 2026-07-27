
const NanoHTTPD = Packages.fi.iki.elonen.NanoHTTPD;

let serverInstance = null;
let serverPort = 0;
let handlers = []; // 存储路由: { method, path, pattern, paramNames, callback }

function getAvailablePort() {
    let ss = new java.net.ServerSocket(0);
    let p = ss.getLocalPort();
    ss.close();
    return p;
}

// 完美复刻 Route.java 的正则编译逻辑
function compilePattern(path) {
    if (!path) path = "/";
    if (!path.startsWith("/")) path = "/" + path;

    let paramNames = [];
    let regexStr = "^";
    let parts = path.split("/");

    for (let p of parts) {
        if (!p) continue;
        regexStr += "/";
        if (p.startsWith(":") && p.endsWith("*") && p.length > 2) {
            // 匹配 :xxx* (例如 :proxyPath*)
            paramNames.push(p.substring(1, p.length - 1));
            regexStr += "(.*)";
        } else if (p.startsWith(":")) {
            // 匹配 :xxx (例如 :mod)
            paramNames.push(p.substring(1));
            regexStr += "([^/]+)";
        } else {
            regexStr += p;
        }
    }
    // 兼容可能带 / 或不带 / 的结尾
    regexStr += "/?$";
    return { pattern: new RegExp(regexStr), paramNames: paramNames };
}

const NanoServer = {
    start: function() {
        if (serverInstance != null) return serverPort;
        try {
            serverPort = getAvailablePort();
            serverInstance = new JavaAdapter(NanoHTTPD, {
                serve: function(session) {
                    try {
                        let method = String(session.getMethod().name());
                        let uri = String(session.getUri());
                        // 剥离查询参数部分，虽然 NanoHTTPD 的 getUri 通常不带
                        if (uri.indexOf("?") > -1) uri = uri.substring(0, uri.indexOf("?"));

                        for (let i = 0; i < handlers.length; i++) {
                            let h = handlers[i];
                            if (h.method !== "ALL" && h.method !== method) continue;

                            let match = uri.match(h.pattern);
                            if (match) {
                                // 提取路径参数
                                let pathParams = {};
                                for (let j = 0; j < h.paramNames.length; j++) {
                                    // 解码 URL 编码的参数
                                    pathParams[h.paramNames[j]] = decodeURIComponent(match[j + 1] || "");
                                }
                                // 将 Query 参数与 Path 参数合并
                                let queryParams = session.getParms();
                                let it = queryParams.keySet().iterator();
                                while (it.hasNext()) {
                                    let k = String(it.next());
                                    pathParams[k] = String(queryParams.get(k));
                                }

                                // 移交业务回调
                                let res = h.callback(session, pathParams);
                                if (res != null) return res;
                            }
                        }
                        
                        return NanoServer.createResponse(404, "text/plain", "404 Not Found (DrpyHiker NanoServer)");
                    } catch (e) {
                        console.print(console.Level.e, "NanoServer 运行异常: " + e, "node:Server");
                        return NanoServer.createResponse(500, "text/plain", String(e));
                    }
                }
            }, serverPort);

            serverInstance.start(5000, true);
            console.print(console.Level.i, "NanoServer 本地代理已启动，端口: " + serverPort, "node:Server");
            return serverPort;
        } catch(e) {
            console.print(console.Level.e, "NanoServer 启动失败: " + e, "node:Server");
            serverInstance = null;
            return 0;
        }
    },

    stop: function() {
        if (serverInstance != null) {
            serverInstance.stop();
            serverInstance = null;
            serverPort = 0;
            
        }
    },
    close(){
        log("关闭代理");
        this.stop();
        handlers = [];
        
    },
    getPort: function() { return serverPort; },

    registerRoute: function(method, path, callback) {
        method = method.toUpperCase();
        let compiled = compilePattern(path);
        handlers.push({ 
            method: method, 
            path: path, 
            pattern: compiled.pattern, 
            paramNames: compiled.paramNames, 
            callback: callback 
        });
        console.print(console.Level.d, "注册路由: " + method + " " + path, "node:Server");
    },

    createResponse: function(statusInt, mimeType, data) {
        let status = NanoHTTPD.Response.Status.lookup(statusInt) || NanoHTTPD.Response.Status.OK;
        if (data instanceof java.io.InputStream) {
            return NanoHTTPD.newFixedLengthResponse(status, mimeType, data, new java.lang.Long(data.available()));
        } else {
            return NanoHTTPD.newFixedLengthResponse(status, mimeType, String(data));
        }
    }
};

$.exports = NanoServer;
