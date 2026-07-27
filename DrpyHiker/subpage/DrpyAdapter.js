const JSEngine = com.example.hikerview.service.parser.JSEngine;

function oldbuildJsEnv(ticket) {
    let code = String.raw`
    // const my_rule = '
    const MY_RULE = ${my_rule};
    const my_rule = JSON.stringify(MY_RULE);
    const MY_TICKET = "${ticket || ""}";
    eval(getJsPlugin());
    eval(getJsLazyPlugin());
    `;
    return code;
}

function buildJsEnv(ticket) {
    MY_RULE.title = MY_RULE._title || MY_RULE.title;
    let my_rule = JSON.stringify(MY_RULE);

    let code = `
    let my_rule = '';
    my_rule = null;
    const MY_RULE = ${my_rule};
    const MY_TICKET = "${ticket || ""}";
    eval(getJsPlugin());
    eval(getJsLazyPlugin());
    `;
    return code;
}
function createDrpy(key, GMkey) {
    let func = buildJsEnv;
    if (typeof my_rule != "undefined" && my_rule != null) {
        func = oldbuildJsEnv;
    }
    JSEngine.getInstance().evalJS(func(MY_TICKET) + "\n!" + $.toString((key, GMkey, MY_TICKET) => {
        let drpy = $.require("drpy", key);
        GM.has(GMkey, (DrpyManage) => {
            DrpyManage.put(key, drpy);
        });
    }, key, GMkey, MY_TICKET) + ";\n", "", false);
}

function DrpyAdapter(source, drpyMap, GMkey) {
    let key = source.key;
    createDrpy(key, GMkey);
    let drpy = drpyMap.get(key);
    
    
    this.drpy = drpy;
}
Object.assign(DrpyAdapter.prototype, {
    init(...args) {
        this.drpy.init.apply(this.drpy, args);
    },
    homeVod(...args) {
        return this.drpy.homeVod.apply(this.drpy, args);
    },
    home(...args) {
        return this.drpy.home.apply(this.drpy, args);
    },
    category(tid, pg, filter, extend) {
        return this.drpy.category(tid, pg, filter, extend);
    },
    detail(vod_url) {
        return this.drpy.detail(vod_url);
    },
    play(flag, id) {
        return this.drpy.play(flag, id);
    },
    search(wd, quick, pg) {
        return this.drpy.search(wd, quick, pg);
    },
    proxy(param) {
        return this.drpy.proxy(param);
    },
    getRule(key) {
        return this.drpy.getRule(key);
    },
    runMain(main_func_code, arg) {
        return this.drpy.runMain(main_func_code, arg);
    }
})
$.exports=DrpyAdapter;