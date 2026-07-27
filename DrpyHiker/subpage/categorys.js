let fl = [];
let results = [];
let homelist = [];
let cate = "";
let vkey = "";
let flkeys = []
let longPressActions = [];

let FlObject = {
    // 假设有一个属性名，例如 'fl'
    fl: [],
    // 定义访问器和设置器
    defineAccessors: function(propName, storage) {
        Object.defineProperty(this, propName, {
            enumerable: false,
            configurable: true,
            get: function() {
                return storage0.getMyVar(vkey + propName, storage);
            },
            set: function(value) {
                storage.push(value);
                storage0.putMyVar(vkey + propName, storage);
            }
        });
    }
};
FlObject.defineAccessors('fl', fl);

let sflkeys = {
    temp: [],
    get() {
        return storage0.getMyVar(vkey + "flkeys", this.temp);
    },
    set(index, value) {
        this.temp[index] = value;
        storage0.putMyVar(vkey + "flkeys", this.temp);
    }
}


GM.put("flkeys", sflkeys);

function setVkey(input) {
    vkey = input;
}

function getCategorys(layout, drpy, page, hasHaed) {
    let {
        ui_config,
        getRangeColors,
    } = $.require("UIManage");
    ui_config = ui_config.yi;

    let {
        removeDuplicatesByValue,
    } = $.require("hiker://page/methods");

    let rule = drpy.getRule();
    //log(rule)
    let runtimeConfig = GM.defineModule("runtimeConfig");
    let code = drpy.runMain("let main=" + $.toString((ext) => {
        return () => getOriginalJs(request(ext, {
            'method': 'GET'
        }));
    }, runtimeConfig.getCurrentSourcePath()));

    if (hasHaed && /模板:\s+'自动'/.test(code)) {
        let result = JSON.parse(request(rule.homeUrl, {
            timeout: rule.timeout || 5000,
            headers: rule.headers || {},
            withHeaders: true,
        }));
        if ((result.body == undefined || result.body == "") || (result.error != undefined) || /^(-1|404|502|503)$/.test(result.statusCode)) {
            clearMyVar(vkey + "links");
            /*layout.push({
              title: "““" + "网站访问异常" + "””",
              desc: "0",
              url: rule.homeUrl,
              col_type: "text_center_1",
              extra: {
                longClick: [{
                  title: "清除ui设置",
                  js: $.toString(() => {
                    let {
                      ui_clear,
                    } = $.require("UIManage");
                    ui_clear("yi");
                    refreshPage();
                  })
                }]
              }
            });*/
            throw new Error("网站访问异常");
            //setResult(layout);
        } else {
            let home = JSON.parse(drpy.home());
            if (home.class.length == 0) {
                throw new Error("访问正常,分类数据获取异常 可尝试刷新源");
            }
        }
    }

    if (Object.keys(rule).length === 0) {
        throw new Error("规则加载失败");
    }

    if ((rule.一级 == "" || rule.一级 == undefined) && !rule.推荐) {
        clearMyVar(vkey + "links");
        layout.length = 0;
        $.require("hiker://page/recommend");
        putMyVar(vkey + "links", "1");
        //throw new Error("该源为搜索源，仅能通过搜索访问数据");
    }

    let categorys = storage0.getMyVar(vkey + "categorys", {});
    if (getMyVar(vkey + "links", "0") == "0") {
        clearMyVar("tempcate");
        categorys = JSON.parse(drpy.home());
        putMyVar(vkey + "categorys", categorys);
    }
    let filters = categorys.filters;
    let cates = categorys.class || [];

    if (page == 1 && getMyVar(vkey + "links", "0") == "0") {
        homelist = JSON.parse(drpy.homeVod()).list;
        if (homelist && homelist.length) {
            homelist = removeDuplicatesByValue(homelist, "vod_id");
        }
        if (homelist != undefined && homelist.length && homelist[0].vod_id != "没有数据") {
            putMyVar(vkey + "ishome", "1");
        }
    }

    if (cates.length == 0 && (homelist == undefined || homelist.length == 0) && page == 1) {
        clearMyVar(vkey + "links");

        putMyVar(vkey + "links", "1")
        //layout.length = 0;
        //throw new Error("分类获取失败可能网络问题");
    }
    if (getMyVar(vkey + "ishome", "0") == "1") {
        cates.unshift({
            type_name: '推荐',
            type_id: 'home',
        })
    }
    let catei = getMyVar(vkey + "catei", "0");
    cate = cates[catei].type_id;


    if (page == 1 && cate == "home" && getMyVar(vkey + "links", "0") == "1") {
        homelist = JSON.parse(drpy.homeVod()).list;
    }

    putMyVar(vkey + "links", "1");
    var fold = storage0.getItem("fold", "0");
    let color = ui_config.分类颜色;
    if (color == "random") {
        color = getRangeColors();
    }

    if (page == 1) {
        cates.forEach((item, i) => {
            let t = catei == i ? "““””" + "<b>" + item.type_name.fontcolor(color) + "</b>" : item.type_name;
            layout.push({
                title: t,
                url: $('#noLoading#').lazyRule((i, tid, vkey) => {
                    clearMyVar("tempcate");
                    putMyVar(vkey + "catei", i);
                    //clearMyVar(vkey + "flkeys");
                    clearMyVar("searchcfs");
                    refreshPage();
                    return "hiker://empty";
                }, i, item.type_id, vkey),
                col_type: 'scroll_button',
                extra: {
                    tid: item.type_id,
                    active: catei == i ? true : false,
                }
            })
        })
    }

    if (cate != 'home' && page == 1) {
        let homei = layout.findIndex(x => {
            return x.extra && x.extra.tid == "home"
        });
        if (homei == -1) {
            homei = layout.findIndex(x => {
                return x.extra && x.extra.tid;
            }) - 1;
        }

        if (filters && filters.hasOwnProperty(cate)) {
            if (homei != -1) {
                layout.splice(homei + 1, 0, {
                    title: fold == "0" ? "““””<b>" + "∧".fontcolor("#1aad19") + "</b>" : "““””<b>" + "∨".fontcolor("#FF0000") + "</b>",
                    col_type: "scroll_button",
                    url: $("#noLoading#").lazyRule((fold) => {
                        storage0.setItem("fold", fold == "0" ? "1" : "0");
                        refreshPage();
                        return "hiker://empty";
                    }, fold),
                    extra: {
                        active: false,
                    }
                })
            }

            let activei = layout.findIndex(x => x.extra && x.extra.active);
            if (activei != -1) {
                layout.splice(activei, 0, {
                    title: "““””" + '🌀',
                    col_type: 'scroll_button',
                    url: $('#noLoading#').lazyRule((c, vkey) => {
                        let cate_obj = storage0.getMyVar(vkey + "cate_obj", {});
                        delete cate_obj[c];
                        storage0.putMyVar(vkey + "cate_obj", cate_obj);
                        clearMyVar("searchcfs");
                        refreshPage();
                        return "toast://清除完成";
                    }, cate, vkey)
                })
            }

            let classify = filters[cate];
            var init_cate = new Array(classify.length).fill("-1");
            let cate_obj = storage0.getMyVar(vkey + "cate_obj", {});
            cate_obj[cate] = cate_obj[cate] ? cate_obj[cate] : init_cate
            var cate_temp = cate_obj[cate];
            //var filter_def=storage0.getItem("filter_def", {});
            if (!Array.isArray(classify)) {
                classify = [classify];
            }

            classify.forEach((x, index) => {
                layout.push({
                    col_type: 'blank_block'
                })
                sflkeys.set(index, x.key);
                x.value.forEach((it, i) => {
                    let t = it.n;
                    if (cate_temp[index] == i) {
                        t = "<b><font color=" + color + ">" + t + "</font></b>";
                        //fl[x.key] = it.v;
                        //floperate.set(x.key, it.v);
                        // fl[index]=({ key: x.key, value: it.v, index: index });
                        FlObject.fl = ({
                            key: x.key,
                            value: it.v,
                            index: index
                        })
                    }
                    if (cate_temp[index] == "-1") {
                        FlObject.fl = ({
                            key: x.key,
                            value: "undefined",
                            index: index
                        })
                        //fl[x.key] = "undefined";
                        //floperate.set(x.key, "undefined");
                        // fl[index]=({ key: x.key, value: "undefined", index: index });
                    }
                    if (fold == 1) {
                        layout.push({
                            title: '““””' + t,
                            url: $("#noLoading#").lazyRule((o, vkey) => {
                                let flkeys = GM.get("flkeys").get();
                                //log(flkeys)
                                let i = o.i;
                                storage0.putMyVar("is_def", "1");
                                let cate_obj = storage0.getMyVar(vkey + "cate_obj", {});

                                let cate_temp = o.cate_temp;
                                if (cate_temp.constructor != Array) {
                                    cate_temp = [];
                                }
                                let index = o.index;

                                let tempc = flkeys.map((key, index) => {
                                    let obj = Object.create(null);
                                    obj["key"] = key;
                                    obj["value"] = cate_temp[index];
                                    obj["index"] = index;
                                    return obj;
                                });
                                let ckey = tempc[index]["key"];

                                let ckeys = tempc.filter(obj => obj.key === ckey);

                                if (ckeys.length > 1) {
                                    ckeys[index] = null;
                                }
                                if (ckeys.length > 1) {
                                    ckeys.forEach((obj, index) => {
                                        if (obj != null) {
                                            cate_temp[obj.index] = "-1";
                                        }
                                    })
                                }

                                let c = cate_temp[index] || "-1";

                                if (c == i) {
                                    o.cate_temp[index] = "-1";
                                } else {
                                    o.cate_temp[index] = i + "";
                                }
                                cate_obj[o.cate] = cate_temp;
                                //log(cate_temp)
                                //storage0.putMyVar("cate_temp", cate_temp);
                                storage0.putMyVar(vkey + "cate_obj", cate_obj);
                                clearMyVar("searchcfs");
                                refreshPage();
                                return "hiker://empty";
                            }, {
                                index: index,
                                cate_temp: cate_temp,
                                i: i,
                                cate: cate
                            }, vkey),
                            col_type: 'scroll_button',
                        })
                    }
                })
            })
        } else {
            //没有筛选清空存储
            FlObject.fl = [];
        }
    }

    let cobj = storage0.getMyVar("tempcate", {});
    if (cobj.list && page == 1) {
        layout.push({
            col_type: "blank_block"
        })
        layout.push({
            title: "““””<small>▲</small>",
            col_type: "scroll_button",
            url: $('#noLoading#').lazyRule((cobj) => {
                if (cobj.list.length == 1) {
                    clearMyVar("tempcate");
                    refreshPage(false);
                    return "hiker://empty";
                } else {
                    let i = cobj.list.findIndex(x => x.id == cobj.current);
                    if (i - 1 != -1) {
                        cobj.current = cobj.list[i - 1].id;
                        cobj.list = cobj.list.slice(0, i);
                    } else {
                        clearMyVar("tempcate");
                        refreshPage(false);
                        return "hiker://empty";
                    }
                    //cobj.list.pop();
                }
                storage0.putMyVar("tempcate", cobj)
                refreshPage(false);
                return "hiker://empty";
            }, cobj)
        })
        cobj.list.forEach(it => {
            let title = it.name;
            if (cobj.current == it.id) {
                title = title.fontcolor(color);
            }
            layout.push({
                title: "““””<small>" + title + "</small>",
                col_type: "scroll_button",
                url: $("#noLoading#").lazyRule((it) => {
                    let obj = storage0.getMyVar("tempcate", {});
                    if (obj.current == it.id) {
                        return "hiker://empty";
                    }
                    obj.current = it.id;
                    let i = obj.list.findIndex(x => x.id == obj.current);
                    if (i > -1) {
                        obj.list = obj.list.slice(0, i + 1);
                    }
                    storage0.putMyVar("tempcate", obj);
                    refreshPage(false);
                    return "hiker://empty";
                }, it)
            })
        })
    }
    let type_flag = String(cates[catei] && cates[catei].type_flag || "");
    let cfs = storage0.getMyVar("searchcfs", {});
    if (type_flag.includes("[CFS]") || type_flag.includes("[CFPY]")) {
        layout.push({
            col_type: "blank_block",
        });
        if (type_flag.includes("[CFS]")) {
            layout.push({
                title: "🔍搜索",
                col_type: "scroll_button",
                url: $(cfs.custom).input((it) => {
                    //let cfs = storage0.getMyVar("searchcfs", {});
                    let cfs = {};
                    cfs.custom = input;
                    storage0.putMyVar("searchcfs", cfs);
                    refreshPage(false);
                    return "hiker://empty";
                })
            });
        }
        if (type_flag.includes("[CFPY]")) {
            layout.push({
                title: "🔍拼音",
                col_type: "scroll_button",
                url: $(cfs.custom_pinyin).input((it) => {
                    //let cfs = storage0.getMyVar("searchcfs", {});
                    let cfs = {};
                    cfs.custom_pinyin = input.toUpperCase();
                    storage0.putMyVar("searchcfs", cfs);
                    refreshPage(false);
                    return "hiker://empty";
                })
            });
        }
        layout.push({
            title: cfs.custom || cfs.custom_pinyin,
            col_type: "scroll_button",
            url: "hiker://empty",
        });
        for (let key in cfs) {
            FlObject.fl = {
                key,
                value: cfs[key]
            };
        }
    }
    const regex = /\[AN:(.*?)\]/g;
    let match;

    // 循环匹配，直到所有结果被提取
    if ((match = regex.exec(type_flag)) !== null) {
        //longPressActions.push(match[1]);
        longPressActions=match[1].split(",");
    }

    //console.log(longPressActions);
}

function getFl() {
    let tfl = FlObject.fl.filter(f => f.value != "undefined");
    fl = Object.fromEntries(tfl.map(item => [item.key, item.value]));
    return fl;
}

function getCateList() {
    return {
        cate,
        homelist,
        longPressActions
    }
}

$.exports = {
    setvkey: setVkey,
    getcatelist: getCateList,
    getcategorys: getCategorys,
    getfl: getFl
}