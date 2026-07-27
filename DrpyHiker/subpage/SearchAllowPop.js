js:
$.exports.show = function () {
  const runtimeConfig = GM.defineModule("runtimeConfig", "runtimeConfig");
  const hikerPop = $.require("hiker://files/data/DrpyHiker/libs/hikerPop.js");
  let searchAllow = runtimeConfig.getSearchAllow();

  let canSearchSource = runtimeConfig.getCanSearchSource();
  //let sourceNameList = canSearchSource.map(v=>v.name);
  let getNames = () => dynamicSource.map(v => searchAllow.includes(v.key) ? "““””" + (v.name + "").fontcolor("#009966") : v.name);
  let spen = 3;

  //let dynamicNames = sourceNameList.slice();
  let dynamicSource = canSearchSource.slice();
  let searchoncount = dynamicSource.filter(v => searchAllow.includes(v.key)).length;
  if (searchoncount == 0) {
    searchoncount = canSearchSource.length;
  }

  function popTitle(input) {
    let list = input?input:searchoncount;
    return "启用搜索源:" + list + "个 共:" + canSearchSource.length + "个搜索源"
  }

  let searchKey = "";
  let inputBox;
  hikerPop.selectBottomRes({
    options: getNames(),
    columns: spen,
    title: popTitle(),
    noAutoDismiss: true,
    position: 1,
    height: .9,
    extraInputBox: (inputBox = new hikerPop.ResExtraInputBox({
      hint: "源关键字 多个用|隔开",
      title: "TAG",
      onChange(text, manage) {
        //log("onChange:"+text)
        searchKey = text;
        manage.list.length = 0;
        dynamicSource.length = 0;
        if (text) {
          canSearchSource.forEach((v, i) => {
            if (text.split(/\|/).filter(f => f).some(x => v.name.includes(x))) {
              dynamicSource.push(v);
              manage.list.push(searchAllow.includes(v.key) ? "““””" + (v.name + "").fontcolor("#009966") : v.name)
            }
          });
        } else {
          dynamicSource = canSearchSource.slice();
          Object.assign(manage.list, getNames());

        }
        manage.change();
      },
      defaultValue: "",
      click(s, manage) {
        let tagClasses = runtimeConfig.getTagClasses();
        if (!tagClasses.length) return "toast://当前配置没有TAG哦。";
        hikerPop.selectCenter({
          options: tagClasses,
          columns: 3,
          title: "TAG[" + tagClasses.length + "]",
          click(a) {
            inputBox.setDefaultValue("[" + a + "]");
          }
        });
      },
      titleVisible: true
    })),
    click(s, i, manage) {
      let key = dynamicSource[i].key;
      let index = -1;
      if ((index = searchAllow.indexOf(key)) !== -1) {
        manage.list[i] = dynamicSource[i].name;
        searchAllow.splice(index, 1);
      } else {
        manage.list[i] = "““””" + (dynamicSource[i].name + "").fontcolor("#009966");
        searchAllow.push(key);
      }
      manage.setTitle(popTitle(searchAllow.length));
      runtimeConfig.setSearchAllow();
      manage.change();
    },
    menuClick(manage) {
      hikerPop.selectCenter({
        options: ["改变样式", "筛选源", "自然排序", "倒序", "全选", "反选"],
        columns: 2,
        title: "请选择",
        click(s, i) {
          if (i === 0) {
            spen = spen == 3 ? 1 : (spen == 2 ? 3 : 2);
            manage.changeColumns(spen);
          } else if (i === 1) {
            hikerPop.inputConfirm({
              content: "输入关键字 空显示全部",
              title: "筛选源",
              hint: "源关键字 多个用|隔开",
              defaultValue: searchKey,
              textarea: false, //多行模式
              maxTextarea: true,
              noAutoSoft: false,
              //hideCancel: true,
              confirm(text) {
                searchKey = text;
                manage.list.length = 0;
                dynamicSource.length = 0;
                if (text) {
                  canSearchSource.forEach((v, i) => {
                    if (text.split(/\|/).filter(f => f).some(x => v.name.includes(x))) {
                      dynamicSource.push(v);
                      manage.list.push(searchAllow.includes(v.key) ? "““””" + (v.name + "").fontcolor("#009966") : v.name)
                    }
                  });
                } else {
                  dynamicSource = canSearchSource.slice();
                  Object.assign(manage.list, getNames());

                }
                manage.change();
                //return "toast://输入了" + text;
              },

            });
          } else if (i === 2) {
            let list = Object.assign([], manage.list);
            manage.list.length = 0;

            dynamicSource.sort((a, b) => {
              return String(a.name).localeCompare(String(b.name), undefined, {
                numeric: true,
                sensitivity: 'base'
              });
            });
            Object.assign(manage.list, getNames());
            manage.change();
          } else if (i == 3) {
            manage.list.reverse();
            dynamicSource.reverse();
            manage.change();
          } else if (i == 4) {
            dynamicSource.forEach(v => {
              if (!searchAllow.includes(v.key)) {
                searchAllow.push(v.key);
              }
            });
            manage.setTitle(popTitle(searchAllow.length));
            Object.assign(manage.list, getNames());
            runtimeConfig.setSearchAllow();
            manage.change();
          } else if (i == 5) {
            let temlist = searchAllow.slice();
            searchAllow.length = 0;
            dynamicSource.forEach(v => {
              if (temlist.includes(v.key)) return;
              searchAllow.push(v.key);
            });
            manage.setTitle(popTitle(searchAllow.length));
            Object.assign(manage.list, getNames());
            runtimeConfig.setSearchAllow();
            manage.change();
          }
        },
      });
    }
  });
}