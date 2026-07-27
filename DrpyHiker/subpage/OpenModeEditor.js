const waylistPath = "hiker://files/rules/DrpyHiker/OpenMode.json";
const defaultWayList = [{
    match: "(pan.quark.cn)|(drive.uc.cn)",
    way: "hiker://page/quarkList?rule=Quark.简&realurl={{encodeUrl}}"
}, {
    match: "(www.aliyundrive.com\\/s\\/)|(www.alipan.com\\/\\s)",
    way: "hiker://page/aliyun?rule=云盘君.简&page=fypage&realurl={{encodeUrl}}"
}];
let waylist = [];

function save(waylist) {
    writeFile(waylistPath, JSON.stringify(waylist));
}
try {
    waylist = $.require(waylistPath);
} catch (e) {
    waylist = defaultWayList;
    save(waylist);
}

function matchOpenMode(url) {
    let find = waylist.find(v => new RegExp(v.match).test(url));
    if (!find) return null;
    if (find.way.startsWith("<js>")) {
        return String(new Function("url",find.way.replace("<js>",""))(url));
    } else {
        return find.way.replace(/\{\{\url}\}/g, url).replace(/\{\{\encodeUrl}\}/g, encodeURIComponent(url));
    }
}
if (typeof module == "undefined") {

    let d = [];
    d.push({
        title: "创建",
        url: $("#noLoading#").lazyRule(() => {
            const hikerPop = $.require("./libs/hikerPop.js");
            let {
                waylist,
                save
            } = $.require("OpenModeEditor");

            hikerPop.inputTwoRow({
                titleHint: "匹配正则",
                urlHint: "方式",
                noAutoSoft: true, //不自动打开输入法
                title: "创建打开方式",
                hideCancel: true,
                confirm(match, way) {
                    if (!match || !way) return "toast://创建失败";
                    try {
                        new RegExp(input);
                    } catch (e) {
                        return "toast://创建失败:" + e.toString();
                    }

                    waylist.push({
                        match,
                        way
                    });
                    save(waylist);
                    refreshPage(false);
                    return "toast://创建成功";
                }
            });
            return "hiker://empty";

        }),
        col_type: "text_center_1"
    });
    waylist.forEach((v, i) => {
        d.push({
            title: "匹配正则：" + v.match,
            desc: "方式：" + v.way,
            url: "hiker://empty",
            col_type: "text_1",
            extra: {
                lineVisible: false
            }
        });

        d.push({
            title: "修改",
            url: $("#noLoading#").lazyRule((i, v) => {
                const hikerPop = $.require("./libs/hikerPop.js");
                let {
                    waylist,
                    save
                } = $.require("OpenModeEditor");

                hikerPop.inputTwoRow({
                    titleHint: "匹配正则",
                    urlHint: "方式",
                    titleDefault: v.match,
                    urlDefault: v.way,
                    noAutoSoft: true, //不自动打开输入法
                    title: "创建打开方式",
                    hideCancel: true,
                    confirm(match, way) {
                        if (!match || !way) return "toast://修改失败";
                        try {
                            new RegExp(input);
                        } catch (e) {
                            return "toast://修改失败:" + e.toString();
                        }

                        waylist.splice(i, 1, {
                            match,
                            way
                        });
                        save(waylist);
                        refreshPage(false);
                        return "toast://修改成功";
                    }
                });
                return "hiker://empty";
            }, i, v),
            col_type: "text_2"
        });
        d.push({
            title: "删除",
            url: $("#noLoading#").lazyRule((i) => {
                let {
                    waylist,
                    save
                } = $.require("OpenModeEditor");
                waylist.splice(i, 1);
                save(waylist);
                refreshPage(false);
                return "toast://删除完成"
            }, i),
            col_type: "text_2"
        });
        d.push({
            col_type: "line"
        });
    });
    setResult(d);

} else {
    $.exports = {
        save,
        waylist,
        waylistPath,
        matchOpenMode
    }
}