let url = decodeURIComponent(getParam("pageUrl", ""), "UTF-8");

loadReadContentPage(url, {
    fromReader: true
});