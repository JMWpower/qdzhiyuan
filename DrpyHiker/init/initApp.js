
let $resolve = $.require.resolve;
$.require.resolve = function(path) {

    if (path.startsWith("../") || path.startsWith("./")) {
    
        return joinUrl("file:///files/data/" + (MY_RULE._title||MY_RULE.title) + "/", path).replace("file:///", "hiker://");
    } else {
        return $resolve(path)
    }
}
Object.defineProperty($.hiker, "console", {
    writable: false,
    value: GM.defineModule("console", "./init/initConsole.js")
});
