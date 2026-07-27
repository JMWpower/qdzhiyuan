const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
const playerUI = $.require('./subpage/playerUI.js'); // 注意相对路径

function getDefaultState() {
    return {
        line: 0,
        page: 0,
        sort: 0,
        fromList: [],
        totalLists: [],
        playPages: [],
        currentPageItems: [],
        pageSize: 40,
        extra: {}
    };
}

function PlayerStateManager() {}

PlayerStateManager.prototype = {
    /**
     * 初始化播放状态
     */
    initState: function(pageId, fromList, totalLists, pageSize, extra) {
        let state = PageStateManager.initState(pageId, { player: getDefaultState() });
        let playerState = state.player;
        playerState.fromList = fromList;
        playerState.totalLists = totalLists;
        
        // 【修复】：正确处理 0 的情况，避免 0 || 40 触发短路逻辑回退为 40
        let parsedSize = parseInt(pageSize, 10);
        playerState.pageSize = isNaN(parsedSize) ? 40 : parsedSize;
        
        playerState.extra = extra || {};
        this._recalcPages(playerState);
        playerState.line = 0;
        playerState.page = 0;
        this._updateCurrentPageItems(playerState);
        return playerState;
    },

    _recalcPages: function(playerState) {
        let totalLists = playerState.totalLists;
        let pageSize = playerState.pageSize;
        let playPages = [];
        for (let i = 0; i < totalLists.length; i++) {
            let list = totalLists[i];
            let pages = [];
            // 当 pageSize === 0 时，将不会进入此循环，转而直接把整个列表长度作为一个范围压入
            if (pageSize > 0 && list.length > 0) {
                for (let j = 0; j < list.length; j += pageSize) {
                    let end = j + pageSize;
                    if (end > list.length) end = list.length;
                    pages.push((j + 1) + '-' + end);
                }
            } else {
                pages = list.length ? ['1-' + list.length] : [];
            }
            playPages.push(pages);
        }
        playerState.playPages = playPages;
    },

    _updateCurrentPageItems: function(playerState) {
        let line = playerState.line;
        let page = playerState.page;
        let totalLists = playerState.totalLists;
        let playPages = playerState.playPages;
        if (!totalLists[line] || !playPages[line] || !playPages[line][page]) {
            playerState.currentPageItems = [];
            return;
        }
        let range = playPages[line][page];
        let parts = range.split('-');
        let start = Number(parts[0]) - 1;
        let end = Number(parts[1]);
        // 当范围为 1-总长度 时，slice(0, length) 就会提取所有数据
        let pageItems = totalLists[line].slice(start, end);
        if (playerState.sort === 1) {
            pageItems = pageItems.slice().reverse();
        }
        playerState.currentPageItems = pageItems;
    },

    getState: function(pageId) {
        let state = PageStateManager.getState(pageId);
        return state ? state.player : null;
    },

    getExtra: function(pageId) {
        let state = this.getState(pageId);
        return state ? state.extra : null;
    },

    setLine: function(pageId, line) {
        let state = this.getState(pageId);
        if (!state) return;
        if (line === state.line) return;
        state.line = line;
        state.page = 0; // 切换线路重置页码
        this._updateCurrentPageItems(state);
    },

    setPage: function(pageId, page) {
        let state = this.getState(pageId);
        if (!state) return;
        if (page === state.page) return;
        state.page = page;
        this._updateCurrentPageItems(state);
    },

    setSort: function(pageId, sort) {
        let state = this.getState(pageId);
        if (!state) return;
        if (sort === state.sort) return;
        state.sort = sort;
        this._updateCurrentPageItems(state);
    },

    /**
     * 刷新播放列表 UI
     * @param {string} pageId
     * @param {boolean} forceRebuildPages 是否强制重建分页区域（线路切换时使用）
     */
    refreshPlaylist: function(pageId, forceRebuildPages) {
        let state = this.getState(pageId);
        if (!state) return;
        let extra = state.extra;
        if (!extra) return;
        playerUI.updatePlaylist(pageId, state, extra, forceRebuildPages);
    },

    close: function(pageId) {
        PageStateManager.removeState(pageId);
    }
};

$.exports = new PlayerStateManager();
