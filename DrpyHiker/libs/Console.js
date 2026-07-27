// ====== 表格渲染函数 ======
function renderTable(data, columns) {
    let output = [];

    // 处理非对象/数组数据
    if (typeof data !== 'object' || data === null) {
        return `Value: ${String(data)}`;
    }

    let rows = [];
    let headers = new Set();
    headers.add("(index)"); // 始终包含索引列

    // 将数据标准化为 [{ "(index)": "key", "col1": "val1", ... }]
    if (Array.isArray(data)) {
        data.forEach((item, index) => {
            const row = {
                "(index)": String(index)
            };
            if (typeof item === 'object' && item !== null) {
                Object.assign(row, item);
                Object.keys(item).forEach(key => headers.add(key));
            } else {
                row["Value"] = item;
                headers.add("Value");
            }
            rows.push(row);
        });
    } else { // 假设是对象
        Object.keys(data).forEach(key => {
            const item = data[key];
            const row = {
                "(index)": String(key)
            };
            if (typeof item === 'object' && item !== null) {
                Object.assign(row, item);
                Object.keys(item).forEach(col => headers.add(col));
            } else {
                row["Value"] = item;
                headers.add("Value");
            }
            rows.push(row);
        });
    }

    // 根据指定的列过滤和排序
    let finalHeaders = Array.from(headers);
    if (columns && Array.isArray(columns) && columns.length > 0) {
        // 先移除 "(index)"，再添加，确保它在最前面
        const indexHeader = "(index)";
        finalHeaders = [indexHeader].concat(columns.filter(col => col !== indexHeader && headers.has(col)));
    } else {
        // 默认排序，确保 "(index)" 在第一个
        finalHeaders.sort((a, b) => {
            if (a === "(index)") return -1;
            if (b === "(index)") return 1;
            return a.localeCompare(b);
        });
    }

    // 计算每列的最大宽度
    let columnWidths = {};
    finalHeaders.forEach(h => columnWidths[h] = h.length); // 初始宽度为列名长度

    rows.forEach(row => {
        finalHeaders.forEach(h => {
            const value = String(row[h] === undefined ? "" : row[h]);
            if (value.length > columnWidths[h]) {
                columnWidths[h] = value.length;
            }
        });
    });

    // 构建表格线
    let separatorLine = "+";
    finalHeaders.forEach(h => {
        separatorLine += "-".repeat(columnWidths[h] + 2) + "+";
    });

    // 构建表头行
    let headerLine = "|";
    finalHeaders.forEach(h => {
        headerLine += ` ${h.padEnd(columnWidths[h])} |`;
    });

    output.push(separatorLine);
    output.push(headerLine);
    output.push(separatorLine);

    // 构建数据行
    rows.forEach(row => {
        let dataLine = "|";
        finalHeaders.forEach(h => {
            const value = String(row[h] === undefined ? "" : row[h]);
            dataLine += ` ${value.padEnd(columnWidths[h])} |`;
        });
        output.push(dataLine);
    });

    output.push(separatorLine);

    return output.join('\n');
}
// ====== Format API ======
const LINE = "\n"
const TAB = "  "
const SPACE = " "

function formatMessage(formatText, args) {
    var actualArgs = args;
    if (actualArgs === undefined) {
        actualArgs = [];
    }

    if (typeof formatText !== 'string') {
        // 如果第一个参数不是字符串，则直接将所有参数转为字符串并连接
        var nonStringArgs = [format(formatText)].concat(actualArgs.map(format));
        return nonStringArgs.join(' ');
    }

    var i = 0;
    var formatted = formatText.replace(/%[sdifoO]/g, function(match) {
        if (i >= actualArgs.length) return match;

        var arg = actualArgs[i++];
        switch (match) {
            case '%s':
                return String(arg);
            case '%d':
            case '%i':
                return parseInt(arg) || 0;
            case '%f':
                return parseFloat(arg) || 0;
            case '%o':
            case '%O':
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            default:
                return match;
        }
    });

    if (i < actualArgs.length) {
        formatted += ' ' + actualArgs.slice(i).map(format).join(' ');
    }
    return formatted;
}

function format(value, opt) {
    const defaultOpt = {
        maxStringLength: 10000,
        depth: 2,
        maxArrayLength: 100,
        seen: [],
        reduceStringLength: 100
    }
    if (typeof opt !== "object") {
        opt = defaultOpt
    } else {
        opt = Object.assign(defaultOpt, opt)
    }

    return formatValue(value, opt, 0)
}

function formatPrimitive(value, opt) {
    const type = typeof value
    switch (type) {
        case "string":
            return formatString(value, opt)
        case "number":
            return Object.is(value, -0) ? '-0' : `${value}`
        case "bigint":
            return `${String(value)}n`
        case "boolean":
            return `${value}`
        case "undefined":
            return "undefined"
        case "symbol":
            return `${value.toString()}`
        default:
            return value.toString
    }
}

function formatFunction(value) {
    let type = getTypeName(value)
    if (type === "JavaClass") {
        return String(value);
    }
    type = value.constructor.name; // Function, AsyncFunction, GeneratorFunction etc.
    const fnName = value.name ? `: ${value.name}` : ' (anonymous)';
    return `[${type}${fnName}]`;
}

function formatArray(value, opt, recurseTimes) {
    let string = '['
    value.forEach((item, index, array) => {
        if (index === 0) {
            string += ' '
        }
        string += formatValue(item, opt, recurseTimes)
        if (index === opt.maxArrayLength - 1) {
            string += `... ${array.length - opt.maxArrayLength} more item${array.length - opt.maxArrayLength > 1 ? 's' : ''}`
        } else if (index !== array.length - 1) {
            string += ','
        }
        string += ' '
    })
    string += ']'
    return string
}

function formatMap(value, opt, recurseTimes) {
    const entries = [];
    for (let [k, v] of value.entries()) {

        entries.push(`${format(k, recurseTimes)} => ${this.format(v, recurseTimes)}`);
    }
    return `Map(${value.size}) { ${entries.join(', ')} }`;
}

function getTypeName(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
}

function formatObject(value, opt, recurseTimes) {
    let type = getTypeName(value);
    if (type === "RegExp") {
        return `${value.toString()}`
    }
    if (type === "Error") {
        return `${value.toString()}`
    }
    if (type === "Promise") {
        return `Promise {${formatValue(value, opt, recurseTimes)}}`
    }
    if (type === "Array") {
        return formatArray(value, opt, recurseTimes)
    }
    if (type === "Float64Array") {
        return `Float64Array(1) [ ${value} ]`
    }
    if (type === "BigInt64Array") {
        return `BigInt64Array(1) [ ${value}n ]`
    }
    if (type === "Map") {
        return formatMap(value, opt, recurseTimes)
    }
    if (type === "JavaObject") {
        try {
            return `[JavaObject ${value.getClass().getName()}]:${String(value)}`;
        } catch (e) {
            return String(value);
        }
    }
    return formatProperty(value, opt, recurseTimes)
}

function formatProperty(value, opt, recurseTimes) {
    let string = ''
    string += '{'
    let keys = Object.keys(value)
    let length = keys.length
    for (let i = 0; i < length; i++) {
        if (i === 0) {
            string += SPACE
        }
        string += LINE
        string += TAB.repeat(recurseTimes)

        let key = keys[i]
        string += `${key}: `
        string += formatValue(value[key], opt, recurseTimes)
        if (i < length - 1) {
            string += ','
        }
        string += SPACE
    }

    string += LINE
    string += TAB.repeat(recurseTimes - 1)
    string += '}'

    if (string.length < opt.reduceStringLength) {
        string = string.replaceAll(LINE, "").replaceAll(TAB, "")
    }

    return string
}

function formatValue(value, opt, recurseTimes) {
    if (typeof value !== 'object' && typeof value !== 'function') {
        return formatPrimitive(value, opt)
    }

    if (value === null) {
        return 'null'
    }

    if (typeof value === 'function') {
        return formatFunction(value)
    }

    if (typeof value === 'object') {
        if (opt.seen.includes(value)) {
            let index = 1
            if (opt.circular === undefined) {
                opt.circular = new Map()
                opt.circular.set(value, index)
            } else {
                index = opt.circular.get(value)
                if (index === undefined) {
                    index = opt.circular.size + 1
                    opt.circular.set(value, index)
                }
            }

            return `[Circular *${index}]`
        }

        if (opt.depth !== null && ((recurseTimes - 1) === opt.depth)) {
            if (value instanceof Array) {
                return '[Array]'
            }
            return '[Object]'
        }

        recurseTimes++
        opt.seen.push(value)
        let string = formatObject(value, opt, recurseTimes)
        opt.seen.pop()
        return string
    }
}

function formatString(value, opt) {
    let trailer = ''
    if (opt.maxStringLength && value.length > opt.maxStringLength) {
        let remaining = value.length - opt.maxStringLength
        value = value.slice(0, opt.maxStringLength)
        trailer = `... ${remaining} more character${remaining > 1 ? 's' : ''}`
    }

    return `'${value}'${trailer}`;
}

let Level = {
    i: "info",
    l: "log",
    w: "warn",
    e: "error",
    a: "assert",
    d: "debug",
    ti: "time",
    tr: "trace",
    ta: "table"
};
// ====== Console API ======
function Console(options) {
    options = options || {};
    this.stdout = options.stdout || function() {
        throw new Error("When invoke console stuff, you should be set a stdout of platform to console.stdout.");
    };
    /** @type Object<string,number> */
    this._count = {};

    /** @type Object<string,number> */
    this._time = {};
    this.defaultTeg = options.Tag || "";
    this.Tag = this.defaultTeg;
};
Console.Level = Level;
Object.assign(Console.prototype, {

    log(msg, ...args) {
        this.print(Level.l, formatMessage(msg, args));
    },
    info(msg, ...args) {
        this.print(Level.i, formatMessage(msg, args));
    },
    warn(msg, ...args) {
        this.print(Level.w, formatMessage(msg, args));
    },
    error(msg, ...args) {
        if (getTypeName(msg) === "Error" && msg.stack) {
            msg = msg.toString() + "\n" + msg.stack;
        }
        this.print(Level.e, formatMessage(msg, args));
    },
    debug(msg, ...args) {
        this.print(Level.d, formatMessage(msg, args));
    },

    trace(message) {
        let stack = new Error().stack;
        let formattedStack = "";
        if (stack) {
            var stackLines = stack.split('\n');
            if (stackLines.length > 1) {
                // Slice is fine as it returns a new array, no spread syntax
                formattedStack = stackLines.slice(1).join('\n');
            } else {
                formattedStack = stackLines.join('\n');
            }
            //formattedStack = stack;
        } else {
            formattedStack = "(Stack trace not available)";
        }

        this.print(Level.tr, msg);
    },
    assert(condition, msg, ...args) {
        let actualArgs = (args !== undefined ? Array.prototype.slice.call(args) : []);
        if (!condition) {
            var errorMessage = formatMessage(msg, args);
            this.print(Level.a, "Assertion failed: " + errorMessage);
        }
    },
    count(label) {
        let actualLabel = (label !== undefined ? label : "default"); // Explicit check
        this._count[actualLabel] = (this._count[actualLabel] || 0) + 1;

        this.print(Level.i, actualLabel + ": " + this._count[actualLabel]);
    },
    countReset(label) {
        let actualLabel = (label !== undefined ? label : "default"); // Explicit check
        if (this._count[actualLabel]) {
            delete this._count[actualLabel];

            this.print(Level.i, actualLabel + ": count reset");
        } else {

            this.print(Level.w, "Count for label '" + actualLabel + "' does not exist.");
        }
    },
    time(label) {
        let actualLabel = (label !== undefined ? label : "default"); // Explicit check
        if (this._time[actualLabel]) {
            this.print(Level.w, "Timer '" + actualLabel + "' already exists.");
            return;
        }
        this._time[actualLabel] = Date.now();

        this.print(Level.ti, "Timer '" + actualLabel + "' started.");
    },
    timeEnd(label) {
        let actualLabel = (label !== undefined ? label : "default"); // Explicit check
        if (!this._time[actualLabel]) {
            this.print(Level.e, "Timer '" + actualLabel + "' does not exist.");
            return;
        }
        let startTime = this._time[actualLabel];
        delete this._time[actualLabel];
        let endTime = Date.now();
        let durationMs = (endTime - startTime);
        this.print(Level.ti, actualLabel + ": " + durationMs.toFixed(3) + "ms");

    },
    table(data, columns) {
        let actualColumns = (columns !== undefined ? columns : null); // Explicit check
        let tableString = "\n" + renderTable(data, actualColumns);

        this.print(Level.ta, tableString);
    },
    print(leve, msg, stag) {
        if (stag) {
            this.stdout(leve, msg, stag);
        } else {
            let tag = this.Tag;
            this.Tag = this.defaultTeg;
            this.stdout(leve, msg, tag);
        }
    },
    setTag(tag) {
        this.Tag = tag;
        return this;
    }
});

$.exports = Console;