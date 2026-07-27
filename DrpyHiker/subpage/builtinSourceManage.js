// 文件路径：subpage/builtinSourceManage.js
// 职责：内建源的独立管理、单源分享(支持云口令)/导出、参数映射与本地管理、动态搜索、批量打包分享

const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
const Fs = $.require('./libs/Fs.js');

// ==============================================================
// 核心逻辑对象：封装所有会导致 UI 刷新的动态数据操作
// ==============================================================
const BuiltinManager = {
    update: function(pId) {
        deleteItemByCls("sources");
        deleteItem("source_length");
        deleteItemByCls("cat_tools"); 

        const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
        let st = PageStateManager.getState(pId);
        let kw = st.searchKeyword.toLowerCase();
        
        if (st.showCategory !== "全部") {
            let catPath = "hiker://files/rules/DrpyHiker/builtin_sources/" + st.showCategory;
            let catTools = [];
            
            catTools.push({
                title: "编辑参数映射表",
                img: "hiker://images/home_icon_code",
                col_type: "scroll_button",
                url: $("#noLoading#").lazyRule((path) => {
                    path += "/.mapping.txt";
                    if (fileExist(path)) {
                        toast("保存后刷新配置或重启才会生效");
                        return "editFile://" + path;
                    } else {
                        return $("不存在映射文件是否创建？").confirm(path => {
                            writeFile(path, "");
                            toast("保存后刷新配置或重启才会生效");
                            return "editFile://" + path;
                        }, path);
                    }
                }, catPath),
                extra: { cls: "cat_tools" }
            });
            
            catTools.push({
                title: "本地管理",
                img: "hiker://images/home_icon_bookmark_group",
                col_type: "scroll_button",
                url: 'hiker://page/LocalDir#noRecordHistory##noHistory#',
                extra: {
                    cpath: catPath,
                    cls: "cat_tools"
                }
            });
            
            addItemAfter("cat_tools_anchor", catTools);
        }

        let filtered = st.sourceList.filter(s => {
            if (st.showCategory !== "全部" && s._category !== st.showCategory) return false;
            if (kw && !s.name.toLowerCase().includes(kw)) return false;
            return true;
        });

        let out = [];
        out.push({
            title: "““””<small>当前显示数量:" + filtered.length + "</small>",
            col_type: "text_center_1",
            url: "hiker://empty",
            extra: { cls: "sources", id: "source_length" }
        });

        filtered.forEach(s => {
            let id = "sources_" + s.key;
            let title = s.name;
            let isSel = st.batShare && st.duoSelect.some(x => x.id === id);
            let stitle = isSel ? '““””<span style="color:#FF5733">' + title + '</span>' : title;

            let longclick = [
                {
                    title: "分享口令",
                    js: $.toString((sData, ruleTitle) => {
                        let pastes = [];
                        try { pastes = getPastes() || []; } catch(e) {}
                        
                        let options = ["本地口令"].concat(pastes);
                        
                        return showSelectOptions({
                            title: "选择分享口令方式",
                            options: options,
                            col: 2,
                            js: $.toString((sData, ruleTitle) => {
                                const ShareManage = $.require('./subpage/ShareManage.js');
                                let packedBase64 = ShareManage.packSource(sData);
                                
                                if (packedBase64.startsWith("error:")) {
                                    return "toast://" + packedBase64;
                                }
                                
                                let url = packedBase64;
                                let pname = (sData.name || "DrpyHikerSource") + ".json";
                                let api = sData.type === 3 ? "drpy2" : "json";
                                
                                let shareCode = "";
                                if (input === "本地口令") {
                                    shareCode ="drpyhiker://" +  url;
                                    toast("已复制本地口令");
                                } else {
                                    showLoading("正在上传并生成云口令...");
                                    shareCode = sharePaste(url, input);
                                    hideLoading();
                                    if (!shareCode) return "toast://生成云口令失败，可能是接口已失效或源码体积过大";
                                    toast("已复制云口令");
                                }
                                
                                let targetUrl = "hiker://page/importAndDifference?rule=" + (ruleTitle) + "&sourcePass=";
                                
                                return "copy://海阔视界，DRPY视频源「" + sData.name + "」复制整条口令打开软件就会自动导入$" + shareCode + "$" + pname + "#" + api + "@import=js:\"" + targetUrl + "\"+input";
                            }, sData, ruleTitle)
                        });
                    }, s, MY_RULE.title)
                },
                {
                    title: "导出文件",
                    js: $.toString((sData) => {
                        const ShareManage = $.require('./subpage/ShareManage.js');
                        return ShareManage.exportSystemFile(sData);
                    }, s)
                },
                {
                    title: "改名",
                    js: $.toString((sData, pageId) => {
                        return $(sData.name, "输入新名称").input((o) => {
                            if(!input) return "toast://不能为空";
                            const Fs = $.require('./libs/Fs.js');
                            const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
                            let state = PageStateManager.getState(o.pageId);

                            let safeInput = input.replace(/[\\/:*?"<>|]/g, "_");
                            let newKey = o.cat + "_" + safeInput;
                            let newJsonPath = Fs.combinPath(Fs.getParentPath(o.jPath), "/" + safeInput + ".json");

                            if(Fs.exists(newJsonPath)) return "toast://同名源已存在";

                            let content = JSON.parse(Fs.readFile(o.jPath));
                            content.name = input;
                            content.key = newKey;
                            
                            // 构造 md5 前缀，确保依赖文件无特殊字符且防冲突
                            let filePrefix = md5(input + newKey) + "_";
                            
                            let formatLocalPath = function(p) {
                                let pStr = String(p);
                                if (pStr.startsWith("file://")) return pStr;
                                if (pStr.startsWith("/")) return "file://" + pStr;
                                return "file://" + getPath(pStr);
                            };

                            let newScriptPath = "";

                            // 【核心改动】：重命名本地绑定的 api 脚本文件并赋予 md5 前缀
                            if (content.api && String(content.api).startsWith("file://")) {
                                let oldApiUrl = String(content.api);
                                let oldApiPath = oldApiUrl.split('?')[0].replace("file://", "");
                                let query = oldApiUrl.includes('?') ? "?" + oldApiUrl.split('?')[1] : "";
                                
                                if (Fs.exists(oldApiPath)) {
                                    let oldFileName = Fs.getName(oldApiPath);
                                    if (/^[a-f0-9]{32}_/.test(oldFileName)) {
                                        oldFileName = oldFileName.substring(33); // 剥离旧前缀
                                    }
                                    let newApiFileName = filePrefix + oldFileName;
                                    let newApiPath = Fs.combinPath(Fs.getParentPath(oldApiPath), "/" + newApiFileName);
                                    Fs.rename(oldApiPath, newApiPath);
                                    content.api = formatLocalPath(newApiPath) + query;
                                    newScriptPath = newApiPath;
                                }
                            }

                            // 【核心改动】：重命名本地绑定的 ext 配置文件并赋予 md5 前缀
                            if (content.ext && String(content.ext).startsWith("file://")) {
                                let oldExtUrl = String(content.ext);
                                let oldExtPath = oldExtUrl.split('?')[0].replace("file://", "");
                                let query = oldExtUrl.includes('?') ? "?" + oldExtUrl.split('?')[1] : "";
                                
                                if (Fs.exists(oldExtPath)) {
                                    let oldFileName = Fs.getName(oldExtPath);
                                    if (/^[a-f0-9]{32}_/.test(oldFileName)) {
                                        oldFileName = oldFileName.substring(33); // 剥离旧前缀
                                    }
                                    let newExtFileName = filePrefix + oldFileName;
                                    let newExtPath = Fs.combinPath(Fs.getParentPath(oldExtPath), "/" + newExtFileName);
                                    Fs.rename(oldExtPath, newExtPath);
                                    content.ext = formatLocalPath(newExtPath) + query;
                                    if (!newScriptPath) newScriptPath = newExtPath;
                                }
                            }

                            Fs.writeFile(newJsonPath, JSON.stringify(content, null, 2));
                            Fs.remove(o.jPath);

                            let targetIdx = state.sourceList.findIndex(x => x.key === o.sData.key);
                            if (targetIdx > -1) {
                                state.sourceList[targetIdx].name = input;
                                state.sourceList[targetIdx].key = newKey;
                                state.sourceList[targetIdx]._jsonPath = newJsonPath;
                                state.sourceList[targetIdx]._scriptPath = newScriptPath;
                            }

                            toast("改名成功");
                            $.require('builtinSourceManage').update(o.pageId);
                        }, { sData: sData, jPath: sData._jsonPath, cat: sData._category, pageId: pageId });
                    }, s, pId)
                },
                {
                    title: "删除",
                    js: $.toString((sData, pageId) => {
                        return $("确定要彻底删除该源吗？\n(关联的本地 ext/api/jar 文件也会一并清理)\n" + sData.name).confirm((o) => {
                            const Fs = $.require('./libs/Fs.js');
                            const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
                            let state = PageStateManager.getState(o.pageId);

                            // 1. 清理主 JSON 配置
                            if (o.jPath) Fs.remove(o.jPath);

                            // 2. 清理绑定的本地 API 脚本
                            if (o.sData.api && String(o.sData.api).startsWith("file://")) {
                                let p = String(o.sData.api).split('?')[0].replace("file://", "");
                                if (Fs.exists(p)) Fs.remove(p);
                            }

                            // 3. 清理绑定的本地 EXT 文件
                            if (o.sData.ext && String(o.sData.ext).startsWith("file://")) {
                                let p = String(o.sData.ext).split('?')[0].replace("file://", "");
                                if (Fs.exists(p)) Fs.remove(p);
                            }
                            
                            // 4. 清理绑定的本地 JAR 文件 (加一个保护：确保它跟 json 在同级目录才删，防误删公共 jar)
                            if (o.sData.jar && String(o.sData.jar).startsWith("file://")) {
                                let p = String(o.sData.jar).split('?')[0].replace("file://", "");
                                if (Fs.exists(p) && Fs.getParentPath(p) === Fs.getParentPath(o.jPath)) {
                                    Fs.remove(p);
                                }
                            }

                            let targetIdx = state.sourceList.findIndex(x => x.key === o.sData.key);
                            if (targetIdx > -1) {
                                state.sourceList.splice(targetIdx, 1);
                            }

                            toast("彻底删除成功");
                            $.require('builtinSourceManage').update(o.pageId);
                        }, { sData: sData, jPath: sData._jsonPath, pageId: pageId });
                    }, s, pId)
                }
            ];

            out.push({
                title: stitle,
                col_type: "text_1",
                url: st.batShare ? $("#noLoading#").lazyRule((dataid, datatitle, sData, pageId) => {
                    const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
                    let state = PageStateManager.getState(pageId);
                    let idx = state.duoSelect.findIndex(x => x.id === dataid);
                    if(idx > -1) {
                        state.duoSelect.splice(idx, 1);
                        updateItem(dataid, { title: datatitle });
                    } else {
                        state.duoSelect.push({ id: dataid, jsonpath: sData._jsonPath, scriptpath: sData._scriptPath });
                        updateItem(dataid, { title: '““””<span style="color:#FF5733">' + datatitle + '</span>' });
                    }
                    updateItem("builtin_share_zip", { title: "打包分享(" + state.duoSelect.length + ")" });
                    return "hiker://empty";
                }, id, title, s, pId) : "hiker://page/editSources#noRecordHistory##noHistory#",
                extra: {
                    id: id,
                    cls: "sources",
                    stitle: title,
                    jsonpath: s._jsonPath,
                    scriptpath: s._scriptPath,
                    source: s,
                    canSave: true,
                    longClick: longclick
                }
            });
        });
        addItemAfter("source_search", out);
    },

    addShareTools: function(pId) {
        let out = [];
        out.push({
            title: "全选",
            col_type: "scroll_button",
            extra: { id: "tool_sel_all", cls: "batshare_tools" },
            url: $("#noLoading#").lazyRule((pageId) => {
                $.require('builtinSourceManage').selectAll(pageId);
                return "toast://已全选可见列表";
            }, pId)
        });
        out.push({
            title: "反选",
            col_type: "scroll_button",
            extra: { id: "tool_sel_inv", cls: "batshare_tools" },
            url: $("#noLoading#").lazyRule((pageId) => {
                $.require('builtinSourceManage').invertSelect(pageId);
                return "toast://已反选";
            }, pId)
        });
        out.push({
            title: "打包分享(0)",
            col_type: "scroll_button",
            extra: { id: "builtin_share_zip", cls: "batshare_tools" },
            url: $("#noLoading#").lazyRule((pageId) => {
                return $.require('builtinSourceManage').pack(pageId);
            }, pId)
        });
        addItemAfter("batshare_anchor", out);
    },

    selectAll: function(pId) {
        const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
        let st = PageStateManager.getState(pId);
        let plays = findItemsByCls("sources").filter(x => x.extra.id !== "source_length");
        plays.forEach(x => {
            let ex = x.extra;
            st.duoSelect.push({ id: ex.id, jsonpath: ex.jsonpath, scriptpath: ex.scriptpath });
            updateItem(ex.id, { title: '““””<span style="color:#FF5733">' + x.title.replace(/<.*?>|[“”]/g, "") + '</span>' });
        });
        let res = new Map();
        st.duoSelect = st.duoSelect.filter((a) => !res.has(a.id) && res.set(a.id, 1));
        updateItem("builtin_share_zip", { title: "打包分享(" + st.duoSelect.length + ")" });
    },

    invertSelect: function(pId) {
        const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
        let st = PageStateManager.getState(pId);
        let plays = findItemsByCls("sources").filter(x => x.extra.id !== "source_length");

        let sPlays = plays.filter(x => st.duoSelect.some(y => y.id === x.extra.id));
        let fPlays = plays.filter(x => !st.duoSelect.some(y => y.id === x.extra.id));

        sPlays.forEach(x => {
            updateItem(x.extra.id, { title: x.extra.stitle });
            let idx = st.duoSelect.findIndex(y => y.id === x.extra.id);
            if(idx > -1) st.duoSelect.splice(idx, 1);
        });
        fPlays.forEach(x => {
            st.duoSelect.push({ id: x.extra.id, jsonpath: x.extra.jsonpath, scriptpath: x.extra.scriptpath });
            updateItem(x.extra.id, { title: '““””<span style="color:#FF5733">' + x.extra.stitle + '</span>' });
        });
        updateItem("builtin_share_zip", { title: "打包分享(" + st.duoSelect.length + ")" });
    },

    pack: function(pId) {
        const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
        let st = PageStateManager.getState(pId);
        if(!st.duoSelect.length) return "toast://请先选择要分享的源";

        return $("", "请输入合集名称").input((o) => {
            let name = input ? input + ".hkpkg" : "内建源合集.hkpkg";
            let sourcePaths = JSON.parse(o.pathsStr);
            const ShareManage = $.require('./subpage/ShareManage.js');
            return ShareManage.exportBatch(sourcePaths, name);
        }, { pathsStr: JSON.stringify(st.duoSelect) });
    }
};

// ==============================================================
// 模块/页面 路由分发器 (同构逻辑)
// ==============================================================
if (typeof module !== 'undefined') {
    module.exports = BuiltinManager;
    if (typeof $ !== 'undefined' && $.exports !== undefined) {
        $.exports = BuiltinManager;
    }
} else {
    (function() {
        let pageKey = "builtinSourceManage";
        let pageId = PageStateManager.getOrCreatePageId(pageKey);

        function scanSources() {
            let list = [];
            let baseDir = getPath("hiker://files/rules/DrpyHiker/builtin_sources/").replace("file://", "");
            let allDirs = [];
            
            if (Fs.exists(baseDir)) {
                Fs.listDir(baseDir, true).forEach(d => {
                    if (d.isDirectory()) {
                        allDirs.push(d.name());
                    }
                });
            }
            
            allDirs.forEach(dir => {
                let dirPath = Fs.combinPath(baseDir, "/" + dir);
                if (Fs.exists(dirPath)) {
                    Fs.listDir(dirPath, true).forEach(f => {
                        if (f.isFile() && f.name().endsWith(".json")) {
                            try {
                                let jsonPath = f.path();
                                let src = JSON.parse(Fs.readFile(jsonPath));
                                
                                src._category = dir;
                                src._jsonPath = jsonPath;
                                
                                let scriptPath = "";
                                if (dir === 't3_drpy2') scriptPath = String(src.ext || "").split('?')[0];
                                else if (dir === 't3_cat' || dir === 't3_py') scriptPath = String(src.api || "").split('?')[0];
                                
                                if (scriptPath && scriptPath.startsWith("file://")) {
                                    src._scriptPath = getPath(scriptPath).replace("file://", "");
                                }
                                list.push(src);
                            } catch(e) {}
                        }
                    });
                }
            });
            return list;
        }

        let state = PageStateManager.initState(pageId, {
            sourceList: scanSources(),
            showCategory: "全部",
            searchKeyword: "",
            batShare: false,
            duoSelect: []
        });
        
        PageStateManager.updateState(pageId, { sourceList: scanSources(), duoSelect: [] });

        addListener("onClose", $.toString((pKey) => {
            const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
            let pId = PageStateManager.getOrCreatePageId(pKey);
            PageStateManager.removeState(pId);
        }, pageKey));

        setPageTitle("内建源管理");

        let d = [];

        let baseDir = getPath("hiker://files/rules/DrpyHiker/builtin_sources/").replace("file://", "");
        let allDirs = [];
        if (Fs.exists(baseDir)) {
            Fs.listDir(baseDir, true).forEach(d => {
                if (d.isDirectory()) {
                    allDirs.push(d.name());
                }
            });
        }
        
        let catCounts = {};
        allDirs.forEach(cat => catCounts[cat] = 0);
        state.sourceList.forEach(s => {
            if (catCounts[s._category] !== undefined) catCounts[s._category]++;
        });

        let cats = ["全部"].concat(allDirs.filter(c => catCounts[c] > 0));

        cats.forEach(cat => {
            let t = cat === "全部" ? `全部(${state.sourceList.length})` : `${cat}(${catCounts[cat]})`;
            d.push({
                title: state.showCategory === cat ? "““””" + t.fontcolor("#449F50") : t,
                col_type: "scroll_button",
                img: "hiker://images/home_icon_code",
                extra: {
                    id: "cat_btn_" + cat,
                    cls: "cat_btns",
                    cat_name: cat,
                    cat_title: t,
                    backgroundColor: state.showCategory === cat ? "#FFDFF1E3" : ""
                },
                url: $("#noLoading#").lazyRule((pId, targetCat) => {
                    const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
                    let state = PageStateManager.getState(pId);
                    if (!state || state.showCategory === targetCat) return "hiker://empty";

                    state.showCategory = targetCat;

                    let catBtns = findItemsByCls("cat_btns");
                    catBtns.forEach(btn => {
                        let cName = btn.extra.cat_name;
                        let cTitle = btn.extra.cat_title;
                        let isSel = cName === targetCat;
                        updateItem(btn.extra.id, {
                            title: isSel ? "““””" + cTitle.fontcolor("#449F50") : cTitle,
                            extra: Object.assign({}, btn.extra, { backgroundColor: isSel ? "#FFDFF1E3" : "" })
                        });
                    });

                    $.require('builtinSourceManage').update(pId);
                    return "hiker://empty";
                }, pageId, cat)
            });
        });

        d.push({ col_type: "blank_block" });

        d.push({ col_type: "blank_block", title: "", url: "hiker://empty", extra: { id: "cat_tools_anchor" } });

        d.push({
            title: "批量分享:" + (state.batShare ? "开启" : "关闭"),
            col_type: "scroll_button",
            extra: { id: "batshare_toggle_btn" },
            url: $("#noLoading#").lazyRule((pId) => {
                const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
                let state = PageStateManager.getState(pId);
                state.batShare = !state.batShare;
                state.duoSelect = [];

                updateItem("batshare_toggle_btn", { title: "批量分享:" + (state.batShare ? "开启" : "关闭") });

                if (state.batShare) {
                    $.require('builtinSourceManage').addShareTools(pId);
                } else {
                    deleteItemByCls("batshare_tools");
                }

                $.require('builtinSourceManage').update(pId);
                return "hiker://empty";
            }, pageId)
        });

        d.push({ col_type: "blank_block", title: "", url: "hiker://empty", extra: { id: "batshare_anchor" } });

        if (state.batShare) {
            d.push({
                title: "全选",
                col_type: "scroll_button",
                extra: { id: "tool_sel_all", cls: "batshare_tools" },
                url: $("#noLoading#").lazyRule((pId) => {
                    $.require('builtinSourceManage').selectAll(pId);
                    return "toast://已全选可见列表";
                }, pageId)
            });
            d.push({
                title: "反选",
                col_type: "scroll_button",
                extra: { id: "tool_sel_inv", cls: "batshare_tools" },
                url: $("#noLoading#").lazyRule((pId) => {
                    $.require('builtinSourceManage').invertSelect(pId);
                    return "toast://已反选";
                }, pageId)
            });
            d.push({
                title: "打包分享(" + state.duoSelect.length + ")",
                col_type: "scroll_button",
                extra: { id: "builtin_share_zip", cls: "batshare_tools" },
                url: $("#noLoading#").lazyRule((pId) => {
                    return $.require('builtinSourceManage').pack(pId);
                }, pageId)
            });
        }

        d.push({
            title: "源名",
            desc: "输入关键字快速筛选",
            col_type: "input",
            extra: {
                id: "source_search",
                defaultValue: state.searchKeyword,
                onChange: $.toString((pId) => {
                    const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
                    let state = PageStateManager.getState(pId);
                    if (state) state.searchKeyword = input;
                    
                    $.require('builtinSourceManage').update(pId);
                }, pageId)
            }
        });

        setResult(d);
        BuiltinManager.update(pageId);

    })();
}