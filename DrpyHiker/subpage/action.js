// @author LoyDgIk
let idfix = "#action";

const GZIP = $.require("GZIP");

function inputAction(options, rulekey) {
    let d = [];
    let id = idfix + "#input" + String(Date.now());
    d.push({
        title: "确认",
        col_type: "text_center_1",
        url: $("#noLoading#").lazyRule((id, options, rulekey) => {
            let value = getMyVar(id, "");
            let vs = {};
            vs[String(options.id)] = value;
            return $.require("action").checkCallbackRes(rulekey, options.actionId, JSON.stringify(vs), options.httpTimeout);
        }, id, options, rulekey),
    });
    if (options.imageUrl) {
        if (options.imageType === "card_pic_3") {
            d.push({
                col_type: "card_pic_3",
                url: "hiker://empty"
            });
        }
        d.push({
            col_type: options.imageType || "pic_1_full",
            url: options.imageUrl,
            pic_url: options.imageUrl,
        });
    }
    if (options.qrcode) {
        d.push({
            col_type: "card_pic_3",
            url: "hiker://empty"
        });
        let path = createQRCodeToFile(options.qrcode);
        d.push({
            title: "查看二维码",
            col_type: "card_pic_3_center",
            pic_url: path,
            url: path
        });

    }
    if (options.msg) {
        d.push({
            title: options.msg,
            col_type: options.msgType || "text_center_1",
            url: "hiker://empty",
            extra: {
                lineVisible: false
            }
        });
    }
    d.push({
        col_type: "input",
        desc: options.tip,
        extra: {
            onChange: $.toString((id) => {
                putMyVar(id, input);
            }, id),
            defaultValue: getMyVar(id, options.value),
            id: id,
            titleVisible: false
        }
    });

    if (options.selectData) {
        let select = options.selectData.split(",").map((v) => {
            v = v.split(":=");
            let r = v[1] || v[0];
            try {
                if (r.startsWith("H4sIAAAAAAAA")) {
                    r = GZIP.unzip(r);
                }
            } catch (e) {}
            return [v[0], r];
        });
        for (let [key, value] of select) {
            d.push({
                title: key,
                col_type: "scroll_button",
                url: $("#noLoading#").lazyRule((id, value) => {
                    let extra = findItem(id).extra;
                    extra.defaultValue = value;
                    updateItem(id, {
                        extra
                    });
                    return "hiker://empty";
                }, id, value)
            });
        }

    }
    setResult(d);
}

function multiInputAction(options, rulekey) {
    let d = [];

    let id = idfix + "#input" + String(Date.now());
    d.push({
        title: "确认",
        col_type: "text_center_1",
        url: $("#noLoading#").lazyRule((id, options, rulekey) => {
            let vs = {};
            options.input.forEach((v, i) => {
                vs[v.id] = getMyVar(id + i, "");
            });
            return $.require("action").checkCallbackRes(rulekey, options.actionId, JSON.stringify(vs), options.httpTimeout)

        }, id, options, rulekey),
    });
    if (options.msg) {
        d.push({
            title: options.msg,
            col_type: options.msgType || "text_center_1",
            url: "hiker://empty",
            extra: {
                lineVisible: false
            }
        });
    }
    let i = 0;
    for (let input of options.input) {
        let inputId = id + (i++);
        d.push({
            col_type: "input",
            desc: input.tip,
            extra: {
                onChange: $.toString((id) => {
                    putMyVar(id, input);
                }, inputId),
                defaultValue: getMyVar(inputId, input.value),
                id: inputId,
                titleVisible: false
            }
        });
    }
    setResult(d);
}

function multiInputXAction(options, rulekey) {
    let d = [];

    let id = idfix + "#input" + String(Date.now());
    d.push({
        title: "确认",
        col_type: "text_center_1",
        url: $("#noLoading#").lazyRule((id, options, rulekey) => {
            let vs = {};
            options.input.forEach((v, i) => {
                vs[v.id] = getMyVar(id + i, "");
            });
            return $.require("action").checkCallbackRes(rulekey, options.actionId, JSON.stringify(vs), options.httpTimeout)

        }, id, options, rulekey),
    });
    if (options.msg) {
        d.push({
            title: options.msg,
            col_type: options.msgType || "text_center_1",
            url: "hiker://empty",
            extra: {
                lineVisible: false
            }
        });
    }
    let i = 0;
    for (let input of options.input) {
        let inputId = id + (i++);
        let selectData = input.selectData;
        let name = input.name || '';
        let value = input.value;
        d.push({
            title: '点击',
            col_type: "input",
            desc: input.tip,
            url: $.toString((data, id, name, value) => {
                const GZIP = $.require("GZIP");
                const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
                let nArray = [],
                    rArray = [];
                for (let item of data.split(",")) {
                    let [key, value] = item.split(":=");
                    let r = value || key;
                    try {
                        if (r.startsWith("H4sIAAAAAAAA")) {
                            r = GZIP.unzip(r);
                        }
                    } catch (e) {}
                    nArray.push(key);
                    rArray.push(r);
                }
                let index = rArray.indexOf(getMyVar(id, '') || value);

                hikerPop.selectCenterMark({
                    options: nArray,
                    title: name + ": 请选择",
                    position: (index > -1) ? index : getMyVar(id + "_select", "0"),
                    icons: new Array(nArray.length).fill(hikerPop.icon.main_menu_home),
                    noAutoDismiss: false,
                    click(a, i) {
                        putMyVar(id, rArray[i]);
                        putMyVar(id + "_select", i.toString());
                        let extra = findItem(id).extra;
                        extra.defaultValue = rArray[i];
                        updateItem(id, {
                            extra: extra
                        });
                    }
                });
                return "hiker://empty";
            }, selectData, inputId, name, value),
            extra: {
                onChange: $.toString((id) => {
                    putMyVar(id, input);
                }, inputId),
                defaultValue: getMyVar(inputId, input.value),
                id: inputId,
                type: 'textarea',
                height: -1,
                highlight: selectData ? false : true
            }
        });
    }
    setResult(d);
}

function refreshAction(options, rulekey) {
    back();
    //refreshPage(false);
    return;
}

function menuAction(options, rulekey) {
    let d = [];
    let option = options.option.map(v => {
        let r = {}
        if (typeof v === "string") {
            v = v.split("$");
            r.name = v[0];
            r.action = v[1];
        } else {
            r = v;
        }
        return r;
    });

    if (options.msg) {
        d.push({
            title: options.msgType || options.msg,
            col_type: "text_center_1",
            url: "hiker://empty",
            extra: {
                lineVisible: false
            }
        });
    }
    let col = options.column || 2;
    col = col < 1 ? 1 : (col > 5 ? 5 : col);
    let i = 0;
    let selectedIndex = options.selectedIndex || -1;
    for (let it of option) {
        d.push({
            col_type: "text_" + col,
            title: i === selectedIndex ? "‘‘" + it.name + "’’" : it.name,
            url: $().lazyRule((options, action, rulekey) => {
                return $.require("action").checkCallbackRes(rulekey, options.actionId, action, options.httpTimeout);

            }, options, it.action, rulekey)
        });
        i++;
    }
    setResult(d);
}

function selectAction(options, rulekey) {
    let d = [];
    let id = idfix + "#select";
    if (!getMyVar(id, "")) {
        storage0.putMyVar(id, options.option);
    }
    let option = storage0.getMyVar(id, options.option);
    d.push({
        title: "全选",
        col_type: "text_4",
        url: $("#noLoading#").lazyRule((id, options) => {
            let opc = storage0.getMyVar(id, []);
            opc = opc.map(v => {
                v.selected = true;
                return v;
            });
            storage0.putMyVar(id, opc);
            putMyVar("action:noclear", "0");
            refreshPage(false);

            return "hiker://empty";
        }, id, options),
        extra: {
            lineVisible: false
        }
    });
    d.push({
        title: "全清",
        col_type: "text_4",
        url: $("#noLoading#").lazyRule((id, options) => {
            let opc = storage0.getMyVar(id, []);
            opc = opc.map(v => {
                v.selected = false;
                return v;
            });
            storage0.putMyVar(id, opc);
            putMyVar("action:noclear", "0");
            refreshPage(false);
            return "hiker://empty";
        }, id, options),
        extra: {
            lineVisible: false
        }
    });
    d.push({
        title: "反选",
        col_type: "text_4",
        url: $("#noLoading#").lazyRule((id, options) => {
            let opc = storage0.getMyVar(id, []);
            opc = opc.map(v => {
                v.selected = !v.selected;
                return v;
            });
            storage0.putMyVar(id, opc);
            putMyVar("action:noclear", "0");
            refreshPage(false);
            return "hiker://empty";
        }, id, options),
        extra: {
            lineVisible: false
        }
    });
    d.push({
        title: "确认",
        col_type: "text_4",
        url: $("#noLoading#").lazyRule((id, options, rulekey) => {
            let opc = storage0.getMyVar(id, []);
            opc = opc.map(v => {
                v.selected = !!v.selected;
                return v;
            });

            return $.require("action").checkCallbackRes(rulekey, options.actionId, JSON.stringify(opc), options.httpTimeout);
        }, id, options, rulekey),
        extra: {
            lineVisible: false
        }
    });

    d.push({
        col_type: "line_blank"
    });
    if (options.msg) {
        d.push({
            title: options.msgType || options.msg,
            col_type: "text_center_1",
            url: "hiker://empty",
            extra: {
                lineVisible: false
            }
        });
    }
    let col = options.column || 2;
    col = col < 1 ? 1 : (col > 5 ? 5 : col);
    let i = 0;
    for (let it of option) {
        d.push({
            col_type: "text_" + col,
            title: it.selected ? "‘‘" + it.name + "’’" : it.name,
            url: $("#noLoading#").lazyRule((id, it, i, name) => {
                if (getMyVar(id + "$", "")) return "toast://太快了";
                putMyVar(id + "$", "1");
                let opc = storage0.getMyVar(id, []);

                opc[i].selected = !opc[i].selected;
                updateItem(id + i, {
                    title: opc[i].selected ? "‘‘" + name + "’’" : name
                });
                storage0.putMyVar(id, opc);

                clearMyVar(id + "$");
                return "hiker://empty";
            }, id, it, i, it.name),
            extra: {
                id: id + i,
            }
        });
        i++;
    }
    setResult(d);
}

function browserAction(options, rulekey) {
    let d = [];
    options.title && setPageTitle(options.title);
    d.push({

        col_type: "x5_webview_single",
        url: options.url,
        desc: "float&&100%",
        extra: {
            canBack: true
        }
    });
    setResult(d);
}

function commentAction(options, rulekey) {
    let d = [];

    // 添加标题（如“剧评精选”）
    if (options.title) {
        d.push({
            title: options.title,
            desc: options.subtitle,
            col_type: "text_center_1",
            url: "hiker://empty",
            extra: {
                lineVisible: false
            }
        });
    }

    // 添加评论总数
    if (options.remarks) {
        d.push({
            title: "““””" + options.remarks.small(),
            col_type: "text_center_1",
            url: "hiker://empty",
            extra: {
                lineVisible: false
            }
        });
    }

    // 添加分割线
    d.push({
        col_type: "line_blank"
    });

    // 遍历评论列表
    if (options.list && options.list.length > 0) {
        for (let item of options.list) {

            d.push({
                col_type: "avatar",
                title: item.title,
                desc: item.subtitle,
                img: item.logo,

                url: "hiker://empty"
            });
            d.push({
                col_type: "long_text",
                title: item.content,
                url: "hiker://empty"
            });
            d.push({
                col_type: "line",

            });
        }
    } else {
        // 无评论时显示提示
        d.push({
            title: "暂无评论",
            col_type: "text_center_1",
            url: "hiker://empty"
        });
    }

    setResult(d);
}

function callback(rulekey, actionId, value, timeout, noLoading) {
    try {
        let runtimeConfig = GM.defineModule("runtimeConfig");
        let DrpyManage = GM.defineModule("DrpyManage");
        let drpy;
        if (rulekey) {
            drpy = DrpyManage.get(rulekey);
        } else {
            let s = runtimeConfig.getCurrentSource();
            drpy = DrpyManage.get(s.key);
        }
        if(!noLoading){
        showLoading("通讯中...");
        }
        let res = drpy.action(actionId, value, timeout);
        return res;
    } catch (e) {
        console.error(e);
        return "";
    } finally {
        hideLoading();
    }
}

function checkCallbackRes(rulekey, actionId, value, timeout, noLoading) {
    let options = callback(rulekey, actionId, value, timeout, noLoading);

    if (!getMyVar(idfix, "")) {
        return "hiker://empty";
    }
    try {
        options = JSON.parse(options);
    } catch (e) {

    }
    if (typeof options === "string") {
        clearMyVar(idfix);
        back(false);
        options && toast(options);
        return "hiker://empty";
    } else {
        if (options.action.actionId === "__keep__") {
            delete options.action.actionId;
            setPageParams({
                vodId: JSON.stringify(Object.assign(JSON.parse(JSON.parse(MY_RULE.params).vodId), options.action))
            });
        } else if (options.action.actionId === "__self_search__") {
            return buildUrl("hiker://page/SearchInSource", {
                tid: encodeURIComponent(String(options.action.tid)),
                skey: encodeURIComponent(String(options.action.skey)),
                pageTitle: options.action.name
            });
        } else if (options.action.actionId === "__detail__") {
            //back(false);
            //java.lang.Thread.sleep(20000);
            return buildUrl("hiker://page/detailed#immersiveTheme#", {
                vodId: encodeURIComponent(String(options.action.ids)),
                skey: encodeURIComponent(String(options.action.skey)),
            });
        } else {
            setPageParams({
                vodId: JSON.stringify(options)
            });
        }
        if (options.toast) {
            toast("" + options.toast);
        }
        refreshPage(false);
        return "hiker://empty";
    }
}

function checkOptions(vodId, noExtra) {
    let options = {};
    try {

        options = JSON.parse(vodId);

    } catch (e) {

        let res = callback("", vodId, "");

        try {
            options = JSON.parse(res);
        } catch (e) {
            if (res) {
                toast(res);
            }
            return "hiker://empty";
        }
        if (!noExtra) {
            let extra;
            try {
                extra = findItem("type_" + vodId).extra;

                extra.vodId = JSON.stringify(options);
                updateItem("type_" + vodId, {
                    extra: extra
                });
            } catch (e) {}
        }
        if (options.toast) {
            toast("" + options.toast);
        }
    }

    return "hiker://page/action#noRecordHistory##noHistory##noRefresh#" + (options.type == "browser" ? "#gameTheme#" : "");

}

function checkOptions2(vodId, key, value) {
    let options = {};
    try {
        options = JSON.parse(vodId);

    } catch (e) {
        //rulekey = key;
        let res = callback(key, vodId, value || "");
        try {
            options = JSON.parse(res);
        } catch (e) {
            if (res) {
                toast(res);
            }
            return "hiker://empty";
        }
        if (options.toast) {
            toast("" + options.toast);
        }
    }

    putMyVar(idfix + "option", JSON.stringify(options));
    return "hiker://page/action#noRecordHistory##noHistory##noRefresh#?rulekey=" + encodeURIComponent(key);
}

function getOptions(rulekey) {
    let options = {};
    if (getMyVar(idfix + "option", "")) {
        MY_PARAMS.vodId = getMyVar(idfix + "option", "");
        setPageParams(MY_PARAMS);
        clearMyVar(idfix + "option");
    }
    try {
        options = JSON.parse(MY_PARAMS.vodId);
    } catch (e) {
        let res = callback(rulekey, MY_PARAMS.vodId, "");
        try {
            options = JSON.parse(res);
        } catch (e) {
            back(false);
            toast(res);
            return;
        }
    }
    if (options.title) {
        setPageTitle(options.title);
    }

    options = options.action || options;
    if (typeof options === "string") {
        try {
            options = JSON.parse(options);
        } catch (e) {
            return {};
        }
    }
    return options;
}

function action(options, rulekey) {
    switch (options.actionId) {
        case "__refresh_list__":
            refreshAction(options, rulekey);
            break;
    }
    switch (options.type) {
        case "input":
            inputAction(options, rulekey);
            break;
        case "multiInput":
            multiInputAction(options, rulekey);
            break;
        case "multiInputX":
            multiInputXAction(options, rulekey);
            break;
        case "menu":
            menuAction(options, rulekey);
            break;
        case "select":
            selectAction(options, rulekey);
            break;
        case "comment":
            commentAction(options, rulekey);
            break;
        case "browser":
            browserAction(options, rulekey);
            break;
        default:
            setResult([]);
    }
    if (options.initAction) {
        checkCallbackRes(rulekey, options.initAction, options.initValue || options.value || "", options.httpTimeout || options.timeout, true);
    }
}
if (typeof module === "undefined") {
    let rulekey = decodeURIComponent(getParam("rulekey", ""));

    let options = getOptions(rulekey);
    putMyVar(idfix, options.actionId);
    addListener("onClose", $.toString((idfix, options, key) => {
        if (options.cancelAction && getMyVar(idfix, "") === options.actionId) {
            $.require("action").checkCallbackRes(key, options.cancelAction, options.cancelValue);
        }
        listMyVarKeys().forEach(v => v.startsWith(idfix) && clearMyVar(v));
    }, idfix, options, rulekey));
    addListener("onRefresh", $.toString(idfix => {
        if (!getMyVar("action:noclear")) {
            listMyVarKeys().forEach(v => v.startsWith(idfix) && clearMyVar(v));
        }
        clearMyVar("action:noclear");
    }, idfix));
    action(options, rulekey);
} else {
    $.exports = {
        checkCallbackRes,
        checkOptions,
        checkOptions2,
    }
}