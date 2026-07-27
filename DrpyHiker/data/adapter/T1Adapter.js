function T1Adapter(source) {
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
Object.assign(T1Adapter.prototype, {
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
        let home = JSON.parse(fetch(buildUrl(this.api, {
            ac: "class"
        })));
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
        return fetch(buildUrl(this.api, {
            ac: "videolist",
            t: tid,
            pg: "" + pg
        }));
    },
    detail(vod_url) {
        return fetch(buildUrl(this.api, {
            ac: "detail",
            ids: vod_url,
        }));
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
        return fetch(buildUrl(this.api, {
            wd: wd,
            pg: "" + pg
        }));
    },
    getRule(key) {
        return key ? this.rule[key] : this.rule;
    },
    runMain() {
        return "";
    }
});
$.exports = T1Adapter;