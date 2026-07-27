js:
var d = [];
setPageTitle("解析管理");
let configs = $.require("configs");
let arr = configs.getJson();
let length = arr.length;
d.push({
    col_type: "avatar",
    title: "提示",
    pic_url: "http://123.56.105.145/tubiao/system/27.png",
    url: $("#noLoading#").lazyRule(() => {
        const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
        let pop = hikerPop.infoBottom({
            options: [
                "[建议]：解析只需要保存少量好用的即可，不需要太多。",
                "[提示]：解析有时效或重定向的'高级'解析，本程序不支持，建议删除。",
                "[Q&A]：为啥在编辑页面测试解析时能用，保存后再视频源中却解析不出来？\n不知道，我的解决办法是建议删除。"
            ],
        });
        return "hiker://empty";
    }),
});
d.push({
    title: "新增",
    url: "hiker://page/ruleEdit#noRecordHistory##noHistory##noRefresh#",
    col_type: "icon_small_4",
    pic_url: "hiker://images/icon_domain_config",
    extra: {
        pageTitle: "新增解析"
    }
});

d.push({
    title: "分享",
    url: $("-1", "输入你要分享解析的序号\n-1全部，-2已启用的，-3已禁用的").input((length) => {
        let indexc = input.split(/,|，/);
        let indexs = [];
        let mo = parseInt(indexc[0]);
        if (!(indexc.length !== 0 && mo < 0 && mo > -5)) {
            for (let it of indexc) {
                let num = parseInt(it);
                if (Number.isNaN(num) || num >= length || num < 0) {
                    return "toast://数字不合法";
                }
                indexs.push(num);
            }
        }

        return $(["HIKER", "TXT"].concat(getPastes()), 2, "分享方式").select((mo, indexs, ext) => {
            function up(rules) {
                let ruleb64 = base64Encode(JSON.stringify(rules));
                let getPass = (length, rule, type) => "海阔视界，DRPY解析，共「" + length + "」条，复制整条口令打开软件就会自动导入$" + rule + "$" + type + "@import=js:$.require('import?rule='+" + JSON.stringify(MY_RULE.title) + ")(input)";
                if (getPastes().includes(input)) {
                    let u = sharePaste(ruleb64, input);
                    return "copy://" + getPass(rules.length, u, "b");
                } else {
                    let path = "hiker://files/rules/LoyDgIk/share/drpy解析「" + rules.length + "」条." + (input === "HIKER" ? "hiker" : "txt");
                    writeFile(path, getPass(rules.length, ruleb64, "a"));
                    return "share://" + path;
                }
            }
            let rules;
            if (mo === -1) {
                rules = $.require("configs").getJson();
            } else if (mo === -2) {
                rules = $.require("configs").getUsefulJson();
            } else if (mo === -3) {
                rules = $.require("configs").getForbiddenJson();
            } else {
                rules = $.require("configs").getJson().filter((v, i) => indexs.includes(i));
            }
            rules = rules.map((v) => {
                v.forbidden = undefined;
                return v;
            });
            return up(rules);
        }, mo, indexs, indexc[1]);

    }, length),
    col_type: "icon_small_4",
    pic_url: "hiker://images/icon_share_green"
});
d.push({
    title: "重置",
    url: $("你确定重置？\n该操作会删除现有解析，恢复自带解析。").confirm((path) => {
        deleteFile(path);
        refreshPage(false);
        return "hiker://empty";
    }, $.require("configs").path),
    col_type: "icon_small_4",
    pic_url: "hiker://images/icon_refresh"
});
d.push({
    title: "清空",
    url: $("你确定全部删除？\n该操作会删除现有解析。").confirm((path) => {
        writeFile(path, "[]");
        refreshPage(false);
        return "hiker://empty";
    }, $.require("configs").path),
    col_type: "icon_small_4",
    pic_url: "hiker://images/icon_code_view"
});

d.push({
    //title: '<font color="#13B61B">▐ </font><b>解析列表<b> (' + String(length).fontcolor("#ff6601") + ")",
    col_type: "rich_text",
});
let countTitle = d.at(-1);

function uniqueNested(arr) {
    return arr.map(item => {
        if (Array.isArray(item)) {
            return uniqueNested(item);
        }
        return item;
    }).flat(Infinity).filter((value, index, self) => self.indexOf(value) === index);
}
var its = []
let flagi = storage0.getMyVar("flagi", ["全部"]);
let count = its.length;
let flags = uniqueNested(arr.map(x => x.flag.split("|")));
flags.unshift("已禁用");
flags.unshift("全部");

let show = getMyVar("flagshow", "");
let col = show == "展开" ? "flex_button" : "scroll_button";
d.push({
    title: show == "展开" ? "““””<b>" + "∧".fontcolor("#1aad19") + "</b>" : "““””<b>" + "∨".fontcolor("#FF0000") + "</b>",
    col_type: col,
    url: $("#noLoading#").lazyRule(() => {
        let show = getMyVar("flagshow", "展开");
        putMyVar("flagshow", show == "展开" ? "收起" : "展开");
        refreshPage();
        return "hiker://empty";
    })
})


flags.forEach(f => {
    d.push({
        title: '““””' + (flagi.includes(f) ? f.fontcolor("#13B61B") : f),
        col_type: col,
        url: $('#noLoading#').lazyRule((f) => {
            let flagi = storage0.getMyVar("flagi", ["全部"]);
            if (/(全部|已禁用)/.test(f)) {
                flagi = [f]
            } else {
                flagi = flagi.filter(x => !/(全部|已禁用)/.test(x));
                if (flagi.includes(f)) {
                    flagi = flagi.filter(x => x != f);
                    if (flagi.length == 0) {
                        flagi = ["全部"]
                    }
                } else {
                    flagi.push(f)
                }
            }
            storage0.putMyVar("flagi", flagi);
            refreshPage();
            return "hiker://empty";
        }, f)
    })
})
for (let i = 0; i < length; i++) {
    let it = arr[i];

    let flag = it.flag.split("|");
    if (flagi.length > 0 && !["全部", "已禁用"].includes(flagi[0])) {
        if (!flagi.every(f => flag.includes(f))) {
            continue;
        }
    }
    if (["已禁用"].includes(flagi[0])) {
        if (!it.hasOwnProperty("forbidden") || !it.forbidden) {
            continue;
        }
    }
    its.push({
        title: '““””[' + i + ']<b>  ' + it.name + (it.forbidden ? " #““禁用””".small() : ""),
        desc: it.url,
        forbidden: it.forbidden,
        url: $(["编辑", "分享", "禁用/启用", "移动", "置顶", "删除"], 1, "操作：" + it.name).select((index, length) => {
            if (input === "编辑") {
                return "hiker://page/ruleEdit#noRecordHistory##noHistory##noRefresh#";
            } else if (input === "分享") {
                let ops = getPastes();
                ops.unshift("完整口令");
                return $(ops, 2, "分享方式").select((index) => {
                    let rule = $.require("configs").getJson()[index];
                    rule.user = undefined;
                    rule.forbidden = undefined;
                    let ruleb64 = base64Encode(JSON.stringify(rule));
                    let getPass = (name, rule, type) => "海阔视界，「" + name + "」DRPY解析，复制整条口令打开软件就会自动导入$" + rule + "$" + type + "@import=js:$.require('import?rule='+" + JSON.stringify(MY_RULE.title) + ")(input)";
                    if (input == "完整口令") {
                        return "copy://" + getPass(rule.name, ruleb64, "a");
                    } else {
                        let u = sharePaste(ruleb64, input);
                        return "copy://" + getPass(rule.name, u, "b");
                    }
                }, index);
            } else if (input === "移动") {
                return $(index + "", "输入位置").input((index, length) => {
                    let newIndex = Number(input);
                    if (Number.isNaN(newIndex) || newIndex >= length) {
                        return "toast://不和规的位置";
                    }
                    let rules = $.require("configs").getJson();
                    let rule = rules.splice(index, 1)[0];
                    rules.splice(newIndex, 0, rule);
                    $.require("configs").saveJson(rules);
                    refreshPage(false);
                }, index, length);
            } else if (input === "置顶") {
                let newIndex = 0;
                let rules = $.require("configs").getJson();
                let rule = rules.splice(index, 1)[0];
                rules.splice(newIndex, 0, rule);
                $.require("configs").saveJson(rules);
                refreshPage(false);
            } else if (input === "删除") {
                return $("确认删除？").confirm((index) => {
                    let rules = $.require("configs").getJson();
                    let rule = rules.splice(index, 1)[0];
                    $.require("configs").saveJson(rules);
                    refreshPage(false);
                    return "toast://已删除" + rule.name;
                }, index);
            } else {
                let arr = $.require("configs").getJson();
                let rule = arr[index];
                rule.forbidden = !rule.forbidden;
                $.require("configs").saveJson(arr);
                refreshPage(false);
                //return "toast://" + (rule.forbidden ? "禁用" : "启用") + rule.name;
            }
        }, i, length),
        col_type: "text_1",
        extra: {
            i: i,
            pageTitle: it.name
        }
    });
}

countTitle.title = '<font color="#13B61B">▐ </font><b>解析列表<b> (' + ((its.length - count) + "/" + length).fontcolor("#ff6601") + ")";

d = d.concat(its);

setResult(d);