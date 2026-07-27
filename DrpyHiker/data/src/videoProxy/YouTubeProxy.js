function importClass(clsname) {
    return new org.mozilla.javascript.NativeJavaClass(this, findJavaClass(clsname));
}
loadJavaClass("hiker://files/data/DrpyHiker/plug/youtube/classes.dex", "com.example.Youtube");
const Youtube = importClass("com.example.Youtube");
const YoutubeExtractor = new Youtube();

$.exports={
    match(url){
        return YoutubeExtractor.match(url); 
    },
    fetch(url){
        return YoutubeExtractor.fetch(url);
    }
}