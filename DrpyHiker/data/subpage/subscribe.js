js:
function generateConfigByGithub(url, path) {
    let rope = url.split("/").slice(3, 5).join("/");
    let html = fetch(url);
    
    let jsonText = pdfh(html, "#repo-content-pjax-container&&script&&Html");
    
    let json = JSON.parse(jsonText);
    let list = json.payload.tree.items;
    let rules = [];
    let count = 0;
    let names = [];
    if (list.length === 0) return "toast://可能删库了";
    for (let it of list) {
        try {
            let name = it.name;
            let spath = it.path;
            if (!name.endsWith(".js")) continue;
            name = name.slice(0, name.lastIndexOf("."));
            let rule = fetch(`https://raw.gitmirror.com/${rope}/master/${spath}`);
            if (!((!rule || !rule.includes("rule")) && !fileExist(path + it.name))) {
                writeFile(path + it.name, rule);
                rules.push({
                    'key': `hipy_js_${name}`,
                    'name': `${name}`,
                    'type': 3,
                    'api': '../libs/drpy2.js',
                    'searchable': 1,
                    'quickSearch': 1,
                    'filterable': 1,
                    'ext': "./" + it.name,
                });
                count++;
            }
            
        } catch (e) {
            log(e.toString());
        }
        names.push(it.name);
    }
    deletelose(names, path)
    writeFile(path + "index.json", JSON.stringify({
        sites: rules
    }));

    return "toast://成功更新" + count + "个";;
}

function deletelose(names, path) {
    try {
        let pathFile = new java.io.File(path);
        if (!pathFile.isDirectory()) return;
        for (let file of pathFile.listFiles()) {
            let name = String(file.getName());
            if (!name.endsWith(".js") || names.includes(name)) continue;
            deleteFile(file.getPath());
        }
    } catch (e) {
        toast("清理失效源失败:" + e.toString());
    }
}

function generateConfigByIndex(url, path) {
    let json = JSON.parse(toCorrectJSONString(request(url)));
    let arr = json.sites;
    let count = 0;
    let i = 0;
    let names = [];
    for (let it of arr) {
        try {
            if ((String(it.api).includes("drpy2.min.js") || String(it.api).includes("drpy2.js"))) {
                let name = it.ext.endsWith(".js") ? decodeURIComponent(it.ext.split("/").at(-1)) : (it.name + ".js");
                let rule;
                if (String(it.ext).startsWith("http")) {
                    rule = request(it.ext);
                } else {
                    rule = request(joinUrl(url, it.ext));
                }
                it.ext = "./" + name;
                if (!rule || !rule.includes("rule")) {
                    if (!fileExist(path + name))
                        arr.splice(i, 1);
                    continue;
                };
                writeFile(path + name, rule);
                names.push(name);
                count++;
            }
        } catch (e) {
            log(e.toString());
        }
        i++;
    }
    deletelose(names, path);
    writeFile(path + "index.json", JSON.stringify(json));
    return "toast://成功更新" + count + "个";
}
$.exports.parseUrl = function (url, path) {
    path = base64Decode(path);
    path = path.endsWith("/") ? path : path + "/";
    try {
        if (url.startsWith("https://github.com/hjdhnx/")) {
            return generateConfigByGithub(url, path);
        } else {
            return generateConfigByIndex(url, path);
        }
    } catch (e) {
        log(e.toString());
        return "error:" + e.toString();
    }
};