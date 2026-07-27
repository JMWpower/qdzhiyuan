function isMovie(text) {

    if (text.length > 8) {
        return false;
    }
    //排除
    let reg = /\.|高清直播|写真推荐|影院|影视|蓝光电影|高清电影|第一季|第二季|第三季|第四季|第五季|\n|\r/;
    if (reg.test(text)) {
        return false;
    }
    return /(原画|备用|蓝光|超清|高清|正片|韩版|4K|1080P|720P|TC|HD|BD|中字|版|全集|HD国语)$/i.test(text);
}

function notChapter(text) {
    return /[0-9]\.[0-9]分/.test(text);
}
let last = null;

function isChapter0(text, nextText) {
    let pri = /^[^(更新)至]*?第\d+(集|章|话|期)$/;
    if (pri.test(text)) {
        //fba.log("debug:" + RegExp.$1 + text)
        return true;
    }

    let num1 = Number(text);
    if (!text || Number.isNaN(num1)) {
        return false;
    }
    if (num1 === 1) {
        //fba.log("debug:" + num1 + text)
        return true;
    }
    if (nextText === null) {
        //fba.log("debug:" + num1 + nextText)
        return true;
    }
    let num2 = Number(nextText);
    if (Number.isNaN(num2)) {
        if (last && (last - num1 < 2 && last - num1 > -2)) {
            //log("debug:" + last)
            return true;
        }
        return false;
    }
    if (num1 - num2 < 2 && num1 - num2 > -2 /*&&num1 - num2!==0*/) {
        //log("debug:" + last)
        last = num1;
        return true;
    }
}


function isChapter(text, nextText) {
    text = text.trim();
    nextText = nextText ? nextText.trim() : nextText;
    if (!text || notChapter(text)) {
        //优先排除
        //log("0排除:"+text)
        return false;
    }
    //判断是不是电影
    if (isMovie(text)) {
        //log("1是电影:" + text)
        return true;
    }

    if (isChapter0(text, nextText)) {
        //log("2是剧集:" + text)
        return true;
    }

    return false;
}


function match(url, html, noFormat) {
    let list_link = [];
    let format = url.replace(/\d+/g, "#d#");
    let list_document_link = pdfa(html, "body&&a");
    let top_j = 0;
    let hasAdded = [];
    let urlFormatSet = new Set();
    let lost = [];
    for (let i = 0; i < list_document_link.length; i++) {
        let item = list_document_link[i];
        var text = pdfh(item, "a&&Text");
        var href = pd(item, "a&&href", url);
        var nextText = i + 1 >= list_document_link.length ? null : pdfh(list_document_link[i + 1], "a&&Text");
        let urlFormat = href.replace(/\d+/g, "#d#");
        if (text && isChapter(text, nextText) && href && href.indexOf('http') > -1 && href.indexOf(url + "#") == -1) {
            /*if (pdfh(item, "a&&target") == '_blank') {
                continue;
            }*/
            if (!noFormat && urlFormat === format) {
                continue;
            }
            if (hasAdded.includes(href)) {
                continue;
            }
            if (list_link[top_j] === undefined) {
                list_link[top_j] = [];
            }
            //log(text + "&" + href);
            var ss = text.replace(/[^\d+]/g, '');
            if (ss.indexOf(0) === 0) {
                text = text.replace('0', '');
            }
            var is_repeat = false;
            let nep = (text.match(/\d+/) || [-1])[0];
            for (let j = 0; j < list_link[top_j].length; j++) {
                if (list_link[top_j][j].href == href) {
                    is_repeat = true;
                    break;
                }
                let cep = list_link[top_j][j].cep;

                if (list_link[top_j][j].text == text || cep === nep) {
                    top_j += 1;
                    list_link[top_j] = [];
                    break;
                }
            }
            if (is_repeat) {
                continue;
            }
            var std = {};
            std.url = href;
            std.text = text;
            std.cep = Number(nep);
            std.urlFormat = urlFormat;
            //排除年代
            let reg = /^1|2[0-9]{3}$/;
            if (text.length == 4 && reg.test(text)) {
                continue;
            }
            hasAdded.push(href);
            urlFormatSet.add(urlFormat);
            list_link[top_j].push(std);
        } else {
            lost.push({
                url: href,
                text: text,
                urlFormat: urlFormat,
                top_j_x: top_j,
                top_j_y: top_j.length
            });
        }
    }
    //lost.reverse();
    //log(lost)
    if (urlFormatSet.size) {
        let prefix = hasAdded[0].split("-")[0];
        for (let item of lost) {
            if (item.text && urlFormatSet.has(item.urlFormat) && !hasAdded.includes(item.url)) {
                if (prefix && !item.url.includes(prefix)) {
                    continue;
                }
                hasAdded.push(item.url);
                list_link[item.top_j_x].splice(item.top_j_y - 1, 0, {
                    url: item.url,
                    text: item.text,
                    cep: -2
                });
            }
        }
    }
    log(list_link);
    if (list_link.length === 0 && !noFormat) {
        log("重匹配")
        return match(url, html, true);
    }
    list_link=tryTransformEpisodes(list_link);
    list_link.forEach(v=>v.sort((a,b)=>a.cep-b.cep));
    return list_link;
}
$.exports.match = match;

//剧集id-线路id-级数id.html 线路拼接
function tryTransformEpisodes(data) {
    if(!(Array.isArray(data)&&data.length===1)){
        return data;
    }
    data=data[0];
    if (!Array.isArray(data) || data.length === 0) {
        return [data];
    }

    // 分离不同类型的项
    const lineItems = [];      // cep为-2的线路项
    const movieItems = [];      // cep为-1的电影项
    const episodeItems = [];    // cep为数字的剧集项
    
    // 分类数据项
    for (let item of data) {
        if (item.cep === -2 || item.cep === '-2') {
            lineItems.push(item);
        } else if (item.cep === -1 || item.cep === '-1') {
            movieItems.push(item);
        } else if (!isNaN(Number(item.cep))) {
            episodeItems.push(item);
        }
    }
    
    // 处理电影情况
    if (movieItems.length > 0 && episodeItems.length === 0) {
        let result = [];
        let allSources = lineItems.concat(movieItems);
        
        for (let source of allSources) {
            let movieText = movieItems[0].text || "电影";
            result.push([{
                cep: -1,
                text: movieText,
                url: source.url
            }]);
        }
        
        return result.length > 0 ? result : [data];
    }
    
    // 处理电视剧情况
    if (episodeItems.length > 0) {
        // 获取最大集数
        let maxEpisode = Math.max.apply(null,episodeItems.map(item => Number(item.cep)));
        
        // 提取所有线路ID（包括剧集项中的线路）
        let lineIds = new Set();
        
        // 从线路项中提取线路ID
        for (let line of lineItems) {
            let match = line.url.match(/\/(\d+)-(\d+)-\d+\.html$/);
            if (match && match[2]) {
                lineIds.add(match[2]);
            }
        }
        
        // 从剧集项中提取线路ID
        for (let ep of episodeItems) {
            let match = ep.url.match(/\/(\d+)-(\d+)-\d+\.html$/);
            if (match && match[2]) {
                lineIds.add(match[2]);
            }
        }
        
        // 如果没有找到线路ID，使用默认处理
        if (lineIds.size === 0) return [data];
        
        // 提取基础URL信息
        const sampleUrl = episodeItems[0].url || (lineItems[0].url || '');
        const urlParts = sampleUrl.split('/');
        const baseUrl = urlParts.slice(0, -1).join('/') + '/';
        const filename = urlParts.pop();
        const [seriesId] = filename.split('-');
        
        // 为每个线路ID生成剧集列表
        let result = [];
        for (let lineId of lineIds) {
            let lineEpisodes = [];
            
            for (let ep = 1; ep <= maxEpisode; ep++) {
                lineEpisodes.push({
                    cep: ep,
                    text: `第${ep}集`,
                    url: `${baseUrl}${seriesId}-${lineId}-${ep}.html`
                });
            }
            
            result.push(lineEpisodes);
        }
        
        return result.length > 0 ? result : [data];
    }
    
    // 不符合转换条件
    return [data];
}
