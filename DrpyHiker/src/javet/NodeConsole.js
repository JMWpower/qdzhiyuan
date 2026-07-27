
/**
 * 构建 Javet 日志拦截器，桥接输出至海阔原生 console.print
 */
 /**
 * 解析格式化字符串并打印日志
 * 字符串格式: %{method}%{message}
 * 例如: %log%Hello World
 *       %error%Error occurred
 */
function parseAndPrintLog(formattedStr, tag) {
  if (!formattedStr || typeof formattedStr !== 'string') {
    console.print(console.Level.i, 'Invalid log format', tag);
    return;
  }
  
  // 查找第一个 % 和第二个 %
  const firstPercentIndex = formattedStr.indexOf('%');
  if (firstPercentIndex === -1) {
    // 没有 % 符号，直接打印为普通信息
    console.print(console.Level.i, formattedStr, tag);
    return;
  }
  
  const secondPercentIndex = formattedStr.indexOf('%', firstPercentIndex + 1);
  if (secondPercentIndex === -1) {
    // 只有一个 % 符号
    let message = formattedStr.substring(firstPercentIndex + 1);
    console.print(console.Level.i, message, tag);
    return;
  }
  
  // 提取方法名和消息
  let method = formattedStr.substring(firstPercentIndex + 1, secondPercentIndex);
  let message = formattedStr.substring(secondPercentIndex + 1);
  
  // 根据方法名映射到对应的日志等级
  mapLogLevel(method, message, tag);
}

/**
 * 将 Node.js console 方法名映射到 App 端日志等级
 */

function mapLogLevel(method, message, tag) {
  // 方法名到日志级别的映射
  const methodToLevel = {
    // 断言级别
    'assert': console.Level.a,
    
    // 调试级别
    'debug': console.Level.d,
    
    // 时间相关级别
    'time': console.Level.ti,
    'timeEnd': console.Level.ti,
    'timeLog': console.Level.ti,
    
    // 追踪级别
    'trace': console.Level.tr,
    
    // 表格级别
    'table': console.Level.ta,
    
    // 信息级别
    'log': console.Level.i,
    'info': console.Level.i,
    'dir': console.Level.i,
    'dirxml': console.Level.i,
    'count': console.Level.i,
    'countReset': console.Level.i,
    'group': console.Level.i,
    'groupCollapsed': console.Level.i,
    'groupEnd': console.Level.i,
    
    // 警告级别
    'warn': console.Level.w,
    
    // 错误级别
    'error': console.Level.e
  };
  
  // 获取对应的级别，默认为信息级别
  const level = methodToLevel[method] || console.Level.i;
  
  // 格式化消息
  const formattedMessage = message;
  
  // 打印日志
  console.print(level, formattedMessage, tag);
}

/**
 * 根据方法名格式化消息
 */
function formatMessageByMethod(method, message) {
  switch (method) {
    case 'time':
    case 'timeEnd':
    case 'timeLog':
      return `⏱️ ${message}`;
    case 'table':
      return `📊 ${message}`;
    case 'trace':
      return `🔍 ${message}`;
    case 'assert':
      return `🛑 ${message}`;
    case 'debug':
      return `🐛 ${message}`;
    case 'warn':
      return `⚠️ ${message}`;
    case 'error':
      return `❌ ${message}`;
    default:
      return `ℹ️ ${message}`;
  }
}

function CreateJavetLogger(tag) {
    return {
        debug(str) {
            
        },
        error(str, th) {
            
        },
        info(str) {
            parseAndPrintLog(String(str), tag);
        },
        warn(str) {
        }
    };
}
$.exports.CreateJavetLogger=CreateJavetLogger;
$.exports.parseAndPrintLog=parseAndPrintLog;