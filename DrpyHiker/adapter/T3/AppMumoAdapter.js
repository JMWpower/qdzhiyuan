/**
传参 Appmuou[模板]@?type=url&params=../json/App模板配置.json$顾我@顾我追剧

csp_HBmoou
csp_AppMuou
*/

const CryptoUtil = $.require("hiker://assets/crypto-java.js");

function AppMuouAdapter(source) {
    this.source = source;
    this.api = source.api;

    this.rule = {
        name: source.name,
        host: source.api,
        一级: "true",
        推荐: "true",
        类型: "影视",
        //模板: "自动"
    };
    this.headers = {
        "user-agent": "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 MUOUAPP/10.8.4506.400",
        "brand-model": "22041216C",
        "app-device": "DeT3Mr5/V+BAz7f+sWKNbxBmh4nMU0VtPYWTXjUUWl4SHrYkNPP/C8/RVvJkD5zOref+Cb+MDuBut1ETgOrGnw==",
        "app-time": "1749291895",
        "sys-version": "14",
        "device": "578545e5f04dd2c5",
        "os": "Android",
        "content-type": "application/x-www-form-urlencoded",
        "app-version": "4.2.0"
    };
    this.appConfig = source.ext;
    this.from = {};
    this.host = this.appConfig.host;

}
Object.assign(AppMuouAdapter.prototype, {
    init() {
        if (this.appConfig.username && this.appConfig.password) {
            try {
                let data = post(`${this.host}/${this.API[this.muban].appLogin}`, {
                    headers: this.headers,
                    body: `password=${this.appConfig.password}&code=&device_id=&user_name=${this.appConfig.username}&invite_code=&key=&is_emulator=0`
                });
                let userInfo = JSON.parse(this.decrypt(JSON.parse(data).data)).user;
                this.headers['app-user-token'] = userInfo.auth_token;
                console.log('token已更新：' + userInfo.auth_token);
            } catch (e) {
                console.log(e);
            }
        }
        //this.cacheClass=null;
    },
    getHomeData() {
        if (this.cacheClass) return this.cacheClass;
        let types_data = request(`${this.host}/api.php/v1.vod/types`, {
            headers: this.headers
        });
        let typelist = JSON.parse(this.decrypt(types_data)).data.typelist;
        let classes = [];
        let filterObj = {};
        typelist.forEach((it, i) => {
            classes.push({
                type_name: it.type_name,
                type_id: it.type_id
            });
            filterObj[it.type_id] = Object.keys(it.type_extend).map((key) => {
                if (!['state', 'star', 'director'].includes(key)) {
                    if (!it.type_extend[key]) {
                        return null;
                    }
                    return {
                        key: key,
                        name: key,
                        value: it.type_extend[key].split(',').map((item) => {
                            return {
                                n: item,
                                v: item
                            }
                        })
                    }
                }
            }).filter(it => it != null).concat({
                key: "by",
                name: "by",
                value: [{
                    n: "按更新",
                    v: "time"
                }, {
                    n: "按播放",
                    v: "hits"
                }, {
                    n: "按评分",
                    v: "score"
                }]
            });
        });

        let home = {
            class: classes,
            filters: filterObj,
            list: []
        };

        this.cacheClass = home;

        return home;
    },
    homeVod() {
        let data = this.getHomeData();
        return JSON.stringify({
            list: data.list || []
        });
    },
    home() {
        return JSON.stringify(this.getHomeData());
    },
    category(tid, pg, filter, extend) {
        let data = fetch(buildUrl(`${this.host}/api.php/v1.vod`, {
            "type": tid,
            "class": filter.class || "",
            "area": filter.area || "",
            "year": filter.year || "",
            "by": filter.by || "",
            "lang": filter.lang || "",
            "version": filter.version || "",
            "page": pg,
            "limit": "18"
        }), {
            headers: this.headers,
        });

        let list = JSON.parse(this.decrypt(data)).data.list;

        //log(list)
        return JSON.stringify({
            list
        });
    },
    detail(vod_url) {

        let data = request(`${this.host}/api.php/v1.vod/detail?vod_id=` + vod_url, {
            headers: this.headers
        });
        let detail = JSON.parse(this.decrypt(data)).data;
        let vod = {
            vod_id: detail.vod_id,
            vod_pic: detail.vod_pic,
            vod_name: detail.vod_name,
            type_name: detail.vod_class,
            vod_remarks: detail.vod_remarks,
            vod_year: detail.vod_year,
            vod_area: detail.vod_area,
            vod_director: detail.vod_director,
            vod_actor: detail.vod_actor,
            vod_content: detail.vod_content
        };
        try {
            let playform = [];
            let playurls = [];
            let playlist = detail.vod_play_list;
            if (playlist && playlist.length != 0) {
                Object.keys(playlist).map((key) => {
                    this.from[playlist[key].player_info.show] = playlist[key].player_info.from;
                    playform.push(playlist[key].player_info.show);
                    playurls.push(Object.keys(playlist[key].urls).map((it) => {
                        return `${playlist[key].urls[it].name}$${playlist[key].urls[it].url}`;
                    }).join("#"));
                });
                vod.vod_play_from = playform.join("$$$");
                vod.vod_play_url = playurls.join("$$$");
            } else {
                vod.vod_play_from = '暂无资源';
                vod.vod_play_url = '暂无资源$0';
            }
        } catch (e) {
            vod.vod_play_from = '暂无资源';
            vod.vod_play_url = '暂无资源$0';
        }
        return JSON.stringify({
            list: [vod]
        });
    },
    play(flag, input) {
        console.log('解析类型>>>' + this.from[flag]);
        try {
            let playerinfo = post(`${this.appConfig.jxhost}/api.php?action=playerinfo`, {
                headers: this.headers
            });
            let data = JSON.parse(this.decrypt(playerinfo)).data;
            // let playerua = data.playerua;
            let parseInfo = data.playerinfo.find(it => it.playername == this.from[flag]);
            if (parseInfo) {
                let playerjiekou = parseInfo.playerjiekou;
                let parseurl = playerjiekou + input;
                let parsedata = request(parseurl, {
                    timeout: 10000
                });
                let parsejson = JSON.parse(parsedata);
                if (parsejson.url) {
                    input = parsejson.url;
                } else {
                    console.log(parsejson.msg + '，即将尝试嗅探播放');
                }
            } else {
                let parsevod = request(`${this.appConfig.jxhost}/json.php?url=${input}&playerkey=${this.from[flag]}`, {
                    headers: this.headers
                });
                if (parsevod) {
                    let data = JSON.parse(this.decrypt(parsevod));
                    input = data.url;
                }
            }
        } catch (e) {}
        if (!/m3u8|mp4|mkv/.test(input)) {
            if (isofficial(input)) {
                return JSON.stringify({
                    parse: 1,
                    jx: 1,
                    url: input
                });
            }
            input = input + '&type=m3u8';
        }
        return JSON.stringify({
            parse: 0,
            url: input
        });

    },
    search(wd, quick, pg) {
        let data = fetch(buildUrl(`${this.host}/api.php/v1.vod`, {
            wd: wd,
            page: "" + pg,
            limit: "18"
        }));
        let listdata = JSON.parse(this.decrypt(JSON.parse(data).data));
        let list=listdata.search_list||listdata.list;
        return JSON.stringify({
            list
        });
    },
    getRule(key) {
        return key ? this.rule[key] : this.rule;
    },
    runMain() {
        return "";
    },

    encrypt(data) {

        return CryptoUtil.AES.encrypt(data, CryptoUtil.Data.parseUTF8(this.appConfig.key), {
            mode: "AES/CBC/PKCS7Padding",
            iv: CryptoUtil.Data.parseUTF8(this.appConfig.iv)
        }).toBase64(_base64.NO_WRAP);
    },
    decrypt(data) {
        try {
            return CryptoUtil.AES.decrypt(data, CryptoUtil.Data.parseUTF8(this.appConfig.key), {
                mode: "AES/CBC/PKCS7Padding",
                iv: CryptoUtil.Data.parseUTF8(this.appConfig.iv)
            }).toString();
        } catch (e) {
            if (typeof data === 'string') {
                return data;
            } else if (typeof data === 'object') {
                return JSON.stringify(data);
            }
        }
    }
});
$.exports = AppMuouAdapter;

function isofficial(url) {
    let flag = new RegExp('qq\.com|iqiyi\.com|youku\.com|mgtv\.com|bilibili\.com|sohu\.com|ixigua\.com|pptv\.com|miguvideo\.com|le\.com|1905\.com|fun\.tv');
    return flag.test(url) && !/url=/.test(url);
}

function ungzip(data) {
    let GZIP = $.require("GZIP");
    return GZIP.unzip(data);
}