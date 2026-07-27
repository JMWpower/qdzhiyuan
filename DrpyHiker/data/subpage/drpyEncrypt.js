function encrypt(rule, encodeMode) {
    if (encodeMode === "Gzip") {
        let GZIP = $.require("GZIP");
        rule = GZIP.zip(rule);
    } else if (encodeMode === "Base64") {
        rule = base64Encode(rule);
    } else if (encodeMode === "AES") {
        const CryptoUtil = $.require("hiker://assets/crypto-java.js");
        let key = CryptoUtil.Data.parseHex("686A64686E780A0A0A0A0A0A0A0A0A0A");
        let iv = CryptoUtil.Data.parseHex("647A797964730A0A0A0A0A0A0A0A0A0A");
        let textData = CryptoUtil.Data.parseUTF8(rule);
        let encrypted0 = CryptoUtil.AES.encrypt(textData, key, {
            mode: "AES/CBC/PKCS7Padding",
            iv: iv
        });
        rule = encrypted0.toBase64(_base64.NO_WRAP);
    }
    return rule;
}

function decrypt(rule, encodeMode) {
    if (encodeMode === "Gzip") {
        let GZIP = $.require("GZIP");
        rule = GZIP.unzip(rule);
    } else if (encodeMode === "Base64") {
        rule = base64Decode(rule);
    } else if (encodeMode === "AES") {
        const CryptoUtil = $.require("hiker://assets/crypto-java.js");
        let key = CryptoUtil.Data.parseHex("686A64686E780A0A0A0A0A0A0A0A0A0A");
        let iv = CryptoUtil.Data.parseHex("647A797964730A0A0A0A0A0A0A0A0A0A");
        let textData = CryptoUtil.Data.parseBase64(rule);
        let encrypted0 = CryptoUtil.AES.decrypt(textData, key, {
            mode: "AES/CBC/PKCS7Padding",
            iv: iv
        });
        rule = encrypted0.toString();
    }
    return rule;
}

function tryDecrypt(rule) {
    let current_match = /^(\s+)?\{|var rule|function|let |var |const /;
    if (current_match.test(rule)) {
        return rule;
    }
    let type=["Gzip", "Base64", "AES"];
    for (let it of type) {
        log(it)
        try {
            let crule = decrypt(rule, it);
            log(crule.slice(1,100));
            log(current_match.test(crule))
            if (current_match.test(crule)){
                return crule;
            }
        } catch (e) {}
    }
    return rule;
}
$.exports = {
    encrypt,
    decrypt,
    tryDecrypt
}