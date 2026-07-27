js:
setPageTitle("创建订阅");
let layout = [];
let f = $.require("hiker://files/data/DrpyHiker/libs/fileSelection.js");
addListener("onClose", () => {
    clearMyVar("drpyHiker_sub_input");
    clearMyVar("drpyHiker_suburl_input");
    clearMyVar("drpyHiker_subname_input");
});
layout.push({
    col_type: "input",
    desc: "订阅名称",
    extra: {
        titleVisible: false,
        defaultValue: "",
        onChange: $.toString(() => {
            putMyVar("drpyHiker_subname_input", input);
        }),
        id: "drpyHiker_subname_input"
    }
});
let path = joinUrl(getPath("hiker://files/"), "../".repeat(5)).slice(7);
layout.push({
    title: "选择",
    url: JSON.stringify(f.fileSelectionUri({
        callback: $.toString(() => {
            let target = findItem("drpyHiker_sub_input").extra;
            updateItem("drpyHiker_sub_input", {
                extra: Object.assign(target, {
                    defaultValue: PATH
                })
            });
            return true;
        }),
        rootDirPath: path,
        initialPath: path,
        pattern: 1
    })),
    col_type: "input",
    desc: "储存路径",
    extra: {
        defaultValue: "",
        onChange: $.toString(() => {
            putMyVar("drpyHiker_sub_input", input);
        }),
        id: "drpyHiker_sub_input"
    }
});

layout.push({
    col_type: "input",
    desc: "订阅地址",
    extra: {
        titleVisible: false,
        defaultValue: "",
        onChange: $.toString(() => {
            putMyVar("drpyHiker_suburl_input", input);
        }),
        id: "drpyHiker_suburl_input"
    }
});

layout.push({
    col_type: "line_blank"
});
layout.push({
    title: "确认",
    url: $("#noLoading#").lazyRule((id) => {
        let path = getMyVar("drpyHiker_sub_input", "");
        let url = getMyVar("drpyHiker_suburl_input", "");
        let name = getMyVar("drpyHiker_subname_input", "");
        if (!(path && url && name)) {
            return "toast://不可为空";
        }
        let rule = base64Encode("海阔视界规则分享，当前分享的是：合集规则订阅￥home_sub￥" + name + "@@" + url+`@js=$.require('subscribe?rule=${MY_RULE.title}').parseUrl(input, '${base64Encode(path)}')`);
        return "rule://" + rule;
    }),
    col_type: "text_center_1",
});
setResult(layout);