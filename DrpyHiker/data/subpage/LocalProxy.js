function proxy() {
    function parseVideo(MY_PARAMS, title) {
        function toPath(value) {
            if (typeof value !== 'string') {
                return [];
            }
            let path = [];
            let current = '';
            let inBrackets = false;
            let escape = false;
            for (let i = 0; i < value.length; i++) {
                let char = value[i];
                if (escape) {
                    current += char;
                    escape = false;
                } else if (char === '\\') {
                    escape = true;
                } else if (char === '.' && !inBrackets) {
                    path.push(current);
                    current = '';
                } else if (char === '[') {
                    inBrackets = true;
                } else if (char === ']') {
                    inBrackets = false;
                } else {
                    current += char;
                }
            }
            if (current) {
                path.push(current);
            }
            return path;
        }

        function getJson(obj, path) {
            if (!obj || !Array.isArray(path)) {
                return undefined;
            }
            if (path.length === 0) {
                return obj;
            }
            let current = obj;
            for (let i = 0; i < path.length; i++) {
                let key = path[i];
                if (current === null || current === undefined || typeof current !== 'object') {
                    return undefined;
                }
                current = current[key];
            }
            return current;
        }
        try {
            let runType = MY_PARAMS.runType[0];
            let url = decodeURIComponent(base64Decode(MY_PARAMS.url[0]));
            if (runType == "JSON") {

                let param = JSON.parse(decodeURIComponent(base64Decode(MY_PARAMS.param[0])));
                let json = JSON.parse(request(url, {
                    headers: param.headers || {},
                    method: param.method || void 0
                }));
                return JSON.stringify({
                    statusCode: 302,
                    headers: Object.assign({}, param.headers || {}, {
                        "Location": getJson(json, toPath(param.jsonPath)),
                    })
                });
            } else if (runType == "JS") {

                let parse;
                if (MY_PARAMS.index) {
                    parse = $.require("configs?rule=" + title).getJson()[MY_PARAMS.index[0]];
                } else {
                    parse = JSON.parse(base64Decode(decodeURIComponent(MY_PARAMS.param[0])));
                }
                let res = new Function("url", "self", parse.js)(url, parse);
                if (typeof res === "string") {
                    return JSON.stringify({
                        statusCode: 302,
                        headers: {
                            "Location": res
                        }
                    });
                } else if ($.type(res) === "object") {
                    return JSON.stringify({
                        statusCode: 302,
                        headers: res
                    });
                }
            }
        } catch (e) {
            log(e.toString());
        }
    }

    function doJs(MY_PARAMS, title, gkey) {
        let {
            GM
        } = $.require("hiker://files/data/DrpyHiker/libs/GlobalVarV3.js");
        GM.setSelfKey(gkey);
        let DrpyManage = GM.defineModule("DrpyManage", "DrpyManage?rule=" + title);
        let drpy = DrpyManage.get(decodeURIComponent(MY_PARAMS.hikerSkey[0]));
        let params = {};
        for (let key in MY_PARAMS) {
            params[key] = decodeURIComponent(String(MY_PARAMS[key][0]));
        }
        
        
        //let result = drpy.proxy(params);
        let result = DrpyManage.runProxy(drpy, [params]);
       
        let [code, media_type, data, headers, isReturnBytes] = result;
        
        headers = Object.assign({}, {
            'Content-Type': media_type,
        }, headers);
        if(typeof data==="string"&&data.startsWith("data:")&&data.includes("base64,")){
            data = data.split("base64,")[1];
            const CryptoUtil = $.require("hiker://assets/crypto-java.js");
            data = CryptoUtil.Data.parseBase64(data).toBytes();
        }
        
        return {
            statusCode: code,
            body: data,
            headers: headers,
        };
    }
    function pushUrl(MY_PARAMS, title, gkey){
        
        let {
            GM
        } = $.require("hiker://files/data/DrpyHiker/libs/GlobalVarV3.js");
        GM.setSelfKey(gkey);
        let DrpyManage = GM.defineModule("DrpyManage", "DrpyManage?rule=" + title);
        let drpy = DrpyManage.get(decodeURIComponent(MY_PARAMS.hikerSkey[0]));
        let params = {};
        for (let key in MY_PARAMS) {
            params[key] = String(MY_PARAMS[key][0]);
        }
        
        return drpy.play(params.flag, params.play);
    }
    function entrance(MY_PARAMS, title, gkey) {
        log(MY_PARAMS);
        if (MY_PARAMS.do && MY_PARAMS.do[0] === "js") {
            try {
                return doJs(MY_PARAMS, title, gkey);
            } catch (e) {
                log(e.toString());
                return;
            }
        } else if(MY_PARAMS.do && MY_PARAMS.do[0] === "pushUrl"){
            try {
                return pushUrl(MY_PARAMS, title, gkey);
            } catch (e) {
                log(e.toString());
                return MY_PARAMS.play&&MY_PARAMS.play[0]||"";
            }
        } else {
            return parseVideo(MY_PARAMS, title);
        }
    }
    this.entrance = entrance;
}

function startProxy(title, gkey) {
    return startProxyServer($.toString((proxy, title, gkey) => {
        return new proxy().entrance(MY_PARAMS, title, gkey);
    }, proxy, title, gkey));
}
$.exports.startProxy = startProxy;