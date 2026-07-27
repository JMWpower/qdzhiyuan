
const stateMap = new Map();
const pageIdMap = new Map();
/**
 * 生成唯一的页面ID
 * @returns {string} 唯一ID
 */
function createPageId() {
    return "page_" + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

function getOrCreatePageId(key){
    if(!pageIdMap.has(key)){
        pageIdMap.set(key, createPageId());
    }
    return pageIdMap.get(key);
}
/**
 * 初始化页面状态，如果已存在则返回现有状态
 * @param {string} pageId
 * @param {Object} initialState 初始状态对象
 * @returns {Object} 当前状态
 */
function initState(pageId, initialState) {
    if (!stateMap.has(pageId)) {
        stateMap.set(pageId, Object.assign({}, initialState));
    }
    return stateMap.get(pageId);
}

/**
 * 获取页面状态
 * @param {string} pageId
 * @returns {Object|undefined}
 */
function getState(pageId) {
    return stateMap.get(pageId);
}

/**
 * 更新页面状态（合并）
 * @param {string} pageId
 * @param {Object} updates 要合并的更新对象
 */
function updateState(pageId, updates) {
    var state = stateMap.get(pageId);
    if (state) {
        // 手动合并属性
        for (var key in updates) {
            if (updates.hasOwnProperty(key)) {
                state[key] = updates[key];
            }
        }
    }
}

/**
 * 移除页面状态
 * @param {string} pageId
 */
function removeState(pageId) {
    stateMap.delete(pageId);
    for(let [k,v] of pageIdMap.entries()){
        if(pageId==v){
            pageIdMap.delete(k);
            break;
        }
    }
}

/**
 * 判断是否存在页面状态
 * @param {string} pageId
 * @returns {boolean}
 */
function hasState(pageId) {
    return stateMap.has(pageId);
}

/**
 * 获取所有页面ID（调试用）
 * @returns {Array<string>}
 */
function getAllPageIds() {
    var keys = [];
    var iterator = stateMap.keys();
    for (var i = 0; i < stateMap.size; i++) {
        keys.push(iterator.next().value);
    }
    return keys;
}

$.exports = {
    createPageId: createPageId,
    getOrCreatePageId,
    initState: initState,
    getState: getState,
    updateState: updateState,
    removeState: removeState,
    hasState: hasState,
    getAllPageIds: getAllPageIds
};