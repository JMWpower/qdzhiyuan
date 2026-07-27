js:
$.exports = [{
    title: "2026/03/30 MaxVersion 118",
    records: [
      "““fix””：修复gzip压缩后的drpy2源无法使用。",
      "““fix””：t5源初次打开报错。",
      "““fix””：修复主题设置部分bug。",
    ]
  },{
    title: "2026/03/21 MaxVersion 116",
    records: [
      "‘‘new’’：支持T5（需要自行安装扩展包）。",
      "‘‘new’’：重构分享导入系统，支持url scheme导入:hiker://page/importSpecialDir?rule=DrpyHiker&lang=ds&name={{name}}&urlc={{url}}。",
      "opt：适配更多jar，添加YouTube播放支持。",
      "opt：重构主页、搜索、详细页面代码，提高复用性，方便后续扩展，重构幅度有点大，可能存在许多bug。",
      "““fix””：修复部分崩溃bug，修复部分设置不生效。",
    ]
  },{
    title: "2026/03/03 MaxVersion 111",
    records: [
      "‘‘new’’：初步支持简单jar爬虫加载。",
      "‘‘new’’：支持cat.js。"
    ]
  },{
    title: "2025/10/03 MaxVersion 108",
    records: [
      "opt：优化xbpq详细页Ai匹配效果，支持智能解析小说章节(通用模板)",
      "opt：优化日志系统。添加悬浮日志窗口。",
      "opt：t4支持跳过二级。",
      "opt：qjs增加rsa相关函数。",
      "‘‘new’’：支持使用配置自带解析。",
      "‘‘new’’：新增自定义打开方式。",
      "‘‘new’’：dr2新增悬浮日志窗口。",
      "‘‘new’’：新增列表样式icon_1_left_pic。",
      "‘‘new’’：更新内置dr2，并迁移至qjs引擎。",
      "‘‘new’’：支持csp_AppGet，csp_AppMuou。",
      "‘‘new’’：支持增加自定义扩展配置(可以将自定义的json配置添加到当前使用的配置)。",
      "‘‘new’’：支持源内搜索和筛选。",
      "‘‘new’’：py源接口支持异步方法。",
      "‘‘new’’：本地文件夹自动生成配置支持py源;本地py支持head信息补充ext;py支持action。",
      "““fix””：修复部分配置读取失败。",
      
    ]
  },{
    title: "2025/02/08 MaxVersion 86",
    records: [
      "optimize：优化信息页",
      "optimize：捐赠页面新增捐赠信息",
    ]
  },
  {
    title: "2025/01/19 MaxVersion 84",
    records: [
      "‘‘new’’：长按菜单增加pushGaent入口，网盘源详细页增加调用小程序进行本地解析的按钮",
      "optimize：适配不夜T4",
    ]
  },
  {
    title: "2025/01/19 MaxVersion 82",
    records: [
      "‘‘new’’：支持部分猫影视配置",
    ]
  },
  {
    title: "2025/01/12 MaxVersion 80",
    records: [
      "optimize：重构部分设置相关功能",
      "optimize：UI管理增加重置操作",
    ]
  },
  {
    title: "2025/01/11 MaxVersion 79",
    records: [
      "optimize：优化push://的解析方式",
    ]
  },
  {
    title: "2025/01/04 MaxVersion 77",
    records: [
      "‘‘new’’：增加推送代理解析，支持小说漫画推送",
    ]
  },
  {
    title: "2025/01/01 MaxVersion 76",
    records: [
      "‘‘new’’：支持TVBOX推送",
      "““fix””：进一步支持action",
    ]
  },
  {
    title: "2024/12/25 MaxVersion 68",
    records: [
      "‘‘new’’：支持drpys action",
      "““fix””：修复一些py源BUG",
    ]
  },
  {
    title: "2024/12/18 MaxVersion 67",
    records: [
      "‘‘new’’：在爱佬的帮助下，支持荐片播放",
    ]
  },
  {
    title: "2024/12/08 MaxVersion 66",
    records: [
      "‘‘new’’：配置链接后加#nodejsID=id会自动启动nodejs对应服务",
    ]
  },
  {
    title: "2024/12/05 MaxVersion 65",
    records: [
      "““fix””：修复t4bug",
    ]
  },
  {
    title: "2024/11/18 MaxVersion 63",
    records: [
      "‘‘new’’：支持Python视频源，需要额外插件支持,请<a href=\"https://www.123865.com/s/fajA-nNTEh\">下载</a>Python插件",
    ]
  },
  {
    title: "2024/11/04 MaxVersion 62",
    records: [
      "‘‘new’’：增加drpy新特性，可以规则内添加搜索验证标识，可以禁止某个源的搜索翻页。",
    ]
  },
  {
    title: "2024/10/31 MaxVersion 61",
    records: [
      "‘‘new’’：修复drpy基础request库一处错误。",
    ]
  },
  {
    title: "2024/10/16 MaxVersion 60",
    records: [
      "‘‘new’’：支持代理链接播放。",
      "‘‘new’’：一级支持vod_tag为folor循环和历史导航。",
    ]
  }, {
    title: "2024/10/01 MaxVersion 59",
    records: [
      "‘‘new’’：动态多线路支持。",
    ]
  }, {
    title: "2024/09/17 MaxVersion 58",
    records: [
      "‘‘new’’：UI增加自定义按钮。",
      "optimize：导入增强。",
    ]
  }, {
    title: "2024/09/08 MaxVersion 57",
    records: [
      "‘‘new’’：编辑本地配置增加分享。",
      "‘‘new’’：增加导入处理。",
      "‘‘new’’：仅搜索源增加默认推荐。",
      "‘‘new’’：增加XYQ适配器。",
      "““fix””：修复XYQ适配器选集只有一集问题。",
    ]
  }, {
    title: "2024/08/30 MaxVersion 56",
    records: [
      "‘‘new’’：设置增加子页面管理 仅开发者可用。",
    ]
  }, {
    title: "2024/08/29 MaxVersion 55",
    records: [
      "optimize：小改动。drpy 封装函数cut matchesAll stringUtils",
      "optimize：子页面移至data目录,避免内存溢出重载问题",
    ]
  }, {
    title: "2024/08/22 MaxVersion 54",
    records: [
      "‘‘new’’：增加编辑当前配置和源编辑功能。",
      "‘‘new’’：ui编辑长按当前可以设为默认。",
      "““fix””：修复一些XBPQ适配器的问题。",
    ]
  },
  {
    title: "2024/08/18 MaxVersion 53",
    records: [
      "‘‘new’’：增加简单的源编辑功能",
    ]
  }, {
    title: "2024/08/03 MaxVersion 52",
    records: [
      "‘‘new’’：尝试完善XBPQ适配器,增加AppYsV2适配器"
    ]
  }, {
    title: "2024/07/23 MaxVersion 51",
    records: [
      "‘‘new’’：增加XBPQ适配器 非完全XBPQ支持 只是转化为Dpry支持格式"
    ]
  }, {
    title: "2024/07/16 MaxVersion 50",
    records: [
      "‘‘new’’：增加测试源页面,调用方法 [hiker://page/ruleTest?rule=DrpyHiker&page=fypage&path=js文件路径]。"
    ]
  }, {
    title: "2024/07/09 MaxVersion 49",
    records: [
      "‘‘new’’：UI管理增加主题管理。"
    ]
  }, {
    title: "2024/07/08 MaxVersion 48",
    records: [
      "‘‘new’’：UI管理增加二级缓存和刷新选项。"
    ]
  }, {
    title: "2024/07/07 MaxVersion 47",
    records: [
      "‘‘new’’：搜索支持跳过二级。"
    ]
  }, {
    title: "2024/07/05 MaxVersion 46",
    records: [
      "optimize：优化一些细节。"
    ]
  }, {
    title: "2024/07/03 MaxVersion 45",
    records: [
      "‘‘new’’：支持t0、t1接口。"
    ]
  }, {
    title: "2024/07/01 MaxVersion 44",
    records: [
      "‘‘new’’：支持t4接口。",
    ]
  }, {
    title: "2024/06/30 MaxVersion 43",
    records: [
      "optimize：优化文件读取速率。",
      "optimize：优化嗅探。",
    ]
  }, {
    title: "2024/06/27 MaxVersion 42",
    records: [
      "‘‘new’’：新增青少年模式。",
    ]
  }, {
    title: "2024/06/26 MaxVersion 41",
    records: [
      "‘‘new’’：新二级界面。",
    ]
  }, {
    title: "2024/06/23 MaxVersion 40",
    records: [
      "““fix””：修复除第一集外不解析的问题。",
    ]
  }, {
    title: "2024/06/22 MaxVersion 39",
    records: [
      "““fix””：修复跳过二级的嗅探链接不正确。",
      "““fix””：修复跳过二级的链接为空。",
      "optimize：自动弹出更新日志",
    ]
  }, {
    title: "2024/06/21 MaxVersion 37",
    records: [
      "‘‘new’’：支持index.js(需要本地包作者兼容性编写)。",
      "‘‘new’’：增加参数映射表。",
      "““fix””：修复配置.mapping.txt可能会报错的bug。",
    ]
  }, {
    title: "2024/06/20 MaxVersion 33",
    records: [
      "““fix””：修复部分bug。",
    ]
  }, {
    title: "2024/06/17 MaxVersion 32",
    records: [
      "‘‘new’’：增加按tag搜索。",
      "““fix””：修复部分源从搜索进入详细页报错。",
      "““fix””：修复部分源lazy返回空url时报错。"
    ]
  }, {
    title: "2024/06/16  MaxVersion 29",
    records: [
      "““fix””：升级drpy.js，修复gzip函数。"
    ]
  }, {
    title: "2024/06/15  MaxVersion 28",
    records: [
      "‘‘new’’：增加ui管理。",
      "‘‘new’’：主页增加跳过形式(*)二级选项。",
      "‘‘new’’：解析管理增加flag分类。",
      "optimize：优优化订阅更新策略。",
    ]
  }, {
    title: "2024/06/12  MaxVersion 26",
    records: [
      "‘‘new’’：在换源界面的菜单可以开启分享时是否使用编码。",
      "optimize：在选源界面刷新配置后会同步更新数量显示。",
    ]
  }, {
    title: "2024/06/10  MaxVersion 25",
    records: [
      "‘‘new’’：增加更新日志。",
      "‘‘new’’：选源长按菜单，增加跳转网页，查看源码。",
      "““fix””：修复编辑解析界面测试js解析一直失败。",
      "““fix””：修复github订阅，会删除全部规则文件。",
      "““fix””：修复解析调用失败。",
      "““fix””：修复更换配置时没有及时清空drpy缓存。",
      "optimize：更改订阅更新策略，会删除本地失效源。",
      "optimize：更新drpy2.js。",
      "optimize：优化解析flag匹配。",
    ]
  }, {
    title: "2024/06/09 MaxVersion 20",
    records: [
      "‘‘new’’：支持proxy_rule代理。",
      "““fix””：修复云盘链接不调取云盘简。",
      "““fix””：修复哔哩影视不能使用解析。",
    ]
  }];