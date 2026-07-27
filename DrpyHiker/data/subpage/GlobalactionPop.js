$.exports.show = function() {
    const runtimeConfig = GM.defineModule("runtimeConfig");
    const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
    let rules = runtimeConfig.getAllSource();
    hikerPop.setUseStartActivity(false);
    let actionList = [];
    rules.forEach(v => {
        if (v.more && v.more.actions) {
            v.more.actions.forEach(t => {
                t = Object.assign({
                    from: v.name,
                    key: v.key
                }, t);
                actionList.push(t);
            });
        }
    });
    let names = actionList.map(v => v.name + "\t[‘‘" + v.from + "’’]");
    let pop = hikerPop.selectCenter({
        options: names,
        columns: 1,
        title: "全局动作",
        //noAutoDismiss: true,
        position: -1,
        click(s, i) {
            hikerPop.runOnNewThread(() => {
                return $.require("action").checkOptions2(actionList[i].action, actionList[i].key);
            });
        }
    });
}