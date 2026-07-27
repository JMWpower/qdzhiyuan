
const HashMap = java.util.HashMap;
const JavaString = java.lang.String;
const JavaInteger = java.lang.Integer;
const JavaDouble = java.lang.Double;
const JavaBoolean = java.lang.Boolean;
const JavaArray = java.lang.reflect.Array;
const JavaObject = java.lang.Object;
const RhinoContext = org.mozilla.javascript.Context;
const JavaByteClass = java.lang.Class.forName("[B");
const Base64 = android.util.Base64;
const ByteArrayInputStream = java.io.ByteArrayInputStream;

const TypeConverter = {
    /**
     * 获取安全的类型标识符
     */
    getSafeType: function(obj) {
        return Object.prototype.toString.call(obj);
    },
    isByteArray(obj) {
        return obj?.getClass()?.getName() == "[B";
    },
    /**
     * 将 JavaScript 数据类型转换为 Java 数据类型
     * @param {*} obj JS 数据
     * @param {boolean} [arrayToList=false] 可选：为 true 时普通数组转为 ArrayList，默认转为 Object[]
     * @returns {java.lang.Object} 对应的 Java 对象
     */
    jsToJava: function(obj, arrayToList) {
        if (obj === null || obj === undefined) {
            return null;
        }

        let typeStr = this.getSafeType(obj);
        let type = typeof obj;

        // 1. 基础类型转换
        if (type === 'string') {
            return new JavaString(obj);
        } else if (type === 'number') {
            return Number.isInteger(obj) ? new JavaInteger(obj) : new JavaDouble(obj);
        } else if (type === 'boolean') {
            return new JavaBoolean(obj);
        }

        // 2. 识别 Java 原生对象和数组，直接安全放行
        if (typeStr === '[object JavaObject]' || typeStr === '[object JavaArray]') {
            return obj;
        }

        // 3. 高性能 TypedArray -> Java byte[] ([B)
        if (typeStr === '[object Uint8Array]' || typeStr === '[object Int8Array]') {
            // 将 TypedArray 转为标准 JS Array，再利用 Rhino 底层极速转为 [B
            let a = Array.from(new Int8Array(obj));
            return RhinoContext.jsToJava(a, JavaByteClass);
        }

        // 4. 安全识别 JS Array (跨上下文免疫)
        else if (typeStr === '[object Array]') {
            if (arrayToList) {
                let list = new java.util.ArrayList();
                for (let i = 0; i < obj.length; i++) {
                    list.add(this.jsToJava(obj[i], arrayToList));
                }
                return list;
            } else {
                let objClass = JavaObject.__javaObject__ || java.lang.Class.forName("java.lang.Object");
                let javaArray = JavaArray.newInstance(objClass, obj.length);
                for (let i = 0; i < obj.length; i++) {
                    javaArray[i] = this.jsToJava(obj[i], arrayToList);
                }
                return javaArray;
            }
        }
        // 5. 安全识别 JS Object (跨上下文免疫)
        else if (typeStr === '[object Object]') {
            let map = new HashMap();
            for (let key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    map.put(new JavaString(key), this.jsToJava(obj[key], arrayToList));
                }
            }
            return map;
        }

        return obj;
    },

    /**
     * 将 Java 数据类型转换为 JavaScript 数据类型
     * @param {*} obj Java 数据
     * @param {boolean} [convertByteArray=false] 可选：为 true 时将 Java byte[] 强转为 JS Uint8Array
     * @returns {*} 对应的 JS 原生数据类型
     */
    javaToJs: function(obj, convertByteArray) {
        if (obj === null || obj === undefined) {
            return null;
        }

        let type = typeof obj;
        let typeStr = this.getSafeType(obj);

        if (type === 'string' || type === 'number' || type === 'boolean') {
            return obj;
        }

        // 拦截可能的跨上下文 JS 基础复合对象
        if (typeStr === '[object Array]') {
            let arr = [];
            for (let i = 0; i < obj.length; i++) arr.push(this.javaToJs(obj[i], convertByteArray));
            return arr;
        }
        if (typeStr === '[object Object]') {
            let jsObj = {};
            for (let key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    jsObj[key] = this.javaToJs(obj[key], convertByteArray);
                }
            }
            return jsObj;
        }

        // 拦截 Java 原生 byte[] ([B)
        if (this.isByteArray(obj)) {
            if (convertByteArray) {
                let len = obj.length;
                let uint8Arr = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    uint8Arr[i] = obj[i];
                }
                return uint8Arr;
            } else {
                return obj;
            }
        }

        // Java 类型判断不受跨上下文影响，放心使用 instanceof
        if (obj instanceof java.lang.String) return String(obj);
        if (obj instanceof java.lang.Number) return Number(obj);
        if (obj instanceof java.lang.Boolean) return Boolean(obj);

        if (obj instanceof java.util.List || typeStr == '[object JavaArray]') {
            let arr = [];
            let isList = obj instanceof java.util.List;
            let len = isList ? obj.size() : obj.length;

            for (let i = 0; i < len; i++) {
                let val = isList ? obj.get(i) : obj[i];
                arr.push(this.javaToJs(val, convertByteArray));
            }
            return arr;
        }

        if (obj instanceof java.util.Map) {
            let jsObj = {};
            let iterator = obj.keySet().iterator();
            while (iterator.hasNext()) {
                let key = iterator.next();
                jsObj[String(key)] = this.javaToJs(obj.get(key), convertByteArray);
            }
            return jsObj;
        }

        return obj;
    },
    stringToStream(obj, base64) {
        if (this.isByteArray(obj)) {
            return new ByteArrayInputStream(obj);
        } else {
            let content = this.jsToJava(obj);
            if (base64 && content.contains("base64,")) content = content.split("base64,")[1];
            return new ByteArrayInputStream(base64 ? Base64.decode(content, Base64.DEFAULT | Base64.NO_WRAP) : content.getBytes());
        }
    }
    

};

$.exports = TypeConverter;