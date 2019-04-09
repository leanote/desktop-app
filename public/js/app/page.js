// 主页渲染
//-------------

var noCharCodes = [37, 38, 39, 40, 16, 17, 18, 91];
var Resize;

// 写作模式
var Writting = {
    _mode: 'normal', // writting
    themeWrittingO: $('#themeWritting'),
    writtingToggleO: $('#writtingToggle'),
    bodyO: $('body'),
    isWriting: function() {
        return this._mode != 'normal';
    },
    init: function() {
        var me = this;
        me.writtingToggleO.click(function() {
            me.toggle();
        });
    },

    // 初始化写作
    // 主要是markdown两列宽度问题
    initWritting: function() {
        var width = UserInfo.MdEditorWidthForWritting;
        // 设中间
        if (!width) {
            width = this.bodyO.width() / 2;
        }
        Resize.setMdColumnWidth(width);
        // $("#mceToolbar").css("height", "40px");
        resizeEditor();

        // 切换到写模式
        Note.toggleWriteable();
    },
    initNormal: function() {
        Resize.setMdColumnWidth(UserInfo.MdEditorWidth);
        // $("#mceToolbar").css("height", "30px");
        resizeEditor();
    },

    toggle: function() {
        var me = this;
        me.themeWrittingO.attr('disabled', me._mode != 'normal');
        me._mode = me._mode == 'normal' ? 'writting' : 'normal';

        // 改变icon
        if (me._mode != 'normal') {
            $('body').addClass('writting');
            me.writtingToggleO.find('.fa').removeClass('fa-expand').addClass('fa-compress');

            me.initWritting();
        } else {
            $('body').removeClass('writting');
            me.writtingToggleO.find('.fa').removeClass('fa-compress').addClass('fa-expand');
            me.initNormal();
        }
    },
};

//----------------
// 拖拉改变变宽度
var Resize = {
    lineMove: false,
    mdLineMove: false,
    target: null,

    leftNotebook: $("#leftNotebook"),
    notebookSplitter: $("#notebookSplitter"),
    noteList: $("#noteList"),
    noteAndEditor: $("#noteAndEditor"),
    noteSplitter: $("#noteSplitter"),
    note: $("#note"),
    body: $("body"),
    leftColumn: $("#left-column"),
    rightColumn: $("#right-column"), // $("#preview-panel"), //
    mdSplitter: $("#mdSplitter2"),

    init: function() {
        var self = this;
        self.initEvent();
    },

    initEvent: function() {
        var self = this;

        // 鼠标点下
        $(".noteSplit").bind("mousedown", function(event) {
            event.preventDefault(); // 防止选择文本
            self.lineMove = true;
            $(this).css("background-color", "#ccc");
            self.target = $(this).attr("id");
            // 防止iframe捕获不了事件
            $("#noteMask").css("z-index", 99999); // .css("background-color", // "#ccc");
        });

        // 鼠标点下
        self.mdSplitter.bind("mousedown", function(event) {
            event.preventDefault(); // 防止选择文本
            if ($(this).hasClass('open')) {
                self.mdLineMove = true;
            }
            // $(this).css("background-color", "#ccc");
        });

        // 鼠标移动时
        self.body.bind("mousemove", function(event) {
            if (self.lineMove) { // 如果没有这个if会导致不能选择文本
                event.preventDefault();
                self.resize3Columns(event);
            } else if (self.mdLineMove) {
                event.preventDefault();
                self.resizeMdColumns(event);
            }
        });

        // 鼠标放开, 结束
        self.body.bind("mouseup", function(event) {
            self.stopResize();
            // 取消遮罩
            $("#noteMask").css("z-index", -1);
        });

        // 瞬间
        var everLeftWidth;
        $('.layout-toggler-preview').click(function() {
            var $t = $(this);
            var $p = self.leftColumn.parent();
            // 是开的
            if ($t.hasClass('open')) {
                var totalWidth = $p.width();
                var minRightWidth = 22;
                var leftWidth = totalWidth - minRightWidth;
                everLeftWidth = self.leftColumn.width();
                self.leftColumn.width(leftWidth);
                self.rightColumn.css('left', 'auto').width(minRightWidth);

                // 禁止split
                $t.removeClass('open'); //.addClass('close');
                self.rightColumn.find('.layout-resizer').removeClass('open');
                // $('.preview-container').hide();

                if (MD) {
                    MD.resize();
                }

            } else {
                $t.addClass('open');
                self.rightColumn.find('.layout-resizer').addClass('open');
                self.leftColumn.width(everLeftWidth);
                // $('.preview-container').show();
                self.rightColumn.css('left', everLeftWidth).width('auto');

                if (MD) {
                    MD.resize();
                }
            }
        });
    },
    // 停止, 保存数据
    stopResize: function() {
        var self = this;
        if (self.lineMove || self.mdLineMove) {
            // ajax保存
            UserService.updateG({
                MdEditorWidth: UserInfo.MdEditorWidth,
                MdEditorWidthForWritting: UserInfo.MdEditorWidthForWritting,
                NotebookWidth: UserInfo.NotebookWidth,
                NoteListWidth: UserInfo.NoteListWidth
            }, function() {
                // alert(UserInfo.NotebookWidth);
            });
        }
        self.lineMove = false;
        self.mdLineMove = false;
        $(".noteSplit").css("background", "none");
        self.mdSplitter.css("background", "none");
    },

    // 最终调用该方法
    set3ColumnsWidth: function(notebookWidth, noteListWidth) {
        var self = this;

        if (notebookWidth < 150 || noteListWidth < 100) {
            self.setTopDragWidth();
            return;
        }
        var noteWidth = self.body.width() - notebookWidth - noteListWidth;
        if (noteWidth < 400) {
            self.setTopDragWidth();
            return;
        }

        self.leftNotebook.width(notebookWidth);
        self.notebookSplitter.css("left", notebookWidth);

        self.noteAndEditor.css("left", notebookWidth);
        self.noteList.width(noteListWidth);
        self.noteSplitter.css("left", noteListWidth);
        self.note.css("left", noteListWidth + 2);

        UserInfo.NotebookWidth = notebookWidth;
        UserInfo.NoteListWidth = noteListWidth;

        self.setTopDragWidth();
    },
    resize3Columns: function(event, isFromeIfr) {
        var self = this;
        if (isFromeIfr) {
            event.clientX += self.body.width() - self.note.width();
        }

        var notebookWidth, noteListWidth;
        if (self.lineMove) {
            if (self.target == "notebookSplitter") {
                notebookWidth = event.clientX;
                noteListWidth = self.noteList.width();
                self.set3ColumnsWidth(notebookWidth, noteListWidth);
            } else {
                notebookWidth = self.leftNotebook.width();
                noteListWidth = event.clientX - notebookWidth;
                self.set3ColumnsWidth(notebookWidth, noteListWidth);
            }

            resizeEditor();
        }
    },

    // mdeditor
    resizeMDInterval: null,
    resizeMdColumns: function(event) {
        var self = this;
        if (self.mdLineMove) {
            var mdEditorWidth = event.clientX - self.leftColumn.offset().left; // self.leftNotebook.width() - self.noteList.width();
            self.setMdColumnWidth(mdEditorWidth);

            clearInterval(self.resizeMDInterval);
            self.resizeMDInterval = setTimeout(function() {
                MD.resize && MD.resize();
            }, 50);
        }
    },

    // 设置宽度
    setMdColumnWidth: function(mdEditorWidth) {
        var self = this;
        var allWidth = $('#note').width();
        if (mdEditorWidth > 100 && mdEditorWidth < allWidth - 80) {
            if (Writting.isWriting()) {
                UserInfo.MdEditorWidthForWritting = mdEditorWidth;
            } else {
                UserInfo.MdEditorWidth = mdEditorWidth;
            }

            self.leftColumn.width(mdEditorWidth);
            self.rightColumn.css("left", mdEditorWidth);
        }

        // 这样, scrollPreview 才会到正确的位置
        if (MD) {
            MD.onResize();
        }
    },

    // 左+中
    // 在atom中, 尽管title和tool的index比topDrag大也没用, 导致不能点击tool, 不能选择title
    setTopDragWidth: function() {
        if (!isMac()) {
            return;
        }
        var self = this;
        var width = UserInfo.NotebookWidth + UserInfo.noteListWidth;
        if (isNaN(width)) {
            width = self.leftNotebook.width() + self.noteList.width();
        }

        var w = width - 60 - 50;
        w = w > 100 ? w : 100;
        $('#topDrag').width(w + 'px');
    }
};

//--------------------------
// 手机端访问之
Mobile = {
    // 点击之笔记
    // 切换到编辑器模式
    noteO: $("#note"),
    bodyO: $("body"),
    setMenuO: $("#setMenu"),
    // 弃用, 统一使用Pjax
    hashChange: function() {
        var self = Mobile;
        var hash = location.hash;
        // noteId
        if (hash.indexOf("noteId") != -1) {
            self.toEditor(false);
            var noteId = hash.substr(8);
            Note.changeNote(noteId, false, false);
        } else {
            // 笔记本和笔记列表
            self.toNormal(false);
        }
    },
    init: function() {
        var self = this;
        self.isMobile();
    },
    isMobile: function() {
        var u = navigator.userAgent;
        LEA.isMobile = false;
        LEA.isMobile = /Mobile|Android|iPhone|iPad/i.test(u);
        LEA.isIpad = /iPad/i.test(u);
        LEA.isIphone = /iPhone/i.test(u);
        if (!LEA.isMobile && $(document).width() <= 700) {
            LEA.isMobile = true
        }
        return LEA.isMobile;
    },
    // 改变笔记, 此时切换到编辑器模式下
    // note.js click事件处理, 先切换到纯编辑器下, 再调用Note.changeNote()
    changeNote: function(noteId) {
        var self = this;
        if (!LEA.isMobile) {
            return true; }
        self.toEditor(true, noteId);
        return false;
    },

    toEditor: function(changeHash, noteId) {
        var self = this;
        self.bodyO.addClass("full-editor");
        self.noteO.addClass("editor-show");
        /*
        if(changeHash) {
        	if(!noteId) {
        		noteId = Note.curNoteId;
        	}
        	location.hash = "noteId=" + noteId;
        }
        */
    },
    toNormal: function(changeHash) {
        var self = this;
        self.bodyO.removeClass("full-editor");
        self.noteO.removeClass("editor-show");

        /*
        if(changeHash) {
        	location.hash = "notebookAndNote";
        }
        */
    },
    switchPage: function() {
        var self = this;
        if (!LEA.isMobile || LEA.isIpad) {
            return true; }
        if (self.bodyO.hasClass("full-editor")) {
            self.toNormal(true);
        } else {
            self.toEditor(true);
        }
        return false;
    }
};

function initSlimScroll() {
    return;
}

//-----------
// 初始化编辑器
function initEditor() {
    // editor
    // toolbar 下拉扩展, 也要resizeEditor
    var mceToobarEverHeight = 0;
    $("#moreBtn").click(function() {
        saveBookmark();
        var $editor = $('#editor');
        if ($editor.hasClass('all-tool')) {
            $editor.removeClass('all-tool');
        } else {
            $editor.addClass('all-tool');
        }

        restoreBookmark();
        return;

        var height = $("#mceToolbar").height();

        // 现在是折叠的
        if (height < $("#popularToolbar").height()) {
            $("#mceToolbar").height($("#popularToolbar").height());
            $(this).find("i").removeClass("fa-angle-down").addClass("fa-angle-up");
            mceToobarEverHeight = height;
        } else {
            $("#mceToolbar").height(mceToobarEverHeight);
            $(this).find("i").removeClass("fa-angle-up").addClass("fa-angle-down");
        }

        resizeEditor();

        restoreBookmark();
    });

    // 初始化编辑器
    tinymce.init({
        inline: true,
        theme: 'leanote',
        // readonly : false,
        valid_children: "+pre[div|#text|p|span|textarea|i|b|strong]", // ace
        setup: function(ed) {

            // electron下有问题, Ace剪切导致行数减少, #16
            ed.on('cut', function(e) {
                if ($(e.target).hasClass('ace_text-input')) {
                    e.preventDefault();
                    return;
                }
            });

            ed.on('keydown', function(e) {
                var num = e.which ? e.which : e.keyCode;
                // 如果是readony, 则不能做任何操作, 除了v, x, z
                if (Note.readOnly && ((e.ctrlKey || e.metaKey) && (num == 88 || num == 86 || num == 90))) {
                    console.log('keydown preventDefault')
                    e.preventDefault();
                    return;
                }

                // 没有ctrl, 直接输入x, <-
                if (Note.readOnly &&
                    !(e.ctrlKey || e.metaKey)) {
                    console.log('keydown preventDefault')
                    e.preventDefault();
                    return;
                }

                // 设置dirty, ctrl+c都设了
                if (!Note.readOnly) {
                    if (noCharCodes.indexOf(num) >= 0) {
                        setEditorIsDirty(true);
                    }
                }

                /*
				var num = e.which ? e.which : e.keyCode;
				if(e.ctrlKey || e.metaKey) {
				    if(num == 86) { // ctrl + v
				    	// document.execCommand('paste');
				    }
			    };
			    */
                // 0.25.2必须要, 默认没有
                // commonCmd(e);
            });
        },

        // fix TinyMCE Removes site base url
        // http://stackoverflow.com/questions/3360084/tinymce-removes-site-base-urls
        convert_urls: true,
        relative_urls: false,
        remove_script_host: false,

        selector: "#editorContent",
        // height: 100,//这个应该是文档的高度, 而其上层的高度是$("#content").height(),
        // parentHeight: $("#content").height(),
        // content_css : ["public/css/editor/editor.css"],
        // skin : "custom",
        language: Api.curLang.indexOf('zh') >= 0 ? 'zh' : 'en', // 语言
        plugins: [
            "autolink link image leaui_mindmap lists charmap hr", "paste",
            "searchreplace leanote_nav leanote_code tabfocus",
            "table directionality textcolor"
        ], // nonbreaking

        toolbar1: "formatselect | forecolor backcolor | bold italic underline strikethrough | image leaui_mindmap | leanote_code leanote_inline_code | bullist numlist | alignleft aligncenter alignright alignjustify",
        toolbar2: "outdent indent blockquote | link unlink | table | hr removeformat | subscript superscript | searchreplace | pastetext | leanote_ace_pre | fontselect fontsizeselect",

        // 使用tab键: http://www.tinymce.com/wiki.php/Plugin3x:nonbreaking
        // http://stackoverflow.com/questions/13543220/tiny-mce-how-to-allow-people-to-indent
        // nonbreaking_force_tab : true,

        menubar: false,
        toolbar_items_size: 'small',
        statusbar: false,
        url_converter: false,
        font_formats: "Arial=arial,helvetica,sans-serif;" + "Arial Black=arial black,avant garde;" + "Times New Roman=times new roman,times;" + "Courier New=courier new,courier;" + "Tahoma=tahoma,arial,helvetica,sans-serif;" + "Verdana=verdana,geneva;" + "宋体=SimSun;" + "新宋体=NSimSun;" + "黑体=SimHei;" + "Microsoft YaHei=Microsoft YaHei",
        block_formats: "Header 1=h1;Header 2=h2;Header 3=h3;Header 4=h4;Paragraph=p",
        // This option specifies whether data:url images (inline images) should be removed or not from the pasted contents.
        // Setting this to "true" will allow the pasted images, and setting this to "false" will disallow pasted images.
        // For example, Firefox enables you to paste images directly into any contentEditable field. This is normally not something people want, so this option is "false" by default.
        paste_data_images: true
    });

    // 刷新时保存 参考autosave插件
    window.onbeforeunload = function(e) {
        Note.curChangedSaveIt(true);
    };

    // 全局ctrl + s
    $("body").on('keydown', Note.saveNote);
}

//-----------------------
// 导航
var random = 1;

function scrollTo(self, tagName, text) {
    var iframe = $("#editorContent"); // .contents();
    if (Writting.isWriting()) {
        iframe = $('#editorContentWrap');
    }
    var target = iframe.find(tagName + ":contains(" + text + ")");
    random++;

    // 找到是第几个
    // 在nav是第几个
    var navs = $('#leanoteNavContent [data-a="' + tagName + '-' + encodeURI(text) + '"]');
    //	alert('#leanoteNavContent [data-a="' + tagName + '-' + encodeURI(text) + '"]')
    var len = navs.size();
    for (var i = 0; i < len; ++i) {
        if (navs[i] == self) {
            break;
        }
    }

    if (target.size() >= i + 1) {
        target = target.eq(i);
        // 之前插入, 防止多行定位不准
        // log(target.scrollTop());
        var top = iframe.scrollTop() - iframe.offset().top + target.offset().top; // 相对于iframe的位置
        // var nowTop = iframe.scrollTop();
        // log(nowTop);
        // log(top);
        // iframe.scrollTop(top);
        iframe.animate({ scrollTop: top }, 300); // 有问题
        return;
    }
}

// 设置宽度， 三栏
function setLayoutWidth() {
    //------------------------
    // 界面设置, 左侧是否是隐藏的
    UserInfo.NotebookWidth = UserInfo.NotebookWidth || $("#notebook").width();
    UserInfo.NoteListWidth = UserInfo.NoteListWidth || $("#noteList").width();

    Resize.init();
    // alert(UserInfo.NotebookWidth);
    Resize.set3ColumnsWidth(UserInfo.NotebookWidth, UserInfo.NoteListWidth);
    Resize.setMdColumnWidth(UserInfo.MdEditorWidth);
}

//--------------
// 调用之
$(function() {
    // 窗口缩放时
    $(window).resize(function() {
        Mobile.isMobile();
        resizeEditor();
    });

    // 初始化编辑器
    initEditor();

    // 左侧, folder 展开与关闭
    $(".folderHeader").click(function() {
        var body = $(this).next();
        var p = $(this).parent();
        if (!body.is(":hidden")) {
            $(".folderNote").removeClass("opened").addClass("closed");
            //					body.hide();
            p.removeClass("opened").addClass("closed");
            $(this).find(".fa-angle-down").removeClass("fa-angle-down").addClass("fa-angle-right");
        } else {
            $(".folderNote").removeClass("opened").addClass("closed");
            //					body.show();
            p.removeClass("closed").addClass("opened");
            $(this).find(".fa-angle-right").removeClass("fa-angle-right").addClass("fa-angle-down");
        }
    });

    // 导航隐藏与显示
    $(".leanoteNav h1").on("click", function(e) {
        var $leanoteNav = $(this).closest('.leanoteNav');
        if (!$leanoteNav.hasClass("unfolder")) {
            $leanoteNav.addClass("unfolder");
        } else {
            $leanoteNav.removeClass("unfolder");
        }
    });

    // 打开设置
    function openSetInfoDialog(whichTab) {
        showDialogRemote("/user/account", { tab: whichTab });
    }

    // 禁止双击选中文字
    $("#notebook, #newMyNote, #myProfile, #topNav, #notesAndSort", "#leanoteNavTrigger").bind("selectstart", function(e) {
        e.preventDefault();
        return false;
    });

    // 得到最大dropdown高度
    // 废弃
    function getMaxDropdownHeight(obj) {
        var offset = $(obj).offset();
        var maxHeight = $(document).height() - offset.top;
        maxHeight -= 70;
        if (maxHeight < 0) {
            maxHeight = 0;
        }

        var preHeight = $(obj).find("ul").height();
        return preHeight < maxHeight ? preHeight : maxHeight;
    }

    // 内容下的a点击, 跳转
    $('#editorContent').on('click', 'a', function(e) {
        e.preventDefault();
        if (LEA.readOnly) {
            var url = $(this).attr('href');
            if (isOtherSiteUrl(url)) {
                openExternal(url);
            }
        }
        return false;
    });

    $('#preview-contents').on('click', 'a', function(e) {
        e.preventDefault();
        var url = $(this).attr('href');
        if (isOtherSiteUrl(url)) {
            openExternal(url);
        }
    });

    // markdown编辑器paste
    $('#left-column').on('paste', function(e) {
        pasteImage(e);
    });
});


//------------
// pjax
//------------
var Pjax = {
    init: function() {
        var me = this;
        // 当history改变时
        window.addEventListener('popstate', function(evt) {
            var state = evt.state;
            if (!state) {
                return;
            }
            document.title = state.title || "Untitled";
            log("pop");
            me.changeNotebookAndNote(state.noteId);
        }, false);

        // ie9
        if (!history.pushState) {
            $(window).on("hashchange", function() {
                var noteId = getHash("noteId");;
                if (noteId) {
                    me.changeNotebookAndNote(noteId);
                }
            });
        }
    },
    // pjax调用
    // popstate事件发生时, 转换到noteId下, 此时要转换notebookId
    changeNotebookAndNote: function(noteId) {
        var note = Note.getNote(noteId);
        if (!note) {
            return;
        }
        var isShare = note.Perm != undefined;

        var notebookId = note.NotebookId;
        // 如果是在当前notebook下, 就不要转换notebook了
        if (Notebook.curNotebookId == notebookId) {
            // 不push state
            Note.changeNoteForPjax(noteId, false);
            return;
        }

        // 自己的
        if (!isShare) {
            // 先切换到notebook下, 得到notes列表, 再changeNote
            Notebook.changeNotebook(notebookId, function(notes) {
                Note.renderNotes(notes);
                // 不push state
                Note.changeNoteForPjax(noteId, false, true);
            });
            // 共享笔记
        } else {}
    },

    // ajax后调用
    changeNote: function(noteInfo) {
        var me = this;
        // life
        return;
        log("push");
        var noteId = noteInfo.NoteId;
        var title = noteInfo.Title;
        var url = '/note/' + noteId;
        if (location.hash) {
            url += location.hash;
        }
        // 如果支持pushState
        if (history.pushState) {
            var state = ({
                url: url,
                noteId: noteId,
                title: title,
            });
            history.pushState(state, title, url);
            document.title = title || 'Untitled';
            // 不支持, 则用hash
        } else {
            setHash("noteId", noteId);
        }
    }
};
$(function() {
    Pjax.init();
});

//----------
// aceEditor
LeaAce = {
    // aceEditorID
    _aceId: 0,
    // {id=>ace}
    _aceEditors: {},
    _isInit: false,
    _canAce: false,
    isAce: true, // 切换pre, 默认是true
    disableAddHistory: function() {
        tinymce.activeEditor.undoManager.setCanAdd(false);
    },
    resetAddHistory: function() {
        tinymce.activeEditor.undoManager.setCanAdd(true);
    },
    canAce: function() {
        return true;
        /*
        if(this._isInit) {
        	return this._canAce;
        }
        if(getVendorPrefix() == "webkit" && !Mobile.isMobile()) {
        	this._canAce = true;
        } else {
        	this._canAce = false;
        }
        this._isInit = true;
        return this._canAce;
        */
    },
    canAndIsAce: function() {
        return this.canAce() && this.isAce;
    },
    getAceId: function() {
        this.aceId++;
        return "leanote_ace_" + (new Date()).getTime() + "_" + this._aceId;
    },
    initAce: function(id, val, force) {
        var me = this;
        if (!force && !me.canAndIsAce()) {
            return;
        }
        var $pre = $('#' + id);
        if ($pre.length == 0) {
            return;
        }
        var rawCode = $pre.html(); // 原生code
        try {
            me.disableAddHistory();

            // 本身就有格式的, 防止之前有格式的显示为<span>(ace下)
            var classes = $pre.attr('class') || '';
            var isHtml = classes.indexOf('brush:html') != -1;
            if ($pre.attr('style')/* ||
                (!isHtml && $pre.html().indexOf('<style>') != -1)*/) { // 如果是html就不用考虑了, 因为html格式的支持有style
                $pre.html($pre.text());
            }
            $pre.find('.toggle-raw').remove();
            var preHtml = $pre.html();

            $pre.removeClass('ace-to-pre');
            $pre.attr("contenteditable", false); // ? 避免tinymce编辑
            var aceEditor = ace.edit(id);

            aceEditor.container.style.lineHeight = 1.5;
            aceEditor.setTheme("ace/theme/tomorrow");

            var brush = me.getPreBrush($pre);
            var b = "";
            if (brush) {
                try {
                    b = brush.split(':')[1];
                } catch (e) {}
            }
            if (!b || b === 'false') {
                b = 'javascript';
            }
            aceEditor.session.setMode("ace/mode/" + b);
            aceEditor.session.setOption("useWorker", false); // 不用语法检查
            // retina
            if (window.devicePixelRatio == 2) {
                aceEditor.setFontSize("12px");
            } else {
                aceEditor.setFontSize("14px");
            }

            aceEditor.getSession().setUseWorker(false); // 不用语法检查
            aceEditor.setOption("showInvisibles", false); // 不显示空格, 没用
            aceEditor.setShowInvisibles(false); // OK 不显示空格
            aceEditor.setOption("wrap", "free");
            aceEditor.setShowInvisibles(false);
            aceEditor.setAutoScrollEditorIntoView(true);
            aceEditor.setReadOnly(Note.readOnly);
            aceEditor.setOption("maxLines", 10000);

            aceEditor.commands.addCommand({
                name: "undo",
                bindKey: { win: "Ctrl-z", mac: "Command-z" },
                exec: function(editor) {
                    var undoManager = editor.getSession().getUndoManager();
                    if (undoManager.hasUndo()) {
                        undoManager.undo();
                    } else {
                        undoManager.reset();
                        tinymce.activeEditor.undoManager.undo();
                    }
                }
            });
            this._aceEditors[id] = aceEditor;
            if (val) {
                aceEditor.setValue(val);
                // 不要选择代码
                // TODO
            } else {
                // 防止 <pre><div>xx</div></pre> 这里的<div>消失
                // preHtml = preHtml.replace('/&nbsp;/g', ' '); // 以前是把' ' 全换成了&nbsp;
                // aceEditor.setValue(preHtml);
                // 全不选
                // aceEditor.selection.clearSelection();
            }

            // XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
            // "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            me.resetAddHistory();
            return aceEditor;
        } catch (e) {
            // 当有错误时, 会有XXXXX的形式, 此时不要ace, 直接原生的!!!
            console.error('ace error!!!!');
            console.error(e);
            $pre.attr("contenteditable", true);
            $pre.removeClass('ace-tomorrow ace_editor ace-tm');
            $pre.html(rawCode);
            me.resetAddHistory();
        }
    },

    // tinymce.setContent调用
    clearIntervalForInitAce: null,
    initAceFromContent: function(editor) {
        if (!this.canAndIsAce()) {
            var content = $(editor.getBody());
            content.find('pre').removeClass('ace_editor');
            return;
        }
        var me = this;
        // 延迟
        if (this.clearIntervalForInitAce) {
            clearInterval(this.clearIntervalForInitAce);
        }
        this.clearIntervalForInitAce = setTimeout(function() {
            var content = $(editor.getBody());
            var pres = content.find('pre');
            for (var i = 0; i < pres.length; ++i) {
                var pre = pres.eq(i);
                // 如果是ace, 那不用处理了, 为什么会有这种情况呢?
                // 按理是没有这种情况的
                var aceAndNode = me.isInAce(pre);
                if (aceAndNode) {
                    if (isAceError(aceAndNode[0].getValue())) {
                        console.error('之前有些没有destroy掉');
                    } else {
                        break;
                    }
                }
                setTimeout((function(pre) {
                    return function() {
                        pre.find('.toggle-raw').remove();
                        var value = pre.html();
                        value = value.replace(/ /g, "&nbsp;").replace(/\<br *\/*\>/gi, "\n").replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        pre.html(value);
                        var id = pre.attr('id');
                        if (!id) {
                            id = me.getAceId();
                            pre.attr('id', id);
                        }
                        me.initAce(id);
                    }
                })(pre));
            }
        }, 10);
    },

    allToPre: function(editor) {
        if (!this.canAndIsAce()) {
            return;
        }
        var me = this;
        // 延迟
        if (me.clearIntervalForInitAce) {
            clearInterval(me.clearIntervalForInitAce);
        }
        me.clearIntervalForInitAce = setTimeout(function() {
            var content = $(editor.getBody());
            var pres = content.find('pre');
            for (var i = 0; i < pres.length; ++i) {
                var pre = pres.eq(i);
                setTimeout((function(pre) {
                    return function() {
                        me.aceToPre(pre);
                    }
                })(pre));
            }
        }, 10);
    },

    undo: function(editor) {
        if (!this.canAndIsAce()) {
            return;
        }
        var me = this;
        // 延迟
        if (this.clearIntervalForInitAce) {
            clearInterval(this.clearIntervalForInitAce);
        }
        this.clearIntervalForInitAce = setTimeout(function() {
            var content = $(editor.getBody());
            var pres = content.find('pre');
            for (var i = 0; i < pres.length; ++i) {
                var pre = pres.eq(i);
                setTimeout((function(pre) {
                    return function() {
                        var value = pre.html();
                        var id = pre.attr('id');
                        var aceEditor = me.getAce(id);
                        if (aceEditor) {
                            var value = aceEditor.getValue();
                            aceEditor.destroy();
                            var aceEditor = me.initAce(id, value);
                            // 全不选
                            aceEditor.selection.clearSelection();
                        } else {
                            value = value.replace(/ /g, "&nbsp;").replace(/\<br *\/*\>/gi, "\n");
                            pre.html(value);
                            var id = pre.attr('id');
                            if (!id) {
                                id = me.getAceId();
                                pre.attr('id', id);
                            }
                            me.initAce(id);
                        }
                    }
                })(pre));
            }
        }, 10);
    },
    // tinymce.setContent调用, 表示在setContent之前先把之前的ace destroy掉
    // 很可能会有一些没有destroy的情况
    destroyAceFromContent: function(everContent) {
        if (!this.canAce()) {
            return;
        }
        var pres = everContent.find('pre');
        for (var i = 0; i < pres.length; ++i) {
            var id = pres.eq(i).attr('id');
            var aceEditorAndPre = this.getAce(id);
            if (aceEditorAndPre) {
                aceEditorAndPre.destroy();
                this._aceEditors[id] = null;
            }
        }
    },
    getAce: function(id) {
        if (!this.canAce()) {
            return;
        }
        return this._aceEditors[id];
    },
    setAceReadOnly: function(pre, readOnly) {
        var me = this;
        if (typeof pre == 'object') {
            var id = pre.attr('id');
        } else {
            var id = pre;
        }
        var ace = me.getAce(id);
        if (ace) {
            ace.setReadOnly(readOnly);
        }
    },
    // 当前焦点是否在aceEditor中
    nowIsInAce: function() {
        if (!this.canAce()) {
            return;
        }

        var node = tinymce.activeEditor.selection.getNode();
        // log("now...");
        // log(node);
        return this.isInAce(node);

    },
    nowIsInPre: function() {
        var node = tinymce.activeEditor.selection.getNode();
        // log("now...");
        // log(node);
        return this.isInPre(node);
    },
    isInPre: function(node) {
        var $node = $(node);
        var node = $node.get(0);
        if (node.nodeName == "PRE") {
            return true;
        } else {
            // 找到父是pre
            var $pre = $node.closest("pre");
            if ($pre.length == 0) {
                return false;
            }
            return true;
        }
    },
    // 是否在node内
    isInAce: function(node) {
        if (!this.canAce()) {
            return;
        }
        var $node = $(node);
        var node = $node.get(0);
        if (node.nodeName == "PRE") {
            // $node.data('brush', brush);
            var id = $node.attr('id');
            var aceEditor = this.getAce(id);
            if (aceEditor) {
                return [aceEditor, $node];
            }
            return false;
        } else {
            // 找到父是pre
            var $pre = $node.closest("pre");
            if ($pre.length == 0) {
                return false;
            }
            return this.isInAce($pre);
        }
        return false;
    },
    getPreBrush: function(node) {
        var $pre = $(node);
        var classes = $pre.attr('class');
        if (!classes) {
            return '';
        }
        var m = classes.match(/brush:[^ ]*/);
        var everBrush = "";
        if (m && m.length > 0) {
            everBrush = m[0];
        }
        return everBrush;
    },
    // pre转换成ace
    preToAce: function(pre, force) {
        if (!force && !this.canAce()) {
            return;
        }
        var $pre = $(pre);
        var id = this.getAceId();
        $pre.attr('id', id);
        var editor = this.initAce(id, "", true);
        if (editor) {
            editor.focus();
        }
    },
    aceToPre: function(pre, isFocus) {
        var me = this;
        var $pre = $(pre);
        // 转成pre
        var aceEditorAndPre = me.isInAce($pre);
        if (aceEditorAndPre) {
            var aceEditor = aceEditorAndPre[0];
            var $pre = aceEditorAndPre[1];
            var value = aceEditor.getValue();
            // 表示有错
            if (isAceError(value)) {
                value = $pre.html();
            }
            value = value.replace(/</g, '&lt').replace(/>/g, '&gt');
            // var id = getAceId();
            var replacePre = $('<pre class="' + $pre.attr('class') + ' ace-to-pre">' + value + "</pre>");
            $pre.replaceWith(replacePre);
            aceEditor.destroy();
            me._aceEditors[$pre.attr('id')] = null;
            // log($replacePre);
            if (isFocus) {
                setTimeout(function() {
                    var tinymceEditor = tinymce.activeEditor;
                    var selection = tinymceEditor.selection;
                    var rng = selection.getRng();
                    // rng.setStart(replacePre.get(0), 1);
                    // rng.setEnd(replacePre.get(0), 9);
                    rng.selectNode(replacePre.get(0));
                    // selection.setRng(rng);
                    // replacePre.focus();
                    tinymceEditor.focus();
                    replacePre.trigger("click");
                    replacePre.html(value + " ");
                    // log(">>>>>>>>>>>>>>")
                }, 0);
            }
        }
    },
    // 转换raw <-> code
    handleEvent: function() {
        var me = this;

        if (!this.canAce()) {
            return;
        }
        var me = this;
        $("#editorContent").on('mouseenter', 'pre', function() {
            // log('in');
            // log($(this));
            var $t = $(this);
            $raw = $t.find('.toggle-raw');
            if ($raw.length == 0) {
                $t.append('<div class="toggle-raw" title="Toggle code with raw html"><input type="checkbox" /></div>');
            }
            $input = $t.find('.toggle-raw input');
            if (LeaAce.isInAce($t)) {
                $input.prop('checked', true);
            } else {
                $input.prop('checked', false);
            }
        });
        $("#editorContent").on('mouseleave', 'pre', function() {
            var $raw = $(this).find('.toggle-raw');
            $raw.remove();
        });
        $("#editorContent").on('change', '.toggle-raw input', function() {
            var checked = $(this).prop('checked');
            var $pre = $(this).closest('pre');
            if (checked) {
                // 转成ace
                me.preToAce($pre, true);
            } else {
                me.aceToPre($pre, true);
            }
        });

        // 当ace里没有内容时, 连续删除则把ace remove掉
        // keydown的delete事件没有
        var lastDeleteTime;

        // 上38下40左37右39
        // shift16,ctrl17,option18,meta91 
        $("#editorContent").on('keyup', 'pre', function(e) {
            if (LEA.readOnly) {
                return;
            }
            var keyCode = e.keyCode;
            // console.log('keyup');
            if (keyCode == 8 || keyCode == 46) { // BackSpace || Delete
                // console.log('delete');
                if (!lastDeleteTime) {
                    lastDeleteTime = (new Date()).getTime();
                } else {
                    var now = (new Date()).getTime();
                    if (now - lastDeleteTime < 300) { // 间隔时间很短
                        var inAce = me.isInAce($(this))
                        if (inAce && !inAce[0].getValue()) {
                            // console.log('destroy');
                            inAce[0].destroy();
                            $(this).remove();
                            return;
                        }
                    }
                    lastDeleteTime = now;
                }
                // console.log($(this));
            }
            if (noCharCodes.indexOf(keyCode) < 0) {
                console.log('ace setEditorIsDirty')
                setEditorIsDirty(true);
            } else {
                console.log('noCharCodes');
            }
        });
    }
};

// 全量同步
function fullSync(callback) {
    log('full sync');
    $('.loading-footer').show();
    SyncService.fullSync(function(err, ret) {
        callback && callback(err, ret);
    });
}

// 强制全量同步, 将Usn设为空, 刷新之
function fullSyncForce() {
    var ok = confirm(getMsg('ForceFullSyncMsg'));
    if (ok) {
        var timeout = isMac() ? 0 : 200;
        onClose(function() {
            UserService.fullSyncForce(function() {
                setTimeout(function() {
                    location.reload();
                }, timeout);
            });
        });
    }
}

// 增量同步
function _incrSync(saveNoteBefore) {
    console.log('incr sync');
    Note.showSpin();
    SyncService.incrSync();
    Note.syncProgress(2);
}

function incrSync(saveNoteBefore) {
    if (saveNoteBefore) {
        Note.curChangedSaveIt(true, function() {
            _incrSync();
        });
    } else {
        _incrSync();
    }
}

// 历史, 恢复原貌
var State = {
    // 保存当前状态
    // 什么时候调用? 关闭程序, 改变note时
    saveCurState: function(callback) {
        // 左侧, 开闭状态
        var StarredOpened = false;
        var NotebookOpened = false;
        var TagOpened = false;
        var $leftOpen = $('.folderNote.opened');
        if ($leftOpen.length == 1) {
            var id = $leftOpen.attr('id');
            if (id == 'myStarredNotes') {
                StarredOpened = true;
            } else if (id == 'myNotebooks') {
                NotebookOpened = true;
            } else if (id == 'myTag') {
                TagOpened = true;
            }
        }
        // 当前笔记
        var CurNoteId = Note.curNoteId; // 当前打开的笔记
        var CurIsStarred = false; // 当前是在星下
        var CurNotebookId = ''; // 定位到某个笔记本
        var CurTag = ''; // 搜索tag
        if (Notebook.isSearch) {
            var CurSearchKey = Note.searchKey;
        }
        if (Notebook.isStarred) {
            CurIsStarred = true;
        } else if (Notebook.isTag) {
            CurTag = Tag.nav.curTag;
        }
        CurNotebookId = Notebook.curNotebookId;

        var state = {
            StarredOpened: StarredOpened,
            NotebookOpened: NotebookOpened,
            TagOpened: TagOpened,

            CurNoteId: CurNoteId,
            CurIsStarred: CurIsStarred,
            CurNotebookId: CurNotebookId,
            CurTag: CurTag,
            CurSearchKey: CurSearchKey
        };
        // console.log(state);
        UserService.saveCurState(state, callback);
    },

    // 是否结束
    recoverEnd: false,

    recoverAfter: function(initedCallback) {
        var me = this;
        me.recoverEnd = true;
        // 先隐藏, 再resize, 再显示
        // $('body').hide();
        // 延迟, 让body先隐藏, 效果先显示出来
        function showBody() {
            $('body').removeClass('init');
            $("#mainMask").html("");
            $("#mainMask").hide(0);
        }
        setTimeout(function() {
            if (isMac()) {
                if (/login/.test(location.href)) {
                    var win = gui.getCurrentWindow();
                    win.setSize(1100, 600);
                    win.center();
                }
            }
            showBody();
            // setTimeout(function() {
                // showBody();
            // }, 100);
        });
        // end
        // 打开时，同步一下
        if (!UserInfo.IsLocal) { //no sync for local account
            setTimeout(function() {
                incrSync(false);
            }, 500);
        }

        initedCallback && initedCallback();
        // $('body').show();
    },

    // 恢复状态
    recoverState: function(userInfo, initedCallback) {
        var state = userInfo.State || {};
        // 表明没有state
        if (state.NotebookOpened === undefined) {
            this.recoverAfter(initedCallback);
            return;
        }
        // 1. 左侧哪个open
        if (!state.NotebookOpened) {
            $('.folderNote.opened').removeClass('opened').addClass('closed');
            if (state.StarredOpened) {
                $('#myStarredNotes').removeClass('closed').addClass('opened');
            } else if (state.TagOpened) {
                $('#myTag').removeClass('closed').addClass('opened');
            }
        }
        // 2.
        // 当前是starred notes
        var notebookId = state.CurNotebookId;
        if (state.CurIsStarred) {
            Note.renderStarNote($('#myStarredNotes li[data-id="' + state.CurNoteId + '"]'));
        }
        // 搜索标签
        else if (state.CurTag) {
            Tag.nav.searchByTag(state.CurTag, state.CurNoteId);
        }
        // 搜索笔记
        else if (state.CurSearchKey) {
            Note.searchNoteSys(state.CurSearchKey, state.CurNoteId);
        }
        // 笔记本了
        else if (notebookId) {
            Notebook.expandNotebookTo(notebookId);
            Notebook.changeNotebook(notebookId, false, state.CurNoteId);
        }

        this.recoverAfter(initedCallback);
    }
};

/*
function initLocalAccountDialogCheckboxEvent() {
    $('#localAccountDialogCheckbox').click(function() {
        localStorage.setItem(UserInfo.UserId + '-local', $(this).prop('checked') ? 'no' : '');
    });
}

function showLocalAccountWarning() {
    if (!UserInfo || !UserInfo.IsLocal) {
        return;
    }
    if (localStorage.getItem(UserInfo.UserId + '-local')) {
        return;
    }

    $('#localAccountDialog').modal('show');
}
*/

// js/main.js 在load plugin后调用
// 实始化页面
// 判断是否登录
function initPage(initedCallback) {
    console.log('init page');

    // 笔记本, 事件, menu初始化
    Notebook.init();
    // 笔记

    // 没用, 估计要到main.js中, 不能这样, 这样刷新后就有问题
    /*
    gui.win.on('close', function(e) {
    	e.preventDefault();
    	return false;
    	// onClose();
    });
    */

    // window.onbeforeunload = function(e) {
    //   console.log('I do not want to be closed');

    //   // Unlike usual browsers, in which a string should be returned and the user is
    //   // prompted to confirm the page unload. Electron gives the power completely
    //   // to the developers, return empty string or false would prevent the unloading
    //   // now. You can also use the dialog API to let user confirm it.
    //   return false;
    // };

    // 在刷新时会有问题, 刷新后前一个browser消失了, 但事件还是存在在main process中
    /*
    gui.win.on('focus', function() {
    });
    gui.win.on('blur', function() {
    });
    */
    // var ipc = require('ipc');
    const { ipcRenderer } = require('electron');
    ipc = ipcRenderer;
    ipc.on('focusWindow', function(event, arg) {
        $('body').removeClass('blur');
    });

    ipc.on('blurWindow', function(event, arg) {
        $('body').addClass('blur');
    });
    // 后端发来event, 告诉要关闭了, 处理好后发送给后端说可以关闭了
    ipc.on('closeWindow', function(event, arg) {
        console.log('Front get closeWindow message')
        onClose(function() {
            ipc.sendSync('quit-app');
        });
    });

    ipc.send('show-tray', {
        Open: getMsg('Open'),
        Close: getMsg('Close')
    });

    // 注入前端变量#
    WebService.set(Notebook, Note, Attach, Tag);

    // 在显示notebooks, stars, tags后才recoverState
    var i = 0;

    function ok() {
        i++;
        if (i == 3) {
            State.recoverState(UserInfo, initedCallback);
        }
    }

    function _init() {
        $(function() {
            // 很奇怪, 当port被占用后, notebook不能获取, 其它的可以
            // 获取笔记本
            NotebookService.getNotebooks(function(notebooks) {
                Notebook.renderNotebooks(notebooks);

                // 获得笔记, 一定要在notebooks获取之后
	            Service.noteService.getNotes('', function(notes) {
	                Note.renderNotesAndFirstOneContent(notes);
	                Notebook.selectNotebook($(tt('#notebook [notebookId="?"]', Notebook.allNotebookId)));
	                ok();
	            });
            });

            // 获取star笔记
            NoteService.getStarNotes(function(notes) {
                Note.renderStars(notes);
                ok();
            });

            // 标签
            TagService.getTags(function(tags) {
                Tag.nav.setTags(tags);
                ok();
            });

            // init notebook后才调用
            // initSlimScroll();
            LeaAce.handleEvent();

            // showLocalAccountWarning();
            // initLocalAccountDialogCheckboxEvent();
        });
    };

    // 判断是否登录
    UserService.init(function(userInfo) {
        if (userInfo) {
            UserInfo = userInfo;
            // no full sync for local account
            // see https://github.com/leanote/desktop-app/issues/36
            if (UserInfo.IsLocal) {
                // console.log('skip full sync for local account');
                _init();
                $('#syncRefresh').off('click');
                $('body').addClass('local');
            }
            // 之前已同步过, 就不要full sync了
            else if ('LastSyncUsn' in UserInfo && UserInfo['LastSyncUsn'] > 0) {
                _init();
            } else {
                fullSync(function(err, info) {
                    if (err) {
                    	if (typeof err == 'object') {
	                    	if(err['Msg'] == 'NOTLOGIN') {
	                    		alert(getMsg('You need to sign in Leanote'));
	                    		toLogin();
	                    		return;
							}
							if(err['Msg'] == 'NEED-UPGRADE-ACCOUNT') {
								alert(getMsg('You need to upgrade Leanote account'));
								openExternal('https://leanote.com/pricing#buy');
								setTimeout(function () {
		                    		toLogin();
								}, 1000);
								return;
							}
                    	}

                    	if (isMac()) {
	                        Notify.show({ title: 'Info', body: getMsg('Sync error, retry to sync after 3 seconds') });
                    	} else {
                    		alert(getMsg('Sync error, retry to sync after 3 seconds'));
                    	}
                        setTimeout(function() {
                            reloadApp();
                        }, 3000);
                    } else {
                        _init();
                    }
                });
            }
            $('#username').text(UserInfo.Username);

            UserService.getAllUsers(function(users) {
                userMenu(users);
            });
            Api.on('deleteUser', function() {
                UserService.getAllUsers(function(users) {
                    userMenu(users);
                });
            });

            setLayoutWidth();
        } else {
            switchAccount();
            // location.href = 'login.html';
        }
    });
}

// 初始bind事件上传图片
// tinymce, markdown触发之
// https://github.com/atom/electron/blob/master/docs/api/file-object.md
function initUploadImage() {
    $('#chooseImageInput').change(function() {
        var $this = $(this);
        var files = $this.get(0).files;

        for (var i = 0; i < files.length; ++i) {
            (function(k) {
                var file = files[k];
                var imagePath = file.path;
                // 上传之
                FileService.uploadImage(imagePath, function(newImage, msg) {
                    if (newImage) {
                        var note = Note.getCurNote();
                        var url = EvtService.getImageLocalUrl(newImage.FileId);
                        if (!note.IsMarkdown) {
                            tinymce.activeEditor.insertContent('<img src="' + url + '">');
                        } else {
                            // TODO markdown insert Image
                            MD.insertLink(url, '', true);
                        }
                    } else {
                        alert(msg || "error");
                    }
                });
            })(i);
        }

    });
}

// 演示模式, 全屏模式
var Pren = {

    _isFullscreen: false,
    _isPren: false,
    _isView: false,

    // 全局菜单
    pren: null,
    fullScreen: null,
    view: null,

    presentationO: $('#presentation'),

    toggleFullscreen: function() {
        var me = this;
        gui.win.setFullScreen(!me._isFullscreen);
        me._isFullscreen = !me._isFullscreen;

        if (me._isFullscreen) {
            me.pren.enabled = false;
            me.view.enabled = false;
        } else {
            me.pren.enabled = true;
            me.view.enabled = true;
        }
    },
    togglePren: function(isToggleView) {
        var me = this;
        // 批量操作时, 不能prenstation
        if (Note.inBatch) {
            alert(getMsg('Please select a note firstly.'));
            return;
        }
        if (!isToggleView) {
            try {
                gui.win.setKiosk(!me._isPren);
                // if(!me._isPren) {
                // 	$('body').get(0).webkitRequestFullScreen();
                // } else {
                // 	$('body').get(0).webkitCancelFullScreen();
                // }
            } catch (e) {}
        }

        var no = isToggleView ? !me._isView : !me._isPren;

        if (no) {
            $('.pren-title').html($('#noteTitle').val());
            var note = Note.getCurNote();
            $('.pren-content').html('');
            if (note) {
                var content = getEditorContent(note.IsMarkdown);
                var contentStr = content;
                if (typeof content == 'object') { // markdown
                    contentStr = content[1];
                }
                $('.pren-content').html(contentStr);
            }

            $('#themePresentation').attr('disabled', false);

            $('body').addClass('no-drag');
            $('#page').hide();

            // 代码高亮
            $(".pren-content pre").addClass("prettyprint linenums");
            prettyPrint();

        } else {
            $('#themePresentation').attr('disabled', true);

            $('body').removeClass('no-drag');
            $('#page').show();
            me.restore();
        }

        if (isToggleView) {
            me._isView = !me._isView;

            if (me._isView) {
                me.fullScreen.enabled = false;
                me.pren.enabled = false;
            } else {
                me.fullScreen.enabled = true;
                me.pren.enabled = true;
            }
        } else {
            me._isPren = !me._isPren;

            if (me._isPren) {
                me.fullScreen.enabled = false;
                me.view.enabled = false;
            } else {
                me.fullScreen.enabled = true;
                me.view.enabled = true;
            }
        }

        // 可拖拉
        if (isToggleView) {
            if (me._isView) {
                $('body').addClass('view');
            } else {
                $('body').removeClass('view');
            }
        }
    },

    // 预览, 演示快捷
    preOrNext: function(isPre) {
        var me = this;
        if (!me._isView && !me._isPren) {
            return;
        }
        if (isPre) {
            var to = me.presentationO.scrollTop() - me.presentationO.height();
        } else {
            var to = me.presentationO.scrollTop() + me.presentationO.height();
        }
        me.presentationO.animate({ scrollTop: to + 'px' }, 200);
    },

    // 恢复, 为了下次显示
    restore: function() {
        var me = this;
        // 防止id重复, markdown下有问题
        $('.pren-content').html('');
        me.presentationO.scrollTop(0);
    },

    _themeMode: 'normal', // 当前背景颜色模式, 三种, normal, writting, black

    toggleThemeMode: function() {
        var me = this;
        if (me._themeMode == 'normal') {
            me.presentationO.addClass('writting');
            me._themeMode = 'writting';
        } else if (me._themeMode == 'writting') {
            me.presentationO.removeClass('writting').addClass('black');
            me._themeMode = 'black';
        } else {
            me.presentationO.removeClass('black');
            me._themeMode = 'normal';
        }
    },

    _fontSizeIndex: 2, // 位置
    _fontScales: ['text-min-2', 'text-min-1', '', 'text-max-1', 'text-max-2'],
    toggleFontSizeMode: function(isMin) {
        var me = this;
        var curClass = me._fontScales[me._fontSizeIndex];

        if (isMin) {
            if (me._fontSizeIndex > 0) {
                me._fontSizeIndex--;
            }
        } else {
            if (me._fontSizeIndex < 4) {
                me._fontSizeIndex++;
            }
        }

        var nextClass = me._fontScales[me._fontSizeIndex];
        if (curClass != nextClass) {
            me.presentationO.removeClass(curClass).addClass(nextClass);
        }
    },

    init: function() {
        var me = this;
        var isMac_ = isMac();
        // 初始化menu
        me.fullScreen = new gui.MenuItem({
            label: getMsg('Toggle Fullscreen'),
            accelerator: isMac_ ? 'command+=' : 'Ctrl+=',
            click: function() {
                me.toggleFullscreen();
            }
        });
        me.pren = new gui.MenuItem({
            label: getMsg('Toggle Presentation'),
            accelerator: isMac_ ? 'command+p' : 'Ctrl+P',
            click: function() {
                me.togglePren();
            }
        });
        me.view = new gui.MenuItem({
            label: getMsg('Toggle View'),
            accelerator: isMac_ ? 'command+t' : 'Ctrl+T',
            click: function() {
                me.togglePren(true);
            }
        });

        // 全局事件
        // Esc, <- ->
        $("body").on('keydown', function(e) {
            var keyCode = e.keyCode;
            if (keyCode == 27) {
                if (me._isPren) {
                    me.togglePren();
                } else if (me._isFullscreen) {
                    me.toggleFullscreen();
                } else if (me._isView) {
                    me.togglePren(true);
                }
            }
            // <--
            else if (keyCode == 37) {
                me.preOrNext(true);
            }
            // -->
            else if (keyCode == 39) {
                me.preOrNext();
            }

            // 各个平台都要

            // e切换只读和可写
            if (keyCode == 69) {
                if ((isMac() && e.metaKey) || (!isMac() && e.ctrlKey)) {
                    Note.toggleWriteableAndReadOnly();
                }
            }

            // linux,windows下需要
            else if (!isMac() && e.ctrlKey) {
                // p
                if (keyCode == 80) {
                    me.togglePren();
                }
                // +
                else if (keyCode == 187) {
                    me.toggleFullscreen();
                }

                // t
                else if (keyCode == 84) {
                    me.togglePren(true);
                }
            }
        });

        // 防止在本窗口打开
        me.presentationO.on('click', 'a', function(e) {
            e.preventDefault();
            var href = $(this).attr('href');
            if (href && href.indexOf('http://127.0.0.1') < 0 && isURL(href)) {
                openExternal(href);
            }
        });

        $('.pren-tool-close').click(function() {
            if (me._isPren) {
                me.togglePren();
            } else if (me._isView) {
                me.togglePren(true);
            }
        });

        $('.pren-tool-bg-color').click(function() {
            me.toggleThemeMode();
        });
        $('.pren-tool-text-size-min').click(function() {
            me.toggleFontSizeMode(true);
        });
        $('.pren-tool-text-size-max').click(function() {
            me.toggleFontSizeMode(false);
        });
        $('.pren-tool-pre').click(function() {
            me.preOrNext(true);
        });
        $('.pren-tool-next').click(function() {
            me.preOrNext();
        });
    }
};

// 升级
function checkForUpdates() {
    if (Upgrade.checkForUpdates) {
        Upgrade.checkForUpdates();
    }
};

function setMacTopMenu() {
    var isMac_ = isMac();
    var template = [{
        label: 'Leanote',
        submenu: [{
            label: 'About Leanote',
            selector: 'orderFrontStandardAboutPanel:'
        }, {
            type: 'separator'
        }, {
            label: 'Services',
            submenu: []
        }, {
            type: 'separator'
        }, {
            label: 'Hide Leanote',
            accelerator: 'Command+H',
            selector: 'hide:'
        }, {
            label: 'Hide Others',
            accelerator: 'Command+Shift+H',
            selector: 'hideOtherApplications:'
        }, {
            label: 'Show All',
            selector: 'unhideAllApplications:'
        }, {
            type: 'separator'
        }, {
            label: 'Quit',
            accelerator: 'Command+Q',
            click: function() {
                onClose(function() {
                    app.quit();
                });
            }
        }, ]
    }, {
        label: 'Edit',
        submenu: [{
            label: 'Undo',
            accelerator: 'Command+Z',
            selector: 'undo:'
        }, {
            label: 'Redo',
            accelerator: 'Shift+Command+Z',
            selector: 'redo:'
        }, {
            type: 'separator'
        }, {
            label: 'Cut',
            accelerator: 'Command+X',
            selector: 'cut:'
        }, {
            label: 'Copy',
            accelerator: 'Command+C',
            selector: 'copy:'
        }, {
            label: 'Paste',
            accelerator: 'Command+V',
            selector: 'paste:'
        }, {
            label: 'Select All',
            accelerator: 'Command+A',
            selector: 'selectAll:'
        }, ]
    }, {
        label: 'View',
        submenu: [{
            label: 'Reload',
            // 开启开发者模式console时, cmd+r不会走这, 关了还是会走这
            accelerator: isMac_ ? 'Command+R' : 'Ctrl+R',
            click: function() {
                onClose(function() {
                    gui.win.reload();
                });
            }
        }, {
            label: getMsg('Toggle DevTools'),
            accelerator: isMac_ ? 'Alt+Command+I' : 'Ctrl+I',
            click: function() { gui.win.toggleDevTools(); }
        }/*, {
            type: 'separator'
        }, {
            label: Api.getMsg('Snippet View'),
            // type: "checkbox",
            click: function() {
                Note.switchView('snippet');
            },
        }, {
            label: Api.getMsg('List View'),
            // type: "checkbox",
            click: function() {
                Note.switchView('list');
            },
        }, */]
    }, {
        label: 'Window',
        submenu: [{
            label: 'Minimize',
            accelerator: 'Command+M',
            selector: 'performMiniaturize:'
        }, {
            label: 'Close',
            accelerator: 'Command+W',
            selector: 'performClose:'
        }, {
            type: 'separator'
        }, {
            label: 'Bring All to Front',
            selector: 'arrangeInFront:'
        }, ]
    }];

    var menu = gui.Menu.buildFromTemplate(template);

    var mode = new gui.Menu();

    mode.append(Pren.fullScreen);

    mode.append(gui.getSeparatorMenu());
    mode.append(Pren.pren);
    mode.append(Pren.view);

    var modes = new gui.MenuItem({ label: getMsg('Mode'), submenu: mode });

    menu.append(modes);

    gui.Menu.setApplicationMenu(menu);
}

function getShortHost(host) {
    if (!host) {
        host = 'https://leanote.com';
    }
    var ret = /http(s*):\/\/([a-zA-Z0-9\.\-]+)/.exec(host);
    if (ret && ret.length == 3) {
        host = ret[2];
    }
    return host;
}

function toggleAccount(user) {
    if (!user) {
        return;
    }
    UserService.saveCurUser({ UserId: user.UserId }, function() {
        reloadApp();
    });
}

function getToggleUserMenus(allUsers) {
    if (!allUsers || !allUsers.length) {
        return null;
    }
    var userMenus = new gui.Menu();
    for (var i = 0; i < allUsers.length; ++i) {
        var user = allUsers[i];
        if (user.Username && user.UserId) {
            var label = user.Username;

            var otherLabel = user.IsLocal ? getMsg('Local') : getShortHost(user.Host);
            label += ' (' + otherLabel + ')';

            userMenus.append(new gui.MenuItem({
                label: label,
                enabled: !user.IsActive,
                click: (function(user) {
                    return function() {
                        toggleAccount(user);
                    }
                })(user)
            }));
        }
    }
    return userMenus;
}

// user
function userMenu(allUsers) {
    // ----------
    // 全局菜单
    var win = gui.getCurrentWindow();

    Pren.init();

    if (isMac() || debug) {
        setMacTopMenu();
    }
    if (debug) {
        setTimeout(function () {
            gui.win.toggleDevTools();
        }, 3000)
    }

    //-------------------
    // 右键菜单

    function menu() {
        var me = this;
        // this.target = '';
        UserInfo.Host = UserInfo.Host || 'https://leanote.com';
        var shortHost = getShortHost(UserInfo.Host);

        this.menu = new gui.Menu();
        this.email = new gui.MenuItem({
            label: UserInfo.IsLocal ? UserInfo.Username + ' (' + getMsg('Local') + ')' : UserInfo.Username + ' (' + shortHost + ')',
            enabled: false,
            click: function(e) {}
        });

        // 注销
        this.logout = new gui.MenuItem({
            label: getMsg('Logout'),
            click: function(e) {
                Loading.show();
                UserService.logout(function() {
                    onClose(function() {
                        toLogin();
                    });
                });
            }
        });

        this.switchAccount = new gui.MenuItem({
            label: getMsg('Add account'),
            click: function(e) {
                // window.open('login.html');
                // win.close();
                //
                switchAccount();
                // 这样, 不能window.open(), 不然needle有问题
                // 可以gui.Window.open();
                // location.href = 'login.html';
            }
        });

        // 所有用户
        var allUsersMenu = new gui.MenuItem({
            label: getMsg('Switch account'),
            submenu: getToggleUserMenus(allUsers)
        });

        this.checkForUpdates = new gui.MenuItem({
            label: getMsg('Check for updates'),
            click: function(e) {
                checkForUpdates();
            }
        });

        this.debug = new gui.MenuItem({
            label: getMsg('Toggle DevTools'),
            click: function(e) {
                gui.win.toggleDevTools();
            }
        });

        this.menu.append(this.email);
        if (!UserInfo.IsLocal) { //hide sync menu for local account
            this.blog = new gui.MenuItem({
                label: getMsg('My blog'),
                click: function(e) {
                    openExternal(UserInfo.Host + '/blog/' + UserInfo.UserId);
                }
            });
            this.menu.append(this.blog);
        }
        this.menu.append(new gui.MenuItem({ type: 'separator' }));
        this.menu.append(this.logout);
        this.menu.append(this.switchAccount);
        this.menu.append(allUsersMenu);
        this.menu.append(new gui.MenuItem({ type: 'separator' }));

        // themeMenu
        var themeMenu = Api.getThemeMenu();
        if (themeMenu) {
            this.menu.append(themeMenu);
        }

        // markdownThemeMenu
        var mdThemeMenu = Api.getMdThemeMenu();
        if (mdThemeMenu) {
            this.menu.append(mdThemeMenu);
        }

        var height = 235;
        if (UserInfo.IsLocal) {
            height = 215;
        }
        if (!isMac()) {
            this.menu.append(new gui.MenuItem({ type: 'separator' }));

            this.menu.append(Pren.pren);
            this.menu.append(Pren.view);
            this.menu.append(Pren.fullScreen);

            height += 90;
        }

        this.menu.append(new gui.MenuItem({ type: 'separator' }));
        this.menu.append(this.checkForUpdates);

        this.menu.append(new gui.MenuItem({ type: 'separator' }));

        var mores = new gui.Menu();
        if (!UserInfo.IsLocal) { //hide sync menu for local account
            this.sync = new gui.MenuItem({
                label: getMsg('Sync now'),
                click: function(e) {
                    console.log('sync now');
                    incrSync(true);
                }
            });
            this.fullSync = new gui.MenuItem({
                label: getMsg('Force full sync'),
                click: function(e) {
                    fullSyncForce();
                }
            });

            mores.append(this.sync);
            mores.append(this.fullSync);
            mores.append(new gui.MenuItem({
                type: 'separator'
            }));
        }

        // 其它的
        var otherMoreMenus = Api.getMoreMenus();
        if (otherMoreMenus) {
            for (var i = 0; i < otherMoreMenus.length; ++i) {
                mores.append(otherMoreMenus[i]);
            }
        }

        // debug
        mores.append(new gui.MenuItem({ type: 'separator' }));
        mores.append(this.debug);


        // 更多
        this.more = new gui.MenuItem({
            label: getMsg('More...'),
            submenu: mores,
            click: function(e) {}
        });

        this.menu.append(this.more);

        this.popup = function(e) {
            var y = $(window).height() - height;
            if (isMac()) {
                this.menu.popup(gui.getCurrentWindow(), 10, y);
            } else {
                // windows下不能用y
                var winY = e.clientY - height;
                this.menu.popup(gui.getCurrentWindow(), 10, winY);
            }
        }
    }

    var userMenuSys = new menu();

    $('#myProfile').off().click(function(e) {
        userMenuSys.popup(e);
    });
}

$(function() {
    initUploadImage();
    Writting.init();

    // disable drag & drop
    document.body.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
    }, false);
    document.body.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
    }, false);

    // 为了解决linux下重复粘贴的问题
    var everPaste;
    $('#left-column').on('paste', function(e) {
        var now = (new Date()).getTime();
        if (everPaste && now - everPaste < 100) {
            e.preventDefault();
            return;
        }
        everPaste = now;
    });
});

// markdown editor v2
LEA.canSetMDModeFromStorage = function() {
    return true;
}
