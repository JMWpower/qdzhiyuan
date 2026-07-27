js:
setPageTitle("文件管理");
let path = getPath(String(MY_PARAMS.cpath)).replace("file://", "");
let fileSelect = $.require("hiker://files/data/DrpyHiker/libs/fileSelection.js");
fileSelect.fileSelection({
    callback: $.toString(() => {
        return "editFile://file://" + PATH;
    }),
    memory: "filepath",
    fileType: ".js|.txt|.json",
    exitSearchRefresh: true,
    pattern: 0,
    rootDirPath: path,
    initialPath: path,
}, MY_PARAMS.newWindow ? [] : [{
    title: "新窗口打开",
    col_type: "text_center_1",
    url: "hiker://page/LocalDir#noRecordHistory##noHistory#",
    extra: {
        cpath: MY_PARAMS.cpath,
        newWindow: true,
        windowId: MY_RULE.title + "@editfile",
        lineVisible: false,
        pageTitle: "文件管理"
    }
}]);