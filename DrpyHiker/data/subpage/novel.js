let drpy = GM.defineModule("DrpyManage").getBySource(MY_PARAMS.source);
let play = JSON.parse(drpy.play(MY_PARAMS.from, MY_PARAMS.id, []));

let data = JSON.parse(play.url.replace("novel://", ""));
let layout = [];
if (data.content) {
let content = "　　" + data.content.split(/(\n|\r)+/).filter(it => it.trim().length > 1).map(it => it.trim()).join("<br>　　");
    if (data.title) {
layout.push({
    col_type: "rich_text",
    title: ("<strong>" + (data.title || getPageTitle()) + "</strong>").big(),
});
    }
layout.push({
    title: content,
    col_type: 'rich_text',
    extra: {
        textSize: 18,
        click: true
    }
});
} else if (data.url) {
    layout.push({
        col_type: "text_center_1",
        title: "点击播放",
        url: data.url,
    });
    layout.push({
        title: "<br>".repeat(30),
        col_type: 'rich_text',
        extra: {
            textSize: 18,
            click: true
        }
    });
} else {
    layout.push({
        col_type: "rich_text",
        title: ("<strong>没有找到正文</strong>").big(),
    });
}
setResult(layout);