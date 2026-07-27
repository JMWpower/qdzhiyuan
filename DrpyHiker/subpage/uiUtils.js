
/**
 * 深度合并多个对象的属性。
 * @param {Object} target - 被合并的对象
 * @returns {Object} 合并后的对象
 */
function deepMerge(target) {
    function isObject(obj) {
        return obj && typeof obj === 'object' && !Array.isArray(obj);
    }
    for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
            if (isObject(source[key])) {
                if (!target[key]) target[key] = {};
                deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }
    return target;
}

/**
 * 从源对象中深度删除指定的属性。
 * @param {Object} source - 源对象
 * @param {Object} exc - 要排除的属性映射 { key: true }
 * @returns {Object} 新对象
 */
function deepOmit(source, exc) {
    const result = {};
    for (let key in source) {
        if (source.hasOwnProperty(key)) {
            if (!(exc.hasOwnProperty(key) && exc[key] === true)) {
                if (typeof source[key] === 'object' && source[key] !== null && exc[key]) {
                    result[key] = deepOmit(source[key], exc[key]);
                } else if (typeof source[key] !== 'object' || source[key] === null || !exc[key]) {
                    result[key] = source[key];
                }
            }
        }
    }
    return result;
}

/**
 * 生成一个随机颜色的十六进制表示。
 * @return {string} 形如 '#RRGGBB'
 */
function getRangeColors() {
    return '#' + ('00000' + (Math.random() * 0x1000000 << 0).toString(16)).substr(-6);
}

/**
 * 根据 order 数组重新排列 array。
 * @param {Array} array - 原始数组，每个元素包含 key 属性
 * @param {Array} order - 顺序数组，格式 [{ key, index, img?, title? }]
 * @returns {Array} 重排后的数组
 */
function reorderArrayByOrder(array, order) {
    let map = new Map(array.map(obj => [obj.key, obj]));
    let reorderedArray = [];
    let removedKeys = new Set();

    order.sort((a,b)=>a.index - b.index).forEach((item, i) => {
        if (item.index === -1) {
            removedKeys.add(item.key);
        } else {
            let obj = map.get(item.key);
            if (obj) {
                if (item.img) obj.img = item.img;
                if (item.title) obj.title = item.title;
                reorderedArray[i] = obj;
            }
        }
    });

    array.forEach(obj => {
        if (!removedKeys.has(obj.key) && !reorderedArray.includes(obj)) {
            reorderedArray.push(obj);
        }
    });

    return reorderedArray.filter(obj => obj !== undefined);
}

/**
 * 验证颜色格式（支持 #rrggbb 或 #rgb 或颜色名称？简单验证）
 * @param {string} color
 * @returns {boolean}
 */
function isValidColor(color) {
    if (typeof color !== 'string') return false;
    // 支持 #rrggbb 或 #rgb
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

/**
 * 将字符串转换为布尔值
 * @param {string|boolean} text
 * @returns {boolean}
 */
function toBoolean(text) {
    if (text === undefined || text === null) return false;
    if (text === true || text === false) return text;
    if (text === "true") return true;
    if (text === "false") return false;
    return false;
}

/**
 * 根据布尔值返回开关图标 URL（可自定义图标）
 * @param {boolean} bool
 * @returns {string}
 */
function buttonImg(bool) {
    bool = toBoolean(bool);
    return bool 
        ? 'http://123.56.105.145/tubiao/messy/55.svg' 
        : 'http://123.56.105.145/img/drpy/off.svg';
}

// 导出所有函数
$.exports = {
    deepMerge,
    deepOmit,
    getRangeColors,
    reorderArrayByOrder,
    isValidColor,
    toBoolean,
    buttonImg
};