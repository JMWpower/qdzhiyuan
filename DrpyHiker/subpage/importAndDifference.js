// 文件路径：subpage/importAndDifference.js
// 职责：处理单源导入防冲突，及 .hkshell 驱动的本地目录批量冲突比对、单源独立对比覆盖

(function() {
    const ConfigManager = $.require('./subpage/ConfigManager.js');
    const runtimeConfig = GM.defineModule('runtimeConfig');
    const ShareManage = $.require('./subpage/ShareManage.js');
    const Fs = $.require('./libs/Fs.js');

    let rawSourcePass = getParam("sourcePass", "");
    let zipcache = getParam("zipcache", "");

    // ===============================================
    // 分支一：处理 .hkpkg 压缩包批量解压导入
    // ===============================================
    if (zipcache) {
        let zipDir = decodeURIComponent(zipcache);
        setPageTitle("批量导入解析与比对");

        let d = [];
        if (!Fs.exists(zipDir)) {
            setResult([{
                title: "错误",
                desc: "临时解压目录已失效或不存在",
                col_type: "text_center_1"
            }]);
            return;
        }

        let importList = [];
        let files = Fs.listDir(zipDir, false);

        files.forEach(f => {
            let filePath = String(f);

            if (filePath.endsWith(".hkshell")) return;

            if (filePath.endsWith(".json")) {
                let jPath = filePath;
                try {
                    let src = JSON.parse(Fs.readFile(jPath));
                    let cat = ShareManage.identifySourceCategory(src);

                    if (cat === 'unsupported_csp' || cat === 'unknown') return;

                    let safeName = String(src.name).replace(/[\\/:*?"<>|]/g, "_");

                    let item = {
                        source: src,
                        category: cat,
                        safeName: safeName,
                        jsonpath: jPath,
                        scriptpath: "",
                        status: "new"
                    };

                    let scriptUrl = "";
                    if (cat === 't3_drpy2') scriptUrl = String(src.ext || "").split('?')[0];
                    else if (cat === 't3_cat' || cat === 't3_py') scriptUrl = String(src.api || "").split('?')[0];

                    if (scriptUrl) {
                        let scriptName = scriptUrl.split('/').pop();
                        let sPath = Fs.combinPath(zipDir, "/" + scriptName);
                        if (Fs.exists(sPath)) item.scriptpath = sPath;
                    }

                    let localBaseDir = getPath("hiker://files/rules/DrpyHiker/builtin_sources/" + cat + "/").replace("file://", "");
                    let localJsonPath = Fs.combinPath(localBaseDir, "/" + safeName + ".json");

                    if (Fs.exists(localJsonPath)) {
                        let localJsonContent = Fs.readFile(localJsonPath);
                        let localSrc = {};
                        try {
                            localSrc = JSON.parse(localJsonContent);
                        } catch (e) {}

                        let localMd5 = "";
                        let newMd5 = "";

                        if (typeof localSrc.ext === "object") {
                            localMd5 = md5(JSON.stringify(localSrc.ext));
                            newMd5 = md5(JSON.stringify(src.ext));
                        } else {
                            let localExtName = (cat === 't3_py') ? ".py" : ".js";
                            let filePrefix = md5(localSrc.name + localSrc.key) + "_";
                            let localScriptPath = Fs.combinPath(localBaseDir, "/" + filePrefix + safeName + localExtName);
                            
                            if (!Fs.exists(localScriptPath)) {
                                localScriptPath = Fs.combinPath(localBaseDir, "/" + safeName + localExtName);
                            }
                            
                            if (Fs.exists(localScriptPath)) localMd5 = md5(Fs.readFile(localScriptPath));
                            else localMd5 = md5(localJsonContent);

                            if (item.scriptpath) newMd5 = md5(Fs.readFile(item.scriptpath));
                            else newMd5 = md5(JSON.stringify(src));
                        }

                        if (localMd5 === newMd5) {
                            // 【核心修复】：通过 formatSourceLocalPaths 将含有 ./ 的相对路径，动态扩展成包含了 md5 前缀的绝对路径
                            let normSrc = ShareManage.formatSourceLocalPaths(src, cat);
                            let normLocalSrc = ShareManage.formatSourceLocalPaths(localSrc, cat);
                            
                            if (md5(JSON.stringify(normSrc)) === md5(JSON.stringify(normLocalSrc))) {
                                item.status = "same";
                            } else {
                                item.status = "modify_config";
                            }
                        } else {
                            item.status = "modify_code";
                        }
                    }
                    importList.push(item);
                } catch (e) {}
            }
        });

        d.push({
            title: "批量导入检测分析",
            col_type: "text_center_1"
        });

        let newCount = importList.filter(x => x.status === 'new').length;
        let modifyCount = importList.filter(x => x.status === 'modify_code' || x.status === 'modify_config').length;
        let sameCount = importList.filter(x => x.status === 'same').length;

        d.push({
            title: `🟢 新增: ${newCount} | 🟡 冲突覆盖: ${modifyCount} | ⚪ 忽略无变化: ${sameCount}`,
            col_type: "text_center_1"
        });

        d.push({
            title: "一键导入 / 覆盖变动项",
            col_type: "text_center_1",
            url: $("#noLoading#").lazyRule((listStr) => {
                const ShareManage = $.require('./subpage/ShareManage.js');
                const runtimeConfig = GM.defineModule('runtimeConfig');
                let list = JSON.parse(listStr);
                let count = 0;
                list.forEach(item => {
                    if (item.status !== "same") {
                        ShareManage.importLocalSource(item.source, item.jsonpath, item.scriptpath);
                        count++;
                    }
                });
                runtimeConfig.initDefault();
                back();
                return "toast://✅ 成功合并/导入了 " + count + " 个源！";
            }, JSON.stringify(importList))
        });

        d.push({
            col_type: "line_blank"
        });

        importList.forEach(item => {
            let statusText = "";
            let color = "";
            if (item.status === 'new') {
                statusText = "🟢 新增项";
                color = "#449F50";
            } else if (item.status === 'same') {
                statusText = "⚪ 无变化";
                color = "#999999";
            } else if (item.status === 'modify_config') {
                statusText = "🟡 配置变更";
                color = "#FF9900";
            } else if (item.status === 'modify_code') {
                statusText = "🔴 代码覆盖";
                color = "#FF5733";
            }

            d.push({
                title: `““””<span style="color:${color}">${statusText}</span> | ${item.source.name}`,
                desc: `点击进行对比与单独操作 | 框架: ${item.category}`,
                col_type: "text_1",
                url: $("#noLoading#").lazyRule((itemStr) => {
                    let item = JSON.parse(itemStr);
                    let options = ["⚡ 独立导入 (覆盖)", "✏️ 改名导入", "📄 查看新代码", "💾 查看本地代码", "⚙️ 查看新配置", "🏠 查看本地配置"];

                    showSelectOptions({
                        title: "详细操作: " + item.source.name,
                        options: options,
                        col: 2,
                        js: $.toString((itemStr) => {
                            const ShareManage = $.require('./subpage/ShareManage.js');
                            const runtimeConfig = GM.defineModule('runtimeConfig');
                            const Fs = $.require('./libs/Fs.js');
                            let item = JSON.parse(itemStr);

                            if (input === "⚡ 独立导入 (覆盖)") {
                                if (item.status === 'same') return "toast://当前源无任何变化，无需导入";
                                ShareManage.importLocalSource(item.source, item.jsonpath, item.scriptpath);
                                runtimeConfig.initDefault();
                                toast("✅ 独立导入成功");
                                refreshPage(false);
                                return "hiker://empty";
                            } else if (input === "✏️ 改名导入") {
                                return $(item.source.name + "_新", "请输入新名字").input((o) => {
                                    if (!input) return "toast://名字不能为空";
                                    const Fs = $.require('./libs/Fs.js');
                                    let safeInput = String(input).replace(/[\\/:*?"<>|]/g, "_");
                                    let checkPath = getPath("hiker://files/rules/DrpyHiker/builtin_sources/" + o.cat + "/" + safeInput + ".json").replace("file://", "");
                                    if (Fs.exists(checkPath)) return "toast://冲突仍存在，请换个名字";

                                    let sObj = o.item.source;
                                    sObj.name = input;
                                    sObj.key = o.cat + "_" + safeInput;

                                    $.require('./subpage/ShareManage.js').importLocalSource(sObj, o.item.jsonpath, o.item.scriptpath);
                                    GM.defineModule('runtimeConfig').initDefault();
                                    toast("✅ 改名导入成功");
                                    refreshPage(false);
                                    return "hiker://empty";
                                }, {
                                    item: item,
                                    cat: item.category
                                });
                            } else if (input === "📄 查看新代码") {
                                if (!item.scriptpath) return "toast://该源无独立脚本文件，请查看配置";
                                return "editFile://file://" + item.scriptpath;
                            } else if (input === "💾 查看本地代码") {
                                let localBaseDir = getPath("hiker://files/rules/DrpyHiker/builtin_sources/" + item.category + "/").replace("file://", "");
                                let extName = (item.category === 't3_py') ? ".py" : ".js";
                                let filePrefix = md5(item.source.name + item.source.key) + "_";
                                let localPath = Fs.combinPath(localBaseDir, "/" + filePrefix + item.safeName + extName);
                                if (!Fs.exists(localPath)) localPath = Fs.combinPath(localBaseDir, "/" + item.safeName + extName);
                                if (!Fs.exists(localPath)) return "toast://本地不存在对应脚本";
                                return "editFile://file://" + localPath;
                            } else if (input === "⚙️ 查看新配置") {
                                return "editFile://file://" + item.jsonpath;
                            } else if (input === "🏠 查看本地配置") {
                                let localBaseDir = getPath("hiker://files/rules/DrpyHiker/builtin_sources/" + item.category + "/").replace("file://", "");
                                let localPath = Fs.combinPath(localBaseDir, "/" + item.safeName + ".json");
                                if (!Fs.exists(localPath)) return "toast://本地不存在对应配置";
                                return "editFile://file://" + localPath;
                            }
                        }, itemStr)
                    });
                    return "hiker://empty";
                }, JSON.stringify(item))
            });
        });

        setResult(d);
        return;
    }


    // ===============================================
    // 分支二：单口令分析比对
    // ===============================================
    if (!rawSourcePass) {
        setResult([{
            title: "错误",
            desc: "未获取到有效的分享参数",
            col_type: "text_center_1"
        }]);
        return;
    }

    setPageTitle("代码一致性比对");
    let d = [];
    let sourcePass = rawSourcePass;
    if (sourcePass.includes("$")) {
        sourcePass = sourcePass.split("$")[1];
    }

    let shareObj = null;
    try {
        shareObj = ShareManage.parseShareCode(sourcePass);
    } catch (e) {
        d.push({
            title: "口令解析失败",
            desc: e.message,
            col_type: "text_center_1"
        });
        setResult(d);
        return;
    }

    let newSource = shareObj.source;
    let newName = newSource.name;
    let category = shareObj.category;
    let safeName = String(newName).replace(/[\\/:*?"<>|]/g, "_");

    if (category === 'unsupported_csp' || category === 'unknown') {
        d.push({
            title: "❌ 不支持的源类型",
            desc: "该分享口令包含了尚未适配的 TVBox 原生爬虫或其他未知源类型，为了防止污染系统文件，已拒绝导入。",
            col_type: "text_center_1"
        });
        setResult(d);
        return;
    }

    let baseDir = getPath("hiker://files/rules/DrpyHiker/builtin_sources/" + category + "/").replace("file://", "");
    let jsonPath = Fs.combinPath(baseDir, "/" + safeName + ".json");

    if (!Fs.exists(jsonPath)) {
        d.push({
            title: "正在导入新源...",
            col_type: "text_center_1"
        });
        setResult(d);
        let msg = ShareManage.importSource(shareObj, true);
        runtimeConfig.initDefault();
        toast(msg.replace("toast://",""));
        back();
        return;
    }

    let localMd5 = "";
    let localJsonContent = Fs.readFile(jsonPath);
    let existSource = {};
    try {
        existSource = JSON.parse(localJsonContent);
    } catch (e) {}

    if (typeof existSource.ext === "object") {
        localMd5 = md5(JSON.stringify(existSource.ext));
    } else {
        let extName = (category === 't3_py') ? ".py" : ".js";
        let filePrefix = md5(existSource.name + existSource.key) + "_";
        let scriptPath = Fs.combinPath(baseDir, "/" + filePrefix + safeName + extName);
        if (!Fs.exists(scriptPath)) {
            scriptPath = Fs.combinPath(baseDir, "/" + safeName + extName);
        }

        if (Fs.exists(scriptPath)) {
            let localContent = Fs.readFile(scriptPath);
            if (localContent) localMd5 = md5(localContent);
        } else {
            localMd5 = md5(JSON.stringify(existSource));
        }
    }

    let isContentSame = localMd5 && (localMd5 === shareObj.scriptMd5);

    if (isContentSame) {
        // 【核心修复】：由于分享源是被标准化的相对路径，这里将两端对象都经由 formatSourceLocalPaths 进行绝对路径转化后再做 MD5 对比
        let normSrc = ShareManage.formatSourceLocalPaths(newSource, category);
        let normLocalSrc = ShareManage.formatSourceLocalPaths(existSource, category);
        
        let sourceJsonMd5 = md5(JSON.stringify(normSrc));
        let existJsonMd5 = md5(JSON.stringify(normLocalSrc));
        
        if (sourceJsonMd5 === existJsonMd5) {
            d.push({
                title: "🟢 本地代码已是最新",
                desc: "本地源与分享源代码及配置 MD5 完全一致，无需重复导入",
                col_type: "text_center_1"
            });
            d.push({
                title: "返回",
                col_type: "text_center_1",
                url: $("#noLoading#").lazyRule(() => {
                    back();
                    return "hiker://empty";
                })
            });
            setResult(d);
            return;
        }
    }

    d.push({
        title: "⚠️ 发现同名源冲突",
        desc: "内部目录已存在名为「" + newName + "」的源\n" + (isContentSame ? "🟢 代码相同，仅参数或配置存在变更" : "🔴 代码文件发生实质性修改！"),
        col_type: "text_center_1"
    });

    let diffDesc = "分类: " + category + " | 新文件 MD5: " + String(shareObj.scriptMd5).substring(0, 8);
    if (shareObj.scriptContent) diffDesc += "\n新代码长度: " + shareObj.scriptContent.length;

    d.push({
        title: newName,
        desc: diffDesc,
        col_type: "avatar",
        img: "hiker://images/home_tools",
        url: $("").lazyRule((existName, shareObjStr, safeName, category, existSourceStr) => {
            let options = ["⚡ 覆盖原始", "✏️ 改名导入", "📄 查看新代码", "💾 查看本地代码", "⚙️ 查看新配置", "🏠 查看本地配置"];
            showSelectOptions({
                title: "详细操作: " + existName,
                options: options,
                col: 2,
                js: $.toString((existName, shareObjStr, safeName, category, existSourceStr) => {
                    const ShareManage = $.require('./subpage/ShareManage.js');
                    const runtimeConfig = GM.defineModule('runtimeConfig');
                    const Fs = $.require('./libs/Fs.js');
                    let sObj = JSON.parse(shareObjStr);
                    let existSrc = JSON.parse(existSourceStr);

                    if (input === "⚡ 覆盖原始") {
                        let msg = ShareManage.importSource(sObj, true);
                        runtimeConfig.initDefault();
                        toast(msg);
                        back();
                    } else if (input === "✏️ 改名导入") {
                        return $(existName + "_新", "请输入新名字").input((o) => {
                            if (!input) return "toast://名字不能为空";
                            const Fs = $.require('./libs/Fs.js');
                            let safeInput = String(input).replace(/[\\/:*?"<>|]/g, "_");
                            let checkPath = getPath("hiker://files/rules/DrpyHiker/builtin_sources/" + o.category + "/" + safeInput + ".json").replace("file://", "");
                            if (Fs.exists(checkPath)) return "toast://冲突仍存在，请换个名字";

                            let sObj = JSON.parse(o.shareObjStr);
                            sObj.source.name = input;
                            sObj.source.key = o.category + "_" + safeInput;

                            let msg = $.require('./subpage/ShareManage.js').importSource(sObj, true);
                            GM.defineModule('runtimeConfig').initDefault();
                            toast(msg);
                            back();
                        }, {
                            existName: existName,
                            shareObjStr: shareObjStr,
                            category: category
                        });
                    } else if (input === "📄 查看新代码") {
                        let cachePath = getPath("hiker://files/_cache/temp_new_source_view.js").replace("file://", "");
                        let outContent = sObj.scriptContent ? sObj.scriptContent : JSON.stringify(sObj.source, null, 2);
                        Fs.writeFile(cachePath, outContent);
                        return "editFile://file://" + cachePath;
                    } else if (input === "💾 查看本地代码") {
                        let localBaseDir = getPath("hiker://files/rules/DrpyHiker/builtin_sources/" + category + "/").replace("file://", "");
                        let extName = (category === 't3_py') ? ".py" : ".js";
                        let filePrefix = md5(existSrc.name + existSrc.key) + "_";
                        let localPath = Fs.combinPath(localBaseDir, "/" + filePrefix + safeName + extName);
                        if (!Fs.exists(localPath)) localPath = Fs.combinPath(localBaseDir, "/" + safeName + extName);
                        if (!Fs.exists(localPath)) return "toast://本地不存在对应脚本";
                        return "editFile://file://" + localPath;
                    } else if (input === "⚙️ 查看新配置") {
                        let cachePath = getPath("hiker://files/_cache/temp_new_source_json.json").replace("file://", "");
                        Fs.writeFile(cachePath, JSON.stringify(sObj.source, null, 2));
                        return "editFile://file://" + cachePath;
                    } else if (input === "🏠 查看本地配置") {
                        let localBaseDir = getPath("hiker://files/rules/DrpyHiker/builtin_sources/" + category + "/").replace("file://", "");
                        let localPath = Fs.combinPath(localBaseDir, "/" + safeName + ".json");
                        if (!Fs.exists(localPath)) return "toast://本地不存在对应配置";
                        return "editFile://file://" + localPath;
                    }
                }, existName, shareObjStr, safeName, category, existSourceStr)
            });
            return "hiker://empty";
        }, newName, JSON.stringify(shareObj), safeName, category, JSON.stringify(existSource))
    });

    d.push({
        title: "取消并返回",
        col_type: "text_center_1",
        url: $("#noLoading#").lazyRule(() => {
            back();
            return "hiker://empty";
        })
    });
    setResult(d);

})();
