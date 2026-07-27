js:
setPageTitle("保存路径");
let layout = [];
let f = $.require("hiker://files/data/DrpyHiker/libs/fileSelection.js");
addListener("onClose", () => {
    clearMyVar("drpyHiker_share_input");
});

let path = joinUrl(getPath("hiker://files/"), "../".repeat(5)).slice(7);
layout.push({
    title: "选择",
    url: JSON.stringify(f.fileSelectionUri({
        callback: $.toString(() => {
            let target = findItem("drpyHiker_share_input").extra;
            updateItem("drpyHiker_share_input", {
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
        defaultValue: getMyVar("drpyHiker_share_input", getPublicItem("DrpyHiker@input_path", "")),
        onChange: $.toString(() => {
            putMyVar("drpyHiker_share_input", input);
        }),
        id: "drpyHiker_share_input"
    }
});


layout.push({
    col_type: "line_blank"
});
layout.push({
    title: "确认",
    url: $("#noLoading#").lazyRule((id) => {
        let path = getMyVar("drpyHiker_share_input", "");

        if (!path) {
            return "toast://不可为空";
        }
        setPublicItem("DrpyHiker@input_path", path);
        back(false);
        return "toast://设置成功";
    }),
    col_type: "text_center_1",
});
if(MY_RULE.title.includes("Test")){
    layout.push({
        title:"清除",
        url: $("#noLoading#").lazyRule(() => {
            clearPublicItem("DrpyHiker@input_path");
            clearMyVar("drpyHiker_share_input");
            refreshPage(false);
            return "toast://清除成功";
        }),
        col_type: "text_center_1"
    });
}

setResult(layout);