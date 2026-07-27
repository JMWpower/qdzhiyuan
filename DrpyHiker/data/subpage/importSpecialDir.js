// 文件路径：subpage/importSpecialDir.js
// 职责：处理 T4/T5 特殊源的本地目录选择、子目录扫描、外部代码文件的下载保存以及引擎互相切换

(function() {
    const ConfigManager = $.require('./subpage/ConfigManager.js');
    const f = $.require("hiker://files/data/DrpyHiker/libs/fileSelection.js");

    // 1. 解析外部调用参数与内部状态，支持动态切换引擎
    let lang = getParam('lang', '');
    let extName = decodeURIComponent(getParam('name', ''));
    let extUrl = getParam('urlc', '');
    let isExternal = !!lang;

    // 获取当前选中的分类 (优先从临时变量读，方便用户手动切换)
    let currentCategory = getMyVar('import_target_category', '');

    if (!currentCategory) {
        if (isExternal) {
            currentCategory = (lang === 'ds') ? 't4' : (lang === 'node' ? 't5' : 't4'); // 默认给 t4
        } else {
            currentCategory = getMyVar("pending_import_category", "t4");
        }
        putMyVar('import_target_category', currentCategory);
    }

    if (!currentCategory) {
        setResult([{ title: "错误", desc: "未知的导入类型或缺少必要参数", col_type: "text_center_1" }]);
        return;
    }

    setPageTitle(currentCategory === 't4' ? "导入为 T4 (DS) 源" : "导入为 T5 (Node) 源");

    addListener("onClose", () => {
        clearMyVar("special_dir_input");
        clearMyVar("import_target_category");
    });

    let layout = [];

    // ==========================================
    // 🌟 新增：目标引擎一键切换开关
    // ==========================================
    layout.push({
        title: (currentCategory === 't4' ? "🔄 当前导入引擎：T4 (DS) 🔄" : "🔄 当前导入引擎：T5 (Node) 🔄")+"\n🔨 当前导入："+ extName+" 🔨",
        desc: "T4/T5 代码通常通用，点击此处可快速切换目标引擎",
        col_type: "text_center_1",
        url: $("#noLoading#").lazyRule(() => {
            let current = getMyVar('import_target_category', 't4');
            let nextCat = current === 't4' ? 't5' : 't4';
            
            putMyVar('import_target_category', nextCat);
            // 切换引擎时，清空输入框的临时路径，让它重新读取新引擎对应的默认配置路径
            clearMyVar("special_dir_input");
            refreshPage(false);
            
            return "toast://已切换为 " + nextCat.toUpperCase() + " 引擎";
        })
    });
    layout.push({ col_type: "line" });

    // 2. 获取配置的根路径
    let configKey = currentCategory === 't4' ? "t4ServerPath" : "localt5";
    let currentPath = getMyVar("special_dir_input", ConfigManager.getGlobal(configKey) || "");

    // 3. 构建路径选择 UI
    let initialPath = joinUrl(getPath("hiker://files/"), "../".repeat(5)).slice(7);
    layout.push({
        title: "选择项目根目录",
        url: JSON.stringify(f.fileSelectionUri({
            callback: $.toString(() => {
                let target = findItem("special_dir_input").extra;
                updateItem("special_dir_input", { extra: Object.assign(target, { defaultValue: PATH }) });
                return true;
            }),
            rootDirPath: initialPath,
            initialPath: initialPath,
            pattern: 1 // 1: 仅选择文件夹
        })),
        col_type: "input",
        desc: "当前 " + currentCategory.toUpperCase() + " 项目根目录，点击左侧选择",
        extra: {
            defaultValue: currentPath,
            onChange: $.toString(() => {
                putMyVar("special_dir_input", input);
            }),
            id: "special_dir_input"
        }
    });

    layout.push({
        title: "保存根目录设置",
        url: $("#noLoading#").lazyRule((configKey) => {
            let path = getMyVar("special_dir_input", "");
            if (!path) return "toast://目录不可为空";
            
            const ConfigManager = $.require('./subpage/ConfigManager.js');
            ConfigManager.setGlobal(configKey, path);
            refreshPage(false);
            return "toast://项目根目录保存成功！";
        }, configKey),
        col_type: "text_center_1"
    });

    layout.push({ col_type: "line_blank" });

    // 4. 扫描子目录与保存逻辑
    if (currentPath) {
        let realPath = currentPath;
        if (realPath.startsWith("hiker://")) realPath = getPath(realPath).replace("file://", "");
        else if (realPath.startsWith("file://")) realPath = realPath.replace("file://", "");

        let dirFile = new java.io.File(realPath);
        
        if (dirFile.exists() && dirFile.isDirectory()) {
            layout.push({ title: "📁 请选择文件保存的位置", col_type: "text_center_1" });

            let dirs = [{ name: "当前根目录 (/)", path: currentPath }];
            
            let list = dirFile.listFiles();
            if (list) {
                let dirArray = Array.from(list).filter(item => item.isDirectory());
                dirArray.sort((a, b) => String(a.getName()).localeCompare(String(b.getName())));
                
                dirArray.forEach(subDir => {
                    let dName = String(subDir.getName());
                    let dPath = currentPath.endsWith("/") ? currentPath + dName : currentPath + "/" + dName;
                    dirs.push({ name: "📂 /" + dName, path: dPath });
                });
            }

            dirs.forEach(d => {
                layout.push({
                    title: d.name,
                    desc: d.path,
                    url: $("").lazyRule((dirPath, isExt, ctg, extN, extU) => {
                        try {
                            let formatPath = dirPath.startsWith("/") ? "file://" + dirPath : dirPath;

                            if (isExt) {
                                // 【外部小程序调用】：下载远端代码文件到选定目录
                                if (!extN || !extU) return "toast://参数缺失：无法获取文件名或下载链接";
                                
                                let savePath = formatPath.endsWith("/") ? formatPath + extN : formatPath + "/" + extN;
                                let content = fetch(extU);
                                if (!content) return "toast://网络异常：文件下载失败";
                                
                                writeFile(savePath, content);
                                return "toast://代码文件已成功保存至:\n" + extN;
                            } else {
                                // 【内部分享导入】：生成 JSON 配置指向该目录
                                let sourceStr = getMyVar("pending_import_source", "");
                                if (!sourceStr) return "toast://缓存丢失：无待导入的源数据";
                                
                                let source = JSON.parse(sourceStr);
                                let safeName = String(source.name).replace(/[\\/:*?"<>|]/g, "_");

                                // 【核心】：根据当前切换的引擎，强制修正源的 type 属性并分类处理
                                if (ctg === 't4') {
                                    source.type = 4;
                                    source.ext = formatPath;
                                    let jsonBaseDir = "hiker://files/rules/DrpyHiker/builtin_sources/t4/";
                                    writeFile(jsonBaseDir + safeName + ".json", JSON.stringify(source, null, 2));
                                } else if (ctg === 't5') {
                                    source.type = 5;
                                    const ConfigManager = $.require('./subpage/ConfigManager.js');
                                    ConfigManager.setGlobal("localt5", formatPath);
                                }

                                clearMyVar("pending_import_source");
                                clearMyVar("pending_import_category");
                                clearMyVar("import_target_category"); // 导入完成，清空临时状态
                                
                                // 重新载入内置源数据以使新源立即生效
                                const runtimeConfig = GM.defineModule("runtimeConfig");
                                runtimeConfig.initDefault();

                                return "toast://" + ctg.toUpperCase() + " 环境源导入成功！";
                            }
                        } catch (e) {
                            return "toast://保存出错: " + e.message;
                        }
                    }, d.path, isExternal, currentCategory, extName, extUrl),
                    col_type: "text_1"
                });
            });
        } else {
            layout.push({ title: "⚠️ 提示：您设置的项目目录无效或不存在", desc: "请点击上方输入框重新选择并保存", col_type: "text_center_1" });
        }
    } else {
        layout.push({ title: "👈 提示：请先在上方设置并保存您的项目根目录", col_type: "text_center_1" });
    }

    setResult(layout);

})();
