// author @LoyDgIk

function splitWithEscapedDelimiter(str, delimiter) {
    const parts = [];
    let buffer = '';
    let i = 0;

    while (i < str.length) {
        if (str.slice(i, i + delimiter.length) === delimiter) {
            if (i > 0 && str[i - 1] === '\\') {
                buffer += delimiter;
            } else {
                parts.push(buffer);
                buffer = '';
            }
            i += delimiter.length;
        } else {
            buffer += str[i];
            i++;
        }
    }
    parts.push(buffer);

    const escapedDelimiter = '\\' + delimiter[0];
    return parts.map(part => part.replaceAll(escapedDelimiter, delimiter[0]));
}

function split(text, target, count) {
    count = count === undefined ? 1 : count;
    let array = [text];

    if (typeof target === 'string') {
        for (let i = 0; i < count; i++) {
            text = array[i];
            let index = text.indexOf(target);
            if (index === -1) {
                break;
            }
            array[i] = text.slice(0, index);
            array[i + 1] = text.slice(index + target.length);
        }
    } else if (target instanceof RegExp) {
        for (let i = 0; i < count; i++) {
            text = array[i];
            let match = target.exec(text);
            if (!match) {
                break;
            }
            let index = match.index;
            let matchLength = match[0].length;
            array[i] = text.slice(0, index);
            array[i + 1] = text.slice(index + matchLength);
        }
    }

    return array;
}
function customSort(arr, order) {
    const orderMap = new Map();
    order.forEach((keyword, index) => {
        orderMap.set(keyword, index);
    });

    function compareStrings(a, b) {
        for (let [keyword, index] of orderMap) {
            let aIndex = a.indexOf(keyword);
            let bIndex = b.indexOf(keyword);
            if (aIndex !== -1 && bIndex === -1) return -1;
            if (bIndex !== -1 && aIndex === -1) return 1;
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        }
        return 0;
    }
    arr.sort(compareStrings);
    return arr;
}

const textInstructionHandlers = {
    "替换": (inputText, instruction, arrayIndex) => {
        const replacements = splitWithEscapedDelimiter(instruction.slice(3), "#");
        replacements.forEach(replacement => {
            const index = replacement.lastIndexOf(">>");
            let oldText = replacement.slice(0, index);
            let newText = replacement.slice(index + 2).replace(/<序号>/g, arrayIndex !== undefined ? (arrayIndex+1) : "");
            newText = newText === "空" ? "" : newText;
            inputText = inputText.split(getSplitRule(oldText)).join(newText);
        });
        return inputText;
    },
    "Base64": (inputText) => base64Decode(inputText),
    "thor": (inputText) => inputText + String.fromCharCode.apply(null, "MpzEhJl".split("").map(c => c.charCodeAt(0) - 1)).split("").reverse().join(""),
};

function carryInstructionForText(inputText, instructions, arrayIndex) {
    instructions.forEach(instruction => {
        const handlerKey = Object.keys(textInstructionHandlers).find(key => instruction.startsWith(key));
        if (handlerKey) {
            inputText = textInstructionHandlers[handlerKey](inputText, instruction, arrayIndex);
        }
    });
    return inputText;
}

const arrayInstructionHandlers = {
    "排序": (array, instruction) => {
        const order = splitWithEscapedDelimiter(instruction.slice(3), ">");
        return customSort(array, order);
    },
    "不包含": (array, instruction) => {
        const excludedItems = splitWithEscapedDelimiter(instruction.slice(4), "#");
        return array.filter(item => !excludedItems.some(exclusion => item.includes(exclusion)));
    },
    "包含": (array, instruction) => {
        const includedItems = splitWithEscapedDelimiter(instruction.slice(3), "#");
        return array.filter(item => includedItems.some(inclusion => item.includes(inclusion)));
    },
    "不含序号": (array, instruction) => {
        const excludedIndices = splitWithEscapedDelimiter(instruction.slice(5), "#");
        return array.filter((_, index) => !isIndexInRange(index+1, excludedIndices));
    },
    "含序号": (array, instruction) => {
        const includedIndices = splitWithEscapedDelimiter(instruction.slice(4), "#");
        return array.filter((_, index) => isIndexInRange(index+1, includedIndices));
    }
};

function carryInstructionForArray(array, instructions) {
    return instructions.reduce((resultArray, instruction) => {
        const handlerKey = Object.keys(arrayInstructionHandlers).find(key => instruction.startsWith(key));
        if (handlerKey) {
            return arrayInstructionHandlers[handlerKey](resultArray, instruction);
        }
        return resultArray;
    }, array);
}

function isIndexInRange(index, ranges) {
    return ranges.some(range => {
        if (!Number.isNaN(Number(range))) {
            return Number(range) === index;
        } else if (/^\d*-\d*$/.test(range)) {
            const [start, end] = range.split("-").map(Number);
            return index >= start && index <= end;
        }
        return false;
    });
}

function getInstructionAndClear(input) {
    let parts = splitWithEscapedDelimiter(input, "[");

    let instructions = parts.map((v, i) => {
        let res = splitWithEscapedDelimiter(v, "]")[0];
        return res.replaceAll("\\&", "&");
    });
    input = instructions.shift();

    if (/^Base64\((.*?)\)$/.test(input)) {
        input = RegExp.$1;
        instructions.push("Base64");
    }
    return [input, instructions];
}

function getSplitRule(rule) {
    return rule.includes("*") && !rule.includes("\\*") ?
        new RegExp(rule.replace(/[\.\+\?\^\$\{\}\(\)\|\[\]]/g, '\\$&').replace("*", "[\\s\\S]*?")) :
        rule;
}

function getSplitStr(text, rule, host) {
    if (!rule) return "";
    let rules = splitWithEscapedDelimiter(rule, "+");
    let res = "";
    rules.forEach((r) => {
        if (!r.includes("&&")) {
            res += r;
            return;
        }

        let [rulec, instruction] = getInstructionAndClear(r);
        if (!rulec.includes("&&")) return;
        rulec = splitWithEscapedDelimiter(rulec, "&&");

        let rindex = Number(rulec[0]);
        let lindex = Number(rulec[1]);
        if (!Number.isNaN(rindex) && !Number.isNaN(lindex)) {
            res += carryInstructionForText(text.slice(rindex, lindex), instruction);
        } else {
            let rtext = (text.split(getSplitRule(rulec[0]))[1] || "").split(getSplitRule(rulec[1]))[0] || "";
            res += carryInstructionForText(rtext, instruction);
        }
    });
    if (host && !res.startsWith("http") && res) {
        res = host + res;
    }
    return res;
}



function getHasRuleSplitStr(text, rule, host, complete) {
    if (!rule) return "";
    let rules = splitWithEscapedDelimiter(rule, "+");
    let res = "";
    for (let r of rules) {
        if (!r.includes("&&")) {
            res += r;
            continue;
        }

        let [rulec, instruction] = getInstructionAndClear(r);
        if (!rulec.includes("&&")) return null;
        rulec = splitWithEscapedDelimiter(rulec, "&&");
        let rindex = Number(rulec[0]);
        let lindex = Number(rulec[1]);
        if (!Number.isNaN(rindex) && !Number.isNaN(lindex)) {
            res += carryInstructionForText(text.slice(rindex, lindex), instruction);
        } else {
            let text0 = split(text, getSplitRule(rulec[0]));

            if (text0.length < 2) return null;
            let text1 = split(text0[1], getSplitRule(rulec[1]));
            if (text1.length === 1) ltext = [text0[1]];
            if (complete && text1.length < 2) return null;
            res += carryInstructionForText(text1[0], instruction);
            /*let rrule = getSplitRule(rulec[0]);
            let rtext = text.split(rrule);
            let fix = typeof rrule === "string" ? rrule : "";
            if (rtext.length < 2) return null;
            let lrule = getSplitRule(rulec[1]);
            let ltext;
            for (let i = 1; i < rtext.length; i++) {
                ltext = (rtext[i] + fix).split(lrule);
                if (ltext.length > 1) break;
            }
            if (ltext.length === 1) ltext = [rtext[1]];
            if (complete && ltext.length < 2) return null;
            res += carryInstructionForText(ltext[0], instruction);*/
        }
    }
    if (host && !res.startsWith("http") && res) {
        res = host + res;
    }
    return res;
}

function getSplitArray(inputText, rule, complete) {
    if (!rule) return [];
    const [ruleCondition, instructions] = getInstructionAndClear(rule);
    const ruleSegments = splitWithEscapedDelimiter(ruleCondition, "&&");

    const splitRule = getSplitRule(ruleSegments[0]);
    const splitResult = inputText.split(splitRule).slice(1);

    const resultArray = splitResult.map((segmentText, index) => {
        let processedText = segmentText.split(getSplitRule(ruleSegments[1]))[0];
        if (complete && processedText === segmentText) return null;
        return carryInstructionForText(processedText, instructions, index);
    }).filter(Boolean);

    return carryInstructionForArray(resultArray, instructions);
}


function splitAndMapToStr(inputText, rule, strRule) {
    return getSplitArray(inputText, rule).map(value => processSplitRule(value, strRule)).filter(Boolean);
}

function isParseJson(inputText, arrrule) {
    const trimmedText = inputText.trim();
    return (trimmedText.startsWith("{") && trimmedText.endsWith("}") || trimmedText.startsWith("[") && trimmedText.endsWith("]")) && !arrrule.includes("&&");
}

function toPath(value) {
    if (typeof value !== 'string') return [];
    const pathSegments = [];
    let buffer = '';
    let inBrackets = false;
    let escapeCharacter = false;

    for (let char of value) {
        if (escapeCharacter) {
            buffer += char;
            escapeCharacter = false;
        } else if (char === '\\') {
            escapeCharacter = true;
        } else if (char === '.' && !inBrackets) {
            pathSegments.push(buffer);
            buffer = '';
        } else if (char === '[') {
            inBrackets = true;
        } else if (char === ']') {
            inBrackets = false;
        } else {
            buffer += char;
        }
    }
    if (buffer) pathSegments.push(buffer);
    return pathSegments;
}

function getJson(obj, path) {
    if (!obj) return undefined;
    const resolvedPath = Array.isArray(path) ? path : toPath(path);
    return resolvedPath.reduce((currentObject, key) =>
        (currentObject && typeof currentObject === 'object') ? currentObject[key] : undefined,
        obj
    );
}

function getJsonArray(json, rule) {
    if (!rule || !json) return [];
    try {
        const parsedJson = typeof json === "string" ? JSON.parse(json) : json;
        return getJson(parsedJson, rule);
    } catch {
        return [];
    }
}

function getJsonStr(json, rule) {
    if (!rule || !json) return "";
    try {
        const parsedJson = typeof json === "string" ? JSON.parse(json) : json;
        return splitWithEscapedDelimiter(rule, "+").reduce((result, part) => {
            if ((part.startsWith("\"") && part.endsWith("\"")) || (part.startsWith("'") && part.endsWith("'"))) {
                // 直接添加字符串内容
                return result + part.slice(1, -1);
            } else {
                const [ruleCondition, instructions] = getInstructionAndClear(part);
                const jsonValue = String(getJson(parsedJson, ruleCondition));
                return result + carryInstructionForText(jsonValue, instructions);
            }
        }, "");
    } catch {
        return "";
    }
}

// 导出模块
$.exports = {
    getSplitStr,
    getSplitArray,
    getHasRuleSplitStr,
    splitAndMapToStr,
    splitWithEscapedDelimiter,
    isParseJson,
    getJsonArray,
    getJsonStr
};