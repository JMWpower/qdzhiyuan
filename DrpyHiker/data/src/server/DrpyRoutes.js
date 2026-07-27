const DrpyManage = GM.defineModule("DrpyManage");
const NanoServer = GM.defineModule('./src/server/NanoServer.js');
const runtimeConfig = GM.defineModule('./subpage/runtimeConfig.js');
const TypeConverter = $.require("./src/utils/TypeConverter.js");

const Base64 = android.util.Base64;
const ByteArrayInputStream = java.io.ByteArrayInputStream;
const File = java.io.File;
const FileInputStream = java.io.FileInputStream;

/**
 * 1. 处理代理流路由 (等同于 Java 版的 proxyRoute)
 * 对应路由: /proxy/:mod/:sourceKey/:proxyPath*
 */
function handleProxyRoute(session, params) {
    let mod = params.mod;
    let sourceKey = params.sourceKey;
    let proxyPath = params.proxyPath; // 动态提取的长路径
    // 参数回填，兼容 T5 内部的 req/param 获取格式
    params.do = mod;
    try {
        let adapter = DrpyManage.get(sourceKey);
        if (typeof adapter.proxy !== "function") {
            return NanoServer.createResponse(500, "text/plain", "Proxy Error: adapter not have proxy()");
        }
        let res = adapter.proxy(params);

        let resObj = formatProxy(res);

        let code = resObj.code || resObj.status || 200;
        let mime = resObj.header?.["Content-Type"] || resObj.headers?.["content-type"] || "application/octet-stream";
        let headers = resObj.header || resObj.headers || {};

        let response;
        
        // 检测正文是否为 URL，如果是则触发 302 重定向
        if (typeof resObj.content == "string" && /^https?:\/\//i.test(resObj.content.trim())) {
            code = 302;
            headers["Location"] = resObj.content.trim(); // 将目标链接放入响应头
            response = NanoServer.createResponse(code, "text/plain", ""); // 正文留空
        } 
        // 原始流媒体或 Base64 处理逻辑
        else if (resObj.isBase64 || TypeConverter.isByteArray(resObj.content)) {
            response = NanoServer.createResponse(code, mime, TypeConverter.stringToStream(resObj.content, resObj.isBase64));
        } 
        // 兜底逻辑：普通的纯文本内容 (比如 M3U8 文本)
        else {
            response = NanoServer.createResponse(code, mime, String(resObj.content || ""));
        }

        // 统一注入 Headers
        for (let k in headers) {
            if (k.toLowerCase() !== "content-type") response.addHeader(k, String(headers[k]));
        }
        
        return response;
    } catch (e) {
        console.error("代理出错", e);
        return NanoServer.createResponse(500, "text/plain", "Proxy Error: " + e);
    }
}

/**
 * 2. 处理解析路由 (等同于 Java 版的 parseRoute)
 * 对应路由: /parse/:name
 */
function handleParseRoute(session, params) {
    let name = params.name;
    
    try {
        // 利用 TypeConverter 快速将 Java Map 转为 JS Object
        let sessionParms = TypeConverter.javaToJs(session.getParms()) || {};
        let sessionHeaders = TypeConverter.javaToJs(session.getHeaders()) || {};
        
        // 将 query 参数、请求头以及路径参数全部合并
        let paramObj = Object.assign({}, sessionParms, sessionHeaders, params);
        

        // 获取当前活跃的源，并获取对应的适配器实例
        let currentSource = runtimeConfig.getCurrentSource();
        if (!currentSource) {
            return NanoServer.createResponse(500, "text/plain", "Parse Error: No active source configured.");
        }

        let adapter = DrpyManage.get(currentSource.key);

        // 仅当适配器 TAG 为 "t5" 时，执行解析逻辑
        if (adapter && adapter.TAG == "t5") {
            let resObj = adapter.executeParse(name, paramObj);
            console.log("parse结果:", resObj);
            // 返回引擎解析的结果
            return NanoServer.createResponse(200, "application/json", JSON.stringify(resObj || {}));
        } else {
            // 其他适配器尚未实现，直接返回兜底提示
            let fallbackRes = {
                code: 200,
                msg: "Not implemented for adapter type: " + (adapter ? adapter.TAG : "unknown"),
                url: ""
            };
            return NanoServer.createResponse(200, "application/json", JSON.stringify(fallbackRes));
        }

    } catch (e) {
        console.error("Parse 解析路由出错", e);
        return NanoServer.createResponse(500, "text/plain", "Parse Error: " + e);
    }
}

/**
 * 3. 处理本地 JSON 静态文件路由
 * 对应路由: /json/:filename*
 */
function handleJsonRoute(session, params) {
    let filename = params.filename;
    console.log("代理文件", filename);
    
    if (!filename) {
        return NanoServer.createResponse(400, "text/plain", "Bad Request: No filename provided");
    }

    // 映射到当前配置文件同级目录下的 json 目录
    let targetPath = runtimeConfig.getAbsolutePath("./json/" + filename);
    console.log("代理文件路径", targetPath);
    try {
        if (!fileExist(targetPath)) {
            console.error("代理文件不存在", targetPath);
            return NanoServer.createResponse(404, "text/plain", "File not found: " + filename);
        }

        let content = fetch(targetPath);

        // 并非 JSON 文件，返回纯文本或原始数据格式
        if (!filename.endsWith(".json")) {
            return NanoServer.createResponse(200, "text/plain", content);
        }

        // 是 JSON 文件，返回 application/json
        return NanoServer.createResponse(200, "application/json", content);

    } catch (e) {
        console.error("读取代理文件出错", e);
        return NanoServer.createResponse(500, "text/plain", "File Read Error: " + e);
    }
}

function formatProxy(rs) {
    if (!Array.isArray(rs)) return {
        code: 500,
        "content-type": "text/plain",
        content: "Wrong proxy parameter format."
    };
    let status = rs[0] || 200;
    let mime = rs[1] || "application/octet-stream";
    let content = rs[2] || "";
    let headers = rs.length > 3 ? (rs[3] || {}) : {};
    let isBase64 = rs.length > 4 && rs[4] === 1;

    return {
        code: status,
        headers: headers,
        "content-type": mime,
        content: content,
        isBase64
    };
}

/**
 * 4. 处理本地 public 静态资源路由 (支持图片、二进制文件流、文本等)
 * 对应路由: /public/:filename*
 */
function handlePublicRoute(session, params) {
    let filename = params.filename;
    console.log("代理公共资源", filename);
    
    if (!filename) {
        return NanoServer.createResponse(400, "text/plain", "Bad Request: No filename provided");
    }

    // 映射到当前配置文件同级目录下的 public 目录
    let targetPath = runtimeConfig.getAbsolutePath("./public/" + filename);

    // 为了使用 FileInputStream 读取真实的二进制流，我们需要把协议前缀剥离，拿到安卓底层真实路径
    let realPath = targetPath;
    if (realPath.startsWith("hiker://")) {
        realPath = getPath(realPath).replace("file://", "");
    } else if (realPath.startsWith("file://")) {
        realPath = realPath.replace("file://", "");
    }

    try {
        let file = new java.io.File(realPath);
        
        // 检查文件是否存在且不是目录
        if (!file.exists() || !file.isFile()) {
            console.error("代理公共资源不存在", realPath);
            return NanoServer.createResponse(404, "text/plain", "File not found: " + filename);
        }

        // 推断正确的 MIME 类型，保证图片/JS/CSS等能够被正确解析
        let mime = "application/octet-stream"; // 默认二进制流
        let ext = filename.split('.').pop().toLowerCase();
        
        const mimeTypes = {
            "webp": "image/webp",
            "png": "image/png",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "gif": "image/gif",
            "svg": "image/svg+xml",
            "ico": "image/x-icon",
            "css": "text/css",
            "js": "application/javascript",
            "html": "text/html",
            "json": "application/json",
            "txt": "text/plain",
            "mp4": "video/mp4",
            "m3u8": "application/vnd.apple.mpegurl",
            "ts": "video/MP2T"
        };

        if (mimeTypes[ext]) {
            mime = mimeTypes[ext];
        } else {
            let guessMap = java.net.URLConnection.getFileNameMap();
            let guessMime = guessMap.getContentTypeFor(filename);
            if (guessMime) mime = guessMime;
        }

        // 直接创建 FileInputStream，并交给 NanoServer.createResponse 自动处理 available() 和传输
        let is = new java.io.FileInputStream(file);
        
        return NanoServer.createResponse(200, mime, is);

    } catch (e) {
        console.error("读取公共资源文件出错", e);
        return NanoServer.createResponse(500, "text/plain", "File Read Error: " + e);
    }
}

function init() {
    NanoServer.registerRoute("GET", "/proxy/:mod/:sourceKey/:proxyPath*", handleProxyRoute);
    NanoServer.registerRoute("GET", "/parse/:name", handleParseRoute);
    NanoServer.registerRoute("GET", "/json/:filename*", handleJsonRoute);
    
    // 注册 public 静态资源路由
    NanoServer.registerRoute("GET", "/public/:filename*", handlePublicRoute);
    
    // proxy 调用
    NanoServer.registerRoute("ALL", "/proxy", handleProxyRoute);
}

$.exports = {
    init: init
};
