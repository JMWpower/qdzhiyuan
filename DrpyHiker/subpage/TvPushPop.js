const ConfigManager = $.require('./subpage/ConfigManager.js');
const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
hikerPop.setUseStartActivity(false);
const cachePath = "hiker://files/rules/DrpyHiker/drpyHiker_tv_ips.json";

function getIPv4Address() {
    const NetworkInterface = java.net.NetworkInterface;
    try {
        for (let en = NetworkInterface.getNetworkInterfaces(); en.hasMoreElements();) {
            let intf = en.nextElement();
            let interfaceName = intf.getName();
            if (interfaceName.startsWith("rmnet") || interfaceName.startsWith("ppp")) {
                // 如果是流量相关的接口,跳过
                continue;
            }
            for (let enumIpAddr = intf.getInetAddresses(); enumIpAddr.hasMoreElements();) {
                let inetAddress = enumIpAddr.nextElement();
                if (!inetAddress.isLoopbackAddress() && inetAddress instanceof java.net.Inet4Address) {
                    return inetAddress.getHostAddress();
                }
            }
        }
    } catch (ex) { }
    return "0.0.0.0";
}

function scanShow(m, ipsCache) {
    let pop = hikerPop.selectCenter({
        options: ["全量扫描", "快速扫描", "手动输入", "清除缓存", "代理解析:" + (ConfigManager.getGlobal("pushUrlProxy") ? "开" : "关")],
        columns: 1,
        title: "IP扫描",
        //noAutoDismiss: true,
        position: -1,
        click(s, i) {
            hikerPop.runOnNewThread(() => {
                if ([0, 1].includes(i)) {
                    let isfast = s == "快速扫描";
                    let ip = getIP();
                    /*if(ip.startsWith('0')){
                        return 'toast://当前设备未接入局域网,请连接wifi后再试!';
                    }*/
                    showLoading(`${input}扫描附近TVB,请稍等...`);
                    let ip_base = ip.split('.').slice(0, -1).join('.');
                    let url_list = [];
                    for (let i = 0; i < 256; i++) {
                        url_list.push(`http://${ip_base}.${i}:9978/`);
                    }
                    url_list.reverse();
                    let htmlUrl = [];
                    let task = function (obj) {
                        return request(obj.url, obj.options);
                    };
                    url_list.forEach(it => {
                        htmlUrl.push({
                            url: it,
                            options: {
                                headers: {
                                    "content-type": "charset=utf-8"
                                },
                                timeout: 250,
                            }
                        });
                    });
                    let tasks = htmlUrl.map((it, idex) => {
                        return {
                            func: task,
                            param: it,
                            id: '' + idex
                        }
                    });
                    let bhtml = [];
                    let count = tasks.length;
                    be(tasks, {
                        func: function (obj, id, error, taskResult) {
                            // bhtml.push(taskResult);
                            bhtml.push({
                                html: taskResult,
                                id: id
                            });
                            count = count - 1;
                            if (isfast && taskResult.includes("推送")) {
                                hideLoading();
                                return "break";
                            } else if (count > 0) {
                                showLoading(`${input}扫描中，剩余：${count}`);
                            } else {
                                hideLoading();
                            }
                        }
                    });
                    // let bhtml = bf(htmlUrl);
                    let tvbs = [];
                    for (let h of bhtml) {
                        if (h.html.includes("推送")) {
                            // tvbs.push(url_list[j]);
                            tvbs.push(url_list[parseInt(h.id)]);
                        }
                    }
                    //log(tvbs);
                    hideLoading();
                    Object.assign(ipsCache, tvbs);

                    if (ipsCache.length > 0) {
                        m.list.length = 0;
                        Object.assign(m.list, ipsCache);
                        hikerPop.runOnUIThread(() => m.change());
                        writeFile(cachePath, JSON.stringify(ipsCache));
                    }
                    return `toast://${s}扫描完毕,发现附近${tvbs.length}个tvbox软件`;
                } else if (2 === i) {
                    hikerPop.inputConfirm({
                        title: "输入ip",
                        defaultValue: 'http://' + getIP() + ':9978/',
                        hideCancel: true,
                        confirm(text) {
                            ipsCache.push(text);
                            ipsCache = Array.from(new Set(ipsCache));
                            m.list.length = 0;
                            Object.assign(m.list, ipsCache);
                            hikerPop.runOnUIThread(() => m.change());
                            writeFile(cachePath, JSON.stringify(ipsCache));
                            return "toast://已添加设备:" + text;
                        }
                    });
                } else if (3 === i) {
                    ipsCache.length = 0;
                    m.list.length = 0;
                    hikerPop.runOnUIThread(() => m.change());
                    writeFile(cachePath, JSON.stringify(ipsCache));
                    return "toast://已清空历史设备";
                } else {
                    ConfigManager.setGlobal("pushUrlProxy", !ConfigManager.getGlobal("pushUrlProxy"));
                    return "toast://" + (ConfigManager.getGlobal("pushUrlProxy") ? "开启" : "关闭");
                }

            });
        }
    });
}



$.exports.show = function (source, id, flag, index) {
    let ipsCache = fetch(cachePath);
    try {
        ipsCache = JSON.parse(ipsCache);
        if (!Array.isArray(ipsCache)) {
            ipsCache = [];
        }
    } catch (e) {
        ipsCache = [];
    }
    const runtimeConfig = GM.defineModule("runtimeConfig");
    const DrpyManage = GM.defineModule("DrpyManage");
    let drpy = DrpyManage.getBySource(source);

    let pop = hikerPop.selectBottomRes({
        options: ipsCache.length == 0 ? ["点击开始扫描"] : ipsCache,
        columns: 1,
        title: "TVBOX推送",
        noAutoDismiss: true,
        position: -1,
        menuClick(manage) {
            scanShow(manage, ipsCache);
        },
        height: .6,
        click(s, i, manage) {
            if (i == 0 && ipsCache.length == 0) {
                scanShow(manage, ipsCache);
            } else {
                hikerPop.runOnNewThread(() => {
                    let isPushUrlProxy = ConfigManager.getGlobal("pushUrlProxy");
                    if (!isPushUrlProxy && ["小说", "漫画"].includes(drpy.getRule("类型"))) {
                        return "toast://推送小说或漫画必须开启代理解析";  
                    }
                    showLoading('推送准备中...');
                    //测试连通性
                    if (!request(s, {
                        headers: {
                            "content-type": "charset=utf-8"
                        },
                        timeout: 250
                    }).includes("推送")) {
                        hideLoading();
                        return "toast://链接失败,请确认IP正确且box处于开启状态";
                    }
                    let vod = JSON.parse(drpy.detail(String(id))).list[0];
                    let detail = {
                        name: vod.vod_name,
                        pic: (vod.vod_pic || "").split('@')[0],
                        content: vod.vod_content,
                        url: vod.vod_play_url,
                        from: vod.vod_play_from,
                        actor: vod.vod_remarks,
                        director: vod.type_name,
                        vod_play_flag: flag,
                        vod_play_index: index
                    };
                    
                    if (isPushUrlProxy) {
                        if (drpy.TAG === "T4Adapter") {
                            detail.vod_play_api = drpy.getPlayApi().replace(/^(https?:\/\/)(localhost|127.0.0.1)/, "$1" + getIPv4Address());
                        } else {
                            let Proxy = $.require("LocalProxy");
                            let proxyUrl = Proxy.startProxy(MY_RULE.title, GM.getSelfKey());
                            detail.vod_play_api = buildUrl(proxyUrl, {
                                "do": "pushUrl",
                                "hikerSkey": source.key
                            })
                        }
                    }
                    //log(detail)
                    let state = post(s + 'action', {
                        timeout: 2000,
                        body: {
                            do: 'push',
                            url: encodeURIComponent(JSON.stringify(detail))
                        },
                        headers: {
                            'User-Agent': MOBILE_UA
                        },
                    });
                    // log(state);
                    
                    hideLoading();
                    if (state === 'ok') {
                        return 'toast://推送成功';
                    } else {
                        return 'toast://推送失败';
                    }
                });
            }
        }
    });
}