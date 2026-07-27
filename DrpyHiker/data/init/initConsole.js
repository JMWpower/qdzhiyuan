const Console = $.require("./libs/Console.js");

const ConfigManager = $.require('./subpage/ConfigManager.js');
let consoleE = {};

if (!ConfigManager.getGlobal("useLog")) {

    let isDev = com.example.hikerview.ui.setting.model.SettingConfig.developerMode;
    consoleE = new Console({
        stdout(l, m, t) {
            if(isDev&&l==="debug"){
                log(m);
            }
        },
        Tag:"DHAPP"
    });
    consoleE.isFloating = false;
} else {

    if (ConfigManager.getGlobal("useCFloatingWindow")) {
        const CFloatingWindow = GA.defineModule("CFloatingWindow", "./libs/CFloatingWindow.js");
        consoleE = new Console({
            stdout(l, m, t) {
                let TYPE = CFloatingWindow.LOG_TYPE[l.toUpperCase()] || CFloatingWindow.LOG_TYPE.LOG;
                CFloatingWindow.addLog(String(m), TYPE, t);
                log(l + "->["+ t+"]\n"+ m);
            },
            Tag:"DHAPP"
        });
        Object.assign(consoleE, {
            show: CFloatingWindow.show,
            destroy: CFloatingWindow.destroy,
            minimize: CFloatingWindow.minimize,
            clear: CFloatingWindow.minimize,
            isFloating: true
        });
    } else {
        consoleE = new Console({
            stdout(l, m, t) {
                log(l + "->["+ t+"]\n"+ m);
            },
            Tag:"DHAPP"
        });
        consoleE.isFloating=false;
    }
}
$.exports = Object.assign(consoleE, {
    Level: Console.Level
});
