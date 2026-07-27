/**
 * 轻量级 HTML 解析器 v2
 * 不依赖 cheerio，使用纯正则表达式实现
 * 用于解决 flutter_js 环境中 cheerio 不工作的问题
 * 
 * 支持的选择器语法：
 * - 标签名: div, p, a, img
 * - 类选择器: .class-name
 * - ID选择器: #id-name
 * - 属性选择器: [attr], [attr=value]
 * - 组合选择器: div.class, div#id, img:last-of-type
 * - 后代选择器: div p (空格分隔)
 * - 伪选择器: :eq(n), :first, :last, :eq(-1), :last-of-type, :first-of-type
 * - :has(selector) - 匹配包含指定子元素的元素
 * - :contains(text) - 匹配包含指定文本的元素
 * - 排除语法: p--a (获取p标签内容但排除a标签)
 * - 海阔视界语法: && 分隔, Text, Html
 */

(function(global) {
  'use strict';

  // 常量
  var URLJOIN_ATTR = /(url|src|href|-original|-src|-play|-url|style)$|^(data-|url-|src-)/;
  var SPECIAL_URL = /^(ftp|magnet|thunder|ws):/;
  var SELF_CLOSING_TAGS = /^(img|br|hr|input|meta|link|area|base|col|embed|param|source|track|wbr)$/i;

  /**
   * HTML 元素类
   */
  function HtmlElement(tagName, attributes, innerHTML, outerHTML) {
    this.tagName = (tagName || '').toLowerCase();
    this.attributes = attributes || {};
    this.innerHTML = innerHTML || '';
    this.outerHTML = outerHTML || '';
  }

  HtmlElement.prototype.attr = function(name) {
    if (!name) return '';
    var lowerName = name.toLowerCase();
    return this.attributes[name] || this.attributes[lowerName] || '';
  };

  HtmlElement.prototype.text = function() {
    return this.innerHTML
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, function(m, c) { return String.fromCharCode(c); })
      .replace(/\s+/g, ' ')
      .trim();
  };

  HtmlElement.prototype.html = function() {
    return this.innerHTML;
  };

  /**
   * 解析 HTML 标签的属性
   */
  function parseAttributes(attrString) {
    var attrs = {};
    if (!attrString) return attrs;
    
    var attrRegex = /([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    var match;
    
    while ((match = attrRegex.exec(attrString)) !== null) {
      var name = match[1].toLowerCase();
      var value = match[2] !== undefined ? match[2] : 
                  match[3] !== undefined ? match[3] : 
                  match[4] !== undefined ? match[4] : '';
      attrs[name] = value;
    }
    
    return attrs;
  }

  /**
   * 解析选择器，提取标签名、类名、ID、属性和伪选择器
   */
  function parseSelector(selector) {
    var result = {
      tagName: null,
      classNames: [],
      idName: null,
      attrs: {},
      pseudo: null,
      pseudoArg: null,
      hasSelector: null  // :has() 选择器的参数
    };
    
    if (!selector) return result;
    selector = selector.trim();
    
    // 解析 :has() 伪选择器 - 必须在其他伪选择器之前处理
    var hasMatch = selector.match(/:has\(([^)]+)\)/);
    if (hasMatch) {
      result.hasSelector = hasMatch[1].trim();
      selector = selector.replace(/:has\([^)]+\)/, '');
    }
    
    // 解析 :contains() 伪选择器
    var containsMatch = selector.match(/:contains\(([^)]+)\)/);
    if (containsMatch) {
      result.pseudo = 'contains';
      result.pseudoArg = containsMatch[1].replace(/^['"]|['"]$/g, '');
      selector = selector.replace(/:contains\([^)]+\)/, '');
    }
    
    // 解析伪选择器 :eq(n), :first, :last, :last-of-type, :first-of-type, :lt(n), :gt(n)
    var pseudoMatch = selector.match(/:(\w+(?:-\w+)*)(?:\((-?\d+)\))?$/);
    if (pseudoMatch && !result.pseudo) {
      result.pseudo = pseudoMatch[1];
      result.pseudoArg = pseudoMatch[2] !== undefined ? parseInt(pseudoMatch[2]) : null;
      selector = selector.replace(/:[\w-]+(?:\(-?\d+\))?$/, '');
    }
    
    // 解析属性选择器 [attr], [attr=value], [attr*=value], [attr^=value], [attr$=value]
    // 支持的匹配模式：
    // [attr] - 存在属性
    // [attr=value] - 精确匹配
    // [attr*=value] - 包含匹配
    // [attr^=value] - 开头匹配
    // [attr$=value] - 结尾匹配
    // [attr~=value] - 空格分隔的词匹配
    var attrRegex = /\[([\w-]+)(?:([*^$~]?)=["']?([^"'\]]+)["']?)?\]/g;
    var attrMatch;
    while ((attrMatch = attrRegex.exec(selector)) !== null) {
      var attrName = attrMatch[1].toLowerCase();
      var matchMode = attrMatch[2] || ''; // '', '*', '^', '$', '~'
      var attrValue = attrMatch[3];
      
      if (attrValue === undefined) {
        // [attr] - 只检查属性存在
        result.attrs[attrName] = { mode: 'exists', value: true };
      } else {
        result.attrs[attrName] = { mode: matchMode || 'exact', value: attrValue };
      }
    }
    selector = selector.replace(/\[[\w-]+(?:[*^$~]?=["']?[^"'\]]+["']?)?\]/g, '');
    
    // 解析 #id
    var idMatch = selector.match(/#([\w-]+)/);
    if (idMatch) {
      result.idName = idMatch[1];
      selector = selector.replace(/#[\w-]+/, '');
    }
    
    // 解析 .class (可能有多个)
    var classRegex = /\.([\w-]+)/g;
    var classMatch;
    while ((classMatch = classRegex.exec(selector)) !== null) {
      result.classNames.push(classMatch[1]);
    }
    selector = selector.replace(/\.[\w-]+/g, '');
    
    // 剩余的是标签名
    selector = selector.trim();
    if (selector && selector !== '*') {
      result.tagName = selector.toLowerCase();
    }
    
    return result;
  }

  /**
   * 检查元素是否匹配选择器条件
   */
  function matchesSelector(element, selectorInfo) {
    // 检查标签名
    if (selectorInfo.tagName && element.tagName !== selectorInfo.tagName) {
      return false;
    }
    
    // 检查 ID
    if (selectorInfo.idName && element.attributes.id !== selectorInfo.idName) {
      return false;
    }
    
    // 检查类名
    if (selectorInfo.classNames.length > 0) {
      var elementClasses = (element.attributes.class || '').split(/\s+/);
      for (var i = 0; i < selectorInfo.classNames.length; i++) {
        if (elementClasses.indexOf(selectorInfo.classNames[i]) === -1) {
          return false;
        }
      }
    }
    
    // 检查属性
    for (var attrKey in selectorInfo.attrs) {
      var attrVal = element.attributes[attrKey];
      var attrRule = selectorInfo.attrs[attrKey];
      
      // 兼容旧格式（直接是值或 true）
      if (typeof attrRule !== 'object') {
        attrRule = { mode: attrRule === true ? 'exists' : 'exact', value: attrRule };
      }
      
      if (attrVal === undefined) return false;
      
      switch (attrRule.mode) {
        case 'exists':
          // [attr] - 只检查属性存在，已经通过上面的 undefined 检查
          break;
        case 'exact':
        case '':
          // [attr=value] - 精确匹配
          if (attrVal !== attrRule.value) return false;
          break;
        case '*':
          // [attr*=value] - 包含匹配
          if (attrVal.indexOf(attrRule.value) === -1) return false;
          break;
        case '^':
          // [attr^=value] - 开头匹配
          if (attrVal.indexOf(attrRule.value) !== 0) return false;
          break;
        case '$':
          // [attr$=value] - 结尾匹配
          if (attrVal.indexOf(attrRule.value) !== attrVal.length - attrRule.value.length) return false;
          break;
        case '~':
          // [attr~=value] - 空格分隔的词匹配
          var words = attrVal.split(/\s+/);
          if (words.indexOf(attrRule.value) === -1) return false;
          break;
        default:
          if (attrVal !== attrRule.value) return false;
      }
    }
    
    // 检查 :has() - 元素内部必须包含匹配的子元素
    if (selectorInfo.hasSelector) {
      var innerHtml = element.innerHTML || element.outerHTML;
      var hasElements = findElements(innerHtml, selectorInfo.hasSelector);
      if (hasElements.length === 0) {
        return false;
      }
    }
    
    // 检查 :contains() - 元素文本必须包含指定内容
    if (selectorInfo.pseudo === 'contains' && selectorInfo.pseudoArg) {
      var text = element.text ? element.text() : '';
      if (text.indexOf(selectorInfo.pseudoArg) === -1) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 应用伪选择器过滤
   */
  function applyPseudo(elements, pseudo, pseudoArg) {
    if (!pseudo || elements.length === 0) return elements;
    
    switch (pseudo) {
      case 'eq':
        if (pseudoArg !== null) {
          var idx = pseudoArg < 0 ? elements.length + pseudoArg : pseudoArg;
          return (idx >= 0 && idx < elements.length) ? [elements[idx]] : [];
        }
        return elements;
        
      case 'first':
        return elements.length > 0 ? [elements[0]] : [];
        
      case 'last':
        return elements.length > 0 ? [elements[elements.length - 1]] : [];
        
      case 'first-of-type':
        return elements.length > 0 ? [elements[0]] : [];
        
      case 'last-of-type':
        return elements.length > 0 ? [elements[elements.length - 1]] : [];
        
      case 'lt':
        if (pseudoArg !== null) {
          return elements.slice(0, pseudoArg);
        }
        return elements;
        
      case 'gt':
        if (pseudoArg !== null) {
          return elements.slice(pseudoArg + 1);
        }
        return elements;
        
      case 'even':
        return elements.filter(function(_, i) { return i % 2 === 0; });
        
      case 'odd':
        return elements.filter(function(_, i) { return i % 2 === 1; });
        
      default:
        return elements;
    }
  }

  /**
   * 在 HTML 中查找所有匹配的元素
   */
  function findElements(html, selector) {
    if (!html || !selector) return [];
    
    var selectorInfo = parseSelector(selector);
    var results = [];
    
    // 构建标签匹配正则
    var tagToFind = selectorInfo.tagName || '[a-zA-Z][a-zA-Z0-9]*';
    var openTagRegex = new RegExp('<(' + tagToFind + ')(\\s[^>]*)?>|<(' + tagToFind + ')(\\s[^>]*)?/>', 'gi');
    var match;
    
    while ((match = openTagRegex.exec(html)) !== null) {
      var matchedTag = (match[1] || match[3] || '').toLowerCase();
      var attrString = match[2] || match[4] || '';
      var startPos = match.index;
      var isSelfClosing = match[0].endsWith('/>') || SELF_CLOSING_TAGS.test(matchedTag);
      
      var parsedAttrs = parseAttributes(attrString);
      var element = new HtmlElement(matchedTag, parsedAttrs, '', match[0]);
      
      // 检查是否匹配选择器
      if (!matchesSelector(element, selectorInfo)) continue;
      
      // 找到匹配的开始标签，现在找结束标签
      if (!isSelfClosing) {
        var depth = 1;
        var searchPos = startPos + match[0].length;
        var contentStart = searchPos;
        
        // 查找配对的结束标签
        var closeTagRegex = new RegExp('<(/?)(' + matchedTag + ')(\\s[^>]*)?>|<' + matchedTag + '(\\s[^>]*)?/>', 'gi');
        closeTagRegex.lastIndex = searchPos;
        
        var tagMatch;
        while ((tagMatch = closeTagRegex.exec(html)) !== null) {
          if (tagMatch[0].endsWith('/>')) {
            continue; // 自闭合标签
          }
          if (tagMatch[1] === '/') {
            depth--;
            if (depth === 0) {
              element.innerHTML = html.substring(contentStart, tagMatch.index);
              element.outerHTML = html.substring(startPos, tagMatch.index + tagMatch[0].length);
              break;
            }
          } else if (tagMatch[2]) {
            depth++;
          }
        }
      }
      
      results.push(element);
    }
    
    // 应用伪选择器
    results = applyPseudo(results, selectorInfo.pseudo, selectorInfo.pseudoArg);
    
    return results;
  }

  /**
   * URL 拼接
   */
  function urlJoin(base, path) {
    if (!path) return base || '';
    if (!base) return path;
    if (/^https?:\/\//i.test(path)) return path;
    if (path.indexOf('//') === 0) {
      return (base.indexOf('https://') === 0 ? 'https:' : 'http:') + path;
    }
    if (path.indexOf('/') === 0) {
      var m = base.match(/^(https?:\/\/[^\/]+)/i);
      return m ? m[1] + path : path;
    }
    
    var baseUrl = base.split('?')[0];
    if (baseUrl.charAt(baseUrl.length - 1) !== '/') {
      var idx = baseUrl.lastIndexOf('/');
      baseUrl = idx > 8 ? baseUrl.substring(0, idx + 1) : baseUrl + '/';
    }
    
    while (path.indexOf('../') === 0) {
      path = path.substring(3);
      var idx2 = baseUrl.lastIndexOf('/', baseUrl.length - 2);
      if (idx2 > 8) baseUrl = baseUrl.substring(0, idx2 + 1);
    }
    
    if (path.indexOf('./') === 0) path = path.substring(2);
    return baseUrl + path;
  }

  /**
   * 清理文本
   */
  function cleanText(text) {
    if (!text) return '';
    return text.replace(/[\s]+/g, ' ').trim();
  }


  /**
   * load - cheerio 兼容接口，供 Widget.html.load 使用
   * @param {string} html - HTML 内容
   * @returns {function} - $ 函数，支持 $(selector) 和 $(element)
   */
  function load(html) {
    if (!html) html = '';
    function createEmpty() {
      return {
        each: function() {},
        find: function() { return createEmpty(); },
        attr: function() { return ''; },
        text: function() { return ''; },
        html: function() { return ''; }
      };
    }
    function wrapElement(el) {
      if (!el) return createEmpty();
      return {
        find: function(selector) {
          var inner = findElements(el.innerHTML || el.outerHTML || '', selector);
          return inner.length > 0 ? wrapElement(inner[0]) : createEmpty();
        },
        attr: function(name) {
          return (el.attr && el.attr(name)) || (el.attributes && (el.attributes[name] || el.attributes[name.toLowerCase()])) || '';
        },
        text: function() {
          var t = (el.text && el.text()) || '';
          return typeof t === 'string' ? t.trim() : '';
        },
        html: function() {
          return (el.innerHTML || '');
        }
      };
    }
    return function(sel) {
      if (typeof sel === 'string') {
        var elements = findElements(html, sel);
        return {
          each: function(cb) {
            for (var i = 0; i < elements.length; i++) {
              cb(i, elements[i]);
            }
          },
          find: function(selector) {
            var first = elements[0];
            return first ? wrapElement(first).find(selector) : createEmpty();
          },
          attr: function(name) {
            var first = elements[0];
            return first ? wrapElement(first).attr(name) : '';
          },
          text: function() {
            var first = elements[0];
            return first ? wrapElement(first).text() : '';
          },
          html: function() {
            var first = elements[0];
            return first ? (first.innerHTML || '') : '';
          }
        };
      }
      if (sel && (sel.innerHTML !== undefined || sel.outerHTML !== undefined)) {
        return wrapElement(sel);
      }
      return createEmpty();
    };
  }

  /**
   * pdfa - 解析 HTML 返回匹配选择器的所有元素（数组）
   * @param {string} html - HTML 内容
   * @param {string} parse - 解析规则，如 ".v-list&&div.item" 或 "body&&a"
   * @returns {Array} - 匹配元素的 outerHTML 数组
   */
  function pdfa(html, parse) {
    if (!html || !parse) return [];
    
    try {
      // 分割 && 得到选择器链
      var parts = parse.split('&&');
      var selectors = [];
      
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i].trim();
        if (!part) continue;
        
        // 跳过 body 选择器（表示当前元素本身）
        if (part.toLowerCase() === 'body') continue;
        
        // 空格分隔的选择器作为后代选择器
        var subParts = part.split(/\s+/);
        for (var j = 0; j < subParts.length; j++) {
          if (subParts[j]) selectors.push(subParts[j]);
        }
      }
      
      if (selectors.length === 0) return [];
      
      // 逐级查找
      var currentHtmls = [html];
      
      for (var k = 0; k < selectors.length; k++) {
        var selector = selectors[k];
        var isLast = (k === selectors.length - 1);
        var newHtmls = [];
        
        for (var m = 0; m < currentHtmls.length; m++) {
          var elements = findElements(currentHtmls[m], selector);
          
          for (var n = 0; n < elements.length; n++) {
            newHtmls.push(isLast ? elements[n].outerHTML : elements[n].innerHTML);
          }
        }
        
        currentHtmls = newHtmls;
        if (currentHtmls.length === 0) break;
      }
      
      return currentHtmls;
    } catch (e) {
      console.log('[pdfa] 异常: ' + e.message);
      return [];
    }
  }

  /**
   * pdfh - 解析 HTML 返回匹配选择器的第一个元素的文本/属性
   * @param {string} html - HTML 内容
   * @param {string} parse - 解析规则，如 "p&&Text" 或 "img&&src" 或 "p--a&&Text"（排除a标签）
   * @param {string} baseUrl - 基础 URL（用于拼接相对路径）
   * @returns {string} - 解析结果
   */
  function pdfh(html, parse, baseUrl) {
    if (!html || !parse) return '';
    
    try {
      // 处理特殊解析规则
      if (parse === 'body&&Text' || parse === 'Text') {
        var tempEl = new HtmlElement('body', {}, html, html);
        return cleanText(tempEl.text());
      }
      if (parse === 'body&&Html' || parse === 'Html') {
        return html;
      }
      
      // 分割 && 得到选择器链和最终的属性/Text/Html
      var parts = parse.split('&&');
      var option = null;
      var selectors = [];
      var excludeTag = null;  // 用于存储 -- 排除的标签
      
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i].trim();
        if (!part) continue;
        
        // 跳过 body 选择器（表示当前元素本身）
        if (part.toLowerCase() === 'body') continue;
        
        // 检查是否有 -- 排除语法，如 p--a 表示 p 标签排除 a 标签
        if (part.indexOf('--') > -1) {
          var excludeParts = part.split('--');
          part = excludeParts[0];
          excludeTag = excludeParts[1];
        }
        
        // 检查最后一个部分是否是属性名或 Text/Html
        if (i === parts.length - 1) {
          var isAttr = (part === 'Text' || part === 'text' || 
                        part === 'Html' || part === 'html' ||
                        /^[\w-]+(\|\|[\w-]+)*$/.test(part));
          
          // 排除常见的 HTML 标签名（注意：title 不在此列表中，因为它更常用作属性名）
          var commonTags = /^(div|span|p|a|img|ul|li|ol|h[1-6]|table|tr|td|th|tbody|thead|tfoot|body|head|html|section|article|nav|aside|header|footer|main|form|input|button|select|option|textarea|label|dl|dt|dd|figure|figcaption|video|audio|source|canvas|svg|iframe|script|style|link|meta|br|hr)$/i;
          
          if (isAttr && !commonTags.test(part.split('||')[0].split(':')[0])) {
            option = part;
            continue;
          }
        }
        
        // 空格分隔的选择器
        var subParts = part.split(/\s+/);
        for (var j = 0; j < subParts.length; j++) {
          if (subParts[j]) selectors.push(subParts[j]);
        }
      }
      
      // 逐级查找
      var currentHtml = html;
      var element = null;
      
      for (var k = 0; k < selectors.length; k++) {
        var elements = findElements(currentHtml, selectors[k]);
        if (elements.length === 0) return '';
        
        element = elements[0];
        currentHtml = element.innerHTML;
      }
      
      if (!element) return '';
      
      // 如果有排除标签，先从 innerHTML 中移除该标签的内容
      var processedHtml = element.innerHTML;
      if (excludeTag) {
        var excludeRegex = new RegExp('<' + excludeTag + '[^>]*>[\\s\\S]*?</' + excludeTag + '>', 'gi');
        processedHtml = processedHtml.replace(excludeRegex, '');
        // 同时处理自闭合标签
        var selfCloseRegex = new RegExp('<' + excludeTag + '[^>]*/>', 'gi');
        processedHtml = processedHtml.replace(selfCloseRegex, '');
      }
      
      // 处理属性/Text/Html
      if (option) {
        if (option === 'Text' || option === 'text') {
          // 使用处理后的 HTML 创建临时元素获取文本
          var tempElement = new HtmlElement(element.tagName, element.attributes, processedHtml, '');
          return cleanText(tempElement.text());
        }
        if (option === 'Html' || option === 'html') {
          return processedHtml;
        }
        
        // 获取属性，支持 || 多属性备选
        var attrOptions = option.split('||');
        var attrVal = '';
        
        for (var m = 0; m < attrOptions.length; m++) {
          var opt = attrOptions[m].trim();
          attrVal = element.attr(opt);
          
          // 处理 style 中的 url
          if (/style/i.test(opt) && attrVal && attrVal.indexOf('url(') > -1) {
            var urlMatch = attrVal.match(/url\((['"]?)([^)]+)\1\)/);
            if (urlMatch) attrVal = urlMatch[2];
          }
          
          // 自动拼接 URL
          if (attrVal && baseUrl && URLJOIN_ATTR.test(opt) && !SPECIAL_URL.test(attrVal)) {
            attrVal = attrVal.indexOf('http') > -1 ? 
                      attrVal.slice(attrVal.indexOf('http')) : 
                      urlJoin(baseUrl, attrVal);
          }
          
          if (attrVal) break;
        }
        
        return attrVal;
      }
      
      return element.innerHTML;
    } catch (e) {
      console.log('[pdfh] 异常: ' + e.message);
      return '';
    }
  }

  /**
   * pd - pdfh 的别名，自动使用 MY_URL 或 HOST 作为 baseUrl
   */
  function pd(html, parse, baseUrl) {
    if (!baseUrl) {
      baseUrl = (typeof MY_URL !== 'undefined' && MY_URL) ? MY_URL : 
                (typeof HOST !== 'undefined' && HOST) ? HOST : '';
    }
    return pdfh(html, parse, baseUrl);
  }

  // ============================================
  // 导出函数
  // ============================================
  
  // 设置到全局
  global.pdfa = pdfa;
  global.pdfh = pdfh;
  global.pd = pd;
  global.load = load;
  global.cheerio = { load: load };
  global.pdfa_advanced = pdfa;
  global.pdfh_advanced = pdfh;
  global.pd_advanced = pd;
  global.pdfa_lite = pdfa;
  global.pdfh_lite = pdfh;
  global.pd_lite = pd;
  
  // 同时设置到 globalThis
  if (typeof globalThis !== 'undefined') {
    globalThis.pdfa = pdfa;
    globalThis.pdfh = pdfh;
    globalThis.pd = pd;
    globalThis.load = load;
    globalThis.cheerio = { load: load };
    globalThis.pdfa_advanced = pdfa;
    globalThis.pdfh_advanced = pdfh;
    globalThis.pd_advanced = pd;
    globalThis.pdfa_lite = pdfa;
    globalThis.pdfh_lite = pdfh;
    globalThis.pd_lite = pd;
  }
  
  // 创建 jsp 对象供 drpy2 引擎使用
  var jsp = {
    pdfa: pdfa,
    pdfh: pdfh,
    pd: pd
  };
  
  global.jsp = jsp;
  if (typeof globalThis !== 'undefined') {
    globalThis.jsp = jsp;
  }
  
  // 工具函数
  global.urlJoin_lite = urlJoin;
  if (typeof globalThis !== 'undefined') {
    globalThis.urlJoin_lite = urlJoin;
  }

  console.log('[html_parser_lite] 轻量级 HTML 解析器 v2 已加载');

})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
