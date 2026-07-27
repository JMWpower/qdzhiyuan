const {
    deepMerge
} = $.require('./subpage/uiUtils.js');

const STORAGE_KEY = 'app_config';
const DEFAULT_CONFIG = {
    yi: {
        "ui": [{
                "key": "换源",
                "index": 0
            },
            {
                "key": "搜索模式",
                "index": 1
            },
            {
                "key": "我的",
                "index": 4,
                "title": "我的"
            },
            {
                "key": "设置",
                "index": 2
            },
            {
                "key": "搜索",
                "index": 6
            },
            {
                "key": "源名",
                "index": -1
            },
            {
                "key": "历史",
                "index": -1
            }
        ],
        "col": "icon_small_4"
    },
    er: {
        分页: 40,
        历史记录: 200,
        分页逻辑: "0",
        分页导航: false,
        线路样式: "scroll_button",
        二级缓存: false,
        二级刷新: false
    },
    global: {
        // 功能开关
        useDanmu: true,
        useLog: false,
        useUserDefined: false,
        useConfigParse: false,
        useJar: false,
        useCFloatingWindow: false,
        skipEr: false,
        pushProxy: true,
        videolog: false,

        // 状态数值
        smode: 0,
        searchsort: 0,
        githubraw: "https://raw.githubusercontent.com",
        homeListCol: "",

        // 新增配置项
        natural: false,
        usingst: false,
        pushUrlProxy: false,
        source_backup: false,
        inputmem: false,
        share_encode: "不编码",
        select_config_mode: "0",
        testUrl: "",
        leach: false,
        leachPass: "",
        no_loading: false,
        firstopen: "",
        
        runMode: 0,
        t4ServerPath: "", // T4 本地服务执行根目录
        localt5: ""       // T5 localt5.js 核心脚本路径
    }
};

function get() {
    let stored;
    try {
        stored = JSON.parse(getItem(STORAGE_KEY, "{}"));
    } catch (e) {
        stored = {}
        setItem(STORAGE_KEY, "{}");
    }
    return JSON.parse(JSON.stringify(deepMerge({}, DEFAULT_CONFIG, stored)));
}

function set(config) {
    setItem(STORAGE_KEY, JSON.stringify(config));
}

function update(path, value) {
    const config = get();
    const parts = path.split('.');
    let current = config;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part] || typeof current[part] !== 'object') {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;

    set(config);
}

function reset() {
    set(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
}

function getGlobal(key) {
    return get().global[key];
}

function setGlobal(key, value) {
    update('global.' + key, value);
}

function getUiOrder() {
    return get().yi.ui;
}

function setUiOrder(order) {
    update('yi.ui', order);
}

function getUiCol() {
    return get().yi.col;
}

function setUiCol(col) {
    update('yi.col', col);
}

function getErConfig() {
    return get().er;
}

function setErConfig(path, value) {
    update('er.' + path, value);
}

const T5_EXT_DIR = 'hiker://files/plugins/DrpyHIker/javet/';
const T5_DEX_PATH = T5_EXT_DIR + 'classes.dex';
const T5_SO_DIR = T5_EXT_DIR + 'arm64-v8a';
const PY_PLUG = "hiker://files/plugins/chaquopy/PythonHiker.js";

function checkT5Environment() {
    return fileExist(T5_DEX_PATH) && fileExist(T5_SO_DIR);
}

function checkPYEnvironment() {
    return fileExist(PY_PLUG);
}

$.exports = {
    get,
    set,
    update,
    reset,
    getGlobal,
    setGlobal,
    getUiOrder,
    setUiOrder,
    getUiCol,
    setUiCol,
    getErConfig,
    setErConfig,
    checkT5Environment,
    checkPYEnvironment,

    t5DexPath: T5_DEX_PATH,
    t5SoDir: T5_SO_DIR,
    pyPlug: PY_PLUG
};
