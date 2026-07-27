const path = "hiker://files/rules/DrpyHiker/parses.json";
const oldpath = "hiker://files/rules/LoyDgIk/parses.json";
let data;

function getJson() {
    if (!fileExist(path) && fileExist(oldpath)) {
        data = JSON.parse(readFile(oldpath) || "[]");
        saveFile(path, JSON.stringify(data));
        //deleteFile(oldpath);
    }
    if (Array.isArray(data)) {
        return data;
    }
    try {
        data = JSON.parse(readFile(path) || "[]");
    } catch (e) {
        deleteFile(path);
        data = [];
    }
    return data;
}

function saveJson(json) {
    saveFile(path, JSON.stringify(json));
}

function getUsefulJson() {
    return getJson().filter(v => !v.forbidden);
}

function getForbiddenJson() {
    return getJson().filter(v => v.forbidden);
}

$.exports = {
    getJson,
    saveJson,
    getUsefulJson,
    getForbiddenJson,
    path,
};