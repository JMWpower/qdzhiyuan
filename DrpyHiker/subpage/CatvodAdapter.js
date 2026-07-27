function _buildUrl(url, o) {
    let oo = {};
    for (key in o) {
        oo[key] = encodeURIComponent(o[key]);
    }
    return buildUrl(url, oo);
}

function CatvodAdapter(source) {
    this.TAG = "CatvodAdapter";
    this.rule = {
        name: source.name,
        host: "hiker://empty",
        一级: "true",
        推荐: "true",
        类型: "影视",
        //模板: "自动"
    };

    let stype = source.medType;
    if (stype < 10) {
        this.rule.类型 = "影视";
    } else if (stype >= 10 && stype < 20) {
        this.rule.类型 = "小说";
    } else if (stype >= 20 && stype < 30) {
        this.rule.类型 = "漫画";
    } else if (stype >= 30 && stype < 40) {
        this.rule.类型 = "听书";
    } /*else if (stype >= 40 && stype < 50) {
        this.rule.类型 = "网盘";
    }*/

    this.ext = {};
    this.api = source.api;
    this.categoryfilter = source.categories ? source.categories.split(/[,，]/).map((category) => category.trim()) : [];
}
Object.assign(CatvodAdapter.prototype, {
    init() {
        request(this.api + '/init', {
            method: "POST",
            body: JSON.stringify({}),
            headers: {
                "Content-Type": "application/json"
            }
        });
    },
    homeVod() {
        return JSON.stringify({
            list: []
        });
    },
    home() {
        const response = JSON.parse(post(this.api + '/home', {
            method: 'POST',
            body: JSON.stringify({}),
            headers: {
                "Content-Type": "application/json"
            }
        }));
        //log(response)
        
        let classes = [];
        let filters = {};
        // 分类
        if (response.class) {
            const seenTypeIds = new Set();
            for (let cls of response.class) {
                let n = String(cls.type_name).trim();
                if (!seenTypeIds.has(cls.type_id)) {
                    seenTypeIds.add(String(cls.type_id));
                    classes.push({
                        type_id: String(cls.type_id),
                        type_name: n,
                    });
                }
            }
            if (
                Array.isArray(classes) &&
                classes.length > 0 &&
                Array.isArray(this.categoryfilter) &&
                this.categoryfilter.length > 0
            ) {
                classes = classes.filter((v) => !this.categoryfilter.includes(v.type_name));
            }
        }
        // 筛选
        if (typeof response.filters === 'object' && Object.keys(response.filters).length > 0) {
            filters = response.filters;
        }
        return JSON.stringify({
            class: classes,
            filters: filters,
        });
    },
    category(tid, pg, filter, extend) {
        const response = JSON.parse(request(this.api + "/category", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: tid,
                page: pg,
                filters: JSON.parse(filter),
            }),
        }));
        const videos = [];
        for (let vod of response.list) {
            videos.push({
                vod_id: String(vod.vod_id || vod.book_id || ""),
                vod_name: String(vod.vod_name || vod.book_name || ""),
                vod_pic: vod.vod_pic || vod.book_pic,
                vod_remarks: vod.vod_remarks || vod.book_remarks,
                vod_tag: vod.vod_tag
            });
        }
        return JSON.stringify({
            page: parseInt(response.page),
            pagecount: parseInt(response.pagecount),
            total: parseInt(response.total),
            list: videos,
        });
    },
    detail(id) {
        const response = JSON.parse(request(this.api + `/detail`, {
            method: 'POST',
            body: JSON.stringify({
                id: Array.isArray(id) ? id[0] : id,
            }),
            headers: {
                "Content-Type": "application/json"
            }
        }));
        //log(response)
        const videos = [];
        for (let vod of response.list) {
            videos.push({
                vod_id: vod.vod_id || vod.book_id,
                vod_name: vod.vod_name || vod.book_name,
                vod_pic: vod.vod_pic || vod.book_pic,
                type_name: vod.type_name,
                vod_year: vod.vod_year || vod.book_year,
                vod_area: vod.vod_area || vod.book_area,
                vod_remarks: vod.vod_remarks || vod.book_remarks,
                vod_actor: vod.vod_actor || vod.book_actor,
                vod_director: vod.vod_director,
                vod_content: String(vod.vod_content || vod.book_content || "").trim(),
                vod_play_from: vod.vod_play_from || vod.volumes || "默认线路",
                vod_play_url: vod.vod_play_url || vod.urls,
            });
        }
        return JSON.stringify({
            page: parseInt(response.page),
            pagecount: parseInt(response.pagecount),
            total: parseInt(response.total),
            list: videos,
        });
    },
    play(flag, id) {
        const response = JSON.parse(request(this.api + `/play`, {
            method: 'POST',
            body: JSON.stringify({
                flag: flag,
                id: id,
            }),
            headers: {
                "Content-Type": "application/json"
            }
        }));
        let res = response;
        //log(res)
        if (response.url && response.url.startsWith('js2p')) {
            const match = response.url.match(/\/proxy\/([^\/]+)\/([^\/]+)\/([^\/]+)\//);
            if (match) {
                const what = match[1];
                const ids = match[2];
                const end = match[3];
                res.url = ids;
            }
        }
        let plays = {};
        if (this.rule.类型 === "小说") {
            plays.url = "novel://" + JSON.stringify(res);
            return JSON.stringify(plays);
        }
        if (this.rule.类型 === "漫画") {
            plays.url = "pics://" + res.content.join("&&");
            return JSON.stringify(plays);
        } else {
            return JSON.stringify(res);
        }
    },

    search(wd, quick, pg) {
        const response = JSON.parse(request(this.api + `/search`, {
            method: 'POST',
            body: JSON.stringify({
                pg,
                wd,
            }),
            headers: {
                "Content-Type": "application/json"
            }
        }));

        const videos = [];
        for (let vod of response.list) {
            videos.push({
                vod_id: String(vod.vod_id || vod.book_id),
                vod_name: String(vod.vod_name || vod.book_name),
                vod_pic: vod.vod_pic || vod.book_pic,
                vod_remarks: vod.vod_remarks || vod.book_remarks,
                vod_tag: vod.vod_tag
            });
        }
        return JSON.stringify({
            page: parseInt(response.page),
            pagecount: parseInt(response.pagecount),
            total: parseInt(response.total),
            list: videos,
        });
    },
    action(actionId, value, timeout) {
        return request(this.api + "/action", {
            method: 'POST',
            timeout: (timeout || 15) * 1000,
            body: JSON.stringify({
                actionId,
                value,
            }),
            headers: {
                "Content-Type": "application/json"
            }
        });
    },
    getRule(key) {
        return key ? this.rule[key] : this.rule;
    },
    runMain() {
        return "";
    }
});
$.exports = CatvodAdapter;