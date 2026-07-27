function importClass(clsname) {
    return new org.mozilla.javascript.NativeJavaClass(this, findJavaClass(clsname));
}
loadJavaClass("hiker://files/data/DrpyHiker/plug/jianpian/bidi.dex", "com.rule.jianpian", "hiker://files/data/DrpyHiker/plug/jianpian/arm64-v8a/libp2p.so");
const JianPian=importClass("com.rule.jianpian");
JianPian.init(getPath("hiker://files/_cache").replace("file://", ""));
$.exports={
    play(url){
        return JianPian.JPUrlDec(url); 
    },
    release(){
        JianPian.finish();
    }
}