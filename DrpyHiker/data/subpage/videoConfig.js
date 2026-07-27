function VideoSniffing(js, parse, t, islog) {
  var ua = fba.getUa();
  const isLog = islog;
  // 保存原始的 console.log 方法
  const originalConsoleLog = console.log;
  if (isLog) {
    try {
      console.log = function () {
        // 使用 Array.prototype.slice.call 来将 arguments 对象转换为数组
        const arr = Array.prototype.slice.call(arguments);
        // 使用 JSON.stringify 来转换非字符串参数
        const stringify = JSON.stringify;
        const processedArgs = arr.map(function (arg) {
          return typeof arg === "string" ? arg : stringify(arg);
        });
        let result = processedArgs.join(",");
        if (result.includes("油猴转换")) {
          return;
        }
        // 调用自定义的日志函数输出结果
        fba.log(t + ":" + result);
      };
    } catch (error) {
      // 如果发生错误，恢复原始的 console.log 方法
      console.log = originalConsoleLog;
    }
  }
  if (js) {
    console.log(js);
  }
  //当前页面为json解析
  let json = document.body.innerText;
  try {
    json = JSON.parse(json);
    console.log(json);
    if (json.hasOwnProperty("url")) {
      location.href = json.url;
    }
  } catch (e) { }


  let referer = document.referrer || /Referer:\s*(\S+)/i.test(document.location.href) && RegExp.$1;
  console.log("Referer:" + referer)
  console.log(window.location)
  console.log(ua);


  if (parse.hasOwnProperty("init_script")) {
    console.log("执行init_script");
    eval(parse.init_script);
    console.log(navigator.platform);
  }

  try {
    let fs = document.querySelectorAll("iframe");
    Array.from(fs).forEach(function (it) {
      if (it.src.includes("/embed/")) {
        console.log("成功找到");
        console.log(it.src);
        location.href = it.src;
        return;
      }
    });
  } catch (e) {
    console.log("iframe不存在");
  }
  let urls = _getUrls();

  function VidFilter(videoList, videoRules, excludeRule) {
    // 使用 Set 来存储已见过的视频，用于去重
    const seenVideos = new Set();
    return videoList.filter(video => {
      // 检查文件是否符合视频规则
      let isIncluded = videoRules.some(rule => {
        let regexPattern;
        if (rule.includes("*")) {
          regexPattern = rule.replace(/\*\./g, '.*\\.');
        } else {
          regexPattern = rule.replace(/\./g, '\\.');
        }
        //console.log(regexPattern.toString())
        // 创建正则表达式对象
        const regex = new RegExp(regexPattern);
        return regex.test(video);
      });
      // 检查文件是否符合排除规则
      let isExcluded = excludeRule.some(rule => video.includes(rule));
      // 检查视频是否已经出现过，用于去重
      let isDuplicate = seenVideos.has(video);
      // 如果视频未出现过，则添加到 Set 中
      if (!isDuplicate) {
        seenVideos.add(video);
      }
      // 返回文件是否应该被包含，即符合视频规则、不符合排除规则且不是重复项
      return isIncluded && !isExcluded && !isDuplicate;
    });
  }

  //eval(js)
  try {
    let attemptCount = 0;
    let maxAttempts = 10;
    let timer = setInterval(() => {
      urls = _getUrls();
      filteredUrls = VidFilter(urls, parse["videoRules"], parse["videoExcludeRules"]);
      //console.log(filteredUrls.length); // 可以根据需要打印或处理 filteredUrls 的长度
      if (filteredUrls.length > 0) {
        console.log("筛选数量:" + filteredUrls.length);
        console.log(filteredUrls);
        clearInterval(timer); // 清除定时器
        console.log("成功");
        return;
      } else if (++attemptCount >= maxAttempts) {
        clearInterval(timer); // 超时，清除定时器
        console.log("超时");
      } else {
        try {
          if (js) {
            eval(js);
          }
          if (js) {
            let video = document.querySelector("video");
            //console.log(document.body.outerHTML);
            let vplayer = document.querySelector("#vplayer");
            if (vplayer) {
              if (typeof jwplayer == "function") {
                jwplayer(vplayer).play();
              }
            }

            if (video) {
              if (typeof videojs == "function" && video.playerId) {
                videojs(video.playerId).play();
                console.log("videojs播放");
              }
              if (video.src && !video.src.startsWith("blob:")) {
                location.href = video.src;
              }
              console.log(video.outerHTML);
              video.play();
            };
            console.log("执行js点击")
          }
        } catch (e) {
          console.log(e.message);
        }
      }
      // 如果需要在外部使用 filteredUrls，可以在定时器停止后进行赋值
    }, 1000);
  } catch (e) {
    console.log(e.message);
  }
}
$$$.exports = {
  vs: VideoSniffing
}