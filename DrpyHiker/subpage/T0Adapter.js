function T0Adapter(source) {
    this.source = source;
    this.api = source.api;
    this.categoryfilter = source.categories;
    this.rule = {
        name: source.name,
        host: source.api,
        一级: "true",
        推荐: "true",
        类型: "影视",
        //模板: "自动"
    };
    this.cacheClass = null;
}
Object.assign(T0Adapter.prototype, {
    init() {
        this.cacheClass = null;
        let data = this.getHomeData();
        if (!Array.isArray(data.list) || !data.list.length) {
            delete this.rule.推荐;
            data.list = [];
        }
    },
    getHomeData() {
        if (this.cacheClass) return this.cacheClass;
        let xml = fetch(buildUrl(this.api, {
            ac: "class"
        })).replace(/\<.*?xml.*?\>/, "");
        let home = {
            list: [],
            class: []
        };
        let homeXml = new XML(xml);
        for each(let item in homeXml.list.video) {
            home.list.push({
                vod_id: item.id.toString(),
                vod_name: item.name.toString(),
                vod_time: item.last.toString(),
                type_id: item.tid.toString(),
                vod_remarks: item.note.toString()
            });
        }
        for each(let item in homeXml.class.ty) {
            home.class.push({
                type_id: item.@id,
                type_name: item.toString(),
            });
        }
        if (Array.isArray(home.class) && Array.isArray(this.categoryfilter)) {
            home.class = home.class.filter(v => this.categoryfilter.includes(v.type_name))
        }

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
        let xml = fetch(buildUrl(this.api, {
            ac: "videolist",
            t: tid,
            pg: "" + pg
        })).replace(/\<.*?xml.*?\>/, "");
        let homeXml = new XML(xml);
        let list = [];
        for each(let item in homeXml.list.video) {
            list.push({
                vod_id: item.id.toString(),
                vod_name: item.name.toString(),
                vod_time: item.last.toString(),
                vod_pic: item.pic.toString(),
                vod_remarks: item.note.toString()
            });
        }
        return JSON.stringify({
            list
        });
    },
    detail(vod_url) {
        let xml = fetch(buildUrl(this.api, {
            ac: "detail",
            ids: vod_url,
        })).replace(/\<.*?xml.*?\>/, "");
        let homeXml = new XML(xml);
        let list = [];
        for each(let item in homeXml.list.video) {
            let resitem = {
                vod_id: item.id.toString(),
                vod_name: item.name.toString(),
                vod_time: item.last.toString(),
                vod_pic: item.pic.toString(),
                vod_remarks: item.note.toString(),
                vod_content: item.des.toString(),
                vod_actor: item.actor.toString(),
                vod_director: item.director.toString(),
            };
            let from = [];
            let play = [];
            for each(let playListItem in item.dl.dd) {
                from.push(playListItem.@flag);
                play.push(playListItem.toString());
            }
            resitem.vod_play_from = from.join("$$$");
            resitem.vod_play_url = play.join("$$$");
            list.push(resitem);
        }
        return JSON.stringify({
            list
        });
    },
    play(flag, input) {
        let parse_url = this.source.playurl || "";
        if (/\.(m3u8|mp4)/.test(input)) {
            return JSON.stringify({
                parse: 0,
                url: input
            });
        } else {
            if (parse_url.startsWith('json:')) {
                let purl = parse_url.replace('json:', '') + input;
                let html = request(purl);
                try {
                    return JSON.stringify({
                        parse: 0,
                        url: JSON.parse(html).url
                    });
                } catch (e) {
                    return JSON.stringify({
                        parse: 1,
                        url: input
                    });
                }
            } else {
                return JSON.stringify({
                    parse: 1,
                    url: parse_url + input
                });
            }
        }
    },
    search(wd, quick, pg) {
        let xml = fetch(buildUrl(this.api, {
            wd: wd,
            pg: "" + pg
        })).replace(/\<.*?xml.*?\>/, "");
        let homeXml = new XML(xml);
        let list = [];
        for each(let item in homeXml.list.video) {
            list.push({
                vod_id: item.id.toString(),
                vod_name: item.name.toString(),
                vod_time: item.last.toString(),
                vod_pic: item.pic.toString(),
                vod_remarks: item.note.toString()
            });
        }
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
$.exports = T0Adapter;