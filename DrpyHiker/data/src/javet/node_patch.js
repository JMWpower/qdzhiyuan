
// 1. 拦截危险操作，防止不良规则误杀海阔主进程
process.reallyExit = function(code) {
    console.log('[DrpyHiker-V8] 拦截到危险操作: process.exit 被触发。');
};
process.abort = function() {
    console.log('[DrpyHiker-V8] 拦截到危险操作: process.abort 被触发。');
};

// 2. 注入全局变量标识
process.env["ANDROID_APP_NAME"] = 'DrpyHiker';
process.env["IS_HIKER"] = "1";

// 3. 拦截控制台异常流 (Promise 异常已在 Java 层拦截，这里拦截同步异常)
process.on('uncaughtException', (error) => {
    console.error('[DrpyHiker-V8] 未捕获的同步异常:', error.stack || error);
});


const setupStreamHooks = () => {
    const originals = {
        stdout: process.stdout.write.bind(process.stdout),
        stderr: process.stderr.write.bind(process.stderr)
    };

    const trimTrailing = (input) => {
        // 判断是否为 Buffer 类型
        if (Buffer.isBuffer(input)) {
            // 直接截取 Buffer
            let end = input.length;
            while (end > 0 && (input[end - 1] === 10 || input[end - 1] === 13)) {
                end--;
            }
            return input.slice(0, end).toString();
        }
        // 判断是否为字符串类型
        else if (typeof input === 'string') {
            // 方法 2：字符串处理
            return input.replace(/[\r\n]+$/, "");
        }
        // 其他类型抛出错误
        else {
            throw new TypeError("Input must be a Buffer or String");
        }
    };

    let inHook = false;

    const createHook = (method, original) => (buffer, encoding, callback) => {
        if (inHook) return original(buffer, encoding, callback);

        try {
            inHook = true;
            //hooklog(method, trimTrailing(buffer));
            if (method == 'error') {
                console.error(trimTrailing(buffer));
            } else {
                console.log(trimTrailing(buffer));
            }

        } catch (e) {
            originals.stderr(`Hook error: ${e.stack || e.message}\n`, 'utf8');
        } finally {
            inHook = false;
        }

        const enc = typeof encoding === 'string' ? encoding : 'utf8';
        const cb = typeof callback === 'function' ? callback : typeof encoding === 'function' ? encoding : undefined;

        return original(buffer, enc, cb);
    };

    process.stdout.write = createHook('info', originals.stdout);
    process.stderr.write = createHook('error', originals.stderr);
};

//setupStreamHooks();
// 4. 挂载 ES Module 动态加载器 
// 原版 T5 规则通过 globalImport 动态加载文件
const vm = require('node:vm');
const path = require('node:path');
globalThis.globalImport = function(modulePath, metaUrl) {
    if (metaUrl) {
        modulePath = path.join(metaUrl, modulePath);
    }
    // 使用 vm 模块动态编译并执行引入
    const script = new vm.Script("import(" + JSON.stringify(modulePath) + ")", {
        importModuleDynamically: vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER
    });
    return script.runInNewContext();
};


const { Console } = require('console');
let originalConsole = console;
// 创建自定义 Console 类
class CustomConsole extends Console {
  constructor(stdout, stderr) {
    super(stdout, stderr);
    
    // 重写所有方法
    const methods = [
      'log', 'info', 'error', 'warn', 'dir', 'time', 
      'timeEnd', 'timeLog', 'trace', 'assert', 'table'
    ];
    
    methods.forEach(method => {
      if (typeof this[method] === 'function') {
        const original = this[method].bind(this);
        this[method] = (...args) => {
          if (typeof appLog === 'function') {
            try {
              const formattedMessage = require('util').format(...args);
              originalConsole.log(`%${method}%${formattedMessage}`);
            } catch (e) {
              originalConsole.error(`%error%Failed in console.${method}: ${e}`);
            }
          }
          return original(...args);
        };
      }
    });
  }
}
const myConsole=new CustomConsole(process.stdout, process.stderr);
global.console=Object.assign(myConsole,originalConsole,{
    log:myConsole.log
});
// 替换全局 console
//global.console = new CustomConsole(process.stdout, process.stderr);
