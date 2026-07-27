// ====== Java Imports  ======
const ThreadTool = com.example.hikerview.utils.ThreadTool;
const Context = android.content.Context;
const WindowManager = android.view.WindowManager;
const LayoutParams = android.view.WindowManager.LayoutParams;
const Gravity = android.view.Gravity;
const Color = android.graphics.Color;
const TypedValue = android.util.TypedValue;
const GradientDrawable = android.graphics.drawable.GradientDrawable;
const PreferenceMgr = com.example.hikerview.utils.PreferenceMgr;

const androidx = Packages.androidx;
const RecyclerView = androidx.recyclerview.widget.RecyclerView;
const LinearLayoutManager = androidx.recyclerview.widget.LinearLayoutManager;
const SimpleDateFormat = java.text.SimpleDateFormat;
const ClipData = android.content.ClipData;
const ClipboardManager = android.content.ClipboardManager;
const Toast = android.widget.Toast;

const WebUtil = com.example.hikerview.utils.WebUtil;
const SpannableString = android.text.SpannableString;
const UnderlineSpan = android.text.style.UnderlineSpan;
const ClickableSpan = android.text.style.ClickableSpan;
const LinkMovementMethod = android.text.method.LinkMovementMethod;

const Uri = android.net.Uri;
const Pattern = java.util.regex.Pattern;
// ====== Android Handler 相关导入 ======
const Handler = android.os.Handler;
const Looper = android.os.Looper;

// ====== 引入用于计时的Java类 ======
const System = java.lang.System;

// ====== 常量定义 ======
const ANIM_DURATION = 300; // 动画时长(ms)
const CACHE_NAME = "hiker_suspend_logs";
const MAX_LOG_LINES = 1000;
const MAX_LOG_LENGTH = 3000;
const DATE_FORMAT = new SimpleDateFormat("HH:mm:ss.SSS");

// ====== 日志批处理常量和变量 ======
const LOG_FLUSH_DELAY = 50;
var logBatchQueue = [];
var logFlushRunnable = null;
var uiHandler = null; // Will be initialized globally
// ===================================


// ===================================

// 日志类型定义
const LOG_TYPE = {
    ALL: {
        tag: "All",
        color: "#FFFFFF",
        emoji: "📋"
    },
    LOG: {
        tag: "LOG",
        color: "#FFFFFF",
        emoji: "💬"
    },
    INFO: {
        tag: "INFO",
        color: "#4CAF50",
        emoji: "ℹ️"
    },
    WARN: {
        tag: "WARN",
        color: "#FFC107",
        emoji: "⚠️"
    },
    ERROR: {
        tag: "ERROR", // Changed from #F44336 to string "ERROR" for consistency with other tags
        color: "#F44336",
        emoji: "❌"
    },
    TRACE: {
        tag: "TRACE",
        color: "#80DEEA",
        emoji: "🔍"
    },
    TIMER: {
        tag: "TIMER",
        color: "#8BC34A",
        emoji: "⏱️"
    },
    TABLE: {
        tag: "TABLE",
        color: "#9C27B0",
        emoji: "📊"
    }
};

// ====== 全局变量 - 核心环境 ======
var context = getCurrentActivity();
var windowManager = context.getSystemService(Context.WINDOW_SERVICE);
const ANDROID_CONTEXT = context;

// 初始化 uiHandler
uiHandler = new Handler(Looper.getMainLooper());

// ====== UI 相关对象和配置 ======
const ui = {
    logWindowView: null,
    iconWindowView: null,
    resizeHandleView: null,
    moveHandleView: null,
    recyclerView: null,
    linearLayoutManager: null,
    logAdapter: null, // Log RecyclerView Adapter
    searchLayout: null,
    searchEditText: null,
    searchToggleButton: null,
    filterButtonRef: null // Reference to the filter button TextView
};

const uiConfig = {
    logWindowParams: null,
    iconWindowParams: null,
    isFixedMode: false,
    isLogWindowAnimating: false,
    isAutoScrollEnabled: true, // 控制是否自动滚动的标志
    currentLogFilterType: null,
    currentSearchQuery: null, // 当前搜索的关键词
    isSearchBoxVisible: false, // 搜索框是否可见

    // 存储日志窗口最小化前的尺寸和位置
    originalLogWindowX: 0,
    originalLogWindowY: 0,
    originalLogWindowWidth: 0,
    originalLogWindowHeight: 0,

    // 窗口位置和大小（从持久化加载）
    logWindowPosition: {
        x: 0,
        y: 0,
        width: 0,
        height: 0
    },
    iconWindowPosition: {
        x: 0,
        y: 0
    }
};

// 初始化 uiConfig 中的窗口位置和大小
uiConfig.logWindowPosition.x = loadIntPreference("LOG_WINDOW_X", 100);
uiConfig.logWindowPosition.y = loadIntPreference("LOG_WINDOW_Y", 100);
uiConfig.logWindowPosition.width = loadIntPreference("LOG_WINDOW_WIDTH", 0);
uiConfig.logWindowPosition.height = loadIntPreference("LOG_WINDOW_HEIGHT", 0);

uiConfig.iconWindowPosition.x = loadIntPreference("ICON_WINDOW_X", 100);
uiConfig.iconWindowPosition.y = loadIntPreference("ICON_WINDOW_Y", 100);

// 日志存储
var logs = []; // 存储所有日志

// ====== 工具函数 ======

// 在UI线程运行代码
function runOnUI(func) {
    ThreadTool.INSTANCE.runOnUI(new java.lang.Runnable({
        run: func
    }));
}

// dp转px
function dp2px(dp) {
    return TypedValue.applyDimension(
        TypedValue.COMPLEX_UNIT_DIP,
        dp,
        context.getResources().getDisplayMetrics()
    );
}

// 加载持久化数据
function loadPreference(key, defaultValue) {
    return PreferenceMgr.get(ANDROID_CONTEXT, CACHE_NAME, key, defaultValue);
}

function savePreference(key, value) {
    PreferenceMgr.put(ANDROID_CONTEXT, CACHE_NAME, key, String(value));
}

function removePreference(key) {
    PreferenceMgr.remove(ANDROID_CONTEXT, CACHE_NAME, key);
}

// 统一加载整数偏好设置
function loadIntPreference(key, defaultValue) {
    return parseInt(loadPreference(key, String(defaultValue)));
}

// 重置日志窗口视图属性
function resetLogWindowViewProperties() {
    if (!ui.logWindowView) return; // Added safety check
    ui.logWindowView.setAlpha(1.0);
    ui.logWindowView.setScaleX(1.0);
    ui.logWindowView.setScaleY(1.0);
    ui.logWindowView.setTranslationX(0);
    ui.logWindowView.setTranslationY(0);
    ui.logWindowView.setPivotX(0);
    ui.logWindowView.setPivotY(0);
    ui.logWindowView.setLayerType(android.view.View.LAYER_TYPE_NONE, null);
}

// ====== 获取过滤后的日志列表 ======
function getFilteredLogs() {
    var filteredByType = logs;

    // 类型过滤
    if (uiConfig.currentLogFilterType !== null) {
        filteredByType = logs.filter(function(log) {
            return log.type.tag === uiConfig.currentLogFilterType;
        });
    }

    // 文本搜索过滤
    if (uiConfig.currentSearchQuery !== null && uiConfig.currentSearchQuery.length > 0) {
        var lowerCaseQuery = uiConfig.currentSearchQuery.toLowerCase();
        // 确保 log.originalMsg 存在，以防万一
        return filteredByType.filter(function(log) {
            return log.originalMsg && log.originalMsg.toLowerCase().includes(lowerCaseQuery);
        });
    } else {
        return filteredByType;
    }
}

// 检查是否已经滚动到底部
function isAtBottom() {
    if (!ui.linearLayoutManager || getFilteredLogs().length === 0) return true;
    var lastVisibleItemPosition = ui.linearLayoutManager.findLastVisibleItemPosition();
    return lastVisibleItemPosition === (getFilteredLogs().length - 1);
}

// 辅助函数：创建导航栏按钮
function createNavButton(text) {
    var button = new android.widget.TextView(context);
    button.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
        dp2px(40),
        dp2px(48)
    ));
    button.setText(text);
    button.setTextSize(20);
    button.setTextColor(Color.WHITE);
    button.setGravity(Gravity.CENTER);

    var outValue = new TypedValue();
    context.getTheme().resolveAttribute(android.R.attr.selectableItemBackgroundBorderless, outValue, true);
    button.setBackgroundResource(outValue.resourceId);

    return button;
}

// ====== URL 处理函数 ======
const URL_REGEX_STRING = "\\b(?:https?://|www\\.)[^\\s\"'<>()\\[\\]{},;]+";

function processLogMessageForUrls(msg, linkColor) {
    var spannable = new SpannableString(msg);
    var matcher = Pattern.compile(URL_REGEX_STRING, Pattern.CASE_INSENSITIVE).matcher(msg);
    var lastEnd = 0;
    var spans = [];

    while (matcher.find()) {
        var url = matcher.group();
        var start = matcher.start();
        var end = matcher.end();

        // 跳过重叠的匹配
        if (start < lastEnd) continue;

        var cleanUrl = String(url).replace(/[.,;'")\\]$/, "");
        if (cleanUrl.length < url.length) {
            end = start + cleanUrl.length;
            url = cleanUrl;
        }

        var finalUrl = url;
        if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
            finalUrl = "http://" + finalUrl;
        }

        var clickableSpan = new JavaAdapter(ClickableSpan, {
            onClick: function(widget) {
                try {
                    WebUtil.goWeb(context, finalUrl);
                    minimizeWindow();
                } catch (e) {
                    console.error("Failed to open URL: " + finalUrl + " - " + e.message);
                }
            },
            updateDrawState: function(ds) {

            }
        });

        spans.push({
            start: start,
            end: end,
            underline: new UnderlineSpan(),
            clickable: clickableSpan
        });

        lastEnd = end;
    }

    // 按从后往前的顺序设置span
    for (var i = spans.length - 1; i >= 0; i--) {
        var span = spans[i];
        spannable.setSpan(span.underline, span.start, span.end, SpannableString.SPAN_EXCLUSIVE_EXCLUSIVE);
        spannable.setSpan(span.clickable, span.start, span.end, SpannableString.SPAN_EXCLUSIVE_EXCLUSIVE);
    }

    return spannable;
}


// ====== Log Console Core Logic ======

// 刷新日志到UI
function flushLogs() {
    runOnUI(function() {
        if (logBatchQueue.length === 0) {
            return;
        }

        logs.push.apply(logs, logBatchQueue); // Allowed, not spread syntax
        logBatchQueue = [];

        // 移除多余日志
        if (logs.length > MAX_LOG_LINES) {
            logs.splice(0, logs.length - MAX_LOG_LINES);
        }

        if (ui.logAdapter && ui.recyclerView) {
            ui.logAdapter.notifyDataSetChanged();

            if (uiConfig.isAutoScrollEnabled) {
                ui.recyclerView.post(new java.lang.Runnable({
                    run: function() {
                        if (getFilteredLogs().length > 0) { // 滚动到过滤后的列表末尾
                            ui.recyclerView.scrollToPosition(getFilteredLogs().length - 1);
                        }
                    }
                }));
            }
        }
    });
}

function addLog(msg, type, tag) {
    var formattedMsg = msg;

    if (formattedMsg.length > MAX_LOG_LENGTH) {
        formattedMsg = formattedMsg.substring(0, MAX_LOG_LENGTH) + "...[TRUNCATED]";
    }

    var time = DATE_FORMAT.format(new java.util.Date());
    var newLog = {
        time: time,
        type: type,
        tag: tag,
        originalMsg: formattedMsg,
        displayMsg: processLogMessageForUrls(formattedMsg, type.color)
    };
    logBatchQueue.push(newLog);

    if (logFlushRunnable !== null) {
        uiHandler.removeCallbacks(logFlushRunnable);
    }

    logFlushRunnable = new java.lang.Runnable({
        run: function() {
            flushLogs();
            logFlushRunnable = null;
        }
    });
    uiHandler.postDelayed(logFlushRunnable, LOG_FLUSH_DELAY);
}

// Log Item 视图创建
function createLogItemView(parent) {
    var container = new android.widget.LinearLayout(context);
    container.setOrientation(android.widget.LinearLayout.VERTICAL);
    container.setLayoutParams(new RecyclerView.LayoutParams(
        android.view.ViewGroup.LayoutParams.MATCH_PARENT,
        android.view.ViewGroup.LayoutParams.WRAP_CONTENT
    ));
    container.setPadding(dp2px(8), dp2px(4), dp2px(8), dp2px(4));

    var headerLayout = new android.widget.LinearLayout(context);
    headerLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    headerLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    ));

    var timeView = new android.widget.TextView(context);
    timeView.setId(101);
    timeView.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
        dp2px(80),
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    ));
    timeView.setTextSize(10);
    timeView.setTextColor(Color.parseColor("#AAAAAA"));
    headerLayout.addView(timeView);

    var typeView = new android.widget.TextView(context);
    typeView.setId(102);
    typeView.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    ));
    typeView.setTextSize(10);
    headerLayout.addView(typeView);

    container.addView(headerLayout);

    var msgView = new android.widget.TextView(context);
    msgView.setId(103);
    var msgParams = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    );
    msgParams.setMargins(0, dp2px(4), 0, 0);
    msgView.setLayoutParams(msgParams);
    msgView.setTextSize(13);
    container.addView(msgView);

    var divider = new android.view.View(context);
    var dividerParams = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        dp2px(1)
    );
    dividerParams.setMargins(0, dp2px(8), 0, 0);
    divider.setBackgroundColor(Color.parseColor("#444444"));
    divider.setLayoutParams(dividerParams);
    divider.setId(104);
    container.addView(divider);

    return container;
}

/**
 * 显示一个自定义的复制菜单。
 *
 * @param {android.widget.TextView} anchorView 菜单将显示在其附近的TextView，用于获取选中文本和定位
 * @param {string} fullLogMessage 原始的完整日志消息，以便在没有文本选中时复制
 */
function showCustomCopyMenu(anchorView, fullLogMessage) {
    var PopupWindow = android.widget.PopupWindow;
    var LinearLayout = android.widget.LinearLayout;
    var TextView = android.widget.TextView;
    var ClipData = android.content.ClipData;
    var Toast = android.widget.Toast;

    // 创建菜单布局
    var popupLayout = new LinearLayout(context);
    popupLayout.setOrientation(LinearLayout.HORIZONTAL);
    popupLayout.setGravity(Gravity.CENTER);

    // 设置背景
    var bgDrawable = new GradientDrawable();
    bgDrawable.setColor(Color.parseColor("#DD000000")); // 半透明深色背景
    bgDrawable.setCornerRadius(dp2px(6)); // 圆角
    popupLayout.setBackground(bgDrawable);
    popupLayout.setPadding(dp2px(8), dp2px(4), dp2px(8), dp2px(4));

    // 创建复制按钮
    var copyButton = new TextView(context);
    copyButton.setLayoutParams(new LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.WRAP_CONTENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    ));
    copyButton.setText("复制");
    copyButton.setTextColor(Color.WHITE);
    copyButton.setTextSize(14);
    copyButton.setPadding(dp2px(8), dp2px(4), dp2px(8), dp2px(4));

    var outValue = new TypedValue();
    context.getTheme().resolveAttribute(android.R.attr.selectableItemBackground, outValue, true);
    copyButton.setBackgroundResource(outValue.resourceId); // 设置可点击背景效果

    popupLayout.addView(copyButton);

    // 创建PopupWindow实例
    var popupWindow = new PopupWindow(popupLayout, LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, true);
    popupWindow.setOutsideTouchable(true); // 点击外部区域可关闭
    popupWindow.setFocusable(true); // 允许其获取焦点，以便接收点击事件

    popupWindow.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT)); // 透明背景，为了显示圆角背景

    // 设置复制按钮点击事件
    copyButton.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function(v) {
            var clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE);
            var textToCopy;
            var start = anchorView.getSelectionStart();
            var end = anchorView.getSelectionEnd();

            if (start !== end) {
                // 如果有文本被选中，则复制选中的文本
                textToCopy = anchorView.getText().subSequence(start, end).toString();
            } else {
                // 如果没有文本被选中，则复制完整的日志消息
                textToCopy = fullLogMessage;
            }

            var clip = ClipData.newPlainText("Log Text", textToCopy);
            clipboard.setPrimaryClip(clip);
            Toast.makeText(context, "已复制", Toast.LENGTH_SHORT).show();
            popupWindow.dismiss(); // 复制后关闭菜单
        }
    }));

    // 测量popupLayout，以获取其准确的宽度和高度，用于定位
    // 这必须在显示PopupWindow之前在UI线程上完成
    popupLayout.measure(
        android.view.View.MeasureSpec.makeMeasureSpec(0, android.view.View.MeasureSpec.UNSPECIFIED),
        android.view.View.MeasureSpec.makeMeasureSpec(0, android.view.View.MeasureSpec.UNSPECIFIED)
    );

    // 获取anchorView在屏幕上的坐标
    var location = java.lang.reflect.Array.newInstance(java.lang.Integer.TYPE, 2);
    anchorView.getLocationOnScreen(location);
    var anchorX = location[0];
    var anchorY = location[1];

    // 计算PopupWindow的显示位置：在anchorView上方居中显示
    // xOffset: 使得PopupWindow水平居中于anchorView
    var xOffset = anchorX + (anchorView.getWidth() - popupLayout.getMeasuredWidth()) / 2;
    // yOffset: 使得PopupWindow显示在anchorView上方，并留有8dp的间距
    var yOffset = anchorY - popupLayout.getMeasuredHeight() - dp2px(8);

    // 考虑屏幕顶部边界，如果弹窗会超出屏幕，则尝试显示在下方
    var screenHeight = context.getResources().getDisplayMetrics().heightPixels;
    if (yOffset < 0) {
        yOffset = anchorY + anchorView.getHeight() + dp2px(8);
    }

    // 显示PopupWindow
    popupWindow.showAtLocation(anchorView, Gravity.NO_GRAVITY, xOffset, yOffset);
}

// Log Adapter
function createlLogAdapter() {
    if (!ui.logAdapter) {

        ui.logAdapter = new JavaAdapter(androidx.recyclerview.widget.RecyclerView.Adapter, {
            getItemCount: function() {
                return getFilteredLogs().length;
            },

            onCreateViewHolder: function(parent, viewType) {
                var view = createLogItemView(parent);
                return new JavaAdapter(androidx.recyclerview.widget.RecyclerView.ViewHolder, {
                    constructor: function(itemView) {
                        this.super$androidx$recyclerview$widget$RecyclerView$ViewHolder(itemView);
                    }
                }, view);
            },

            onBindViewHolder: function(holder, position) {
                var filteredLogs = getFilteredLogs();
                if (position < 0 || position >= filteredLogs.length) {
                    return;
                }

                var log = filteredLogs[position];
                var view = holder.itemView;

                var timeView = view.findViewById(101);
                var typeView = view.findViewById(102);
                var msgView = view.findViewById(103);
                var divider = view.findViewById(104);

                timeView.setText(log.time);
                typeView.setText(log.type.emoji + " " + log.type.tag + (log.tag ? "  [" + log.tag + "]" : ""));
                typeView.setTextColor(Color.parseColor(log.type.color));
                msgView.setText(log.displayMsg);
                msgView.setTextColor(Color.parseColor(log.type.color));
                msgView.setForceDarkAllowed(false);
                msgView.setMovementMethod(LinkMovementMethod.getInstance());
                msgView.setTextIsSelectable(true); // 允许文本选中
                divider.setVisibility(position === filteredLogs.length - 1 ? android.view.View.GONE : android.view.View.VISIBLE);

                // 移除之前在整个item view上的长按监听器
                view.setOnLongClickListener(null);

                // 在 msgView (显示日志文本的TextView) 上设置长按监听器，以弹出自定义复制菜单
                msgView.setOnLongClickListener(new JavaAdapter(android.view.View.OnLongClickListener, {
                    onLongClick: function(v) {
                        // 确保在UI线程上操作，尤其是涉及到UI更新和PopupWindow显示
                        runOnUI(function() {
                            // 调用自定义复制菜单函数，传入msgView和原始日志消息
                            showCustomCopyMenu(msgView, log.originalMsg);
                        });
                        return true; // 消耗掉长按事件，防止其他默认行为
                    }
                }));
            },

            getItemId: function(position) {
                return position;
            }
        });
    }
}
// ====== Window Management ======
//FLAG_NOT_FOCUSABLE/FLAG_NOT_TOUCH_MODAL
function createLogWindow() {
    uiConfig.logWindowParams = new LayoutParams(
        uiConfig.logWindowPosition.width > 0 ? uiConfig.logWindowPosition.width : LayoutParams.MATCH_PARENT,
        uiConfig.logWindowPosition.height > 0 ? uiConfig.logWindowPosition.height : context.getResources().getDisplayMetrics().heightPixels * 2 / 3,
        LayoutParams.TYPE_APPLICATION_OVERLAY,
        LayoutParams.FLAG_NOT_TOUCH_MODAL | LayoutParams.FLAG_LAYOUT_NO_LIMITS,
        android.graphics.PixelFormat.TRANSLUCENT
    );

    uiConfig.logWindowParams.gravity = Gravity.TOP | Gravity.LEFT;
    uiConfig.logWindowParams.x = uiConfig.logWindowPosition.x;
    uiConfig.logWindowParams.y = uiConfig.logWindowPosition.y;

    var container = new android.widget.LinearLayout(context);
    container.setFocusable(true);
    container.setFocusableInTouchMode(true);
    container.setOnKeyListener(new android.view.View.OnKeyListener({
        onKey: function(v, keyCode, event) {
            // 监听按键抬起且是返回键
            if (event.getAction() === android.view.KeyEvent.ACTION_UP && 
                keyCode === android.view.KeyEvent.KEYCODE_BACK) {
  
                minimizeWindow();
                return true; // 消费事件，防止传递给底层APP
            }
            return false;
        }
    }));
    container.setOrientation(android.widget.LinearLayout.VERTICAL);
    container.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT
    ));

    var bgDrawable = new GradientDrawable();
    bgDrawable.setColor(Color.parseColor("#CC000000"));
    bgDrawable.setCornerRadius(dp2px(10));
    container.setBackground(bgDrawable);

    var navBg = new GradientDrawable();
    navBg.setColor(Color.parseColor("#80000000"));
    navBg.setCornerRadii([dp2px(10), dp2px(10), dp2px(10), dp2px(10), 0, 0, 0, 0]);

    var navBar = new android.widget.LinearLayout(context);
    navBar.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
        LayoutParams.MATCH_PARENT,
        dp2px(48)
    ));
    navBar.setBackground(navBg);
    navBar.setGravity(Gravity.CENTER_VERTICAL);

    var title = new android.widget.TextView(context);
    title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
        0,
        LayoutParams.WRAP_CONTENT,
        1
    ));
    title.setText("Console");
    title.setTextColor(Color.WHITE);
    title.setTextSize(15);
    title.setPadding(dp2px(16), 0, 0, 0);
    navBar.addView(title); // index 0

    // ====== 搜索切换按钮 ======
    ui.searchToggleButton = createNavButton("🔎");
    ui.searchToggleButton.setTag("search_toggle_btn");
    ui.searchToggleButton.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function() {
            toggleSearchBoxVisibility();
        }
    }));
    navBar.addView(ui.searchToggleButton, 1);
    // =============================================

    var filterButton = createNavButton("All");
    filterButton.setTag("filter_btn");
    filterButton.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function() {
            showLogFilterPopup(filterButton);
        }
    }));
    navBar.addView(filterButton, 2); // 插入到 index 2
    ui.filterButtonRef = filterButton; // Assign to ui object
    updateFilterButtonText();

    var buttons = [{
            text: "🔒",
            action: toggleFixedMode,
            id: "fix_btn"
        },
        {
            text: "➖",
            action: minimizeWindow
        },
        {
            text: "✕",
            action: hideWindow
        },
        {
            text: "🗑️",
            action: clearLogs
        }
    ];

    // Using forEach is fine, no spread operator for object/array literal creation
    buttons.forEach(function(btn, index) {
        var button = createNavButton(btn.text);
        if (btn.id) button.setTag(btn.id);
        button.setOnClickListener(new android.view.View.OnClickListener({
            onClick: btn.action
        }));
        navBar.addView(button, index + 3); // 从 index 3 开始添加
    });

    container.addView(navBar);

    // ====== 搜索框布局 ======
    ui.searchLayout = new android.widget.LinearLayout(context);
    ui.searchLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    ui.searchLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
        LayoutParams.MATCH_PARENT,
        dp2px(48)
    ));
    ui.searchLayout.setBackgroundColor(Color.parseColor("#333333")); // 深一点的背景
    ui.searchLayout.setPadding(dp2px(8), 0, dp2px(8), 0);
    ui.searchLayout.setGravity(Gravity.CENTER_VERTICAL);
    ui.searchLayout.setVisibility(android.view.View.GONE); // 默认隐藏

    ui.searchEditText = new android.widget.EditText(context);
    ui.searchEditText.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
        0,
        LayoutParams.WRAP_CONTENT,
        1 // 权重，占据大部分空间
    ));
    ui.searchEditText.setHint("搜索日志...");
    ui.searchEditText.setHintTextColor(Color.parseColor("#AAAAAA"));
    ui.searchEditText.setTextColor(Color.WHITE);
    ui.searchEditText.setTextSize(14);
    ui.searchEditText.setSingleLine(true);
    ui.searchEditText.setBackground(null); // 去除默认背景，融入背景色
    ui.searchEditText.setOnKeyListener(new android.view.View.OnKeyListener({
        onKey: function(v, keyCode, event) {
            // 监听返回键抬起
            if (event.getAction() === android.view.KeyEvent.ACTION_UP && 
                keyCode === android.view.KeyEvent.KEYCODE_BACK) {
                
                // 逻辑：如果搜索框有焦点且按了返回，则关闭搜索框
                toggleSearchBoxVisibility();
                ui.logWindowView.requestFocus();
                return true; // 消费事件，阻止系统继续处理
            }
            return false;
        }
    }));
    ui.searchLayout.addView(ui.searchEditText);

    var searchActionBtn = createNavButton("🔎"); // 搜索按钮
    searchActionBtn.setTextSize(16);
    searchActionBtn.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
        dp2px(40),
        dp2px(40)
    ));
    searchActionBtn.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function() {
            performSearch();
        }
    }));
    ui.searchLayout.addView(searchActionBtn);

    container.addView(ui.searchLayout);
    // =============================================

    ui.recyclerView = new RecyclerView(context);
    ui.recyclerView.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
        LayoutParams.MATCH_PARENT,
        LayoutParams.MATCH_PARENT,
        1
    ));
    ui.recyclerView.setId(2);

    ui.linearLayoutManager = new LinearLayoutManager(context);
    ui.recyclerView.setLayoutManager(ui.linearLayoutManager);
    createlLogAdapter();
    ui.recyclerView.setAdapter(ui.logAdapter);
    ui.recyclerView.setHasFixedSize(true);

    container.addView(ui.recyclerView);

    // RecyclerView 滚动监听器
    ui.recyclerView.addOnScrollListener(new JavaAdapter(RecyclerView.OnScrollListener, {
        onScrollStateChanged: function(recyclerView, newState) {
            if (newState === RecyclerView.SCROLL_STATE_IDLE) {
                if (isAtBottom()) {
                    uiConfig.isAutoScrollEnabled = true;
                }
            } else if (newState === RecyclerView.SCROLL_STATE_DRAGGING) {
                if (!isAtBottom()) {
                    uiConfig.isAutoScrollEnabled = false;
                }
            }
        },
        onScrolled: function(recyclerView, dx, dy) {
            // 确保向上滚动时禁用自动滚动
            if (dy < 0 && !isAtBottom()) { // dy < 0 表示向上滚动
                uiConfig.isAutoScrollEnabled = false;
            } else if (dy > 0 && isAtBottom()) { // dy > 0 表示向下滚动，如果到底部则重新开启
                uiConfig.isAutoScrollEnabled = true;
            }
        }
    }));

    // 导航栏拖动逻辑
    (function() {
        var lastX = 0,
            lastY = 0;
        navBar.setOnTouchListener(new android.view.View.OnTouchListener({
            onTouch: function(v, event) {
                if (uiConfig.isFixedMode) return false;

                switch (event.getAction()) {
                    case android.view.MotionEvent.ACTION_DOWN:
                        lastX = event.getRawX();
                        lastY = event.getRawY();
                        return true;
                    case android.view.MotionEvent.ACTION_MOVE:
                        var dx = event.getRawX() - lastX;
                        var dy = event.getRawY() - lastY;
                        uiConfig.logWindowParams.x += dx;
                        uiConfig.logWindowParams.y += dy;
                        windowManager.updateViewLayout(container, uiConfig.logWindowParams);
                        lastX = event.getRawX();
                        lastY = event.getRawY();

                        uiConfig.logWindowPosition.x = uiConfig.logWindowParams.x;
                        uiConfig.logWindowPosition.y = uiConfig.logWindowParams.y;
                        savePreference("LOG_WINDOW_X", uiConfig.logWindowPosition.x);
                        savePreference("LOG_WINDOW_Y", uiConfig.logWindowPosition.y);
                        return true;
                }
                return false;
            }
        }));
    })();

    ui.logWindowView = container; // Assign to ui object

    if (loadPreference("FIXED_STATE", "false") === "true") {
        toggleFixedMode();
    }
}

function updateFilterButtonText() {
    if (ui.filterButtonRef) {
        if (uiConfig.currentLogFilterType === null) {
            ui.filterButtonRef.setText(LOG_TYPE.ALL.emoji);
        } else {

            var selectedLogType = Object.values(LOG_TYPE).find(function(type) {
                return type.tag === uiConfig.currentLogFilterType;
            });
            if (selectedLogType) {
                ui.filterButtonRef.setText(selectedLogType.emoji);
            } else {
                ui.filterButtonRef.setText("❓");
            }
        }
    }
}

// ====== 搜索相关函数 ======
// 切换搜索框可见性
function toggleSearchBoxVisibility() {
    if (!ui.searchLayout || !ui.searchToggleButton || !ui.searchEditText) return;

    uiConfig.isSearchBoxVisible = !uiConfig.isSearchBoxVisible;

    if (uiConfig.isSearchBoxVisible) {
        ui.searchLayout.setVisibility(android.view.View.VISIBLE);
        ui.searchToggleButton.setText("🔙"); // 变为关闭图标
        ui.searchEditText.requestFocus();
        // 弹出键盘
        var imm = context.getSystemService(Context.INPUT_METHOD_SERVICE);
        imm.showSoftInput(ui.searchEditText, 0);
    } else {
        ui.searchLayout.setVisibility(android.view.View.GONE);
        ui.searchToggleButton.setText("🔎"); // 恢复初始文本
        // 隐藏键盘
        var imm = context.getSystemService(Context.INPUT_METHOD_SERVICE);
        imm.hideSoftInputFromWindow(ui.searchEditText.getWindowToken(), 0);
        clearSearch(); // 关闭搜索框时，清除当前搜索并刷新列表
    }
}

// 执行搜索
function performSearch() {
    if (!ui.searchEditText) return;
    var query = String(ui.searchEditText.getText().toString()).trim();

    if (query.length > 0) {
        uiConfig.currentSearchQuery = query;
    } else {
        uiConfig.currentSearchQuery = null; // 空查询等同于没有搜索
    }
    ui.logAdapter.notifyDataSetChanged();
    // 搜索后滚动到顶部或第一个匹配项，这里选择顶部
    if (ui.logAdapter.getItemCount() > 0) {
        ui.recyclerView.scrollToPosition(0);
    }
    // 隐藏键盘
    var imm = context.getSystemService(Context.INPUT_METHOD_SERVICE);
    imm.hideSoftInputFromWindow(ui.searchEditText.getWindowToken(), 0);
}

// 清除搜索
function clearSearch() {
    if (ui.searchEditText) {
        ui.searchEditText.setText(""); // 清空输入框内容
    }
    uiConfig.currentSearchQuery = null; // 重置搜索查询
    // 刷新日志列表以显示所有日志（或仅按类型过滤的日志）
    ui.logAdapter.notifyDataSetChanged();
    // 滚动到日志底部，如果之前开启了自动滚动
    if (uiConfig.isAutoScrollEnabled && getFilteredLogs().length > 0) {
        ui.recyclerView.post(new java.lang.Runnable({
            run: function() {
                ui.recyclerView.scrollToPosition(getFilteredLogs().length - 1);
            }
        }));
    }
}
// ===================================
// ====== 显示日志类型过滤弹窗 ======
function showLogFilterPopup(anchorView) {
    var PopupWindow = android.widget.PopupWindow;
    var LinearLayout = android.widget.LinearLayout;
    var TextView = android.widget.TextView;

    var popupLayout = new LinearLayout(context);
    popupLayout.setOrientation(LinearLayout.VERTICAL);

    var bgDrawable = new GradientDrawable();
    bgDrawable.setColor(Color.parseColor("#CC222222")); // 半透明深灰色背景
    bgDrawable.setCornerRadius(dp2px(8));
    popupLayout.setBackground(bgDrawable);
    popupLayout.setPadding(dp2px(4), dp2px(4), dp2px(4), dp2px(4));

    var types = [];
    for (var key in LOG_TYPE) {
        types.push(LOG_TYPE[key]);
    }

    var currentSelectedTag = uiConfig.currentLogFilterType === null ? "All" : uiConfig.currentLogFilterType;

    types.forEach(function(type) {
        var itemTextView = new TextView(context);
        itemTextView.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            dp2px(40)
        ));
        itemTextView.setPadding(dp2px(16), 0, dp2px(16), 0);
        itemTextView.setGravity(Gravity.CENTER_VERTICAL);
        itemTextView.setTextSize(12);
        itemTextView.setTextColor(Color.WHITE);

        var displayTag = type.tag;

        itemTextView.setText(type.emoji + " " + type.tag);

        var outValue = new TypedValue();
        context.getTheme().resolveAttribute(android.R.attr.selectableItemBackground, outValue, true);
        itemTextView.setBackgroundResource(outValue.resourceId);

        if (displayTag === currentSelectedTag) {
            itemTextView.setTextColor(Color.parseColor("#42A5F5")); // 亮蓝色，表示选中
        }

        itemTextView.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) {
                runOnUI(function() {
                    if (type.tag === "All") {
                        uiConfig.currentLogFilterType = null;
                    } else {
                        uiConfig.currentLogFilterType = type.tag;
                    }
                    updateFilterButtonText();
                    ui.logAdapter.notifyDataSetChanged();

                    if (uiConfig.isAutoScrollEnabled && getFilteredLogs().length > 0) {
                        ui.recyclerView.post(new java.lang.Runnable({
                            run: function() {
                                ui.recyclerView.scrollToPosition(getFilteredLogs().length - 1);
                            }
                        }));
                    }
                    popupWindow.dismiss();
                });
            }
        }));
        popupLayout.addView(itemTextView);
    });

    var popupWindow = new PopupWindow(popupLayout, LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, true);
    popupWindow.setOutsideTouchable(true);
    popupWindow.setFocusable(true);

    popupWindow.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));

    popupWindow.showAsDropDown(anchorView); // 在锚点视图下方显示
}

function toggleFixedMode() {
    uiConfig.isFixedMode = !uiConfig.isFixedMode;

    var fixBtn = ui.logWindowView.findViewWithTag("fix_btn");
    if (fixBtn) {
        fixBtn.setText(uiConfig.isFixedMode ? "🔓" : "🔒");
    }

    savePreference("FIXED_STATE", uiConfig.isFixedMode);

    if (uiConfig.isFixedMode) {
        createResizeHandle();
        createMoveHandle();
    } else {
        if (ui.resizeHandleView) {
            windowManager.removeView(ui.resizeHandleView);
            ui.resizeHandleView = null;
        }
        if (ui.moveHandleView) {
            windowManager.removeView(ui.moveHandleView);
            ui.moveHandleView = null;
        }
    }
}

function createResizeHandle() {
    if (ui.resizeHandleView) return;

    var size = dp2px(30);
    var params = new LayoutParams(
        size,
        size,
        LayoutParams.TYPE_APPLICATION_OVERLAY,
        LayoutParams.FLAG_NOT_TOUCH_MODAL,
        android.graphics.PixelFormat.TRANSLUCENT
    );

    params.gravity = Gravity.TOP | Gravity.LEFT;
    params.x = uiConfig.logWindowParams.x + uiConfig.logWindowParams.width - size;
    params.y = uiConfig.logWindowParams.y + uiConfig.logWindowParams.height - size;

    var view = new android.widget.TextView(context);
    view.setText("↘️");
    view.setTextSize(12);
    view.setGravity(Gravity.CENTER);

    var bgDrawable = new GradientDrawable();
    bgDrawable.setShape(GradientDrawable.OVAL);
    bgDrawable.setColor(Color.parseColor("#80000000"));
    view.setBackground(bgDrawable);

    (function() {
        var lastX = 0,
            lastY = 0;
        var startWidth = 0,
            startHeight = 0;

        view.setOnTouchListener(new android.view.View.OnTouchListener({
            onTouch: function(v, event) {
                switch (event.getAction()) {
                    case android.view.MotionEvent.ACTION_DOWN:
                        lastX = event.getRawX();
                        lastY = event.getRawY();
                        startWidth = uiConfig.logWindowParams.width;
                        startHeight = uiConfig.logWindowParams.height;
                        return true;

                    case android.view.MotionEvent.ACTION_MOVE:
                        var dx = event.getRawX() - lastX;
                        var dy = event.getRawY() - lastY;

                        var newWidth = Math.max(dp2px(200), startWidth + dx);
                        var newHeight = Math.max(dp2px(200), startHeight + dy);

                        uiConfig.logWindowParams.width = newWidth;
                        uiConfig.logWindowParams.height = newHeight;
                        windowManager.updateViewLayout(ui.logWindowView, uiConfig.logWindowParams); // Use ui.logWindowView

                        params.x = uiConfig.logWindowParams.x + newWidth - params.width;
                        params.y = uiConfig.logWindowParams.y + newHeight - params.height;
                        windowManager.updateViewLayout(view, params);

                        uiConfig.logWindowPosition.width = newWidth;
                        uiConfig.logWindowPosition.height = newHeight;
                        savePreference("LOG_WINDOW_WIDTH", newWidth);
                        savePreference("LOG_WINDOW_HEIGHT", newHeight);
                        return true;
                }
                return false;
            }
        }));
    })();

    ui.resizeHandleView = view;
    windowManager.addView(ui.resizeHandleView, params);
}

function createMoveHandle() {
    if (ui.moveHandleView) return; // Check ui.moveHandleView

    var size = dp2px(30);
    var params = new LayoutParams(
        size,
        size,
        LayoutParams.TYPE_APPLICATION_OVERLAY,
        LayoutParams.FLAG_NOT_TOUCH_MODAL,
        android.graphics.PixelFormat.TRANSLUCENT
    );

    params.gravity = Gravity.TOP | Gravity.LEFT;
    params.x = uiConfig.logWindowParams.x;
    params.y = uiConfig.logWindowParams.y;

    var view = new android.widget.TextView(context);
    view.setText("↖️");
    view.setTextSize(12);
    view.setGravity(Gravity.CENTER);

    var bgDrawable = new GradientDrawable();
    bgDrawable.setShape(GradientDrawable.OVAL);
    bgDrawable.setColor(Color.parseColor("#80000000"));
    view.setBackground(bgDrawable);

    (function() {
        var lastX = 0,
            lastY = 0;
        var startX = 0,
            startY = 0;

        view.setOnTouchListener(new android.view.View.OnTouchListener({
            onTouch: function(v, event) {
                switch (event.getAction()) {
                    case android.view.MotionEvent.ACTION_DOWN:
                        lastX = event.getRawX();
                        lastY = event.getRawY();
                        startX = uiConfig.logWindowParams.x;
                        startY = uiConfig.logWindowParams.y;
                        return true;

                    case android.view.MotionEvent.ACTION_MOVE:
                        var dx = event.getRawX() - lastX;
                        var dy = event.getRawY() - lastY;

                        var newX = startX + dx;
                        var newY = startY + dy;

                        uiConfig.logWindowParams.x = newX;
                        uiConfig.logWindowParams.y = newY;
                        windowManager.updateViewLayout(ui.logWindowView, uiConfig.logWindowParams); // Use ui.logWindowView

                        params.x = newX;
                        params.y = newY;
                        windowManager.updateViewLayout(view, params);

                        if (ui.resizeHandleView) { // Check ui.resizeHandleView
                            var resizeParams = ui.resizeHandleView.getLayoutParams();
                            resizeParams.x = newX + uiConfig.logWindowParams.width - resizeParams.width;
                            resizeParams.y = newY + uiConfig.logWindowParams.height - resizeParams.height;
                            windowManager.updateViewLayout(ui.resizeHandleView, resizeParams);
                        }

                        uiConfig.logWindowPosition.x = newX;
                        uiConfig.logWindowPosition.y = newY;
                        savePreference("LOG_WINDOW_X", newX);
                        savePreference("LOG_WINDOW_Y", newY);
                        return true;
                }
                return false;
            }
        }));
    })();

    ui.moveHandleView = view; // Assign to ui object
    windowManager.addView(ui.moveHandleView, params);
}

// 统一的隐藏窗口逻辑/动画
function hideWindowInternal(targetIconMode /* true = 最小化到图标 */ ) {
    var shouldTargetIconMode = (targetIconMode !== undefined ? targetIconMode : false); // Explicit check

    runOnUI(function() {
        if (!ui.logWindowView || ui.logWindowView.getParent() == null || uiConfig.isLogWindowAnimating) return;

        uiConfig.isLogWindowAnimating = true;

        if (ui.resizeHandleView && ui.resizeHandleView.getParent() != null) {
            windowManager.removeView(ui.resizeHandleView);
            ui.resizeHandleView = null;
        }
        if (ui.moveHandleView && ui.moveHandleView.getParent() != null) {
            windowManager.removeView(ui.moveHandleView);
            ui.moveHandleView = null;
        }

        uiConfig.originalLogWindowX = uiConfig.logWindowParams.x;
        uiConfig.originalLogWindowY = uiConfig.logWindowParams.y;
        uiConfig.originalLogWindowWidth = uiConfig.logWindowParams.width;
        uiConfig.originalLogWindowHeight = uiConfig.logWindowParams.height;

        ui.logWindowView.setPivotX(ui.logWindowView.getWidth() / 2.0);
        ui.logWindowView.setPivotY(ui.logWindowView.getHeight() / 2.0);
        ui.logWindowView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null);

        var animator = ui.logWindowView.animate();

        if (shouldTargetIconMode && uiConfig.iconWindowParams) {
            var targetScaleX = uiConfig.iconWindowParams.width / ui.logWindowView.getWidth();
            var targetScaleY = uiConfig.iconWindowParams.height / ui.logWindowView.getHeight();

            var winCenterX = uiConfig.logWindowParams.x + ui.logWindowView.getWidth() / 2.0;
            var winCenterY = uiConfig.logWindowParams.y + ui.logWindowView.getHeight() / 2.0;
            var iconCenterX = uiConfig.iconWindowParams.x + uiConfig.iconWindowParams.width / 2.0;
            var iconCenterY = uiConfig.iconWindowParams.y + uiConfig.iconWindowParams.height / 2.0;

            animator
                .alpha(0.0) // 透明淡出
                .scaleX(targetScaleX) // 缩小到图标大小
                .scaleY(targetScaleY)
                .translationX(iconCenterX - winCenterX) // 位移到图标中心
                .translationY(iconCenterY - winCenterY);
        } else {
            // 默认的向下滑出
            animator
                .alpha(0.0)
                .translationY(uiConfig.logWindowParams.height + dp2px(50)) // 滑出屏幕底部
                .scaleX(1.0)
                .scaleY(1.0);
        }

        animator.setDuration(ANIM_DURATION)
            .setListener(new JavaAdapter(android.animation.Animator.AnimatorListener, {
                onAnimationStart: function(anim) {},
                onAnimationEnd: function(anim) {
                    ui.logWindowView.post(new java.lang.Runnable({
                        run: function() {
                            if (ui.logWindowView && ui.logWindowView.getParent() != null) {
                                windowManager.removeView(ui.logWindowView);
                            }
                            resetLogWindowViewProperties();
                            uiConfig.isLogWindowAnimating = false;

                            if (shouldTargetIconMode) {
                                createIconWindow();
                            }
                        }
                    }));
                },
                onAnimationCancel: function(anim) {
                    ui.logWindowView.post(new java.lang.Runnable({
                        run: function() {
                            if (ui.logWindowView && ui.logWindowView.getParent() != null) {
                                windowManager.removeView(ui.logWindowView);
                            }
                            resetLogWindowViewProperties();
                            uiConfig.isLogWindowAnimating = false;
                        }
                    }));
                },
                onAnimationRepeat: function(anim) {}
            }))
            .start();
    });
}

// 按钮功能：最小化窗口
function minimizeWindow() {
    if (uiConfig.logWindowParams) {
        uiConfig.logWindowPosition.x = uiConfig.logWindowParams.x;
        uiConfig.logWindowPosition.y = uiConfig.logWindowParams.y;
        uiConfig.logWindowPosition.width = uiConfig.logWindowParams.width;
        uiConfig.logWindowPosition.height = uiConfig.logWindowParams.height;

        savePreference("LOG_WINDOW_X", uiConfig.logWindowPosition.x);
        savePreference("LOG_WINDOW_Y", uiConfig.logWindowPosition.y);
        savePreference("LOG_WINDOW_WIDTH", uiConfig.logWindowPosition.width);
        savePreference("LOG_WINDOW_HEIGHT", uiConfig.logWindowPosition.height);
    }
    uiConfig.isFixedMode = true; // Set to true to make sure handles are removed/not created
    toggleFixedMode(); // Call toggle to properly clean up handles
    hideWindowInternal(true);
}

// 按钮功能：完全隐藏窗口（无最小化图标）
function hideWindow() {
    if (uiConfig.logWindowParams) {
        uiConfig.logWindowPosition.x = uiConfig.logWindowParams.x;
        uiConfig.logWindowPosition.y = uiConfig.logWindowParams.y;
        uiConfig.logWindowPosition.width = uiConfig.logWindowParams.width;
        uiConfig.logWindowPosition.height = uiConfig.logWindowParams.height;

        savePreference("LOG_WINDOW_X", uiConfig.logWindowPosition.x);
        savePreference("LOG_WINDOW_Y", uiConfig.logWindowPosition.y);
        savePreference("LOG_WINDOW_WIDTH", uiConfig.logWindowPosition.width);
        savePreference("LOG_WINDOW_HEIGHT", uiConfig.logWindowPosition.height);
    }
    hideWindowInternal(false); // Explicitly pass false for targetIconMode
}

// 按钮功能：清理日志
function clearLogs() {
    runOnUI(function() {
        logs = [];
        logBatchQueue = [];

        counters = {};
        timers = {};

        // 清除类型过滤
        uiConfig.currentLogFilterType = null;
        updateFilterButtonText();

        // 清除文本搜索，并隐藏搜索框
        clearSearch(); // 会重置 uiConfig.currentSearchQuery 并刷新
        if (uiConfig.isSearchBoxVisible) { // 如果搜索框还在显示状态，则隐藏它并重置按钮文本
            uiConfig.isSearchBoxVisible = false;
            ui.searchLayout.setVisibility(android.view.View.GONE);
            ui.searchToggleButton.setText("🔎");
            // 隐藏键盘
            var imm = context.getSystemService(Context.INPUT_METHOD_SERVICE);
            imm.hideSoftInputFromWindow(ui.searchEditText.getWindowToken(), 0);
        }

        if (logFlushRunnable !== null) {
            uiHandler.removeCallbacks(logFlushRunnable);
            logFlushRunnable = null;
        }

        // ui.logAdapter.notifyDataSetChanged(); // clearSearch() 内部已经调用

        uiConfig.isAutoScrollEnabled = true;
    });
}

// 创建悬浮图标
function createIconWindow() {
    if (ui.iconWindowView && ui.iconWindowView.getParent() != null) return;

    uiConfig.iconWindowParams = new LayoutParams(
        dp2px(48), dp2px(48),
        LayoutParams.TYPE_APPLICATION_OVERLAY,
        LayoutParams.FLAG_NOT_FOCUSABLE,
        android.graphics.PixelFormat.TRANSLUCENT
    );
    uiConfig.iconWindowParams.gravity = Gravity.TOP | Gravity.LEFT;
    uiConfig.iconWindowParams.x = uiConfig.iconWindowPosition.x;
    uiConfig.iconWindowParams.y = uiConfig.iconWindowPosition.y;

    var iconView = new android.widget.TextView(context);
    iconView.setText("📋");
    iconView.setTextSize(20);
    iconView.setGravity(Gravity.CENTER);
    var bg = new GradientDrawable();
    bg.setShape(GradientDrawable.OVAL);
    bg.setColor(Color.parseColor("#CC000000"));
    iconView.setBackground(bg);

    iconView.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function() {
            show();
        }
    }));

    (function() {
        var lastX = 0,
            lastY = 0;
        var isDragging = false;
        var touchSlop = android.view.ViewConfiguration.get(context).getScaledTouchSlop();

        iconView.setOnTouchListener(new android.view.View.OnTouchListener({
            onTouch: function(v, ev) {
                switch (ev.getAction()) {
                    case android.view.MotionEvent.ACTION_DOWN:
                        lastX = ev.getRawX();
                        lastY = ev.getRawY();
                        isDragging = false;
                        return true;
                    case android.view.MotionEvent.ACTION_MOVE:
                        var curX = ev.getRawX(),
                            curY = ev.getRawY();
                        if (!isDragging && (Math.abs(curX - lastX) > touchSlop || Math.abs(curY - lastY) > touchSlop)) {
                            isDragging = true;
                        }
                        if (isDragging) {
                            var dx = curX - lastX,
                                dy = curY - lastY;
                            uiConfig.iconWindowParams.x += dx;
                            uiConfig.iconWindowParams.y += dy;
                            windowManager.updateViewLayout(iconView, uiConfig.iconWindowParams);
                            lastX = curX;
                            lastY = curY;

                            uiConfig.iconWindowPosition.x = uiConfig.iconWindowParams.x;
                            uiConfig.iconWindowPosition.y = uiConfig.iconWindowParams.y;
                            savePreference("ICON_WINDOW_X", uiConfig.iconWindowPosition.x);
                            savePreference("ICON_WINDOW_Y", uiConfig.iconWindowPosition.y);
                        }
                        return true;
                    case android.view.MotionEvent.ACTION_UP:
                        if (isDragging) {
                        
                            var screenWidth = context.getResources().getDisplayMetrics().widthPixels;
                            
                            var buttonWidth = v.getWidth();
                            var buttonHeight = v.getHeight();

                            // 计算当前中心点
                            var centerX = uiConfig.iconWindowParams.x + buttonWidth / 2;

                            // 确定吸附方向（左/右）
                            var targetX;
                            if (centerX < screenWidth / 2) {
                                // 吸附到左侧
                                targetX = 0;
                            } else {
                                // 吸附到右侧
                                targetX = screenWidth - buttonWidth;
                            }

                            // 使用属性动画实现平滑移动
                            var animator = android.animation.ValueAnimator.ofInt(
                                uiConfig.iconWindowParams.x,
                                targetX
                            );

                            animator.setDuration(200); // 200ms动画时长
                            animator.setInterpolator(new android.view.animation.DecelerateInterpolator());

                            animator.addUpdateListener(new android.animation.ValueAnimator.AnimatorUpdateListener({
                                onAnimationUpdate: function(animation) {
                                    uiConfig.iconWindowParams.x = animation.getAnimatedValue();
                                    windowManager.updateViewLayout(v, uiConfig.iconWindowParams);
                                }
                            }));

                            animator.addListener(new android.animation.Animator.AnimatorListener({
                                onAnimationEnd: function() {
                                   
                                    uiConfig.iconWindowPosition.x = uiConfig.iconWindowParams.x;
                                    savePreference("ICON_WINDOW_X", uiConfig.iconWindowParams.x);
                                    uiConfig.isLogWindowAnimating=false;
                                },
                                
                                onAnimationStart: function() {},
                                onAnimationCancel: function() {},
                                onAnimationRepeat: function() {}
                            }));
                            uiConfig.isLogWindowAnimating=true;
                            animator.start();
                        } else {
                            v.performClick();
                        }
                        return true;
                }
                return false;
            }
        }));
    })();

    ui.iconWindowView = iconView; // Assign to ui object
    windowManager.addView(ui.iconWindowView, uiConfig.iconWindowParams);
}

function show() {
    runOnUI(function() {
        if (!ui.logWindowView) createLogWindow(); // Ensure UI is initialized

        if (ui.logWindowView.getParent() != null || uiConfig.isLogWindowAnimating) return;

        // 如果图标仍在屏幕上，先把它移除
        if (ui.iconWindowView && ui.iconWindowView.getParent() != null) {
            windowManager.removeView(ui.iconWindowView);
            ui.iconWindowView = null;
        }

        // 计算起始状态
        var startAlpha = 0.0;
        var startScaleX = 1.0;
        var startScaleY = 1.0;
        var startTransX = 0;
        var startTransY = context.getResources().getDisplayMetrics().heightPixels; // 从屏幕底部

        if (uiConfig.iconWindowParams) {
            var winW = uiConfig.logWindowParams.width > 0 ? uiConfig.logWindowParams.width : context.getResources().getDisplayMetrics().widthPixels;
            var winH = uiConfig.logWindowParams.height > 0 ? uiConfig.logWindowParams.height : context.getResources().getMetrics().heightPixels * 2 / 3;

            var iconCenterX = uiConfig.iconWindowParams.x + uiConfig.iconWindowParams.width / 2.0;
            var iconCenterY = uiConfig.iconWindowParams.y + uiConfig.iconWindowParams.height / 2.0;
            var winCenterX = uiConfig.logWindowParams.x + winW / 2.0;
            var winCenterY = uiConfig.logWindowParams.y + winH / 2.0;

            startScaleX = uiConfig.iconWindowParams.width / winW;
            startScaleY = uiConfig.iconWindowParams.height / winH;
            startTransX = iconCenterX - winCenterX;
            startTransY = iconCenterY - winCenterY;
            startAlpha = 0.0;
        }

        // 把起始属性写到 View 上
        ui.logWindowView.setAlpha(startAlpha);
        ui.logWindowView.setScaleX(startScaleX);
        ui.logWindowView.setScaleY(startScaleY);
        ui.logWindowView.setTranslationX(startTransX);
        ui.logWindowView.setTranslationY(startTransY);
        ui.logWindowView.setPivotX(ui.logWindowView.getWidth() / 2.0);
        ui.logWindowView.setPivotY(ui.logWindowView.getHeight() / 2.0);
        ui.logWindowView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null);

        windowManager.addView(ui.logWindowView, uiConfig.logWindowParams);
        ui.logWindowView.requestFocus();
        uiConfig.isLogWindowAnimating = true;
        uiConfig.isAutoScrollEnabled = true; // 显示时，默认开启自动滚动

        // 在第一次绘制前启动动画
        var preDrawListener = new android.view.ViewTreeObserver.OnPreDrawListener({
            onPreDraw: function() {
                ui.logWindowView.getViewTreeObserver().removeOnPreDrawListener(this);

                ui.logWindowView.animate()
                    .alpha(1.0)
                    .scaleX(1.0)
                    .scaleY(1.0)
                    .translationX(0)
                    .translationY(0)
                    .setDuration(ANIM_DURATION)
                    .setListener(new JavaAdapter(android.animation.Animator.AnimatorListener, {
                        onAnimationStart: function(anim) {},
                        onAnimationEnd: function(anim) {
                            resetLogWindowViewProperties(); // 动画结束后恢复属性
                            uiConfig.isLogWindowAnimating = false;
                            if (isAtBottom()) {
                                ui.recyclerView.post(new java.lang.Runnable({
                                    run: function() {
                                        if (getFilteredLogs().length > 0) { // 滚动到过滤后的列表末尾
                                            ui.recyclerView.scrollToPosition(getFilteredLogs().length - 1);
                                        }
                                    }
                                }));
                            }
                        },
                        onAnimationCancel: function(anim) {
                            resetLogWindowViewProperties(); // 动画取消时恢复属性
                            uiConfig.isLogWindowAnimating = false;
                        },
                        onAnimationRepeat: function(anim) {}
                    }))
                    .start();
                return true;
            }
        });
        ui.logWindowView.getViewTreeObserver().addOnPreDrawListener(preDrawListener);
    });
};

function destroy() {
    while (uiConfig.isLogWindowAnimating) {
        java.lang.Thread.sleep(10);
    }
    runOnUI(function() {
        // Stop any pending log flushes
        if (logFlushRunnable !== null) {
            uiHandler.removeCallbacks(logFlushRunnable);
            logFlushRunnable = null;
        }

        // Remove all views from WindowManager if they are attached
        if (ui.logWindowView && ui.logWindowView.getParent() != null) {
            windowManager.removeView(ui.logWindowView);
        }
        if (ui.iconWindowView && ui.iconWindowView.getParent() != null) {
            windowManager.removeView(ui.iconWindowView);
        }
        if (ui.resizeHandleView && ui.resizeHandleView.getParent() != null) {
            windowManager.removeView(ui.resizeHandleView);
        }
        if (ui.moveHandleView && ui.moveHandleView.getParent() != null) {
            windowManager.removeView(ui.moveHandleView);
        }

        // Nullify UI object references
        ui.logWindowView = null;
        ui.iconWindowView = null;
        ui.resizeHandleView = null;
        ui.moveHandleView = null;
        ui.recyclerView = null;
        ui.linearLayoutManager = null;
        ui.logAdapter = null;
        ui.searchLayout = null;
        ui.searchEditText = null;
        ui.searchToggleButton = null;
        ui.filterButtonRef = null;

        // Reset UI config state
        uiConfig.logWindowParams = null;
        uiConfig.iconWindowParams = null;
        uiConfig.isFixedMode = false;
        uiConfig.isLogWindowAnimating = false;
        uiConfig.isAutoScrollEnabled = true;
        uiConfig.currentLogFilterType = null;
        uiConfig.currentSearchQuery = null;
        uiConfig.isSearchBoxVisible = false;
        uiConfig.originalLogWindowX = 0;
        uiConfig.originalLogWindowY = 0;
        uiConfig.originalLogWindowWidth = 0;
        uiConfig.originalLogWindowHeight = 0;
        // Reset position configs to default initial values (could also reload from preferences here if desired)
        uiConfig.logWindowPosition.x = loadIntPreference("LOG_WINDOW_X", 100);
        uiConfig.logWindowPosition.y = loadIntPreference("LOG_WINDOW_Y", 100);
        uiConfig.logWindowPosition.width = loadIntPreference("LOG_WINDOW_WIDTH", 0);
        uiConfig.logWindowPosition.height = loadIntPreference("LOG_WINDOW_HEIGHT", 0);
        uiConfig.iconWindowPosition.x = loadIntPreference("ICON_WINDOW_X", 100);
        uiConfig.iconWindowPosition.y = loadIntPreference("ICON_WINDOW_Y", 100);

        // Clear internal data
        logs = [];
        logBatchQueue = [];
    });
}
$.exports = {
    clearLogs,
    minimizeWindow,
    show,
    destroy,
    addLog,
    LOG_TYPE
};