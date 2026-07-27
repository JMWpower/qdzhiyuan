
const { deepMerge } = $.require('./subpage/uiUtils.js');

const THEME_FILE_PATH = "hiker://files/rules/DrpyHiker/theme.json";

// 默认主题定义
const DEFAULT_THEMES = {
    默认: {
        yi: {
            mark: "#immersiveTheme#",
            换源颜色: "#DD9C5A",
            分类颜色: "random",
            icons: {
                换源: "hiker://files/data/DrpyHiker/icon/换源.png",
                搜索: "hiker://files/data/DrpyHiker/icon/搜索.png",
                设置: "hiker://files/data/DrpyHiker/icon/设置.png",
                我的: "hiker://files/data/DrpyHiker/icon/我的.png",
                收藏: "hiker://files/data/DrpyHiker/icon/我的.png",
                历史: "hiker://files/data/DrpyHiker/icon/历史.png",
                影视: "hiker://files/data/DrpyHiker/icon/影视.png",
                漫画: "hiker://files/data/DrpyHiker/icon/漫画.png",
                小说: "hiker://files/data/DrpyHiker/icon/小说.png",
                书架小说: "hiker://files/data/DrpyHiker/icon/书架小说.png",
                书架漫画: "hiker://files/data/DrpyHiker/icon/书架漫画.png",
            }
        },
        er: {
            icons: {
                正序: "hiker://files/data/DrpyHiker/icon/正序.svg",
                倒序: "hiker://files/data/DrpyHiker/icon/倒序.svg",
                视频: "hiker://files/data/DrpyHiker/icon/视频.svg"
            },
            简介样式: "0",
            浅来源色: "#FFFFFF;",
            深来源色: "#FFFFFF;",
            线路颜色: "#DD9C5A",
            线路显示: "当前线路: {from}\t\t共:{plays}集\t\t{spage}/{max}",
        }
    }
};

/**
 * 从文件读取所有主题
 */
function _readThemesFromFile() {
    if (!fileExist(THEME_FILE_PATH)) {
        return {};
    }
    try {
        let content = readFile(THEME_FILE_PATH);
        return JSON.parse(content);
    } catch (e) {
        log("读取主题文件失败：" + e.toString());
        return {};
    }
}

/**
 * 保存所有主题到文件
 */
function _saveThemesToFile(themes) {
    try {
        writeFile(THEME_FILE_PATH, JSON.stringify(themes, null, 2));
    } catch (e) {
        log("保存主题文件失败：" + e.toString());
    }
}

/**
 * 获取所有主题（合并默认和用户自定义）
 */
function getAllThemes() {
    let fileThemes = _readThemesFromFile();
    let allThemes = {};
    // 合并默认主题（确保每个默认主题都存在）
    for (let name in DEFAULT_THEMES) {
        allThemes[name] = deepMerge({}, DEFAULT_THEMES[name], fileThemes[name] || {});
    }
    // 添加用户自定义的额外主题（如果有）
    for (let name in fileThemes) {
        if (!allThemes[name]) {
            allThemes[name] = fileThemes[name];
        }
    }
    return allThemes;
}

/**
 * 获取指定主题的配置
 */
function getTheme(name) {
    let allThemes = getAllThemes();
    return allThemes[name] || allThemes['默认'];
}

/**
 * 更新指定主题的配置（合并）
 */
function setTheme(name, themeConfig) {
    let allThemes = getAllThemes();
    allThemes[name] = deepMerge({}, allThemes[name] || {}, themeConfig);
    _saveThemesToFile(allThemes);
}

/**
 * 删除指定主题（用户自定义主题可删除，默认主题不可删除）
 */
function deleteTheme(name) {
    if (DEFAULT_THEMES.hasOwnProperty(name)) {
        log("不能删除默认主题");
        return;
    }
    let allThemes = getAllThemes();
    delete allThemes[name];
    _saveThemesToFile(allThemes);
}

/**
 * 获取当前选中的主题名称
 */
function getCurrentThemeName() {
    return getItem('theme', '默认');
}

/**
 * 设置当前选中的主题
 */
function setCurrentTheme(name) {
    setItem('theme', name);
}

/**
 * 获取当前主题的完整配置
 */
function getCurrentTheme() {
    return getTheme(getCurrentThemeName());
}

/**
 * 更新当前主题的指定路径的值
 */
function updateCurrentTheme(path, value) {
    let name = getCurrentThemeName();
    let allThemes = getAllThemes();
    let theme = allThemes[name] || {};

    let parts = path.split('.');
    let current = theme;
    for (let i = 0; i < parts.length - 1; i++) {
        let part = parts[i];
        if (!current[part] || typeof current[part] !== 'object') {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;

    allThemes[name] = theme;
    _saveThemesToFile(allThemes);
}

/**
 * 重置当前主题为默认（删除文件中的用户修改）
 */
function resetCurrentTheme() {
    let name = getCurrentThemeName();
    let allThemes = _readThemesFromFile();
    delete allThemes[name];
    _saveThemesToFile(allThemes);
}

/**
 * 判断是否存在指定主题（包括默认和用户自定义）
 */
function hasTheme(name) {
    let allThemes = getAllThemes();
    return allThemes.hasOwnProperty(name);
}

/**
 * 获取所有主题的名称列表
 */
function getAllThemeNames() {
    let allThemes = getAllThemes();
    return Object.keys(allThemes);
}

$.exports = {
    getAllThemes,
    getTheme,
    setTheme,
    deleteTheme,
    getCurrentThemeName,
    setCurrentTheme,
    getCurrentTheme,
    updateCurrentTheme,
    resetCurrentTheme,
    hasTheme,
    getAllThemeNames
};