// 文件路径：subpage/ShareManage.js
// 职责：处理源分享打包、口令解析、本地与云端导入、单源导出、批量 .hkpkg 生成与依赖本地化转正
// 架构：无视框架特性，通用提取并重定位外部文件为本地 ./ 实体存储架构

const Base64 = android.util.Base64;
const ConfigManager = $.require('./subpage/ConfigManager.js');
const drpyEncrypt = $.require("drpyEncrypt");
const AdapterConfig = $.require('./subpage/AdapterConfig.js');

// -------------------------------------------------------------
// 工具函数区
// -------------------------------------------------------------

function ensureFileProtocol(pathStr) {
    if (!pathStr) return pathStr;
    let absPath = getPath(pathStr);
    if (!absPath.startsWith("file://")) {
        return "file://" + absPath;
    }
    return absPath;
}

function resolvePath(path, sourceConfigPath) {
    if (!path || typeof path !== 'string') return path;
    
    if (path.startsWith("./") || path.startsWith("../")) {
        if (sourceConfigPath) {
            try {
                if (sourceConfigPath.startsWith("http")) {
                    return new java.net.URL(new java.net.URL(sourceConfigPath), path).toString();
                } else if (sourceConfigPath.includes("://")) {
                    let baseDir = sourceConfigPath.substring(0, sourceConfigPath.lastIndexOf('/') + 1);
                    let parts = path.split('/');
                    let baseParts = baseDir.split('/');
                    baseParts.pop(); 
                    
                    for (let i = 0; i < parts.length; i++) {
                        if (parts[i] === '.') continue;
                        if (parts[i] === '..') {
                            baseParts.pop(); 
                        } else {
                            baseParts.push(parts[i]);
                        }
                    }
                    return baseParts.join('/');
                }
            } catch(e) {
                console.error("路径拼接异常，走降级流程", e);
            }
        }
        const runtimeConfig = GM.defineModule("runtimeConfig");
        return runtimeConfig.getAbsolutePath(path);
    }
    return path;
}

// -------------------------------------------------------------
// 源信息动态识别与格式化区
// -------------------------------------------------------------

function identifySourceCategory(source) {
    let meta = AdapterConfig.getAdapterMeta(source);
    return meta ? meta.id : 'unknown';
}

function isShareable(source) {
    let meta = AdapterConfig.getAdapterMeta(source);
    return meta && meta.share && meta.share.shareable === true;
}

// 【新增核心】：暴露出来的相对路径还原器，用于保证 MD5 对比和存储的一致性
function formatSourceLocalPaths(source, category) {
    let meta = AdapterConfig.getAdapterMeta(source);
    let shareConf = meta ? meta.share : {};
    let dirName = (shareConf && shareConf.dirName) ? shareConf.dirName : (category || "unknown");
    let baseDir = "hiker://files/rules/DrpyHiker/builtin_sources/" + dirName + "/";
    let filePrefix = md5(source.name + source.key) + "_";

    let newSource = Object.assign({}, source);

    if (newSource.api && String(newSource.api).startsWith("./")) {
        let apiStr = String(newSource.api);
        let pathPart = apiStr.split("?")[0];
        let queryPart = apiStr.includes("?") ? "?" + apiStr.split("?")[1] : "";
        let fileName = pathPart.substring(2); 
        newSource.api = ensureFileProtocol(baseDir + filePrefix + fileName) + queryPart;
    }

    if (newSource.ext && String(newSource.ext).startsWith("./")) {
        let extStr = String(newSource.ext);
        let pathPart = extStr.split("?")[0];
        let queryPart = extStr.includes("?") ? "?" + extStr.split("?")[1] : "";
        let fileName = pathPart.substring(2); 
        newSource.ext = ensureFileProtocol(baseDir + filePrefix + fileName) + queryPart;
    }

    return newSource;
}

// -------------------------------------------------------------
// 核心打包与解析区
// -------------------------------------------------------------

function packSource(source) {
    let meta = AdapterConfig.getAdapterMeta(source);
    if (!meta || !meta.share || !meta.share.shareable) {
        let msg = (meta && meta.share && meta.share.unshareableMsg) ? meta.share.unshareableMsg : "暂不支持直接分享";
        return "error: " + msg;
    }

    let configPath = source._configPath || "";
    let processedSource = Object.assign({}, source);
    
    delete processedSource._configPath; 
    delete processedSource._scriptPath; 
    delete processedSource._jsonPath; 
    delete processedSource._category; 
    let category = meta.id;
    let safeName = String(processedSource.name || "DrpyHikerSource").replace(/[\\/:*?"<>|]/g, "_");

    let shareObj = {
        source: processedSource,
        category: category,
        scriptContent: null, 
        extContent: null,    
        encodeMode: ""
    };

    if (processedSource.jar) {
        let resolvedJar = resolvePath(String(processedSource.jar), configPath);
        if (resolvedJar.startsWith("file://")) {
            delete processedSource.jar; 
        } else {
            processedSource.jar = resolvedJar;
        }
    }

    if (processedSource.ext) {
        if (typeof processedSource.ext === 'object') {
            shareObj.extContent = JSON.stringify(processedSource.ext, null, 2);
            processedSource.ext = "./" + safeName + ".ext.json";
        } else {
            let resolvedExt = resolvePath(String(processedSource.ext), configPath);
            if (resolvedExt.startsWith("file://")) {
                try {
                    let pathPart = resolvedExt.split("?")[0];
                    let queryPart = resolvedExt.includes("?") ? "?" + resolvedExt.split("?")[1] : "";
                    let content = fetch(pathPart);
                    if (content) {
                        shareObj.extContent = content;
                        let extExt = pathPart.includes(".") ? pathPart.split('.').pop() : "json";
                        processedSource.ext = "./" + safeName + ".ext." + extExt + queryPart;
                    } else {
                        processedSource.ext = resolvedExt; 
                    }
                } catch(e) { processedSource.ext = resolvedExt; }
            } else {
                processedSource.ext = resolvedExt; 
            }
        }
    }

    if (processedSource.api) {
        let resolvedApi = resolvePath(String(processedSource.api), configPath);
        if (resolvedApi.startsWith("file://")) {
            try {
                let pathPart = resolvedApi.split("?")[0];
                let queryPart = resolvedApi.includes("?") ? "?" + resolvedApi.split("?")[1] : "";
                let content = fetch(pathPart);
                if (content) {
                    shareObj.scriptContent = content;
                    let apiExt = pathPart.includes(".") ? pathPart.split('.').pop() : "js";
                    processedSource.api = "./" + safeName + "." + apiExt + queryPart;
                } else {
                    processedSource.api = resolvedApi; 
                }
            } catch(e) { processedSource.api = resolvedApi; }
        } else {
            processedSource.api = resolvedApi; 
        }
    }

    let encodeMode = ConfigManager.getGlobal("share_encode");
    if (encodeMode && encodeMode !== "不编码") {
        if (shareObj.scriptContent) {
            try { shareObj.scriptContent = drpyEncrypt.encrypt(shareObj.scriptContent, encodeMode); } catch(e){}
        }
        if (shareObj.extContent) {
            try { shareObj.extContent = drpyEncrypt.encrypt(shareObj.extContent, encodeMode); } catch(e){}
        }
        shareObj.encodeMode = encodeMode; 
    }

    let javaString = new java.lang.String(JSON.stringify(shareObj));
    return String(Base64.encodeToString(javaString.getBytes("UTF-8"), Base64.NO_WRAP));
}

function parseShareCode(shareText) {
    if (!shareText) throw new Error("分享口令不可为空");

    let base64Str = "";
    if (shareText.startsWith("云")) {
        let res = parsePaste(shareText);
        if (!res) throw new Error("云端口令拉取失败");
        base64Str = res.trim();
    } else if (shareText.startsWith("http")) {
        let res = fetch(shareText);
        if (!res) throw new Error("云端口令拉取失败");
        base64Str = res.trim();
    } else if (shareText.startsWith("drpyhiker://")) {
        base64Str = shareText.replace("drpyhiker://", "").trim();
    } else {
        base64Str = shareText.trim();
    }

    let jsonStr = String(new java.lang.String(Base64.decode(base64Str, Base64.DEFAULT), "UTF-8"));
    let shareObj = JSON.parse(jsonStr);

    if (shareObj.encodeMode && shareObj.encodeMode !== "不编码") {
        if (shareObj.scriptContent) {
            try { shareObj.scriptContent = drpyEncrypt.decrypt(shareObj.scriptContent, shareObj.encodeMode); } catch(e){}
        }
        if (shareObj.extContent) {
            try { shareObj.extContent = drpyEncrypt.decrypt(shareObj.extContent, shareObj.encodeMode); } catch(e){}
        }
    }

    // 【核心修复】：解析后直接将 ./ 转为预期的绝对路径格式，以便 MD5 对比不出错
    shareObj.source = formatSourceLocalPaths(shareObj.source, shareObj.category);

    // 精确的真实脚本内容 MD5 用于防冲突判断
    if (shareObj.scriptContent) {
        shareObj.scriptMd5 = md5(shareObj.scriptContent);
    } else if (shareObj.extContent) {
        shareObj.scriptMd5 = md5(shareObj.extContent); 
    } else {
        shareObj.scriptMd5 = md5(JSON.stringify(shareObj.source));
    }

    return shareObj;
}

// -------------------------------------------------------------
// 导入与导出执行区
// -------------------------------------------------------------

function importSource(shareData, isAuto) {
    try {
        let shareObj = typeof shareData === 'string' ? parseShareCode(shareData) : shareData;
        let source = shareObj.source; // 此时已经是还原过绝对路径的 source
        let category = shareObj.category;

        if (category === 'unsupported_csp' || category === 'unknown') {
            return "toast://❌ 导入失败: 该源类型未适配，已被安全拦截";
        }
        
        if (category === 't4' || category === 't5') {
            putMyVar("pending_import_source", JSON.stringify(source));
            putMyVar("pending_import_category", category);
            return $("hiker://empty#noHistory#").rule(() => {
                require("hiker://files/rules/DrpyHiker/subpage/importSpecialDir.js");
            });
        }

        let meta = AdapterConfig.getAdapterMeta(source);
        let shareConf = meta ? meta.share : {};
        let dirName = (shareConf && shareConf.dirName) ? shareConf.dirName : (category || "unknown");
        let baseDir = "hiker://files/rules/DrpyHiker/builtin_sources/" + dirName + "/";
        let safeName = String(source.name).replace(/[\\/:*?"<>|]/g, "_");

        // 统一写入载荷内容
        if (shareObj.scriptContent && source.api && String(source.api).startsWith("file://")) {
            let absPath = String(source.api).split("?")[0].replace("file://", "");
            writeFile(absPath, shareObj.scriptContent);
        }

        if (shareObj.extContent && source.ext && String(source.ext).startsWith("file://")) {
            let absPath = String(source.ext).split("?")[0].replace("file://", "");
            writeFile(absPath, shareObj.extContent);
        }

        let jsonPath = baseDir + safeName + ".json";
        writeFile(jsonPath, JSON.stringify(source, null, 2));

        return isAuto ? "toast://✅ 自动导入成功：" + source.name : "toast://✅ 导入并本地化成功：" + source.name;

    } catch (e) {
        console.error("导入执行失败", e);
        return "toast://❌ 导入失败: " + e.message;
    }
}

function importLocalSource(source, sourceJsonPath, sourceScriptPath) {
    let meta = AdapterConfig.getAdapterMeta(source);
    if (!meta || !meta.share || meta.id === 'unsupported_csp' || meta.id === 'unknown') return "error";
    
    const Fs = $.require('./libs/Fs.js');
    let shareConf = meta.share;
    let baseDir = getPath("hiker://files/rules/DrpyHiker/builtin_sources/" + shareConf.dirName + "/").replace("file://", "");
    if (!Fs.exists(baseDir)) Fs.mkDir(baseDir);
    
    let safeName = String(source.name).replace(/[\\/:*?"<>|]/g, "_");
    let filePrefix = md5(source.name + source.key) + "_";
    
    let targetScriptPath = "";
    let queryPart = "";
    
    if (shareConf.processExtAsScript) {
        let extStr = String(source.ext || "");
        queryPart = extStr.includes('?') ? "?" + extStr.split('?')[1] : "";
        targetScriptPath = Fs.combinPath(baseDir, "/" + filePrefix + safeName + ".js");
        if (sourceScriptPath && Fs.exists(sourceScriptPath)) {
            Fs.copyFile(sourceScriptPath, targetScriptPath, true);
            source.ext = ensureFileProtocol(targetScriptPath) + queryPart;
        }
    } 
    else if (shareConf.processApiAsScript) {
        let apiStr = String(source.api || "");
        queryPart = apiStr.includes('?') ? "?" + apiStr.split('?')[1] : "";
        let extName = meta.id === 't3_py' ? ".py" : ".js";
        targetScriptPath = Fs.combinPath(baseDir, "/" + filePrefix + safeName + extName);
        if (sourceScriptPath && Fs.exists(sourceScriptPath)) {
            Fs.copyFile(sourceScriptPath, targetScriptPath, true);
            source.api = ensureFileProtocol(targetScriptPath) + queryPart;
        }
    }

    let jsonPath = Fs.combinPath(baseDir, "/" + safeName + ".json");
    Fs.writeFile(jsonPath, JSON.stringify(source, null, 2));
    return "success";
}

// -------------------------------------------------------------
// 文件与批量分享导出区
// -------------------------------------------------------------

function exportSystemFile(source) {
    let meta = AdapterConfig.getAdapterMeta(source);
    if (!meta || (meta.share && meta.share.shareable === false)) {
        let msg = (meta && meta.share && meta.share.unshareableMsg) ? meta.share.unshareableMsg : "暂不支持导出分享";
        return "toast://" + msg;
    }

    let configPath = source._configPath || "";
    let safeName = String(source.name || $.dateFormat(new Date().getTime(), "MM-dd_hhmmss")).replace(/[\\/:*?"<>|]/g, "_");
    let cachePath = "hiker://files/_cache/";

    if (typeof source.ext === "object") {
        let pname = safeName + ".json";
        writeFile(cachePath + pname, JSON.stringify(source.ext, null, 2));
        return "share://" + cachePath + pname;
    }

    let targetPath = "";
    let extName = ".js";

    if (meta.share.processExtAsScript) {
        targetPath = String(source.ext || "").split('?')[0];
    } else if (meta.share.processApiAsScript) {
        targetPath = String(source.api || "").split('?')[0];
        if (meta.id === 't3_py') extName = ".py";
    } else if (meta.id === 't5') {
        return "toast://T5源包含复杂依赖目录，请使用文件管理器自主打包分享";
    } else {
        let pname = safeName + ".json";
        writeFile(cachePath + pname, JSON.stringify(source, null, 2));
        return "share://" + cachePath + pname;
    }

    targetPath = resolvePath(targetPath, configPath);

    if (!targetPath || targetPath === "hiker://empty") {
        let pname = safeName + ".json";
        writeFile(cachePath + pname, JSON.stringify(source, null, 2));
        return "share://" + cachePath + pname;
    }

    let pname = targetPath.split("/").pop();
    if (!pname || !pname.includes(".")) pname = safeName + extName;

    if (!targetPath.startsWith("http") && !fileExist(targetPath)) {
        return "toast://无法找到本地绑定的脚本文件：" + targetPath;
    }

    let content = fetch(targetPath);
    if (!content) return "toast://绑定的文件读取或下载失败";

    let finalPath = cachePath + pname;
    writeFile(finalPath, content);
    
    return "share://" + finalPath;
}

function exportBatch(sourcePaths, packName) {
    const Fs = $.require('./libs/Fs.js');
    let cacheDir = getPath("hiker://files/_cache/DrpyHiker/builtin_share/").replace("file://", "");
    Fs.removeDir(cacheDir);
    Fs.mkDir(cacheDir);

    sourcePaths.forEach(item => {
        if(item.jsonpath && Fs.exists(item.jsonpath)) {
            Fs.copyFile(item.jsonpath, Fs.combinPath(cacheDir, "/" + Fs.getName(item.jsonpath)), true);
        }
        if(item.scriptpath && Fs.exists(item.scriptpath)) {
            Fs.copyFile(item.scriptpath, Fs.combinPath(cacheDir, "/" + Fs.getName(item.scriptpath)), true);
        }
    });

    let shellContent = "js:'hiker://page/importAndDifference?rule=DrpyHiker&zipcache=' + encodeURIComponent(MY_DIR);";
    Fs.writeFile(Fs.combinPath(cacheDir, "/安装.hkshell"), shellContent);

    shareDirectory("hiker://files/_cache/DrpyHiker/builtin_share/", packName || "内建源合集.hkpkg");
    return "toast://正在启动批量分享打包...";
}

$.exports = { 
    identifySourceCategory, 
    isShareable, 
    packSource, 
    parseShareCode, 
    importSource, 
    importLocalSource,
    exportSystemFile, 
    exportBatch,
    formatSourceLocalPaths
};