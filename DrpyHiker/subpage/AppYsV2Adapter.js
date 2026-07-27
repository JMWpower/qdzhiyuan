var lienName = {
    'bfzym3u8': '暴风',
    '1080zyk': '优质',
    'kuaikan': '快看',
    'lzm3u8': '量子',
    'ffm3u8': '非凡',
    'haiwaikan': '海外看',
    'gsm3u8': '光速',
    'zuidam3u8': '最大',
    'bjm3u8': '八戒',
    'snm3u8': '索尼',
    'wolong': '卧龙',
    'xlm3u8': '新浪',
    'yhm3u8': '樱花',
    'tkm3u8': '天空',
    'jsm3u8': '极速',
    'wjm3u8': '无尽',
    'sdm3u8': '闪电',
    'kcm3u8': '快车',
    'jinyingm3u8': '金鹰',
    'fsm3u8': '飞速',
    'tpm3u8': '淘片',
    'lem3u8': '鱼乐',
    'dbm3u8': '百度',
    'tomm3u8': '番茄',
    'ukm3u8': 'U酷',
    'ikm3u8': '爱坤',
    'hnzym3u8': '红牛资源',
    'hnm3u8': '红牛',
    '68zy_m3u8': '68',
    'kdm3u8': '酷点',
    'bdxm3u8': '北斗星',
    'qhm3u8': '奇虎',
    'hhm3u8': '豪华',
    'kbm3u8': '快播'
};

function AppYsV2Adapter(source) {
    this.source = source;
    this.type = String(source.ext).includes("v1.vod") ? 1 : 2;
    this.api = source.ext.endsWith("/") ? source.ext.replace(/\/$/, "") : source.ext;

    this.rule = {
        name: source.name,
        host: source.ext,
        一级: "true",
        推荐: "true",
        类型: "影视",
        //模板: "自动"
    };
    this.cacheClass = null;
}
Object.assign(AppYsV2Adapter.prototype, {
    init() {
        this.cacheClass = null;
        this.randomPrefix = (Date.now() / 1000) + "Prefix:";
    },
    homeVod() {
        let res;
        let videoList = [];
        let list = [];
        try {
            if (this.type === 1) {
                res = JSON.parse(request(this.api + '/vodPhbAll', {
                    timeout: 3000
                }));
                videoList = res.data.list;
            } else {
                res = JSON.parse(request(this.api + '/index_video', {
                    timeout: 3000
                }));
                videoList = res.list || res.data;
            }
            videoList.forEach((it, idex) => {
                let vlist = this.type === 1 ? videoList[idex].vod_list : videoList[idex].vlist;
                vlist.forEach(it => {
                    list.push({
                        vod_id: it.vod_id,
                        vod_name: it.vod_name,
                        vod_pic: it.vod_pic.startsWith('http') ? it.vod_pic : it.vod_pic.startsWith('//') ? 'https:' + it.vod_pic : it.vod_pic.startsWith('/') ? getHome(this.api) + it.vod_pic : getHome(this.api) + '/' + it.vod_pic,
                        vod_remarks: it.vod_remarks,
                    });
                });
            });
        } catch (e) {
            list.push({
                vod_id: "没有数据",
                vod_name: "无数据,防止无限请求",
                vod_pic: "https://ghproxy.net/https://raw.githubusercontent.com/hjdhnx/dr_py/main/404.jpg",
                vod_remarks: "不要点，会崩的",
            });
        }
        return JSON.stringify({
            list
        });
    },
    home() {
        if (this.cacheClass) return this.cacheClass;
        let home = {
            class: [],
            filters: {}
        };
        let res;
        if (this.type === 1) {
            res = JSON.parse(request(this.api + '/types'));
            res = res.data.list;
        } else {
            res = JSON.parse(request(this.api + '/nav'));
            res = res.list || res.data;
        }
        let keyMap = new Map([
            ["class", "类型"],
            ["area", "地区"],
            ["lang", "语言"],
            ["year", "年份"],
            ["by", "排序"]
        ]);
        for (let i in res) {
            let item = res[i];
            home.class.push({
                type_id: item.type_id,
                type_name: item.type_name
            });
            let extend = item.type_extend || {};
            if (Object.keys(extend).length) {
                home.filters[i] = [];
            }
            for (let key in extend) {
                let it = extend[key];
                if (keyMap.has(key) && it) {
                    let fl = {
                        key,
                        name: keyMap.get(key),
                        value: [{
                            n: "全部",
                            v: ""
                        }]
                    }
                    it.split(",").forEach(v => {
                        fl.value.push({
                            n: v,
                            v
                        });
                    });
                    home.filters[i].push(fl);
                }
            }
        }
        home = JSON.stringify(home);
        this.cacheClass = home;
        return home;
    },
    category(tid, pg, filter, fl) {
        let f = `class=${fl.class || ""}&area=${fl.area || ""}&lang=${fl.lang || ""}&letter=${fl.letter || ""}&year=${fl.year || ""}&by=${fl.by || ""}`;
        let res;
        let videoList = [];
        let list = [];
        if (this.type === 1) {
            res = JSON.parse(request(this.api + `?tid=${tid}&page=${pg}&${f}`));
            videoList = res.data.list;
        } else {
            res = JSON.parse(request(this.api + `/video?tid=${tid}&pg=${pg}&${f}`));
            videoList = res.list || res.data;
        }
        let burl = this.api;
        videoList.forEach(it => {
            list.push({
                vod_id: it.vod_id || (this.randomPrefix + it.vod_name),
                vod_name: it.vod_name,
                vod_pic: it.vod_pic.startsWith('http') ? it.vod_pic : it.vod_pic.startsWith('//') ? 'https:' + it.vod_pic : it.vod_pic.startsWith('/') ? getHome(this.api) + it.vod_pic : getHome(this.api) + '/' + it.vod_pic,
                vod_remarks: it.vod_remarks,
            });
        });
        return JSON.stringify({
            list
        });
    },
    detail(vod_id) {
        try {
            let url;
            if (String(vod_id).startsWith(this.randomPrefix)) {
                let wd = String(vod_id).replace(this.randomPrefix, "");
                if (this.type === 1) {
                    let res = JSON.parse(request(this.api + "?wd=" + wd));
                    vod_id = res.data.list[0].vod_id;
                } else {
                    let res = JSON.parse(request(this.api + "/search?text=" + wd));
                    vod_id = (res.list || res.data)[0].vod_id;
                }
            }
            if (this.type === 1) {

                url = this.api + "/detail?vod_id=" + vod_id;
            } else {
                url = this.api + "/video_detail?id=" + vod_id;
            }
            let html = request(url);
            html = JSON.parse(html);
            let node = html.data.vod_info || html.data;
            let VOD = {
                vod_id: node.vod_id,
                vod_name: node.vod_name,
                vod_pic: node.vod_pic,
                type_name: node.vod_class,
                vod_year: node.vod_year,
                vod_area: node.vod_area,
                vod_remarks: node.vod_remarks,
                vod_actor: node.vod_actor,
                vod_director: node.vod_director,
                vod_content: node.vod_content
            };

            let episodes = this.type === 1 ? node.vod_play_list : node.vod_url_with_player;

            if (episodes != '') {
                let playMap = {};
                let parse_apis = new Map();
                let arr = [];
                episodes.forEach(ep => {
                    //log(ep)
                    let from = [];
                    if (this.type === 1) {
                        from = ep.player_info.from || ep.player_info.show || ep.from || ep.show;
                    } else {
                        from = ep.code || ep.name;
                    }
                    if (!playMap.hasOwnProperty(from)) {
                        playMap[from] = [];
                        if (ep.parse_api) {
                            parse_apis.set(lienName.hasOwnProperty(from) ? lienName[from] : from, ep.parse_api)
                        }
                    }

                    if (from != null) playMap[from].push(ep.url)
                });
                if (parse_apis.size > 0) {
                    this.source.parse_apis = Object.fromEntries(parse_apis);
                }

                for (var key in playMap) {
                    if ('bfzym3u8' == key) {
                        arr.push({
                            flag: lienName[key],
                            url: playMap[key],
                            sort: 1
                        })
                    } else if ('1080zyk' == key) {
                        arr.push({
                            flag: lienName[key],
                            url: playMap[key],
                            sort: 2
                        })
                    } else if ('kuaikan' == key) {
                        arr.push({
                            flag: lienName[key],
                            url: playMap[key],
                            sort: 3
                        })
                    } else if ('lzm3u8' == key) {
                        arr.push({
                            flag: lienName[key],
                            url: playMap[key],
                            sort: 4
                        })
                    } else if ('ffm3u8' == key) {
                        arr.push({
                            flag: lienName[key],
                            url: playMap[key],
                            sort: 5
                        })
                    } else if ('snm3u8' == key) {
                        arr.push({
                            flag: lienName[key],
                            url: playMap[key],
                            sort: 6
                        })
                    } else if ('qhm3u8' == key) {
                        arr.push({
                            flag: lienName[key],
                            url: playMap[key],
                            sort: 7
                        })
                    } else {
                        arr.push({
                            flag: lienName[key] ? lienName[key] : key,
                            url: playMap[key],
                            sort: 8
                        })
                    }
                }
                arr.sort((a, b) => a.sort - b.sort);
                let playFrom = [];
                let playList = [];
                arr.map(val => {
                    if (!/undefined/.test(val.flag)) {
                        playFrom.push(val.flag);
                        playList.push(val.url);
                    }
                })
                VOD.vod_play_from = playFrom.join('$$$');
                VOD.vod_play_url = playList.join('$$$');
            } else {
                VOD.vod_play_from = node.vod_play_from;
                VOD.vod_play_url = node.vod_play_url;
            }
            return JSON.stringify({
                list: [VOD]
            });
        } catch (e) {
            log(e.toString());
            return JSON.stringify({
                list: [{}]
            });
        }
    },
    play(flag, input) {
        let parse_apis = this.source.parse_apis || {};
        if (parse_apis.hasOwnProperty(flag)) {
            if (!/\.(m3u8|mp4)/.test(input)) {
                input = parse_apis[flag] + input;
            }
        }
        if (/\.(m3u8|mp4)/.test(input)) {
            return JSON.stringify({
                parse: 0,
                url: input
            });
        } else {
            return JSON.stringify({
                parse: 1,
                url: input
            });
        }
    },
    search(wd, quick, pg) {
        let res;
        let videoList = [];
        let list = [];
        if (this.type === 1) {
            res = JSON.parse(request(this.api + "?wd=" + wd + "&page=" + pg));
            videoList = res.data.list;
        } else {
            res = JSON.parse(request(this.api + "/search?text=" + wd + "&pg=" + pg));
            videoList = res.list || res.data;
        }
        videoList.forEach(it => {
            list.push({
                vod_id: it.vod_id,
                vod_name: it.vod_name,
                vod_pic: it.vod_pic.startsWith('http') ? it.vod_pic : it.vod_pic.startsWith('//') ? 'https:' + it.vod_pic : it.vod_pic.startsWith('/') ? getHome(this.api) + it.vod_pic : getHome(this.api) + '/' + it.vod_pic,
                vod_remarks: it.vod_remarks,
            });
        });
        return JSON.stringify({
            list
        });
    },
    getRule(key) {
        return key ? this.rule[key] : this.rule;
    },
    runMain() {
        return "";
    }
});
$.exports = AppYsV2Adapter;