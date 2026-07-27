let Config = {
    "ruleContent": {
        "content": "#content&&Html@@#chaptercontent&&Html@@#nr1&&Html@@#nr&&Html@@#booktxt&&Html@@#article&&Html@@#txt&&Html@@#novelcontent&&Html@@#ccc&&Html@@#rtext&&Html@@#htmlContent&&Html@@#TextContent&&Html@@#acontent&&Html@@.content&&Html@@.text&&Html@@.TxtContent&&Html@@.txtnav&&Html@@.chapter_content&&Html@@#YiJianZhan&&Html@@.article&&Html@@.readcontent&&Html@@#articlecon&&Html@@article&&Html",
        "nextContentUrl": ":containsOwn(下一页)&&href@@:containsOwn(下一章)&&href@@:containsOwn(下章)&&href@@:containsOwn(下页)&&href@@#pb_next&&href@@#linkNext&&href@@#next_url&&href",
        "ruleList": ":containsOwn(目录)&&href@@:containsOwn(章节目录)&&href@@:containsOwn(章节列表)&&href@@:containsOwn(返回目录)&&href@@#linkIndex&&href@@:containsOwn(回目录)&&href@@:containsOwn(返回详情)&&href@@#pt_mulu&&href@@.icon-active&&href@@.Readpage,-1&&a,1&&href@@#info_url&&href"
    },
    "ruleToc": {
        "chapterList": ".chapter,0&&li@@.chapter&&li&&a@@.section-box,0&&li@@.section-box&&li@@.section-list,0&&li@@.section-list&&li@@.chapters,0&&li@@.chapters&&li@@.last9&&li@@.chapter-list,0&&li@@.chapter-list&&li@@.listmain&&dd@@.recommend,0&&p@@#alllist&&li@@.info-chapters,0&&a@@.info-chapters&&a@@#main&&li@@#list&&dd@@#list-chapterAll&&dd@@#chapterlist&&li@@.book_last,0&&dd@@.book_last,0&&li@@.book_last&&dd@@.directoryArea,0&&p@@.directoryArea&&p@@#chapterlist&&p@@.ph_list&&li@@.bookchapter&&li@@.novel-text-list&&li@@#all_chapter&&div@@.chapterindex&&li@@#zjlb&&li@@.panel-chapterlist,0&&dd@@.panel-chapterlist&&dd@@.lb_mulu,0&&li@@.zxjz,0&&ul,0&&li@@.list_xm,0&&li@@#J-ascChapterList2&&li@@.chapterlist&&li@@.chapterlist&&dd@@#jieqi_page_contents&&dd@@.cataloglist&&li@@#chapterList&&li@@.list,0&&li@@.list&&li@@#ul_all_chapters&&li@@#clist&&li@@.mululist,0&&li@@.chapter&&div@@#listsss&&li@@#list&&li@@#list&&a@@.info_chapters,0&&ul,0&&li@@.list&&li@@.bookchapter&&li@@.MLlist&&li@@#J-chapterlist&&li@@#listBox&&dd@@#newlist&&dd@@.catalog_list,0&&li@@.child-title&&li@@.info_newest,0&&li@@.box_con,0&&li@@#chapterlist&&a@@.book_list,-1&&li",
        "chapterName": "a&&Text@@Text",
        "chapterUrl": "a&&href@@href",
        "ruleList": ".book_more&&a&&href@@:containsOwn(章节列表)&&href@@:containsOwn(查看完整目录)&&href@@.gengduo&&a&&href@@:containsOwn(查看更多章节)&&href@@:containsOwn(查看目录)&&href@@:containsOwn(全部章节目录)&&href@@.more&&a&&href@@.text-center&&a&&href@@.ablum_read,0&&a,0&&href@@.recommend,0&&h2,1&&a&&href@@.bookmore&&a&&href@@:containsOwn(更多目录>>)&&a&&href",
        "nextTocUrl": ":containsOwn(下一页)&&href@@body&&.page-item:not([class*=\"active\"]):has(a[href]):contains({{ext}})&&a&&href",
        "select_option": "option&&value"
    },
    /*"ruleBookInfo": {
        "coverUrl": ".block_img2&&img&&src@@.synopsisArea&&img&&src@@.books&&img&&src@@.imgbox&&img&&src@@.cover&&img&&src@@.catalog&&img&&src@@#rInfo&&img&&src@@.detail&&img&&src@@#fmimg&&img&&src@@#main&&img&&src@@.img_wrap&&img&&src@@.stui-content__thumb&&img&&src"
    },
    "ruleTocListReplace": [{
            "domain": "xxdingdian.com",
            "ruleList": ""
        },
        {
            "domain": "bbshuwu.net",
            "ruleList": ":containsOwn(开始阅读)&&href"
        },
        {
            "domain": "biqudu.net",
            "ruleList": ":containsOwn(查看完整目录)&&href"
        },
        {
            "domain": "biqugei.net",
            "ruleList": ".bookmore&&a,1&&href"
        },
        {
            "domain": "mbtxt.la",
            "ruleList": ""
        },
        {
            "domain": "biquge.name",
            "ruleList": ""
        },
        {
            "domain": "biqugse.com",
            "ruleList": ":containsOwn(开始阅读)&&href"
        },
        {
            "domain": "cits0871.com",
            "ruleList": ""
        },
        {
            "domain": "biquge123.la",
            "ruleList": ":containsOwn(章节目录)&&href"
        },
        {
            "domain": "fantuantanshu.com",
            "ruleList": ".ablum_read,1&&a&&href"
        },
        {
            "domain": "xfwxs.com",
            "ruleList": ""
        }
    ],
    "reverseToc": [
        "ibiqu.org",
        "biqu5200.net",
        "ibiqu.net",
        "b520.cc",
        "paoshu8.com",
        "xxbiqudu.com",
        "b5200.net",
        "biquge5200.com"
    ]*/
}

function parseWithRules(html, rulesStr, isArray, host, ext) {
    if (!rulesStr) {
        return isArray ? [] : '';
    }

    var rules = rulesStr.split('@@');

    for (var i = 0; i < rules.length; i++) {
        try {
            var rule = rules[i].trim().replaceAll("{{ext}}", String(ext||""));
            if (!rule) continue;

            var result;
            if (isArray) {
                result = parseDomForArray(html, rule);
                if (result.length > 0) {
                    return result;
                }
            } else {
                result = host?parseDom(html, rule, host):parseDomForHtml(html, rule);
                
                if (result && result !== '') {
                    return result;
                }
            }
        } catch (e) {

        }
    }

    return isArray ? [] : '';
}

let chapterUrl=MY_PARAMS.novelMatchUrl;

let html = fetch(chapterUrl)

if (!MY_PARAMS.isInit) {
    MY_PARAMS.initialUrl=chapterUrl;
    log("初始化")
    let chapterUrl0 = parseWithRules(html, Config.ruleToc.ruleList, false, chapterUrl) || parseWithRules(html, Config.ruleContent.ruleList,false,  chapterUrl);
    log("初始化Url"+chapterUrl0)
    if (chapterUrl0) {
        html=fetch(chapterUrl);
        chapterUrl=chapterUrl0;
    }
    
}
addListener("onRefresh",$.toString((initialUrl)=>{
    setPageParams({
        novelMatchUrl:initialUrl
    })
}, MY_PARAMS.initialUrl))

let nextUrl=parseWithRules(html, Config.ruleToc.nextTocUrl, false,chapterUrl, MY_PAGE+1);
log("next:"+nextUrl)
let list = parseWithRules(html, Config.ruleToc.chapterList,true);

let d=[];

for (let item of list){
    d.push({
        title:parseWithRules(item, Config.ruleToc.chapterName),
        url:"hiker://page/AiNovel#autoReader#?pageUrl="+encodeURIComponent(parseWithRules(item, Config.ruleToc.chapterUrl,false, chapterUrl)),
        col_type:"text_1",
    });
}
setPageParams(Object.assign(MY_PARAMS, {
    novelMatchUrl:  nextUrl||chapterUrl||MY_PARAMS.novelMatchUrl,
    isInit: true,
    
}))
setResult(d);