const PageStateManager = GM.defineModule('./subpage/PageStateManager.js');
const CategoryManager = GM.defineModule('./subpage/CategoryManager.js');
const ThemeManager = $.require('./subpage/ThemeManager.js');
const ConfigManager = $.require('./subpage/ConfigManager.js');
const ShareManage = $.require('./subpage/ShareManage.js');

const uiUtils = $.require("./subpage/uiUtils.js");
$.exports.show = function(time) {
    if (time) {
        java.lang.Thread.sleep(time);
    }

    const getRangeColors = uiUtils.getRangeColors;
    const theme = ThemeManager.getCurrentTheme();
    const ui_config = theme.yi;

    let {
        getLeach,
        leachlist,
    } = $.require("methods");

    let leach = getLeach();
    leachlist(leach);

    const runtimeConfig = GM.defineModule("runtimeConfig");
    let source = runtimeConfig.getCurrentSource() || {};

    let name = source.name || "";
    const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
    let color = ui_config.换源颜色;
    if (color == "random") {
        color = getRangeColors();
    }

    let slist = Array.from(runtimeConfig.getAllSource());

    let sourceNameList = slist.map(v => {
        return v.name == name ? `““””<span style="color:${color}">${v.name}</span>` : v.name;
    });

    hikerPop.setUseStartActivity(false);

    function dateFormat(date) {
        let text = 'M-dd HH:mm';
        return $.dateFormat(date.getTime(), text);
    }

    let datetime = dateFormat(new Date());
    let ps = datetime.split(" ")[1].split(':').reduce((acc, val) => acc + parseInt(val, 10), 0);

    //排序方法
    let {
        naturalSort,
        usingSort,
        removeHtmlTags
    } = $.require("methods");

    let spen = ConfigManager.getGlobal("change_list_spen")||3;
    let items = sourceNameList.map((x, i) => {
        return {
            title: x,
            url: i
        }
    });

    let names = items.map(v => v.title);
    let sname = names.slice();
    if (ConfigManager.getGlobal("natural")) {
        names = naturalSort(names);
    }
    if (ConfigManager.getGlobal("usingst")) {
        names = usingSort.get(names);
    }

    let manage_all = names.slice();
    let searchKey = "";
    let inputBox;
    let pop = hikerPop.selectBottomRes({
        options: names,
        columns: spen,
        title: "选择视频源 当前共:" + items.length + "个视频源",
        noAutoDismiss: true,
        position: 1,
        extraInputBox: (inputBox = new hikerPop.ResExtraInputBox({
            hint: "源关键字",
            title: "TAG",
            onChange(text, manage) {
                text = text.toLowerCase();
                if (!/^\[.*\]$/.test(text)) {
                    putMyVar("searchSourceTag", "");
                }
                let flist = names.filter(x => {
                    if (text.startsWith('?')) {
                        let regex;
                        try {
                            regex = new RegExp(text.substring(1), 'i');
                        } catch {}
                        if (regex) {
                            return regex.test(x);
                        }
                    } else {
                        return x.toLowerCase().includes(text);
                    }
                });
                if (ConfigManager.getGlobal("inputmem")) {
                    putMyVar("searchSourceTag", text);
                }
                manage.list.length = 0;
                flist.forEach(x => {
                    manage.list.push(x);
                });
                manage.change();
            },
            defaultValue: getMyVar("searchSourceTag", ""),
            click(s, manage) {
                let tagClasses = runtimeConfig.getTagClasses();
                if (!tagClasses.length) return "toast://当前配置没有TAG哦。";
                tagClasses.unshift("全部");
                hikerPop.selectCenter({
                    options: tagClasses,
                    columns: 3,
                    title: "TAG[" + tagClasses.length + "]",
                    click(a) {
                        let tag = a;
                        if (a == "全部") {
                            tag = "";
                        } else {
                            tag = "[" + a + "]"
                        }
                        inputBox.setDefaultValue(tag);
                        putMyVar("searchSourceTag", tag);
                    }
                });
            },
            titleVisible: true
        })),
        // ==========================================
        // 【核心修改区】长按源操作菜单
        // ==========================================
        longClick(s, i) {
            const runtimeConfig = GM.defineModule("runtimeConfig");
            let sources = runtimeConfig.getAllSource();
            let source = sources.find(v => v.name == removeHtmlTags(s));

            let options = ["源码查看"];

            // 加入自动唤醒的多种分享方式
            if (ShareManage.isShareable(source)) {
                options.push("导出系统文件");
                options.push("本地完整口令");
                options.push("云口令");
                try {
                    let pastes = typeof getPastes === 'function' ? getPastes() : [];
                    if (pastes && pastes.length > 0) {
                        options = options.concat(pastes); // 动态加载可用的 Pastebin
                    }
                } catch (e) {}
            }

            const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
            hikerPop.selectCenter({
                options: options,
                columns: 2,
                title: "源操作",
                click(input, MY_INDEX) {
                    let name = removeHtmlTags(s);
                    const runtimeConfig = GM.defineModule("runtimeConfig");
                    let sources = runtimeConfig.getAllSource();
                    let source = sources.find(v => v.name == name);

                    if (input == "源码查看") {
                        return $.require("methods").viewSourse(source);
                    }

                    if (input == "导出系统文件") {
                        return ShareManage.exportSystemFile(source);
                    }
                    hikerPop.runOnNewThread(()=>{
                    
                        let packedBase64 = ShareManage.packSource(source);
                        if (packedBase64.startsWith("error:")) {
                            return "toast://" + packedBase64;
                        }

                        let url = "";
                        if (input=="本地完整口令") {
                            url = "drpyhiker://" + packedBase64;
                        } else {
                            // 调用原来的云分享方法上传 Base64
                           
                            url =  sharePaste(packedBase64, input) ;
                            if (!url) return "toast://云端分享失败，网络异常或Pastebin无响应";
                        }

                        let pname = (source.name || "DrpyHikerSource") + ".json";
                        let api = source.type === 3 ? "drpy2" : "json";

                        // 组装完美的自动唤醒导入剪贴板口令
                        return "copy://海阔视界，DRPY视频源「" + name + "」复制整条口令打开软件就会自动导入$" + url + "$" + pname + "#" + api + "@import=js:'hiker://page/importAndDifference?rule=DrpyHiker&sourcePass='+input";
                    });

                }
            });
        },
        // ==========================================
        click(s, i, manage) {
            pop.dismiss();

            ConfigManager.setGlobal("no_loading", true);

            let homePageId = PageStateManager.getOrCreatePageId("home");
            if (homePageId) {
                CategoryManager.close(homePageId);
            }

            let name = removeHtmlTags(manage.list[i]);

            if (name == source.name) {
                refreshPage();
                return;
            }
            let sources = runtimeConfig.getAllSource();
            let key = sources.find(v => v.name == name).key;

            usingSort.set(name);
            let sourceNameList = runtimeConfig.setCurrentSource(key);

            refreshPage();
        },
        menuClick(manage) {
            hikerPop.selectCenter({
                options: ["改变样式", "倒序", "自然排序:" + (!ConfigManager.getGlobal("natural") ? "关闭" : "启用"), "使用排序:" + (!ConfigManager.getGlobal("usingst") ? "关闭" : "启用"), "刷新配置", "分享时编码:" + ConfigManager.getGlobal("share_encode"), "输入框记忆:" + (!ConfigManager.getGlobal("inputmem") ? "关闭" : "启用"), "青少年模式:" + (leach ? "开启" : "关闭")],
                columns: 2,
                title: "请选择 时间 " + datetime,
                click(s, i) {
                    if (s == "改变样式") {
                        spen = spen == 3 ? 1 : (spen == 2 ? 3 : 2);
                        ConfigManager.setGlobal("change_list_spen",spen)
                        manage.changeColumns(spen);
                    } else if (s.includes("倒序")) {
                        manage.list.reverse();
                        names.reverse();
                        manage.change();
                    } else if (s.includes("自然排序")) {
                        let list = manage.list.concat();
                        let natural = ConfigManager.getGlobal("natural");
                        if (!natural) {
                            manage.list.length = 0;
                            naturalSort(list).forEach(x => {
                                manage.list.push(x);
                            });
                            ConfigManager.setGlobal("usingst", false)
                        } else {
                            manage.list.length = 0;
                            sname.forEach(x => {
                                manage.list.push(x);
                            })
                        }
                        manage.change();
                        ConfigManager.setGlobal("natural", !natural);
                    } else if (s.includes("使用排序")) {
                        let list = manage.list.concat();
                        let usingst = ConfigManager.getGlobal("usingst");
                        if (!usingst) {
                            manage.list.length = 0;
                            usingSort.get(list).forEach(x => {
                                manage.list.push(x);
                            });
                            ConfigManager.setGlobal("natural", false)
                        } else {
                            manage.list.length = 0;
                            sname.forEach(x => {
                                manage.list.push(x);
                            })
                        }
                        manage.change();
                        ConfigManager.setGlobal("usingst", !usingst);
                    } else if (s == "刷新配置") {
                        hikerPop.runOnNewThread(() => {
                            function arrayDifference(arr1, arr2) {
                                const map = new Map(arr2.map(item => [item.key, item]));
                                return arr1.filter(item => !map.has(item.key));
                            }

                            let runtimeConfig = GM.defineModule("runtimeConfig", "runtimeConfig");
                            let list = runtimeConfig.getAllSource();
                            if (!runtimeConfig.initDefault()) {
                                toast("刷新失败");
                                return;
                            };
                            let nsources = runtimeConfig.getAllSource();

                            let alist = arrayDifference(nsources, list);
                            let dlist = arrayDifference(list, nsources);

                            if (alist.length > 0 || dlist.length > 0) {
                                let msg = "";
                                if (alist.length > 0) {
                                    alist.forEach(x => {
                                        manage.list.push(x.name);
                                    })
                                    msg += "新增" + alist.length + "个源";
                                }
                                if (dlist.length > 0) {
                                    dlist.forEach(x => {
                                        manage.list.splice(manage.list.indexOf(x.name), 1);
                                    })
                                    msg += " 移除" + dlist.length + "个源";
                                }
                                hikerPop.runOnUIThread(() => {
                                    manage.change();
                                    manage.setTitle("选择视频源 当前共:" + manage.list.length + "个视频源");
                                });
                                toast(msg + " 更多详情看log");
                            } else {
                                toast("已刷新");
                            }
                        });

                    } else if (s.includes("青少年模式")) {
                        function select() {
                            showSelectOptions({
                                "title": "选择",
                                "options": ["临时关闭", "关闭", "设置密码"],
                                col: 1,
                                js: $.toString(() => {
                                    const ConfigManager = $.require('./subpage/ConfigManager.js');
                                    if (input == "临时关闭") {
                                        putMyVar("tempLeach", input);
                                    } else if (input == "关闭") {
                                        ConfigManager.setGlobal("leach", false);
                                    } else {
                                        return $("", "设置密码\n指纹不能用时有效").input(() => {
                                            if (input) {
                                                ConfigManager.setGlobal("leachPass", input);
                                                return "toast://设置成功";
                                            } else {
                                                ConfigManager.setGlobal("leachPass", "");
                                                return "toast://使用默认密码";
                                            }
                                        });
                                    }
                                })
                            });
                        }
                        let leachPass = ConfigManager.getGlobal("leachPass");
                        if (s.includes("关闭")) {
                            if (hikerPop.canBiometric() !== 0 && !leachPass) {
                                hikerPop.inputConfirm({
                                    title: "设置密码",
                                    hint: "密码",
                                    confirm(text) {
                                        if (!text) {
                                            return "toast://密码不能为空";
                                        } else {
                                            ConfigManager.setGlobal("leachPass", text);
                                            ConfigManager.setGlobal("leach", true);
                                            clearMyVar("tempLeach");
                                            toast("打开过滤");
                                        }
                                    },
                                });
                            } else {
                                ConfigManager.setGlobal("leach", true);
                                clearMyVar("tempLeach");
                                toast("打开过滤");
                            }
                        } else {
                            if (hikerPop.canBiometric() !== 0) {
                                hikerPop.inputConfirm({
                                    content: "输入密码进行关闭",
                                    title: "输入密码",
                                    hint: "密码",
                                    confirm(text) {
                                        if (text === leachPass || (!leachPass && text === String(ps))) {
                                            select();
                                        } else {
                                            return "toast://密码错误";
                                        }
                                    },
                                });
                            } else {
                                hikerPop.checkByBiometric(() => {
                                    hikerPop.runOnNewThread(() => {
                                        select();
                                    });
                                });
                            }
                        }
                        pop.dismiss();
                        return "hiker://empty";
                    } else if (s.includes("编码")) {
                        showSelectOptions({
                            title: "编码类型",
                            options: ["不编码", "Gzip", "Base64", "AES"],
                            col: 1,
                            js: $.toString(() => {
                                const ConfigManager = $.require('./subpage/ConfigManager.js');
                                if (MY_INDEX === 0) {
                                    ConfigManager.setGlobal("share_encode", "");
                                } else {
                                    ConfigManager.setGlobal("share_encode", input);
                                }
                                return "toast://" + input;
                            })
                        });
                    } else if (s.includes("输入框")) {
                        ConfigManager.setGlobal("inputmem", !ConfigManager.getGlobal("inputmem"));
                        if (!ConfigManager.getGlobal("inputmem")) {
                            clearMyVar("searchSourceTag");
                            pop.dismiss();
                        }
                        toast("已" + (ConfigManager.getGlobal("inputmem") ? "开启" : "关闭") + "输入框记忆");
                    }
                },
            });
        }
    });
}