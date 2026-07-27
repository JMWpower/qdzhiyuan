const C_PATH = "./adapter/AdapterConfig.json";
const ConfigManager = $.require('./subpage/ConfigManager.js');

let config = $.require(C_PATH);

function getT3Types() {
    let types = [];
    config.adapters.filter(a => a.type === 3).forEach(a => {
        if (a.apiMatch) types.push.apply(types, a.apiMatch);
    });
    if(ConfigManager.getGlobal("useJar")){
        types.push("csp_");
    }
    // 去重并返回
    return [...new Set(types)];
}

// 【新增核心】基于更加完善的源类型判断规则提取适配器元数据
function getAdapterMeta(source) {
    let type = Number(source.type);
    let api = String(source.api || "");
    
    let typeAdapters = config.adapters.filter(a => a.type === type);
    if (typeAdapters.length === 0) return null;

    if (type === 3) {
        // 1. 精确包含匹配 (如 csp_XBPQ)
        let match = typeAdapters.find(a => a.apiMatch && a.apiMatch.some(t => api.includes(t)));
        if (match) return match;
        
        // 2. 前缀匹配 (拦截未知、未适配的 csp_ 源)
        match = typeAdapters.find(a => a.apiPrefix && a.apiPrefix.some(t => api.startsWith(t)));
        if (match) return match;
        
        // 3. 兜底匹配 (Catvod 框架)
        match = typeAdapters.find(a => a.fallback);
        if (match) return match;
    } else {
        return typeAdapters[0]; // t0, t1, t4, t5 纯靠 type 决定
    }
    
    return null;
}

function findAdapter(source) {
    let meta = getAdapterMeta(source);
    if (!meta) return null;
    return $.require(meta.script);
}

function getJarAdapter(){
    return $.require(config.jar);
}

// 【新增核心】处理分享数据：洗切参数、转化对象，完美接驳 ShareManage
function processSourceForShare(originalSource) {
    let source = Object.assign({}, originalSource);
    let meta = getAdapterMeta(source);
    if (!meta || !meta.share) return source;
    
    let shareConf = meta.share;
    
    // 1. 剥离难以携带的本地 jar 属性
    if (shareConf.stripLocalJar && source.jar && String(source.jar).startsWith("file://")) {
        delete source.jar;
    }
    
    // 2. 将本地的 ext JSON 配置文件读取并转为 Object，
    // 以便后续分享模块能原生将其序列化在口令中
    if (shareConf.processExtAsJsonObj && source.ext) {
        let extStr = String(source.ext);
        if (extStr.startsWith("file://") && extStr.split('?')[0].endsWith(".json")) {
            try {
                let path = extStr.split('?')[0]; 
                // 海阔环境 fetch 本地绝对路径即可读取文本
                let content = fetch(path);
                if (content) {
                    source.ext = JSON.parse(content);
                }
            } catch (e) {
                console.error("AdapterConfig: 解析本地 ext json 失败", e);
            }
        }
    }
    
    return source;
}

$.exports = {
    getT3Types,
    getAdapterMeta,
    findAdapter,
    getJarAdapter,
    processSourceForShare
}
