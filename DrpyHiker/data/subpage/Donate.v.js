js:
    let d = [];
setPageTitle("捐赠/支持");
d.push({
    title: "捐赠/支持",
    desc: "这个捐赠不能为你带来特权，但您的支持会提高我更新创作的动力。",
    col_type: "text_center_1",
    url: "toast://感谢您的支持"
});
d.push({
    title: "十分感谢α大佬的参与开发，以及道长大佬对本程序开发上的指导。",
    col_type: "text_center_1",
    url: "toast://感谢您的支持"
});
d.push({
    col_type: "pic_1_full",
    url: "https://gitee.com/LoyDgIk/LoyDgIk_Rule/raw/master/67d8f0187f0186c1.png",
    pic_url: "https://gitee.com/LoyDgIk/LoyDgIk_Rule/raw/master/67d8f0187f0186c1.png"
});
d.push({
    col_type: "text_center_1",
    title: "““””" + "图片加载缓慢请稍等".small().fontcolor("Gray"),
    url: "hiker://empty",
    extra: {
        lineVisible: false
    }
});
d.push({
    col_type: "line_blank",
});
d.push({
    col_type: "text_1",
    title: "捐赠信息",
    url: "hiker://empty",
    extra: {
        lineVisible: false
    }
});
d.push({
    col_type: "x5_webview_single",
    url: "https://kdocs.cn/l/cgLRqUNWJJDy",
    desc: "list&&screen-150",
    extra: {
    }

});
setResult(d);