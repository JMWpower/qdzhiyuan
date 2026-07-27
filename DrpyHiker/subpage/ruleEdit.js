js:
const ConfigManager = $.require('./subpage/ConfigManager.js');
var d = [];

addListener("onClose", $.toString(() => {
    clearMyVar("ps_name");
    clearMyVar("ps_url");
    clearMyVar("ps_flag");
    clearMyVar("ps_headers");
    clearMyVar("ps_method");
    clearMyVar("ps_runType");
    clearMyVar("ps_jsonPath");
    clearMyVar("ps_js");
}));
let urlIndex = parseInt(getParam("index", ""));
urlIndex = Number.isNaN(urlIndex) ? void(0) : urlIndex;
let index = void(0) === urlIndex ? MY_PARAMS.i : urlIndex;
let isImport = !!getParam("isImport", "");
let arr = $.require("configs").getJson();
let obj;
if (isImport) {
    try {
        obj = $.require("hiker://files/_cache/jiexiSimpleImport.json");
        let tip = index !== void(0) ? "更新解析" : "导入解析";
        setPageTitle(tip + ":" + obj.name);
        d.push({
            title: "‘‘" + tip + "’’",
            col_type: "text_center_1",
            url: "hiker://empty",
            extra: {
                lineVisible: false
            }
        });

    } catch (e) {
        obj = {};
        back();
        toast("导入错误");
    }
} else if (index !== void(0)) {
    obj = arr[index];
    setPageTitle("编辑解析:" + obj.name);
} else {
    obj = {
        runType: "WEB",
        method: "GET"
    };
    setPageTitle("新建解析");
}

d.push({
    col_type: "input",
    desc: "名字(必填)",
    extra: {
        onChange: $.toString(() => {
            putMyVar("ps_name", input);
        }),
        defaultValue: obj.name,
        titleVisible: false
    }
});


d.push({
    col_type: "input",
    desc: "解析url(必填)",
    extra: {
        onChange: $.toString(() => {
            putMyVar("ps_url", input);
        }),
        defaultValue: obj.url,
        titleVisible: false,
    }
});
d.push({
    col_type: "input",
    desc: "flag(必填)",
    extra: {
        type: "textarea",
        height: 2,
        highlight: true,
        onChange: $.toString(() => {
            putMyVar("ps_flag", input);
        }),
        defaultValue: getMyVar("ps_flag",obj.flag||"qiyi|imgo|爱奇艺|奇艺|qq|qq 预告及花絮|腾讯|youku|优酷|pptv|PPTV|letv|乐视|leshi|mgtv|芒果|sohu|xigua|fun|风行"),
        titleVisible: false,
    }
});
d.push({
    col_type: "input",
    desc: "headers(选填)",
    extra: {
        type: "textarea",
        height: 2,
        highlight: true,
        onChange: $.toString(() => {
            putMyVar("ps_headers", input);
        }),
        defaultValue: obj.headers,
        titleVisible: false,
    }
});

putMyVar("ps_runType", obj.runType || "");
d.push({
    title: "解析模式：" + (obj.runType || "WEB"),
    col_type: "text_center_1",
    url: $(["WEB", "JSON", "JS"]).select(() => {

        putMyVar("ps_runType", input);
        updateItem("ps_runType", {
            title: "解析模式：" + input
        });
        return "hiker://empty";
    }),
    extra: {
        id: "ps_runType",
        lineVisible: false
    }
});


d.push({
    col_type: "line_blank"
});
d.push({
    col_type: "input",
    desc: "jsonPath(JSON解析模式必填)",
    extra: {
        onChange: $.toString(() => {
            putMyVar("ps_jsonPath", input);
        }),
        defaultValue: obj.jsonPath,
        titleVisible: false,
    }
});
putMyVar("ps_method", obj.method || "");
d.push({
    title: "JSON请求模式：" + (obj.method || "GET"),
    col_type: "text_1",
    url: $(["GET", "POST"]).select(() => {

        putMyVar("ps_method", input);
        updateItem("ps_method", {
            title: "JSON请求模式：" + input
        });
        return "hiker://empty";
    }),
    extra: {
        id: "ps_method",
        lineVisible: false
    }
});
d.push({
    col_type: "line_blank"
});
d.push({
    col_type: "input",
    desc: "js(JS模式必填)",
    extra: {
        type: "textarea",
        height: 3,
        highlight: true,
        onChange: $.toString(() => {
            putMyVar("ps_js", input);
        }),
        defaultValue: obj.js,
        titleVisible: false,
    }
});
d.push({
    col_type: "line_blank"
});
d.push({
    title: "删除",
    url: $("#noLoading#").lazyRule((index, urlIndex) => {
        if (index === void(0)) {
            return "toast://此项无法删除";
        }
        if (urlIndex !== void(0)) {
            return "toast://正在更新解析，删除请从解析管理进入";
        }
        confirm({
            title: "温馨提示",
            content: "确定要删除此解析吗？注意删除后无法恢复",
            confirm: $.toString((index) => {
                let arr = $.require("configs").getJson();
                arr.splice(index, 1);
                $.require("configs").saveJson(arr);
                back(true);
                return "toast://删除成功";
            }, index)
        });
        return "hiker://empty"
    }, index, urlIndex),
    col_type: "text_3",
});

d.push({
    title: "测试",
    url: $("#noLoading#").lazyRule(() => {
        let testKeyword = ConfigManager.getGlobal("testUrl");
        return $(testKeyword, "请输入影视网站地址").input(() => {
            ConfigManager.setGlobal("testUrl", input);
            let url = getMyVar("ps_url", "");
            let name = getMyVar("ps_name", "");
            let flag = getMyVar("ps_flag", "");
            let headers = getMyVar("ps_headers", "");
            let runType = getMyVar("ps_runType", "WEB");
            let method = getMyVar("ps_method", "GET");
            let jsonPath = getMyVar("ps_jsonPath", "").trim() || void 0;
            let js = getMyVar("ps_js", "") || void 0;
            if (headers) {
                try {
                    headers = JSON.parse(headers);
                } catch (e) {
                    return "headers格式错误:" + e.toString();
                }
            }
            return $.require("videoUrl").prepareParses([{
                name,
                url,
                flag,
                headers,
                runType,
                method,
                jsonPath,
                js
            }], input,null, true);
        });
    }),
    col_type: "text_3",
});

d.push({
    title: "保存",
    url: $("#noLoading#").lazyRule((index, isImport) => {
        let name = getMyVar("ps_name", "").trim();
        if (!name) {
            return "toast://名字得有一个吧";
        }
        let url = getMyVar("ps_url", "").trim();
        if (!url) {
            return "toast://解析地址不能为空";
        }
        let flag = getMyVar("ps_flag", "");
        if (!flag) {
            return "toast://解析地址标识不能为空";
        }
        let headers = getMyVar("ps_headers", "").trim();
        if (headers) {
            try {
                headers = JSON.parse(headers);
                if(typeof headers!=="object") throw new Error("错误类型，必须为Object");
            } catch (e) {
                return "headers格式错误:" + e.toString();
            }
        }
        let runType = getMyVar("ps_runType", "WEB");
        let method = getMyVar("ps_method", "GET");
        let jsonPath = getMyVar("ps_jsonPath", "").trim() || void 0;
        let js = getMyVar("ps_js", "") || void 0;
        if (runType === "JSON" && !jsonPath) {
            return "toast://JSON模式下必须填jsonPath";
        } else if (runType === "JS" && !js) {
            return "toast://JS模式下必须填js";
        }
        let arr = $.require("configs").getJson();
        let obj1 = {
            name,
            url,
            flag,
            headers,
            runType,
            method,
            jsonPath,
            js
        };
        if (index === void(0)) {
            if (arr.some(v => v.name === name)) {
                return "toast://已经存在该解析";
            }
            if (obj1.group) {
                let group = obj1.group;
                let index = arr.findIndex(v => v.group === group);
                if (index === -1) {
                    arr.unshift(obj1);
                } else {
                    arr.splice(index, 0, obj1);
                }
            } else {
                if (isImport) {
                    arr.push(obj1);
                } else {
                    arr.unshift(obj1);
                }
            }
        } else {
            let namey = arr[index].name;
            if (name !== namey) {
                if (arr.some(v => v.name === name)) {
                    return "toast://已经存在该解析";
                }
            }
            obj1 = Object.assign(arr[index], obj1);
            arr.splice(index, 1, obj1);
        }
        $.require("configs").saveJson(arr);
        back(true);
        return "toast://保存成功";
    }, index, isImport),
    col_type: "text_3",
});

setResult(d);