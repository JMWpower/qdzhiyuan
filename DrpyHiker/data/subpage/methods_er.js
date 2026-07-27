js:
const ConfigManager = $.require('./subpage/ConfigManager.js');

const ThemeManager = $.require('./subpage/ThemeManager.js');

let er = ThemeManager.getCurrentTheme().er;

let { substr } = $.require("methods?rule"+MY_RULE.title);

function replaceTags(htmlString, oldTag, newTag) {
  // 创建正则表达式，匹配开头的<oldTag>和</oldTag>标签
  var regExpStart = new RegExp('<' + oldTag + '[^>]*>', 'g');
  var regExpEnd = new RegExp('<\/' + oldTag + '>', 'g');
  // 替换开头的<oldTag>标签为<newTag>标签
  var newHtmlString = htmlString.replace(regExpStart, '<' + newTag + '>');
  // 替换闭合的</oldTag>标签为</newTag>标签
  newHtmlString = newHtmlString.replace(regExpEnd, '</' + newTag + '>');
  return newHtmlString;
}

//风格1：简介
function setDesc1(arr, desc, num) {
  //log(desc)
  if (desc == undefined) {
    return;
  }
  desc = desc.constructor == Array ? desc.join('<br>') : desc;
  if (desc.replace(/(<br>|\s+|<\/?p>|&nbsp;)/g, '').length == 0) {
    return;
  }

  const mark = 'desc';
  num = typeof (num) == 'undefined' ? 100 : num
  desc = desc.startsWith('　　') ? desc : '　　' + desc;
  desc = desc.replace(/'/g, "&#39;");
  desc = desc.replace(/\r\n/g, "<br>");
  desc = desc.replace(/\n/g, "<br>");
  desc = replaceTags(desc, 'p', 'span');
  let sdesc = substr(desc, num);

  var colors = {
    show: "black",
    hide: "grey"
  }

  var lazy = $(`#noLoading#`).b64().lazyRule((dc, sdc, m, cs) => {
    var show = storage0.getItem(m, '0');
    var title = findItem('desc').title;
    var re = /(<\/small><br>.*?>).+/g;
    var exp = '展开:';
    var ret = '收起:';
    if (show == '1') {
      updateItem('desc', {
        title: title
          .replace(ret, exp)
          .replace(re, '$1' + sdc + '</small>')
          .replace(/(<\/small><br>\<font color=").*?(">)/, '$1' + cs.hide + '$2')

      })
      storage0.setItem(m, '0');
    } else {
      updateItem('desc', {
        title: title
          .replace(exp, ret)
          .replace(re, '$1' + dc + '</small>')
          .replace(/(<\/small><br>\<font color=").*?(">)/, '$1' + cs.show + '$2')
      })
      storage0.setItem(m, '1');
    }
    return `hiker://empty`
  }, desc, sdesc, mark, colors)
  var sc = storage0.getItem(mark, '0') == '0' ? '展开:' : '收起:';
  var dc = storage0.getItem(mark, '0') == '0' ? sdesc : desc;
  var cs = storage0.getItem(mark, '0') == '0' ? colors.hide : colors.show;
  arr.push({
    title: '' + '<b><font color="#098AC1">∷剧情简介	</font></b>' + "<small><a style='text-decoration: none;' href='" + lazy + "'>" + sc + '</a></small><br><font color="' + cs + '">' + `${dc}` + '</small>',
    col_type: 'rich_text',
    extra: {
      id: 'desc',
      lineSpacing: 6,
      textSize: 15,
      lineVisible: true,
    }
  })
}
//风格2：简介
function setDesc2(arr, desc) {
  // 如果desc未定义，则直接返回
  if (desc === undefined) return;
  // 确保desc是字符串，如为数组则用<br>连接
  desc = Array.isArray(desc) ? desc.join("<br>") : String(desc);
  // 如果desc去除空白和换行后为空，向d添加空白项并返回
  if (!desc.replace(/(<br>|\s+)/g, "")) {
    arr.push(
      {
        col_type: "big_blank_block"
      },
      {
        col_type: "big_blank_block"
      }
    );
    return;
  }
  const Color = er.线路颜色;
  let emojiReg = /[\uD83C|\uD83D|\uD83E][\uDC00-\uDFFF][\u200D|\uFE0F]|[\uD83C|\uD83D|\uD83E][\uDC00-\uDFFF]|[0-9|*|#]\uFE0F\u20E3|[0-9|#]\u20E3|[\u203C-\u3299]\uFE0F\u200D|[\u203C-\u3299]\uFE0F|[\u2122-\u2B55]|\u303D|[\A9|\AE]\u3030|\uA9|\uAE|\u3030/gi;
  // 规范化desc：替换特定字符，移除表情符号
  let desDesc = desc
    .replace(/s*/g, "")
    .replace(/'|[\r\n]/g, "<br>")
    .replace(/<[^<>]+>|简介：|详情|/g, "")
    .replace(emojiReg, "");
  // 构建并推入描述项至d
  arr.push({
    title: "影片简介",
    desc: `<small><span style="color: ${Color}">展开>></span></small>`,
    img: "http://123.56.105.145/img/jj.svg",
    url: $("#noLoading#").lazyRule(
      (jjid, decid, desText, Color) => {
        const action = getMyVar("jjs", "展开") === "展开" ? "收起" : "展开";
        putMyVar("jjs", action);

        updateItem({
          extra: {
            id: jjid
          },
          desc: `<small><span style="color: ${Color}">${action}>></span></small>`
        });
        updateItem({
          extra: {
            textSize: 14,
            lineSpacing: 3,
            id: decid
          },
          title: `<span style="color:#808080">${action === "收起" ? desText : desText.substr(0, 68) + "..."}</span>`
        });

        return "hiker://empty";
      }, MY_RULE + "_jjid", MY_RULE + "_decid", desDesc, Color
    ),
    col_type: "avatar",
    extra: {
      id: MY_RULE + "_jjid"
    }
  }, {
    title: `<span style="color:#808080">${desDesc.substr(0, 68) + "..."}</span>`,
    col_type: "rich_text",
    extra: {
      textSize: 14,
      lineSpacing: 3,
      id: MY_RULE + "_decid"
    }
  });
}

function setDesc(d, desc, num) {
  switch (er.简介样式) {
    case undefined:
    case "0":
      setDesc1(d, desc, num)
      break;
    case "1":
      setDesc2(d, desc)
      break;
  }
}

function findIcon(keyword, er_ui) {
  let e = typeof er != "undefined" ? er : er_ui;
  // 定义基础域名
  const baseHost = "http://123.56.105.145/";
  // 图标映射对象，键为平台名称，值为图标URL
  const iconMap = {
    腾讯qqTX: `${baseHost}img/qq.svg`,
    优酷youkuYK: `${baseHost}img/yk.svg`,
    爱奇艺iqiyiQY: `${baseHost}img/aqy.svg`,
    哔哩bilibili1: `${baseHost}img/bili.svg`,
    芒果mgtvimgo: `${baseHost}img/mgtv.svg`,
    咪咕miguvideo: `${baseHost}img/mg.svg`,
    西瓜ixiguaxg: `${baseHost}img/xg.svg`,
    搜狐sohuSH: `${baseHost}img/sh.svg`,
    乐视letvleshilevp: `${baseHost}img/le.svg`,
    风行FX: `${baseHost}img/fx.svg`,
    PPTV: `${baseHost}img/pptv.svg`,
    CNTV: `${baseHost}img/cntv.svg`,
    电影网m1905: `${baseHost}img/1905.svg`,
    抖音douyin: `${baseHost}img/douyin.svg`,
    default: e.icons.视频
  };

  const cleanedKeyword = keyword.replace(/\s+/g, "").replace(/视频$/, "").replace(/TV$/, "").trim().toLowerCase();
  // 尝试原始关键词匹配
  let matchedKey = Object.keys(iconMap).find(key => new RegExp(cleanedKeyword, "i").test(key));
  // 若未找到匹配，尝试连续字符匹配，确保不会误匹配到其他键的片段
  if (!matchedKey && cleanedKeyword.length > 1) {
    for (let i = cleanedKeyword.length; i > 0; i--) {
      // 从最长子串开始尝试
      for (let j = 0; j <= cleanedKeyword.length - i; j++) {
        const subKeyword = cleanedKeyword.substring(j, j + i);
        // 确保子串不是其他键的组成部分
        const isUniqueMatch = !Object.keys(iconMap).some(otherKey => otherKey !== subKeyword && otherKey.toLowerCase()
          .includes(subKeyword) && !new RegExp(`^${subKeyword}\\w+`).test(otherKey));
        if (isUniqueMatch) {
          matchedKey = subKeyword;
          break;
        }
      }
      if (matchedKey) break;
    }
    matchedKey = matchedKey ? Object.keys(iconMap).find(key => key.includes(matchedKey)) : null;
  }
  return matchedKey ? iconMap[matchedKey] : iconMap.default;
}

$.exports = {
  findIcon,
  setDesc,
}