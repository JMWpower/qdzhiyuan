if (getItem("firstopen") == MY_RULE.version) {
    $.require("mian");
} else if (MY_PAGE === 1) {
    let d = []
    let time = getItem("firstopen", "") ? 6 : 20;
    let id = Date.now();
    let content = `
    1. 本小程序所有代码全部开源，且本规则为学习目的，请于导入24小时内删除！！！
    2. 本小程序<b>完全免费</b>，如果你是付费购买的恭喜你被骗了。
    当然如果有能力想鼓励作者的可以${"支持一下".big().link("hiker://page/Donate.v#noHistory##noRecordHistory#")}</a>(<small>点击可进入捐赠，可在主页菜单进入</small>)。
    3. 本小程序只支持道长的drpy[js]视频源，其他皆为适配器转换支持并不完全。
    4. 本程序不适合"大格局"的人使用。不会用的也不要🐶叫，删了就行，谢谢配合。
    
    <big><b> License </b></big>
    This project is licensed under the GPLv3 License - see the ${"LICENSE".link(getPath("hiker://files/data/DrpyHiker/LICENSE"))} file for details.
    
    <b>开始使用本规则即代表遵守规则条例</b>
    `;

    d.push({
        title: "““””<strong>使用前须知</strong>".big(),
        desc:"““本地典藏版””",
        col_type: "text_center_1",
        url: "hiker://empty",
        extra: {
            lineVisible: false
        }
    });

    d.push({
        title: content.trim().replace(/\n\s*?/g, "<br>"),
        "col_type": "rich_text"
    }, {
        title: `当前版本：${MY_RULE.version} ${getItem("firstopen", "") && getItem("firstopen", "") < MY_RULE.version ? "🆕" : ""}`,
        col_type: "text_1",
        url: $("#noLoading#").lazyRule(() => {
            const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
            hikerPop.updateRecordsBottom($.require("updateRecords"));

            return "hiker://empty";
        }),
        extra: {
            titleVisible: false
        }
    }, {
        col_type: "line"
    }, {
        title: time + "秒后继续",
        url: "toast://请认真阅读以上内容",
        col_type: "text_center_1",
        extra: {
            id: id + "timer"
        }
    });

    setResult(d);
    while (time != 0) {
        java.lang.Thread.sleep(1000);
        time -= 1;
        updateItem(id + "timer", {
            title: time + "秒后继续"
        });
    }
    updateItem(id + "timer", {
        title: "““我同意以上要求””",
        url: $("#noLoading#").lazyRule((v) => {
            setItem("firstopen", String(v));
            GM.clear("runtimeConfig");
            refreshPage();
            const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
            hikerPop.updateRecordsBottom($.require("updateRecords"));
            return "toast://感谢您的理解";
        }, MY_RULE.version),
        col_type: "text_center_1"
    });
}