js:
var d = [];
setPageTitle("子页面管理[" + MY_RULE.pageList.length + "]");
let pageList = MY_RULE.pageList.filter(page => !page.name.match(/子页面管理/));
for (let page of pageList) {
  d.push({
    title: '[' + page.path + ']' + page.name,
    col_type: 'text_1',
    url: $('#noLoading#').lazyRule((p) => {
      let path = p.rule.match(/(?!requ[eirst]+\()".*?(.*js)"/g)[0];
      path = eval(path);
      if (!fileExist(path)) {
        writeFile(path, "");
      }
      return "editFile://" + path;
    }, page),
    extra: {

    }
  })
}

setResult(d);