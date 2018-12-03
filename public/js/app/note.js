// 1. notebook change
// notebook一改变, 当前的肯定要保存, ajax是异步的. 此时先清空所有note信息. -> 得到该notebook的notes, 显示出来, 并选中第一个!
// 在这期间定时器还会保存, curNoteId还没换, 所以会清空curNoteId的content!!!

// 2. note change, save cur, 立即curNoteId = ""!!

// 3. 什么时候设置curNoteId? 是ajax得到内容之后设置

// note
Note.curNoteId = "";

Note.interval = ""; // 定时器

Note.noteItemListO = $("#noteItemList");
Note.$itemList = $('#noteItemList');

// notbeookId => {"updatedTime" => [noteId1, noteId2], "title" => [noteId1, noteId2...]} 排序方式分组
// 一旦某notebook改变了就清空, 重新排序之. (用js排)
Note.cacheByNotebookId = { all: {} };
Note.notebookIds = {}; // notebookId => true

// 初始化模版字符串
// blog, star, settings
var itemIsBlog = '<div class="item-options"><div class="item-blog"><i class="fa fa-bold" title="' + getMsg('Blog') + '"></i></div><div class="item-conflict-info"><i class="fa fa-bug" title="' + getMsg('Conflict') + '!!"></i></div><div class="item-warning"><i class="fa fa-warning" title="' + getMsg('Error') + '!!"></i></div><div class="item-star"><i class="fa fa-star-o" title="' + getMsg('Star') + '"></i></div><div class="item-setting"><i class="fa fa-cog" title="' + getMsg('Setting') + '"></i></div></div>';
Note.itemTplNoImg = '<li href="#" class="item ?" data-seq="?" noteId="?">';
Note.itemTplNoImg += itemIsBlog + '<div class="item-desc"><p class="item-title">?</p><p class="item-info"><i class="fa fa-book"></i> <span class="note-notebook">?</span> <i class="fa fa-clock-o"></i> <span class="updated-time">?</span></p><p class="desc">?</p></div></li>';
Note.itemTpl = '<li href="#" class="item ? item-image" data-seq="?" noteId="?"><div class="item-thumb" style=""><img src="?"/></div>';
Note.itemTpl += itemIsBlog + '<div class="item-desc" style=""><p class="item-title">?</p><p class="item-info"><i class="fa fa-book"></i> <span class="note-notebook">?</span> <i class="fa fa-clock-o"></i> <span class="updated-time">?</span></p><p class="desc">?</p></div></li>';

Note.switchView = function(view) {
    const viewList = ['snippet', 'list'];
    if (viewList.indexOf(view) === -1) return;
    viewList.forEach(function(name) {
        $('#noteItemList').removeClass(name + '-view');
    });
    $('#noteItemList').addClass(view + '-view');
    Config.view = view;
    Api.writeConfig(Config);
}
Note.switchView(Config.view || 'snippet');

Note.getItemTpl = function() {
    return Note.itemTpl;
}

Note.getItemTplNoImg = function() {
    return Note.itemTplNoImg;
}

// 定时保存信息
Note.intervalTime = 10 * 1000; // 10秒
Note.startInterval = function() {
    if (Note.interval) {
        clearInterval(Note.interval);
    }
    Note.interval = setInterval(function() {
        console.log("自动保存...");
        Note.curChangedSaveIt(false);
    }, Note.intervalTime); // 600s, 10mins
};

// 停止, 当切换note时
// 但过5000后自动启动
Note.stopInterval = function(notStartAuto) {
    clearInterval(Note.interval);

    // 是否自动启动, 默认是自动启动
    if (!notStartAuto) {
        setTimeout(function() {
            Note.startInterval();
        }, Note.intervalTime);
    }
};

// note = {NoteId, Desc, UserId,...}
Note.addNoteCache = function(note) {
        Note.cache[note.NoteId] = note;
        Note.clearCacheByNotebookId(note.NotebookId);
    }
    // content = {NoteId:, Content:}
    // 还可以设置其它的值
Note.setNoteCache = function(content, clear) {
    if (!Note.cache[content.NoteId]) {
        Note.cache[content.NoteId] = content;
    } else {
        $.extend(Note.cache[content.NoteId], content);
    }

    if (clear == undefined) {
        clear = true;
    }
    if (clear) {
        Note.clearCacheByNotebookId(content.NotebookId);
    }
}

// 删除缓存
Note.deleteCache = function(noteId) {
    delete this.cache[noteId];
};

// 得到当前的笔记
Note.getCurNote = function() {
    var self = this;
    if (!self.curNoteId) {
        return null;
    }
    return self.cache[self.curNoteId];
}
Note.getNote = function(noteId) {
    var self = this;
    return self.cache[noteId];
};

Note.getTargetById = function(noteId) {
    return this.$itemList.find('li[noteId="' + noteId + '"]');
};

// 每当有notebookId相应的note改变时都要重新清空之
// 并设置该notebookId有值
Note.clearCacheByNotebookId = function(notebookId) {
    if (notebookId) {
        Note.cacheByNotebookId[notebookId] = {};
        Note.cacheByNotebookId["all"] = {};
        Note.notebookIds[notebookId] = true;
    }
};

// notebook是否有notes
// called by Notebook
Note.notebookHasNotes = function(notebookId) {
    var notes = Note.getNotesByNotebookId(notebookId);
    return !isEmpty(notes);
};

// 重新设置sorter, 此时要重新render
// sortType = dateCreatedASC dateCreatedDESC
Note.setNotesSorter = function (sortType) {
	Config.sortType = sortType;

    // 如果当前是tagSearch, search, star 怎么办?
	// 重新Render
    if (Notebook.isTag || Notebook.isStarred || Notebook.isSearch) {
        Note.renderNotesAndTargetNote(Note._everNotes, false, false);
    } else {
        // 其实这里也可以用Note._everNotes, 主要是为了缓存数据
        Notebook.changeNotebook(Notebook.curNotebookId);
    }
    // Note.renderNotesAndTargetNote(Note._everNotes, false, false);

	Api.writeConfig(Config);
};

// render前先排序
Note.sortNotes = function (notes) {
	if (isEmpty(notes)) {
		return;
	}

	var sorterAndOrder = Note.getSorterAndOrder();
    var sortBy = sorterAndOrder.sortBy;
    var isAsc = sorterAndOrder.isAsc;

	// 排序之
    notes.sort(function(a, b) {
        var t1 = a[sortBy];
        var t2 = b[sortBy];

        if (isAsc) {
            if (t1 < t2) {
                return -1;
            } else if (t1 > t2) {
                return 1;
            }
        } else {
            if (t1 < t2) {
                return 1;
            } else if (t1 > t2) {
                return -1;
            }
        }
        return 0;
    });
};

Note.getSorterAndOrder = function () {
	var sortBy = "UpdatedTime";
    var isAsc = false; // 默认是降序
    if (Config.sortType) {
    	switch(Config.sortType) {
    		case 'dateCreatedASC':
    			sortBy = 'CreatedTime';
    			isAsc = true;
    			break;
    		case 'dateCreatedDESC':
    			sortBy = 'CreatedTime';
    			isAsc = false;
    			break;
    		case 'dateUpdatedASC':
    			sortBy = 'UpdatedTime';
    			isAsc = true;
    			break;
    		case 'dateUpdatedDESC':
    			sortBy = 'UpdatedTime';
    			isAsc = false;
    			break;
    		case 'titleASC':
    			sortBy = 'Title';
    			isAsc = true;
    			break;
    		case 'titleDESC':
    			sortBy = 'Title';
    			isAsc = false;
    			break;
    	}
    }
    console.log({sortBy: sortBy, isAsc: isAsc});
    return {sortBy: sortBy, isAsc: isAsc};
};

// 得到notebook下的notes, 按什么排序 updatedTime?
Note.getNotesByNotebookId = function(notebookId) {
    var sorterAndOrder = Note.getSorterAndOrder();
    var sortBy = sorterAndOrder.sortBy;
    var isAsc = sorterAndOrder.isAsc;

    if (!notebookId) {
        notebookId = "all";
    }

    if (!Note.cacheByNotebookId[notebookId]) {
        return [];
    }

    if (Note.cacheByNotebookId[notebookId][sortBy]) {
    	if (Note.cacheByNotebookId[notebookId][sortBy][isAsc]) {
    		return Note.cacheByNotebookId[notebookId][sortBy][isAsc];
    	}
    	// 逆序
    	Note.cacheByNotebookId[notebookId][sortBy][!isAsc].reverse();
    	var notes = Note.cacheByNotebookId[notebookId][sortBy][!isAsc];
    	Note.cacheByNotebookId[notebookId][sortBy][!isAsc] = null;
    	Note.cacheByNotebookId[notebookId][sortBy][isAsc] = notes;
    	return notes;
    }

    // 从所有的notes中找到notebookId的, 并排序之
    var notes = [];
    for (var i in Note.cache) {
        if (!i) {
            continue;
        }
        var note = Note.cache[i];
        if (!note) {
            continue;
        }

        if (!('IsMarkdown' in note)) {
            console.error('僵尸note------');
        }
        // 不要trash的not, 共享的也不要
        if (note.IsTrash || note.IsDeleted || note.LocalIsDelete) {
            continue;
        }
        if (notebookId == "all" || note.NotebookId == notebookId) {
            notes.push(note);
        }
    }

    Note.sortNotes(notes);

    // 缓存之
    Note.cacheByNotebookId[notebookId][sortBy] = {};
    Note.cacheByNotebookId[notebookId][sortBy][isAsc] = notes;
    return notes;
};

// called by Notebook
// render 所有notes, 和第一个note的content
Note.renderNotesAndFirstOneContent = function(ret) {
    // 错误的ret是一个Object
    if (!isArray(ret)) {
        return;
    }

    // note 导航
    Note.renderNotes(ret);
    // 渲染第一个
    if (!isEmpty(ret[0])) {
        Note.changeNoteForPjax(ret[0].NoteId, true, false);
    } else {}
};

// 渲染并定位到特定的
Note.renderNotesAndTargetNote = function(ret, noteId, hasSorted) {
    // 错误的ret是一个Object
    if (!isArray(ret)) {
        return;
    }

    // note 导航
    Note.renderNotes(ret, false, hasSorted);
    // 渲染特定的
    if (!isEmpty(ret[0])) {
        if (noteId) {
            // Note.changeNoteForPjax(noteId, true, false);
            Note.changeNoteForPjax(noteId, true, false);
            if (!Note.directToNote(noteId)) {
                // 找不到啊
                Note.changeNoteForPjax(ret[0].NoteId, true, false);
            }
        } else {
            Note.changeNoteForPjax(ret[0].NoteId, true, false);
        }
    }
};

Note.alertWeb = function(msg) {
    alert(msg);
};

// 当前的note是否改变过了?
// 返回已改变的信息
Note.curHasChanged = function(force) {
    var cacheNote = Note.getCurNote();
    if (!cacheNote || cacheNote.InitSync) { // 还没有同步的, 不能保存
        return false;
    }
    // else {
    // 	// console.log('当前笔记为' + cacheNote.NoteId);
    // }

    // 收集当前信息, 与cache比对
    var title = $('#noteTitle').val();
    var tags = Tag.input.getTags();

    var hasChanged = {
        hasChanged: false, // 总的是否有改变
        IsNew: cacheNote.IsNew, // 是否是新添加的
        IsMarkdown: cacheNote.IsMarkdown, // 是否是markdown笔记
        FromUserId: cacheNote.FromUserId, // 是否是共享新建的
        NoteId: cacheNote.NoteId,
        NotebookId: cacheNote.NotebookId
    };

    if (cacheNote.IsNew) {
        hasChanged.hasChanged = true;
    }

    if (cacheNote.Title != title) {
        hasChanged.hasChanged = true; // 本页使用用小写
        hasChanged.Title = title; // 要传到后台的用大写
    }

    if (!arrayEqual(cacheNote.Tags, tags)) {
        hasChanged.hasChanged = true;
        hasChanged.Tags = tags;
    }

    // 是否需要检查内容呢?
    var needCheckContent = false;
    if (cacheNote.IsNew || force || !Note.readOnly) {
        needCheckContent = true;
    }

    // 标题, 标签, 内容都没改变
    if (!hasChanged.hasChanged && !needCheckContent) {
        return false;
    }

    if (!needCheckContent) {
        return hasChanged;
    }

    //===========
    // 内容的比较

    // 是mardown编辑器, 或者富文本编辑器已Dirty
    if (cacheNote.IsMarkdown || editorIsDirty()) {

        // 如果是markdown返回[content, preview]
        var contents = getEditorContent(cacheNote.IsMarkdown);
        var content, preview;
        if (isArray(contents)) {
            content = contents[0];
            preview = contents[1];
            // preview可能没来得到及解析
            if (content && previewIsEmpty(preview) && Converter) {
                preview = Converter.makeHtml(content);
            }
            if (!content) {
                preview = "";
            }
            cacheNote.Preview = preview; // 仅仅缓存在前台
        } else if (cacheNote.IsMarkdown && typeof contents === 'boolean') {
            // 不会出现, 因为刚开始时readOnly=true, 且只有设置内容完成后才setCurNoteId
            // markdown编辑器还没准备好
            throw new Error('markdown编辑器还没准备好');
        }
        // 富文本编辑器
        else {
            content = contents;
        }

        if (cacheNote.Content != content) {
            hasChanged.hasChanged = true;
            hasChanged.Content = content;

            // 从html中得到...
            var c = preview || content;

            // 不是博客或没有自定义设置的
            if (!cacheNote.HasSelfDefined || !cacheNote.IsBlog) {
                hasChanged.Desc = Note.genDesc(c);
                hasChanged.ImgSrc = Note.getImgSrc(c);
                hasChanged.Abstract = Note.genAbstract(c);
            }
        }

        // 已保存了, 不再Dirty
        setEditorIsDirty(false);
    } else {
        console.log('内容无修改', 'isMarkdown:' + cacheNote.IsMarkdown, 'isDirty:' + editorIsDirty());
    }

    if (hasChanged.hasChanged) {
        return hasChanged;
    }
    return false;
};

// 由content生成desc
// 换行不要替换
Note.genDesc = function(content, length) {
    if (!content) {
        return "";
    }
    if (!length) {
        length = 20;
    }

    // 留空格
    content = content.replace(/<br \/>/g, " ");
    content = content.replace(/<\/p>/g, " ");
    content = content.replace(/<\/div>/g, " ");

    // 非常危险, 万一markdown里, 或者code里写了<script></script>或<http meta=refresh>之类的
    // 避免其它的<img 之类的不完全
    // 之前会将content放到<div></div>中
    // content = $("<div></div>").html(content).text();
    // content = $("<div>" + content + "</div>").text();

    // 将html tags全部删除
    content = content.replace(/<\/?[^>]+(>|$)/g, "");
    content = $.trim(content);
    // pre下text()会将&lt; => < &gt; => >
    content = content.replace(/</g, "&lt;");
    content = content.replace(/>/g, "&gt;");

    if (content.length < length) {
        return content;
    }

    return content.substring(0, length);
}

// 得到摘要
Note.genAbstract = function(content, len) {
    if (!content) {
        return "";
    }
    if (len == undefined) {
        len = 1000;
    }
    if (content.length < len) {
        return content;
    }
    var isCode = false;
    var isHTML = false;
    var n = 0;
    var result = "";
    var maxLen = len;
    for (var i = 0; i < content.length; ++i) {
        var temp = content[i]
        if (temp == '<') {
            isCode = true
        } else if (temp == '&') {
            isHTML = true
        } else if (temp == '>' && isCode) {
            n = n - 1
            isCode = false
        } else if (temp == ';' && isHTML) {
            isHTML = false
        }
        if (!isCode && !isHTML) {
            n = n + 1
        }
        result += temp
        if (n >= maxLen) {
            break
        }
    }

    var d = document.createElement("div");
    d.innerHTML = result
    return d.innerHTML;
};

Note.fixImageSrc = function(src) {
    return fixContentUrl(src);
};

Note.getImgSrc = function(content) {
    if (!content) {
        return "";
    }
    try {
        var imgs = $(content).find("img");
        for (var i in imgs) {
            var src = imgs.eq(i).attr("src");
            if(src && src.indexOf('data:image') < 0) { // 不是base64数据
                return src;
            }
        }
    } catch (e) {}
    return "";
};

Note.setNoteDirty = function(noteId, isDirty) {
    console.trace('setNoteDirty');
    var $leftNoteNav = $(tt('#noteItemList [noteId="?"]', noteId));
    if (!isDirty) {
        $leftNoteNav.removeClass('item-err');
    }
    this.setNoteCache({ NoteId: noteId, IsDirty: isDirty }, false);
    isDirty ? $leftNoteNav.addClass('item-dirty') : $leftNoteNav.removeClass('item-dirty');
};

// 如果当前的改变了, 就保存它
// 以后要定时调用
// force , 默认是true, 表强校验内容
// 定时保存传false
Note.saveInProcess = {}; // noteId => bool, true表示该note正在保存到服务器, 服务器未响应
Note.savePool = {}; // 保存池, 以后的保存先放在pool中, id => note
Note.savePoolNew = {}; // 如果之前新建的保存了, 连续2次事件, 拖动笔记, 则会保存新建两次, 此时数据库中出现两个noteId一样的
Note.curChangedSaveIt = function(force, callback) {
    var me = Note;
    // 如果当前没有笔记, 不保存
    if (!me.curNoteId) {
        // console.trace('无当前笔记!!');
        callback && callback();
        return;
    }

    try {
        var hasChanged = Note.curHasChanged(force);
    } catch (e) {
        console.error('error curHasChanged:'); // + e.toString())
        console.error(e);
        callback && callback();
        return;
    }

    if (hasChanged && hasChanged.hasChanged) {
        // 把已改变的渲染到左边 item-list
        Note.renderChangedNote(hasChanged);

        delete hasChanged.hasChanged;

        // 先缓存, 把markdown的preview也缓存起来
        Note.setNoteCache(hasChanged, false);

        // 设置更新时间
        Note.setNoteCache({ "NoteId": hasChanged.NoteId, "UpdatedTime": new Date() }, false);
        Note.clearCacheByNotebookId(hasChanged.NotebookId);

        // 保存之
        me.saveInProcess[hasChanged.NoteId] = true;

        if (hasChanged.IsNew) {
            if (me.savePoolNew[hasChanged.NoteId]) {
                console.log('要保存新建两次, 被阻止')
                return;
            }
            me.savePoolNew[hasChanged.NoteId] = true;
        }

        // console.log(hasChanged);
        NoteService.updateNoteOrContent(hasChanged, function(ret) {
            me.saveInProcess[hasChanged.NoteId] = false;
            if (hasChanged.IsNew) {
                // 缓存之, 后台得到其它信息
                ret.IsNew = false;
                Note.setNoteCache(ret, false);

                // 新建笔记也要change history
                Pjax.changeNote(ret);
            }

            me.setNoteDirty(hasChanged.NoteId, true);

            callback && callback(ret);
        }, force);

        return hasChanged;

    } else {
        // 如果是强制的, 则要加历史, 但因笔记内容没改, 所以之前不会有
        if (force) {
            var note = me.getCurNote();
            if (!note) {
                return;
            }
            var content = getEditorContent(note.IsMarkdown);
            if (isArray(content)) {
                content = content[0];
            }
            NoteService.addNoteHistory(me.curNoteId, content, callback);
            // console.log('已保存到历史中')
        } else {
            console.log('不用保存 (^_^)');
            callback && callback();
        }
    }
    // callback && callback();
    return false;
};

// 更新池里的笔记
Note.updatePoolNote = function() {
    var me = this;
    for (var noteId in me.savePool) {
        if (!noteId) {
            continue;
        }
        // 删除之
        delete me.savePool[noteId];
        var hasChanged = me.savePool[noteId];
        me.saveInProcess[noteId] = true;
        ajaxPost("/note/updateNoteOrContent", hasChanged, function(ret) {
            me.saveInProcess[noteId] = false;
        });
    }
};
// 启动保存, 暂不处理
Note.updatePoolNoteInterval = null;
Note.startUpdatePoolNoteInterval = function() {
    return;
    var me = this;
    if (me.updatePoolNoteInterval) {
        return;
    }
    me.updatePoolNoteInterval = setTimeout(function() {
        log('update pool');
        me.updatePoolNote();
    }, 1000);
};

Note.clearSelect = function(target) {
    $(".item").removeClass("item-active");
};
Note.selectTarget = function(target) {
    this.clearSelect();
    $(target).addClass("item-active");

    // 判断是否在star中
    var noteId = $(target).attr('noteId');
    Note.selectStar(noteId);
};

// 改变note
// 可能改变的是share note
// 1. 保存之前的note
// 2. ajax得到现在的note
Note.showContentLoading = function() {
    $("#noteMaskForLoading").css("z-index", 11);
};
Note.hideContentLoading = function() {
    $("#noteMaskForLoading").css("z-index", -1);
};

// 定位到笔记
Note.directToNote = function(noteId) {
    // alert(noteId);
    var $t = $("[noteId='" + noteId + "']");
    if ($t.length == 0) {
        return false;
    }

    var $p = $("#noteItemList");
    var pHeight = $p.height();

    var scrollTop = $p.scrollTop();
    var pTop = $t.position().top; // 相对于noteItemList的位置

    // 当前的可视范围的元素位置是[0, pHeight]
    if (pTop >= 0 && pTop <= pHeight) {
        // alert(pTop + ' ' + scrollTop + ' ' + pHeight)
    } else {
        // var top = pTop;
        // console.log("定位到特定note, 在可视范围内");
        $("#noteItemList").scrollTop(pTop + scrollTop);
    }
    return true;
};

// mustPush表示是否将状态push到state中, 默认为true
// 什么时候为false, 在popstate时
// needTargetNobook默认为false, 在点击notebook, renderfirst时为false
Note.changeNoteForPjax = function(noteId, mustPush, needTargetNotebook) {
    // console.trace('changeNoteForPjax');
    var me = this;
    if (!noteId) {
        return;
    }
    var note = me.getNote(noteId);
    if (!note) {
        return;
    }
    var isShare = note.Perm != undefined;
    if (needTargetNotebook == undefined) {
        needTargetNotebook = true;
    }
    me.changeNote(noteId, isShare, true, function(note) {
        // push state
        if (mustPush == undefined) {
            mustPush = true;
        }
        if (mustPush) {
            Pjax.changeNote(note);
        }

        // popstate时虽然选中了note, 但位置可能不可见
        if (needTargetNotebook) {
            Note.directToNote(noteId);
        }
    });

    // 第一次render时定位到第一个笔记的notebook 12.06 life
    // 或通过pop时
    // 什么时候需要? 1. 第一次changeNote, 2. pop时, 只有当点击了notebook后才不要

    // 这里, 万一是共享笔记呢?
    // 切换到共享中
    if (needTargetNotebook) {
        if (isShare) {
            if ($("#myShareNotebooks").hasClass("closed")) {
                $("#myShareNotebooks .folderHeader").trigger("click");
            }
        } else {
            if ($("#myNotebooks").hasClass("closed")) {
                $("#myNotebooks .folderHeader").trigger("click");
            }
        }
        // 如果是子笔记本, 那么要展开父笔记本
        Notebook.expandNotebookTo(note.NotebookId);
    }
};

// 点击notebook时调用, 渲染第一个笔记
Note.contentAjax = null;
Note.contentAjaxSeq = 1;
Note.inChangeNoteId = '';
Note.setCurNoteId = function(noteId) {
    // console.trace('setCurNoteId: ' + noteId);
    Note.curNoteId = noteId;
    Note.inChangeNoteId = '';
};
// 清空curNoteId,
Note.clearCurNoteId = function() {
    // 为什么要++? 避免刚清空, 因为内容的延迟又设置回去了
    Note.contentAjaxSeq++;
    this.curNoteId = null;
};

Note.changeNote = function(selectNoteId, isShare, needSaveChanged, callback) {
    var self = this;
    if (!selectNoteId) {
        return;
    }
    // 1 停止定时器
    Note.stopInterval();

    // 3
    var target = self.getTargetById(selectNoteId);
    Note.selectTarget(target);

    // 1 之前的note, 判断是否已改变, 改变了就要保存之
    // 这里, 在搜索的时候总是保存, 搜索的话, 比较快, 肯定没有变化, 就不要执行该操作
    if (needSaveChanged == undefined) {
        needSaveChanged = true;
    }
    if (needSaveChanged) {
        Note.curChangedSaveIt(true);
    }

    // 2. 设空, 防止在内容得到之前又发生保存
    Note.clearCurNoteId();
    Note.inChangeNoteId = selectNoteId;

    // 2 得到现在的
    // ajax之
    var cacheNote = self.getNote(selectNoteId);
    if (!cacheNote) {
        return;
    }

    Note.renderNote(cacheNote);

    // 这里要切换编辑器
    switchEditor(cacheNote.IsMarkdown);
    Note.hideEditorMask();

    setTimeout(function() {
        Attach.renderNoteAttachNum(selectNoteId, true);
    });

    // 下面很慢
    Note.contentAjaxSeq++;
    var seq = Note.contentAjaxSeq;

    function setContent(ret, fromCache, seq2) {
        // 找不到内容, 就一直loading
        if (!ret) {
            console.error('取不到内容');
            return;
        }

        cacheNote.InitSync = false;

        ret = ret || {};
        Note.contentAjax = null;
        if (seq2 != Note.contentAjaxSeq) {
            return;
        }
        if (!fromCache) {
            Note.setNoteCache(ret, false);
        }
        // 把其它信息也带上
        ret = Note.cache[selectNoteId]
        Note.renderNoteContent(ret, false, seq2);

        self.hideContentLoading();

        callback && callback(ret);
    }

    // 不是刚同步过来的, 且有内容
    if (!cacheNote.InitSync && cacheNote.Content) {
        setContent(cacheNote, true, seq);
        return;
    }

    self.showContentLoading();
    Service.noteService.getNoteContent(cacheNote.NoteId, (function(seq2) {
        return function(ret) {
            setContent(ret, false, seq2);
        }
    })(seq));
};

// 重新渲染笔记, 因为sync更新了
Note.reRenderNote = function(noteId) {
    var me = this;

    me.showContentLoading();
    var note = Note.getNote(noteId);
    Note.renderNote(note);
    NoteService.getNoteContent(noteId, function(noteContent) {
        if (noteContent) {
            Note.setNoteCache(noteContent, false);
            // 确保重置的是当前note
            if (Note.curNoteId === noteId) {
                Attach.renderNoteAttachNum(noteId, true);
                Note.renderNoteContent(noteContent, true);
            }
        }
        me.hideContentLoading();
    });
};

// 更改信息到左侧
// 定时更改 当前正在编辑的信息到左侧导航
// 或change select. 之前的note, 已经改变了
Note.renderChangedNote = function(changedNote) {
    if (!changedNote) {
        return;
    }

    // 找到左侧相应的note
    var $leftNoteNav = $(tt('#noteItemList [noteId="?"]', changedNote.NoteId));
    if (changedNote.Title) {
        $leftNoteNav.find(".item-title").html(trimTitle(changedNote.Title));
        // 如果标题改了, 如果也在star列表中, 那也要改star的标题啊
        Note.changeStarNoteTitle(changedNote.NoteId, trimTitle(changedNote.Title));
    }

    if ($leftNoteNav.hasClass("list-item")) {
        return; //list view只需要更新title
    }

    if (changedNote.Desc) {
        $leftNoteNav.find(".desc").html(trimTitle(changedNote.Desc));
    }
    if (changedNote.ImgSrc) {
        var $thumb = $leftNoteNav.find(".item-thumb");
        // 有可能之前没有图片
        if ($thumb.length > 0) {
            $thumb.find("img").attr("src", Note.fixImageSrc(changedNote.ImgSrc));
        } else {
            $leftNoteNav.append(tt('<div class="item-thumb" style=""><img src="?"></div>', Note.fixImageSrc(changedNote.ImgSrc)));
            $leftNoteNav.addClass("item-image");
        }
        $leftNoteNav.find(".item-desc").removeAttr("style");
    } else if (changedNote.ImgSrc == "") {
        $leftNoteNav.find(".item-thumb").remove(); // 以前有, 现在没有了
        $leftNoteNav.removeClass("item-image");
    }
};

// 清空右侧note信息, 可能是共享的,
// 此时需要清空只读的, 且切换到note edit模式下
Note.clearNoteInfo = function() {
    Note.clearCurNoteId();
    Tag.input.clearTags();
    $("#noteTitle").val("");
    setEditorContent("");

    // markdown editor
    /*
    $("#wmd-input").val("");
    $("#wmd-preview").html("");
    */

    // 只隐藏即可
    $("#noteRead").hide();
};

// 清除noteList导航
Note.clearNoteList = function() {
    Note.noteItemListO.html(""); // 清空
}

// 清空所有, 在转换notebook时使用
Note.clearAll = function() {
    // 当前的笔记清空掉
    Note.clearCurNoteId();

    Note.clearNoteInfo();
    Note.clearNoteList();
};

// render到编辑器
// render note
Note.renderNote = function(note) {
    if (!note) {
        return;
    }
    var title = note.Title || '';
    title = title.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    // title
    $("#noteTitle").val(title);

    // 当前正在编辑的
    // tags
    Tag.input.setTags(note.Tags);
};

// render content
// 这一步很慢
Note.renderNoteContent = function(content, dontNeedSetReadonly, seq2) {
    if (seq2 && seq2 != Note.contentAjaxSeq) {
        return;
    }
    setEditorContent(content.Content, content.IsMarkdown, content.Preview, function() {
        if (seq2 && seq2 != Note.contentAjaxSeq) {
            return;
        }
        Note.setCurNoteId(content.NoteId);

        if (!dontNeedSetReadonly) {
            Note.toggleReadOnly();
        }
    });

    // 只有在renderNoteContent时才设置curNoteId
    // Note.setCurNoteId(content.NoteId);

    // 重新渲染到左侧 desc, 因为笔记传过来是没有desc的
    var $leftNoteNav = $(tt('#noteItemList [noteId="?"]', content.NoteId));
    if ($leftNoteNav.find(".desc").text() == "") {
        Note.renderNoteDesc(content);
    }
};

Note.renderNoteDesc = function(note) {
    // life
    // 重新渲染到左侧 desc, 因为笔记传过来是没有desc的
    note.Desc = Note.genDesc(note.Content);
    note.ImgSrc = Note.getImgSrc(note.Content);
    Note.renderChangedNote(note);
};

Note.showEditorMask = function() {
    $("#editorMask").css("z-index", 10).show();
    // 要判断是否是垃圾筒
    if (Notebook.curNotebookIsTrashOrAll()) {
        $("#editorMaskBtns").hide();
        $("#editorMaskBtnsEmpty").show();
    } else {
        $("#editorMaskBtns").show();
        $("#editorMaskBtnsEmpty").hide();
    }
};

Note.hideEditorMask = function() {
    $("#editorMask").css("z-index", -10).hide();
};

// 这里如果notes过多>100个将会很慢!!, 使用setTimeout来分解
Note.renderNotesC = 0;
/**
 * [renderNotes description]
 * @param  {[type]}  notes      [description]
 * @param  {[type]}  forNewNote [description]
 * @param  {Boolean} hasSorted  是否已排序过
 * @return {[type]}             [description]
 */
Note.renderNotes = function(notes, forNewNote, hasSorted) {
    var renderNotesC = ++Note.renderNotesC;
    var isShared = false;

    this.clearSeqForNew();
    this.batch.reset();

    // 为了切换排序方式用
    Note._everNotes = notes;

    // 手机端不用
    // slimScroll使得手机端滚动不流畅
    if (!LEA.isMobile && !Mobile.isMobile()) {
        // $("#noteItemList").slimScroll({ scrollTo: '0px', height: "100%", onlyScrollBar: true});
        $("#noteItemList").scrollTop(0); // ({ scrollTo: '0px', height: "100%", onlyScrollBar: true});
    }

    if (!notes || typeof notes != "object" || notes.length <= 0) {
        // 如果没有, 那么是不是应该hide editor?
        if (!forNewNote) {
            Note.showEditorMask();
        }
        return;
    }
    Note.hideEditorMask();
    // 新建笔记时会先创建一个新笔记, 所以不能清空
    if (forNewNote == undefined) {
        forNewNote = false;
    }
    if (!forNewNote) {
        Note.noteItemListO.html(""); // 清空
    }

    // 重置获取内容
    // console.trace('--------render notes-----------');
    Note.resetGetNoteContentLazy();

    // 重新排序
    if (!hasSorted) {
	    Note.sortNotes(notes);
    }

    // 20个一次
    var len = notes.length;
    var c = Math.ceil(len / 20);

    Note._renderNotes(notes, forNewNote, isShared, 1);

    // 先设置缓存
    for (var i = 0; i < len; ++i) {
        var note = notes[i];
        // 不清空
        // 之前是addNoteCache, 如果是搜索出的, 会把内容都重置了
        Note.setNoteCache(note, false);
    }

    for (var i = 1; i < c; ++i) {
        setTimeout(
            (function(i) {
                // 防止还没渲染完就点击另一个notebook了
                return function() {
                    if (renderNotesC == Note.renderNotesC) {
                        Note._renderNotes(notes, forNewNote, isShared, i + 1);
                    }
                }
            })(i), i * 2000);
    }
};

Note._getNoteHtmlObjct = function(note, isShared) {
        var baseClasses = "item-my";
        var classes = baseClasses;
        if (note.IsDeleted) {
            console.error('_getNoteHtmlObjct note.IsDeleted');
            return;
        }

        var tmp;
        if (note.ImgSrc) {
            tmp = tt(Note.getItemTpl(), classes, this.newNoteSeq(), note.NoteId, Note.fixImageSrc(note.ImgSrc), note.Title || getMsg('UnTitled'), Notebook.getNotebookTitle(note.NotebookId), goNowToDatetime(note.UpdatedTime), note.Desc);
        } else {
            tmp = tt(Note.getItemTplNoImg(), classes, this.newNoteSeq(), note.NoteId, note.Title || getMsg('UnTitled'), Notebook.getNotebookTitle(note.NotebookId), goNowToDatetime(note.UpdatedTime), note.Desc);
        }
        // blog ?
        var $tmp = $(tmp);
        if (!note.IsBlog) {
            $tmp.removeClass('item-b');
        } else {
            $tmp.addClass('item-b');
        }
        // star ?
        if (note.Star) {
            $tmp.addClass('item-is-star');
        }

        return tmp;
    },
    Note._renderNotes = function(notes, forNewNote, isShared, tang) { // 第几趟
        var baseClasses = "item-my";

        var len = notes.length;
        for (var i = (tang - 1) * 20; i < len && i < tang * 20; ++i) {
            var classes = baseClasses;

            if (!forNewNote && i == 0) {
                classes += " item-active";
            }
            var note = notes[i];
            if (note.IsDeleted) {
                console.error('note.IsDeleted');
                continue;
            }

            note.Title = trimTitle(note.Title);
            if (note.IsDirty || note.IsNew) {
                classes += " item-dirty";
            }
            // 不是trash才要star, conflict fix
            if (!note.IsTrash) {
                // star ?
                if (note.Star) {
                    classes += ' item-is-star';
                }
                if (note.ConflictNoteId) {
                    classes += ' item-conflict';
                }
            } else {
                classes += ' item-is-trash';
            }

            if (note.Err) {
                classes += ' item-err';
            }

            if (note.IsBlog) {
                classes += ' item-b';
            }

            // 这里, 如果没有内容, 则添加到异步池中
            if (note.InitSync) {
                Note.addGetNoteContentLazy(note.NoteId);
            }

            if (!note.Desc && note.Content) {
                note.Desc = Note.genDesc(note.Content);
            }

            var tmp;
            if (note.ImgSrc) {
                tmp = tt(Note.getItemTpl(), classes, i, note.NoteId, Note.fixImageSrc(note.ImgSrc), note.Title || getMsg('UnTitled'), Notebook.getNotebookTitle(note.NotebookId), goNowToDatetime(note.UpdatedTime), note.Desc || '');
            } else {
                tmp = tt(Note.getItemTplNoImg(), classes, i, note.NoteId, note.Title || getMsg('UnTitled'), Notebook.getNotebookTitle(note.NotebookId), goNowToDatetime(note.UpdatedTime), note.Desc || '');
            }

            Note.noteItemListO.append(tmp);
        }
    };

Note._seqForNew = 0;
Note.clearSeqForNew = function() {
    this._seqForNew = 0;
};
Note.newNoteSeq = function() {
    return --this._seqForNew;
};

// 新建一个笔记
// 要切换到当前的notebook下去新建笔记
// isShare时fromUserId才有用
// 3.8 add isMarkdown
Note.newNote = function(notebookId, isShare, fromUserId, isMarkdown) {
    var me = this;

    // 切换编辑器
    switchEditor(isMarkdown);
    Note.hideEditorMask();

    Note.stopInterval();

    Note.batch.reset();

    // 保存当前的笔记
    Note.curChangedSaveIt(true);

    // 新笔记
    var note = {
        NoteId: getObjectId(),
        Title: '',
        Tags: [],
        Desc: '',
        Content: '',
        NotebookId: notebookId,
        IsNew: true,
        FromUserId: fromUserId,
        IsMarkdown: isMarkdown,
        CreatedTime: new Date(),
        UpdatedTime: new Date()
    }; // 是新的

    // 添加到缓存中
    Note.addNoteCache(note);
    Note.clearCacheByNotebookId(notebookId);

    // 清空附件数
    Attach.clearNoteAttachNum();

    // 是否是为共享的notebook添加笔记, 如果是, 则还要记录fromUserId
    var newItem = "";

    var baseClasses = "item-my item-active";

    var notebook = Notebook.getNotebook(notebookId);
    var notebookTitle = notebook ? notebook.Title : "";
    var curDate = getCurDatetime();

    newItem = tt(Note.getItemTplNoImg(), baseClasses, me.newNoteSeq(), note.NoteId, note.Title, notebookTitle, curDate, "");

    newItem = $(newItem);
    // newItem.find(".item-blog").hide();

    // 是否在当前notebook下, 不是则切换过去, 并得到该notebook下所有的notes, 追加到后面!
    if (!Notebook.isCurNotebook(notebookId)) {
        // 先清空所有
        Note.clearAll();

        // 插入到第一个位置
        Note.noteItemListO.prepend(newItem);

        // 改变为当前的notebookId
        // 会得到该notebookId的其它笔记
        Notebook.changeNotebookForNewNote(notebookId);
    } else {
        // 插入到第一个位置
        Note.noteItemListO.prepend(newItem);
    }

    Note.selectTarget($(tt('#noteItemList [noteId="?"]', note.NoteId)));

    setTimeout(function() {
        $("#noteTitle").focus();
    });

    Note.renderNote(note);
    Note.renderNoteContent(note);
    Note.setCurNoteId(note.NoteId);

    // 更新数量
    // Notebook.incrNotebookNumberNotes(notebookId);

    // 切换到写模式
    Note.toggleWriteable(true);
};

// 同步
Note._syncRefreshE = $('#syncRefresh');
Note._syncWarningE = $('#syncWarning');
Note.showSpin = function() {
    var me = this;
    me._syncRefreshE.addClass('fa-spin');

    // 如果超过30秒还在转, 证明有问题了
    /*
    setTimeout(function() {
    	if(me._syncRefreshE.hasClass('fa-spin')) {
    		me._syncRefreshE.removeClass('fa-spin');
    		Note.hideSyncProgress();
    	}
    }, 30 * 1000);
    */

    // 禁止自动保存
    me.stopInterval(true);
};
Note.hideSpin = function() {
    var me = this;
    me._syncRefreshE.removeClass('fa-spin');
    // 开始自动保存
    me.startInterval();
};
// nodejs调用
Note.syncFinished = function(hasError) {
    var me = this;
    me.hideSpin();
    if (!hasError) {
        me._syncWarningE.hide();
    }
    Note.hideSyncProgress();
};
// 过时
Note.sync = function() {
    var me = this;
    me.showSpin();
    SyncService.incrSync();
    me.syncProgress(1);
};
Note._syncProgressO = $('#syncProgress');
Note._syncProgressBarO = $('#syncProgressBar');
Note.syncProgress = function(n) {
    var me = this;
    me._syncProgressO.removeClass('hide');
    me._syncProgressBarO.css('width', n + '%');
};
Note.hideSyncProgress = function() {
    var me = this;
    // 升到100, 再隐藏
    me.syncProgress(100);
    setTimeout(function() {
        me._syncProgressO.addClass('hide');
    }, 1000);
};

// 断网处理
/*
1. sync出现感叹号
2. 如果是需要重新登录, 则点击后出现重新登录的界面
*/
Note.unConnected = function() {
    var me = this;
    me._syncWarningE.show();
    SyncService.setSyncFinished(true);
    me.hideSpin();
    me._syncWarningE.data('reason', 'unConnected');
    me._syncWarningE.attr('title', 'Network error');
};
// 网络已经连接好了
Note.connected = function() {
    var me = this;
    if (me._syncWarningE.data('reason') == 'unConnected') {
    	me._syncWarningE.data('reason', '-');
    	me._syncWarningE.hide();
    }
};
Note.notLogin = function() {
    var me = this;
    me._syncWarningE.show();
    me.hideSpin();
    SyncService.setSyncFinished(true);
    me._syncWarningE.data('reason', 'notLogin');
    me._syncWarningE.attr('title', getMsg('You need to sign in Leanote'));
};
Note.needUpgradeAccount = function() {
    var me = this;
    me.hideSpin();
    SyncService.setSyncFinished(true);
    me._syncWarningE.show();
    me._syncWarningE.data('reason', 'NEED-UPGRADE-ACCOUNT');
    me._syncWarningE.attr('title', getMsg('You need to upgrade Leanote account'));
};
// 点击感叹号, 处理错误
Note.fixNetOrAuthError = function() {
    var me = this;
    var reason = me._syncWarningE.data('reason');

    if (reason == 'unConnected') {
        alert(getMsg('Network error, please check out your network.'));

    } else if (reason == 'notLogin') {
        alert(getMsg('You need to sign in Leanote'));
        // 弹出登录框登录之, 重新弹出
        toLogin();

        // 需要升级Leanote
    } else if (reason == 'NEED-UPGRADE-ACCOUNT') {
        alert(getMsg('You need to upgrade Leanote account'));
        openExternal('https://leanote.com/pricing#buy');
    }
};

// 同步进度显示
Note.syncProcess = function(msg) {
    $('#allProcess').hide();
    $('#syncProcess').show().html(msg);
    $('.loading-footer').show();
};

// 保存note ctrl + s
Note.saveNote = function(e) {
    var num = e.which ? e.which : e.keyCode;
    // 保存
    if ((e.ctrlKey || e.metaKey) && num == 83) { // ctrl + s or command + s
        incrSync(true);
        e.preventDefault();
        return false;
    } else {}

    return;
    // 以前需要, 但现在是electron, 不需要
    // copy, paste
    if (e.ctrlKey || e.metaKey) {
        if (num == 67) { // ctrl + c
            document.execCommand('copy');
        } else if (num == 86) { // ctrl + v
            // 不能要, 要的话会有两次paste
            // document.execCommand('paste');
        } else if (num == 65) { // ctrl + a
            document.execCommand('selectAll');
        } else if (num == 88) { // ctrl + x
            document.execCommand('cut');
        }
    }
};

// 删除或移动笔记后, 渲染下一个或上一个
Note.changeToNext = function(target) {
    var $target = $(target);
    var next = $target.next();
    if (!next.length) {
        var prev = $target.prev();
        if (prev.length) {
            next = prev;
        } else {
            // 就它一个
            Note.showEditorMask();
            return;
        }
    }

    Note.changeNote(next.attr("noteId"));
};

// 要删除noteIds, 找下一个可以的
Note.changeToNextSkipNotes = function(noteIds) {
    var me = Note;
    if (isEmpty(noteIds)) {
        return;
    }

    // 全删除了
    if (me.$itemList.find('li').length <= noteIds.length) {
        me.showEditorMask();
        return;
    }

    // 如果只有一个笔记, 且当前活跃的又不是要删除的, 则不用change
    if (noteIds.length == 1) {
        var $actives = me.$itemList.find('.item-active');
        if ($actives.length == 1 && $actives.attr('noteId') != noteIds[0]) {
            return;
        }
    }

    var $start = me.getTargetById(noteIds[0]);
    var $next = $start.next();
    var i = 1;
    var len = noteIds.length;
    var find = false;
    while ($next.length) {
        // 超出了noteIds
        if (i >= len) {
            find = true;
            break;
        }
        // 不在删除的列表中
        if ($next.attr('noteId') != me.getTargetById(noteIds[i]).attr('noteId')) {
            find = true;
            break;
        }

        $next = $next.next();
        i++;
    }

    // 找不到, 证明是要到前一个了
    if (!find) {
        $next = $start.prev();
    }

    if ($next) {
        me.changeNote($next.attr("noteId"));
    }
};

// 删除笔记
Note.deleteNote = function(target, contextmenuItem, isShared) {
    var me = Note;

    var noteIds;
    if (me.inBatch) {
        noteIds = me.getBatchNoteIds();
    } else {
        noteIds = [$(target).attr('noteId')];
    }
    if (isEmpty(noteIds)) {
        return;
    }

    // 如果删除的是已选中的, 赶紧设置curNoteId = null
    if (noteIds.length == 1 && $(target).hasClass("item-active")) {
        // -1 停止定时器
        Note.stopInterval();
        // 不保存
        me.clearCurNoteId();
        // 清空信息
        Note.clearNoteInfo();
    }

    var $actives;
    if (noteIds.length == 1) {
        $actives = $(target);
    } else {
        $actives = me.$itemList.find('.item-active');
    }

    // 1
    $actives.hide();
    // 2
    NoteService.deleteNote(noteIds, function(ret) {
        if (ret) {
            Note.changeToNextSkipNotes(noteIds);
            $actives.remove();

            // 删除缓存
            for (var i = 0; i < noteIds.length; ++i) {
                var noteId = noteIds[i];
                var note = me.getNote(noteId);
                if (note) {
                    // 取消star
                    Note.unStar(noteId);

                    /*
                    由后端到前端render
                    if (!note.IsTrash) {
                    	// 减少数量
                    	// Notebook.minusNotebookNumberNotes(note.NotebookId);
                    }
                    */
                    Note.clearCacheByNotebookId(note.NotebookId);

                    // 删除缓存
                    delete Note.cache[noteId];
                }
            }
        }
    });

    me.batch.reset();
    return;
};

// 显示共享信息
Note.listNoteShareUserInfo = function(target) {
    var noteId = $(target).attr("noteId");
    showDialogRemote("/share/listNoteShareUserInfo", { noteId: noteId });
}

// 共享笔记
Note.shareNote = function(target) {
    var title = $(target).find(".item-title").text();
    showDialog("dialogShareNote", { title: getMsg("shareToFriends") + "-" + title });

    setTimeout(function() {
        $("#friendsEmail").focus();
    }, 500);

    var noteId = $(target).attr("noteId");
    shareNoteOrNotebook(noteId, true);
}

//---------------------------
// 搜索
// 有点小复杂, 因为速度过快会导致没加载完, 然后就保存上一个 => 致使标题没有
// 为什么会标题没有?
Note.lastSearch = null;
Note.lastKey = null; // 判断是否与上一个相等, 相等就不查询, 如果是等了很久再按enter?
Note.lastSearchTime = new Date();
Note.isOver2Seconds = false;
Note.isSameSearch = function(key) {
    // 判断时间是否超过了1秒, 超过了就认为是不同的
    var now = new Date();
    var duration = now.getTime() - Note.lastSearchTime.getTime();
    Note.isOver2Seconds = duration > 2000 ? true : false;
    if (!Note.lastKey || Note.lastKey != key || duration > 1000) {
        Note.lastKey = key;
        Note.lastSearchTime = now;
        return false;
    }

    if (key == Note.lastKey) {
        return true;
    }

    Note.lastSearchTime = now;
    Note.lastKey = key;
    return false;
}

// 搜索笔记
Note.searchSeq = 0;

// for recoverState
Note.searchNoteSys = function(val, noteId) {
    $("#searchNoteInput").val(val);
    var me = this;
    NoteService.searchNote(val, function(notes) {
        if (notes) {
            Note.searchKey = val;
            Notebook.changeCurNotebookTitle(getMsg('Search results'), false, notes.length, false, true);
            Note.renderNotes(notes);
            // markdown一旦setContent就focus, 导致搜索失去焦点
            setTimeout(function() {
                $("#searchNoteInput").focus();
            })
            if (!isEmpty(notes)) {
                Note.renderNotesAndTargetNote(notes, noteId, false);
            }
        } else {
            // abort的
        }
    });
};

Note.searchNote = function() {
    var val = $("#searchNoteInput").val();
    if (!val) {
        // 定位到all
        Notebook.changeNotebook("0");
        return;
    }
    // 判断是否与上一个是相同的搜索, 是则不搜索
    if (Note.isSameSearch(val)) {
        return;
    }

    // 之前有, 还有结束的
    // if(Note.lastSearch) {
    // Note.lastSearch.abort();
    // }

    // 步骤与tag的搜索一样
    // 1
    Note.curChangedSaveIt();

    // 2 先清空所有
    Note.clearAll();

    // 发送请求之
    // 先取消上一个
    showLoading();

    Note.searchSeq++;
    var t = Note.searchSeq;
    NoteService.searchNote(val, function(notes) {
        hideLoading();
        if (t == Note.searchSeq && notes) {
            Note.searchKey = val;
            Notebook.changeCurNotebookTitle(getMsg('Search results'), false, notes.length, false, true);
            Note.renderNotes(notes);
            // markdown一旦setContent就focus, 导致搜索失去焦点
            setTimeout(function() {
                $("#searchNoteInput").focus();
            })
            if (!isEmpty(notes)) {
                Note.changeNote(notes[0].NoteId, false /*, true || Note.isOver2Seconds*/ ); // isShare, needSaveChanged?, 超过2秒就要保存
            }
        } else {
            // abort的
        }
    });
    // Note.lastSearch.abort();
}

//---------------
//设为blog/unset


Note.setNote2Blog = function(target, isBlog) {
    var me = Note;

    var noteIds;
    if (me.inBatch) {
        noteIds = me.getBatchNoteIds();
    } else {
        noteIds = [$(target).attr('noteId')];
    }
    if (isEmpty(noteIds)) {
        return;
    }

    // 是新笔记 或 当前笔记就是它的, 则先保存之
    Note.curChangedSaveIt(true, function() {
        NoteService.setNote2Blog(noteIds, isBlog, function(ret) {
            if (ret) {
                // 触发同步
                incrSync();
            }
        });
    });
};

// 设置notebook的blog状态
// 当修改notebook是否是blog时调用
Note.setAllNoteBlogStatus = function(notebookId, isBlog) {
    if (!notebookId) {
        return;
    }
    var notes = Note.getNotesByNotebookId(notebookId);
    if (!isArray(notes)) {
        return;
    }
    var len = notes.length;
    if (len == 0) {
        for (var i in Note.cache) {
            if (Note.cache[i].NotebookId == notebookId) {
                Note.cache[i].IsBlog = isBlog;
            }
        }
    } else {
        for (var i = 0; i < len; ++i) {
            notes[i].IsBlog = isBlog;
        }
    }
};

// 移动
Note.moveNote = function(target, data) {
    var me = Note;
    // 批量操作
    var noteIds;
    if (Note.inBatch) {
        noteIds = me.getBatchNoteIds();
    } else {
        noteIds = [$(target).attr('noteId')];
    }

    // 当前在该笔记本下
    var toNotebookId = data.notebookId;
    if (Notebook.getCurNotebookId() == toNotebookId) {
        return;
    }

    if (noteIds.length == 1) {
        var note = me.getNote(noteIds[0]);
        if (!note.IsTrash && note.NotebookId == toNotebookId) {
            return;
        }
    }

    NoteService.moveNote(noteIds, toNotebookId, function(ret) {
        if (ret) {
            me.clearCacheByNotebookId(toNotebookId);

            for (var i = 0; i < noteIds.length; ++i) {
                var noteId = noteIds[i];
                var note = me.getNote(noteId);
                if (note) {
                    // 修改笔记数量
                    if (note.NotebookId != toNotebookId) {
                        Notebook.incrNotebookNumberNotes(toNotebookId);
                        if (!note.IsTrash) {
                            Notebook.minusNotebookNumberNotes(note.NotebookId);
                        }
                    } else if (note.IsTrash) {
                        Notebook.incrNotebookNumberNotes(note.NotebookId);
                    }

                    me.clearCacheByNotebookId(note.NotebookId);

                    // 设置缓存
                    note.NotebookId = toNotebookId;
                    note.IsTrash = false;
                    note.UpdatedTime = new Date();
                    me.setNoteCache(note);
                }
            }

            var $actives;
            if (noteIds.length == 1) {
                $actives = target;
            } else {
                $actives = me.$itemList.find('.item-active');
            }
            // 不在all下, 就删除之
            if (!Notebook.curActiveNotebookIsAll()) {
                me.changeToNextSkipNotes(noteIds);
                $actives.remove();
            }
            // 在all下, 不要删除
            else {
                // 不移动, 那么要改变其notebook title
                $actives.find(".note-notebook").html(Notebook.getNotebookTitle(toNotebookId));

                me.changeNote($actives.eq(0).attr('noteId'));
            }
        }
    });

    // 重置, 因为可能移动后笔记下没笔记了
    me.batch.reset();
};

// 复制
// data是自动传来的, 是contextmenu数据
Note.copyNote = function(target, data, isShared) {
    var me = Note;

    var toNotebookId = data.notebookId;
    var noteIds;
    if (Note.inBatch) {
        noteIds = me.getBatchNoteIds();
    } else {
        noteIds = [$(target).attr('noteId')];
    }

    // 得到需要复制的
    var needNoteIds = [];
    for (var i = 0; i < noteIds.length; ++i) {
        var noteId = noteIds[i];
        var note = me.getNote(noteId);
        if (note) {
            // trash不能复制, 不能复制给自己
            // 因为contexmenu不能disable有子menu的项, 所以允许复制trash
            if ( /*note.IsTrash || */ note.NotebookId == toNotebookId) {
                continue;
            }
            needNoteIds.push(noteId);
        }
    }
    if (needNoteIds.length == 0) {
        return;
    }

    NoteService.copyNote(needNoteIds, toNotebookId, function(notes) {
        if (!isEmpty(notes)) {
            // 重新清空cache 之后的
            Note.clearCacheByNotebookId(toNotebookId);
            for (var i = 0; i < notes.length; ++i) {
                var note = notes[i];
                if (!note.NoteId) {
                    continue;
                }
                // 改变缓存, 添加之
                Note.setNoteCache(note);

                // 增加数量
                Notebook.incrNotebookNumberNotes(toNotebookId)
            }
        }
    });
};

// 删除笔记标签
// item = {noteId => usn}
Note.deleteNoteTag = function(item, tag) {
    if (!item) {
        return;
    }
    // noteId => note
    for (var noteId in item) {
        var note = Note.getNote(noteId);
        if (note) {
            note.Tags = note.Tags || [];
            for (var i = 0; i < note.Tags.length; ++i) {
                if (note.Tags[i] == tag) {
                    note.Tags.splice(i, 1);
                    continue;
                }
            }
            // 如果当前笔记是展示的笔记, 则重新renderTags
            if (noteId == Note.curNoteId) {
                Tag.input.setTags(note.Tags);
            }

            Note.setNoteDirty(noteId, true);
        }
    }
};

Note.readOnly = true; // 默认为true
LEA.readOnly = true;
// 切换只读模式
Note.toggleReadOnly = function(needSave) {
    var me = this;
    var note = me.getCurNote();

    // tinymce
    var $editor = $('#editor');
    $editor.addClass('read-only').removeClass('all-tool'); // 不要全部的

    // 不可写
    $('#editorContent').attr('contenteditable', false);

    // markdown
    $('#mdEditor').addClass('read-only');
    $('#note').addClass('read-only-editor');

    if (!note) {
        return;
    }

    if (note.IsMarkdown) {
        $('#mdInfoToolbar .created-time').html(goNowToDatetime(note.CreatedTime));
        $('#mdInfoToolbar .updated-time').html(goNowToDatetime(note.UpdatedTime));
    } else {
        $('#infoToolbar .created-time').html(goNowToDatetime(note.CreatedTime));
        $('#infoToolbar .updated-time').html(goNowToDatetime(note.UpdatedTime));
    }

    // 保存之
    if (needSave) {
        Note.curChangedSaveIt(true);
    }

    Note.readOnly = true;
    LEA.readOnly = true;

    if (!note.IsMarkdown) {
        // 里面的pre也设为不可写
        $('#editorContent pre').each(function() {
            LeaAce.setAceReadOnly($(this), true);
        });
    }
};

// 切换到编辑模式
LEA.toggleWriteable = Note.toggleWriteable = function(isFromNewNote) {
    var me = Note;
    var note = me.getCurNote();
    if (note) {
        if (note.InitSync) {
            alert('Waiting for loading content from server');
            return;
        }
    }

    // $('#infoToolbar').hide();
    $('#editor').removeClass('read-only');
    $('#note').removeClass('read-only-editor');
    $('#editorContent').attr('contenteditable', true);

    // markdown
    $('#mdEditor').removeClass('read-only');

    if (!note) {
        return;
    }

    Note.readOnly = false;
    LEA.readOnly = false;

    if (!note.IsMarkdown) {
        // 里面的pre也设为不可写
        $('#editorContent pre').each(function() {
            LeaAce.setAceReadOnly($(this), false);
        });

        isFromNewNote || tinymce.activeEditor.focus();
    } else {
        if (MD) {
            isFromNewNote || MD.focus();
            MD.onResize();
        }
    }
};

Note.toggleWriteableAndReadOnly = function() {
    if (LEA.readOnly) {
        Note.toggleWriteable();
    } else {
        Note.toggleReadOnly(true);
    }
};

// 渲染列表
Note.starNotes = [];
Note.starItemT = '<li data-id="?"><a>?<span class="delete-star" title="' + getMsg('Remove') + '">X</span></a></li>';
Note.starNotesO = $('#starNotes');
Note.renderStars = function(notes) {
    var me = this;
    var notes = notes || me.starNotes;
    me.starNotes = notes;
    me.starNotesO.html('');
    for (var i = 0; i < notes.length; ++i) {
        var note = notes[i];
        var t = tt(me.starItemT, note.NoteId, trimTitle(note.Title) || getMsg('Untitled'));
        me.starNotesO.append(t);
    }

    if (notes.length == 0) {
        me.starNotesO.html('<p class="no-info">' + getMsg('No Starred Note') + '</p>');
    }
};

// 点击笔记, 判断是否在star中, 如果在, 则也选中
Note.selectStar = function(noteId) {
    var me = this;
    var target = me.starNotesO.find('li[data-id="' + noteId + '"]');
    me.starNotesO.find('li').removeClass('selected');
    target.addClass('selected');
};

// 点击, note
Note.renderStarNote = function(target) {
    var me = this;
    var noteId = target.data('id');
    // 如果没有target, 则选第一个
    if (!noteId) {
        target = me.starNotesO.find('li').eq(0);
    }
    var noteId = target.data('id');
    if (!noteId) {
        return;
    }
    me.starNotesO.find('li').removeClass('selected');
    target.addClass('selected');


    // 大BUG start
    // 先保存现有的啊
    me.curChangedSaveIt();

    // 把当前笔记放在第一位
    me.clearAll();

    // 如果数据改了, me.starNotes 的content不是最新的
    me.starNotes || (me.starNotes = []);
    for (var i = 0; i < me.starNotes.length; ++i) {
        me.starNotes[i] = me.getNote(me.starNotes[i].NoteId);
    }
    // 大BUG end

    me.renderNotes(me.starNotes);
    me.changeNoteForPjax(noteId, true, false);
    me.directToNote(noteId);

    // $('#curNotebookForLisNote').text("Starred");
    Notebook.changeCurNotebookTitle(getMsg('Starred'), true);
};

// 笔记标题改了后, 如果在star中, 则也要改标题
Note.changeStarNoteTitle = function(noteId, title) {
    var me = this;
    var cacheNote = me.getNote(noteId);
    /*
    if(!cacheNote.Star) {
    	return;
    }
    */

    var target = me.starNotesO.find('li[data-id="' + noteId + '"]');
    if (target.length == 1) {
        target.find('a').html((title || 'Untitled') + '<span class="delete-star" title="' + getMsg('Remove') + '">X</span>');
    }
};

// 取消star, note delete/trash时取消star
Note.unStar = function(noteId) {
    var me = this;

    // 删除该stars
    var has = false;
    for (var i = 0; i < me.starNotes.length; ++i) {
        var tNote = me.starNotes[i];
        if (tNote.NoteId == noteId) {
            var has = true;
            me.starNotes.splice(i, 1);
            break;
        }
    }

    if (has) {
        // 重新渲染之
        me.renderStars(me.starNotes);
    }
};

// 收藏或取消收藏
Note.star = function(noteId) {
    var me = this;
    var note = me.getNote(noteId);
    if (!note || note.IsTrash) {
        return;
    }
    var $target = $('[noteId="' + noteId + '"]');
    NoteService.star(noteId, function(ok, isStarred) {
        if (ok) {
            note.Star = isStarred;
            if (isStarred) {
                me.starNotes.unshift(note);
                $target.addClass('item-is-star');
            } else {
                $target.removeClass('item-is-star');
                // 删除该stars
                for (var i = 0; i < me.starNotes.length; ++i) {
                    var tNote = me.starNotes[i];
                    if (tNote.NoteId == noteId) {
                        me.starNotes.splice(i, 1);
                        break;
                    }
                }
            }

            // 重新渲染之
            me.renderStars(me.starNotes);
        }
    });
};

// 显示
Note._curFixNoteId = ''; // 当前要处理的
Note._curFixNoteTarget = '';
Note._conflictTipsElem = $('#conflictTips');
Note._showConflictInfoInited = false;
// 初始化事件
Note._initshowConflictInfo = function() {
    var me = this;

    // 点击与之冲突的笔记, 则将该笔记显示到它前面, 并选中
    Note._conflictTipsElem.find('.conflict-title').click(function() {
        var conflictNoteId = $(this).data('id');
        var conflictNote = me.getNote(conflictNoteId);
        if (!conflictNote) {
            alert('The note is not exists');
            return;
        }
        // 是否在该列表中?
        var target = $(tt('#noteItemList [noteId="?"]', conflictNoteId)); //
        // 如果当前笔记在笔记列表中, 那么生成一个新笔记放在这个笔记上面
        if (target.length > 0) {} else {
            target = me._getNoteHtmlObjct(conflictNote);
        }
        // console.log(">....>");
        // console.log(me._curFixNoteTarget);
        // console.log(target);

        target.insertAfter(me._curFixNoteTarget);
        // alert(3);
        // me._curFixNoteTarget.insertBefore(target);
        // 选中与之冲突的笔记
        me.changeNote(conflictNoteId);
    });
};
Note.showConflictInfo = function(target, e) {
    var me = this;

    var $li = $(target).closest('li');
    var noteId = $li.attr('noteId');

    var note = me.getNote(noteId);
    if (!note) {
        return;
    }
    var conflictNoteId = note.ConflictNoteId;

    function conflictIsFixed() {
        // 去掉item-confict class
        // 并且改变
        $li.removeClass('item-conflict');
        note.ConflictNoteId = "";
        NoteService.conflictIsFixed(noteId);
    }
    if (!conflictNoteId) {
        return conflictIsFixed();
    }

    var conflictNote = me.getNote(conflictNoteId);
    if (!conflictNote) {
        return conflictIsFixed();
    }

    me._curFixNoteId = noteId;
    me._curFixNoteTarget = $li;

    if (!me._showConflictInfoInited) {
        me._showConflictInfoInited = true;
        me._initshowConflictInfo();
    }

    // 初始化数据
    var titleElem = Note._conflictTipsElem.find('.conflict-title');
    titleElem.text(conflictNote.Title);
    titleElem.data('id', conflictNoteId);
    Note._conflictTipsElem.find('.conflict-resolved').prop('checked', false);

    ContextTips.show('#conflictTips', e, function() {
        if (Note._conflictTipsElem.find('.conflict-resolved').prop('checked')) {
            conflictIsFixed();
        }
    });
};

// 内容已同步成功
Note.contentSynced = function(noteId, content) {
    var me = this;
    var note = me.getNote(noteId);
    if (!note) {
        // 可能之前还没有
        // me.setNoteCache(noteId, {Content: content});
        return;
    }
    if (note.InitSync) {
        // 重新render内容
        note.InitSync = false;
        note.Content = content;
        if (me.curNoteId == noteId || me.inChangeNoteId == noteId) {
            // alert(note.Title);
            // 重新渲染
            // alert(me.curNoteId == noteId); false
            // alert(me.inChangeNoteId == noteId); true
            Note.reRenderNote(noteId);
        } else {
            // 生成desc
            me.renderNoteDesc(note);
        }
    }
};

//------------------------
// 异步加载note content

// 池, 最大10个
Note._loadContentPool = [];
Note._loadContentPoolSeq = 0;
Note._startedGetNoteContentLazy = false;
Note._stopGetNoteContentLazy = false;

Note._loadContentRunSeq = 0;

Note._loadContentStarted = {};

// 在render notes时
// 延迟加载内容

// 重新render notes时, 重置pool
Note.resetGetNoteContentLazy = function() {
    var me = this;
    me._loadContentPool = [];
    me._loadContentPoolSeq = 0;
    me._stopGetNoteContentLazy = false;
    me._startedGetNoteContentLazy = false;
    me._loadContentRunSeq++;
};

// 添加到池子中
Note.addGetNoteContentLazy = function(noteId) {
    var me = this;
    Note._loadContentPool.push(noteId);
    me.startGetNoteContentLazy();
};

// render notes后,
// 开始加载
Note.startGetNoteContentLazy = function() {
    var me = this;

    if (me._loadContentStarted[me._loadContentRunSeq]) {
        return;
    }
    me._loadContentStarted[me._loadContentRunSeq] = true;

    me.getNoteContentLazy(me._loadContentRunSeq);
};

// 得到下一个要处理的noteId
Note._getNextNoteId = function() {
    var me = this;
    var noteId = me._loadContentPool[me._loadContentPoolSeq];
    me._loadContentPoolSeq++;
    return noteId;
};

Note.getNoteContentLazy = function(runSeq) {
    var me = this;

    // // 暂停了
    // if (me._stopGetNoteContentLazy) {
    // 	return;
    // }

    // 不是一个时候了
    if (runSeq != me._loadContentRunSeq) {
        console.log('不是一个时候了 ' + runSeq + '_' + me._loadContentRunSeq);
        return;
    }

    var noteId = me._getNextNoteId();
    if (!noteId) {
        return;
    }

    var note = me.getNote(noteId);
    if (note && !note.InitSync) {
        console.log('不用加载');
        me.getNoteContentLazy(runSeq);
        return;
    }

    console.log('正在加载....' + noteId);

    setTimeout(function() {
        NoteService.getNoteContent(noteId, function(contentO) {
            if (typeof contentO == 'object') {
                Note.contentSynced(noteId, contentO.Content);
                me.getNoteContentLazy(runSeq);
            }
        });
    }, 800);
};

Note.stopGetNoteContentLazy = function() {
    var me = this;
    me._stopGetNoteContentLazy = true;
};

Note.target = null; // 当前处理的note
Note.menuItemsForMove = {}; // notebookId => menu
Note.menuItemsForCopy = {}; // notebookId => menu
Note.getContextNotebooksSys = function(notebooks) {

    var submenuMoves = new gui.Menu();
    var submenuCopys = new gui.Menu();

    for (var i in notebooks) {
        (function(j) {
            var notebook = notebooks[j];

            var moveMenu = {
                label: notebook.Title,
                click: function() {
                    Note.moveNote(Note.target, { notebookId: notebook.NotebookId });
                }
            };
            var copyMenu = {
                label: notebook.Title,
                click: function() {
                    Note.copyNote(Note.target, { notebookId: notebook.NotebookId });
                }
            };

            if (!isEmpty(notebook.Subs)) {
                var mc = Note.getContextNotebooksSys(notebook.Subs);
                moveMenu.submenu = mc[0];
                moveMenu.type = 'submenu';
                copyMenu.submenu = mc[1];
                copyMenu.type = 'submenu';
            }

            var move = new gui.MenuItem(moveMenu);
            var copy = new gui.MenuItem(copyMenu);

            Note.menuItemsForMove[notebook.NotebookId] = move;
            Note.menuItemsForCopy[notebook.NotebookId] = copy;

            submenuMoves.append(move);
            submenuCopys.append(copy);

        })(i);
    }
    return [submenuMoves, submenuCopys];
};

// Notebook调用
Note.contextmenu = null;
Note.notebooksCopy = []; // share会用到
Note.initContextmenu = function() {
    var self = Note;
    var notebooks = Notebook.everNotebooks;

    //-------------------
    // 右键菜单
    function noteMenu() {

        var me = this;
        // this.target = '';
        this.menu = new gui.Menu();
        this.del = new gui.MenuItem({
            label: getMsg("Delete"),
            click: function(e) {
                Note.deleteNote(self.target);
            }
        });

        this.publicBlog = new gui.MenuItem({
            label: getMsg("Public as blog"),
            click: function(e) {
                Note.setNote2Blog(self.target, true);
            }
        });
        this.unPublicBlog = new gui.MenuItem({
            label: getMsg("Cancel public"),
            click: function(e) {
                Note.setNote2Blog(self.target, false);
            }
        });

        // var ms = Note.getContextNotebooksSys(notebooks);
        // this.move.submenu = ms[0];
        // this.copy.submenu = ms[1];

        this.move = new gui.MenuItem({
            label: getMsg("Move"),
            click: function(e) {
                dialogOperateNotes({ notebooks: notebooks, func: 'move' });
            }
        });
        this.copy = new gui.MenuItem({
            label: getMsg("Copy"),
            click: function(e) {
                dialogOperateNotes({ notebooks: notebooks, func: 'copy' });
            }
        });

        function dialogOperateNotes(options) {
            $("#leanoteDialog #modalTitle").html(getMsg("selectNotebook"));

            $("#leanoteDialog .modal-body").html('<p><strong>' + getMsg("doubleClick") + '</strong></p><ul id="notebookTree" class="ztree showIcon"></ul>');
            $("#leanoteDialog .modal-footer").html('\
            	<button type="button" class="btn btn-default" data-dismiss="modal">' + getMsg("Close") + '</button>\
            	');
            var callback;
            if ('move' == options.func) {
                callback = function(notebookId) {
                    Note.moveNote(Note.target, { notebookId: notebookId });
                }
            } else if ('copy' == options.func) {
                callback = function(notebookId) {
                    Note.copyNote(Note.target, { notebookId: notebookId });
                }
            }
            var notebookTree = $.fn.zTree.init($("#notebookTree"), Notebook.getSimpleTreeSetting({ callback: callback }), options.notebooks);
            delete options.title;
            options.show = true;
            $("#leanoteDialog").modal(options);
        }

        // 本地笔记不能公开为博客
        if (!UserInfo.IsLocal) {
            this.menu.append(this.publicBlog);
            this.menu.append(this.unPublicBlog);
            this.menu.append(gui.getSeparatorMenu());
        }

        this.menu.append(this.del);
        this.menu.append(gui.getSeparatorMenu());

        this.menu.append(this.move);
        this.menu.append(this.copy);

        // 导出
        var exportsSubMenus = new gui.Menu();
        var exportMenus = Api.getExportMenus() || [];
        for (var i = 0; i < exportMenus.length; ++i) {
            (function(j) {

                var menu = exportMenus[j];
                var clickBac = menu.click;

                var menuItem = new gui.MenuItem({
                    label: menu.label,
                    click: function(e) {
                        if (Note.inBatch) {
                            var noteIds = Note.getBatchNoteIds();
                        } else {
                            var noteIds = [$(self.target).attr('noteId')];
                        }
                        // var note = Note.getNote();
                        clickBac && clickBac(noteIds);
                    }
                });

                exportMenus[i].menu = menuItem;

                exportsSubMenus.append(menuItem);
            })(i);
        }

        if (exportMenus.length > 0) {
            this.exports = new gui.MenuItem({
                label: getMsg('Export'),
                submenu: exportsSubMenus,
                click: function(e) {}
            });

            this.menu.append(gui.getSeparatorMenu());
            this.menu.append(this.exports);
        }

        this.enable = function(name, ok) {
                this[name].enabled = ok;
            }
            // 控制disable
        this.popup = function(e, target) {
            self.target = target;
            var noteIds;
            if (Note.inBatch) {
                noteIds = Note.getBatchNoteIds();
            } else {
                noteIds = [$(target).attr("noteId")];
            }

            // 导出的enabled
            for (var i = 0; i < exportMenus.length; ++i) {
                exportMenus[i].menu.enabled = exportMenus[i].enabled(noteIds);
            }

            // 批量, 除了导出pdf都可以操作
            if (Note.inBatch) {
                this.copy.enabled = true;
                this.move.enabled = true;
                this.publicBlog.enabled = true;
                this.unPublicBlog.enabled = true;
            } else {
                var note = Note.getNote(noteIds[0]);
                if (!note) {
                    return;
                }

                if (note.IsTrash || Notebook.curNotebookIsTrash()) {
                    this.copy.enabled = false; // 没用
                    this.publicBlog.enabled = false;
                    this.unPublicBlog.enabled = false;
                } else {
                    this.copy.enabled = true;

                    if (note.IsBlog) {
                        this.publicBlog.enabled = false;
                        this.unPublicBlog.enabled = true;
                    } else {
                        this.publicBlog.enabled = true;
                        this.unPublicBlog.enabled = false;
                    }
                }
            }

            // this.menu.popup(gui.getCurrentWindow(), e.originalEvent.x, e.originalEvent.y);
            this.menu.popup(gui.getCurrentWindow(), e.pageX, e.pageY);
        }
    }

    var noteMenuSys = new noteMenu();

    Note.noteMenuSys = noteMenuSys;
};

// 附件
// 笔记的附件需要ajax获取
// 建一张附件表? attachId, noteId, 其它信息
// note里有attach_nums字段记录个数
// [ok]
var Attach = {
    loadedNoteAttachs: {}, // noteId => [attch1Info, attach2Info...] // 按笔记
    attachsMap: {}, // attachId => attachInfo
    getAttach: function(attachId) {
        return this.attachsMap[attachId];
    },
    init: function() {
        var self = this;
        var me = this;
        // 显示attachs
        $("#showAttach").click(function() {
            self.renderAttachs(Note.curNoteId);
        });
        // 防止点击隐藏
        self.attachListO.click(function(e) {
            e.stopPropagation();
        });
        // 删除
        self.attachListO.on("click", ".delete-attach", function(e) {
            e.stopPropagation();
            var attachId = $(this).closest('li').data("id");
            var t = this;
            if (confirm(getMsg("Are you sure to delete it ?"))) {
                // $(t).button("loading");
                self.deleteAttach(attachId);
                // $(t).button("reset");
            }
        });
        // 下载
        var curAttachId = '';
        self.attachListO.on("click", ".download-attach", function(e) {
            e.stopPropagation();
            var $li = $(this).closest('li');
            var attachId = $li.data("id");
            var title = $li.find('.attach-title').text();

            gui.dialog.showSaveDialog(gui.getCurrentWindow(), { title: title, defaultPath: gui.app.getPath('userDesktop') + '/' + title }, function(targetPath) {
                if (targetPath) {
                    var curAttach = me.getAttach(attachId);
                    if (curAttach) {
                        FileService.download(curAttach.Path, targetPath, function(ok, msg) {
                            if (!ok) {
                                Notify.show({ type: 'warning', title: 'Warning', body: 'File saved failed!' });
                            } else {
                                Notify.show({ title: 'Info', body: 'File saved successful!' });
                            }
                        });
                    } else {
                        alert('error');
                    }
                } else {}
            });
        });

        // make link
        self.attachListO.on("click", ".link-attach", function(e) {
            e.stopPropagation();
            var attachId = $(this).closest('li').data("id");
            var attach = self.attachsMap[attachId];
            var src = EvtService.getAttachLocalUrl(attachId); // + "/attach/download?attachId=" + attachId;
            // http://leanote.com/attach/download?attachId=54f7481638f4112ff000170f

            Note.toggleWriteable();
            if (LEA.isMarkdownEditor() && MD) {
                MD.insertLink(src, attach.Title);
            } else {
                tinymce.activeEditor.insertContent('<a target="_blank" href="' + src + '">' + attach.Title + '</a>');
            }
        });

        // 添加Attach
        $('#chooseFile').click(function() {
            gui.dialog.showOpenDialog(gui.getCurrentWindow(), {
                    defaultPath: gui.app.getPath('userDesktop'),
                    properties: ['openFile', 'multiSelections']
                },
                function(paths) {
                    if (!paths) {
                        return;
                    }

                    // 如果是新建的笔记, 必须先保存note
                    var note = Note.getCurNote();
                    if (note && note.IsNew) {
                        Note.curChangedSaveIt(true);
                    }

                    FileService.addAttach(paths, Note.curNoteId, function(files) {
                        if (files) {
                            me.addAttachs(files);
                        }
                    });
                }
            );
        });
    },
    attachListO: $("#attachList"),
    attachNumO: $("#attachNum"),
    attachDropdownO: $("#attachDropdown"),
    downloadAllBtnO: $("#downloadAllBtn"),
    linkAllBtnO: $("#linkAllBtn"),
    // 添加笔记时
    clearNoteAttachNum: function() {
        var self = this;
        self.attachNumO.html("").hide();
    },
    renderNoteAttachNum: function(noteId, needHide) {
        var self = this;
        var note = Note.getNote(noteId);
        var attachs = note.Attachs;
        var attachNum = attachs ? attachs.length : 0;
        if (attachNum) {
            self.attachNumO.html("(" + attachNum + ")").show();
            self.downloadAllBtnO.show();
            self.linkAllBtnO.show();
        } else {
            self.attachNumO.hide();
            self.downloadAllBtnO.hide();
            self.linkAllBtnO.hide();
        }

        // 隐藏掉
        if (needHide) {
            self.attachDropdownO.removeClass("open");
        }
    },
    _renderAttachs: function(attachs) {
        var self = this;
        // foreach 循环之
        /*
        <li class="clearfix">
        	<div class="attach-title">leanote官abcefedafadfadfadfadfad方文档.doc</div>
        	<div class="attach-process">
        		<button class="btn btn-sm btn-warning">Delete</button>
        		<button class="btn btn-sm btn-deafult">Download</button>
        	</div>
        </li>
        */
        var html = "";
        var attachNum = attachs.length;
        // console.log(attachs);
        for (var i = 0; i < attachNum; ++i) {
            var each = attachs[i];
            var path = each.Path;
            // 本地是否有, 没有, 是否是在显示的时候才去从服务器上抓? 不
            var disabled = '';
            if (path) {
                var d = '<i class="fa fa-download"></i>';
            } else {
                d = '...'
                disabled = 'disabled';
                // 通过后端去下载
                NoteService.downloadAttachFromServer(Note.curNoteId, each.ServerFileId, each.FileId);
            }
            html += '<li class="clearfix" data-id="' + each.FileId + '">' +
                '<div class="attach-title">' + each.Title + '</div>' +
                '<div class="attach-process"> ' +
                '	  <button class="btn btn-sm btn-warning delete-attach" data-loading-text="..." title="' + getMsg('Delete') + '"><i class="fa fa-trash-o"></i></button> ' +
                '	  <button type="button" class="btn btn-sm btn-primary download-attach" ' + disabled + ' title="' + getMsg('Save as') + '">' + d + '</button> ' +
                '	  <button type="button" class="btn btn-sm btn-default link-attach" title="' + getMsg('Insert link into content') + '"><i class="fa fa-link"></i></button> ' +
                '</div>' +
                '</li>';
            self.attachsMap[each.FileId] = each;
        }
        self.attachListO.html(html);

        // 设置数量
        var note = Note.getCurNote();
        if (note) {
            note.AttachNum = attachNum;
            self.renderNoteAttachNum(note.NoteId, false);
        }
    },
    // 渲染noteId的附件
    // 当点击"附件"时加载,
    // TODO 判断是否已loaded
    // note添加一个Attachs
    renderAttachs: function(noteId) {
        var self = this;
        var note = Note.getNote(noteId);
        note.Attachs = note.Attachs || [];
        self.loadedNoteAttachs[noteId] = note.Attachs; // 一个对象
        self._renderAttachs(note.Attachs);
        return;
        /*

        if(self.loadedNoteAttachs[noteId]) {
        	self._renderAttachs(self.loadedNoteAttachs[noteId]);
        	return;
        }
        // 显示loading
        self.attachListO.html('<li class="loading"><img src="public/images/loading-24.gif"/></li>');
        // ajax获取noteAttachs
        ajaxGet("/attach/getAttachs", {noteId: noteId}, function(ret) {
        	var list = [];
        	if(ret.Ok) {
        		list = ret.List;
        		if(!list) {
        			list = [];
        		}
        	}
        	// 添加到缓存中
        	self.loadedNoteAttachs[noteId] = list;
        	self._renderAttachs(list);
        });
        */
    },
    // 添加附件, attachment_upload上传调用
    addAttach: function(attachInfo) {
        var self = this;
        self.loadedNoteAttachs[attachInfo.NoteId].push(attachInfo);
        self.renderAttachs(attachInfo.NoteId);
        // TOOD 更新Note表
        self.updateAttachToDB(attachInfo.NoteId);
    },
    addAttachs: function(attachInfos) {
        var self = this;
        var noteId = '';
        for (var i in attachInfos) {
            var attachInfo = attachInfos[i];
            noteId = attachInfo.NoteId;
            self.loadedNoteAttachs[noteId].push(attachInfo);
        }
        self.renderAttachs(attachInfo.NoteId);
        // TOOD 更新Note表
        self.updateAttachToDB(noteId);
    },
    // 删除
    deleteAttach: function(attachId) {
        var self = this;
        var noteId = Note.curNoteId;
        var attachs = self.loadedNoteAttachs[noteId];
        for (var i = 0; i < attachs.length; ++i) {
            if (attachs[i].FileId == attachId) {
                // 删除之, 并render之
                attachs.splice(i, 1);
                break;
            }
        }
        // self.loadedNoteAttachs[noteId] = attachs;
        self.renderAttachs(noteId);
        // TODO 更新
        self.updateAttachToDB(noteId);
    },

    // 更新到Note表中
    updateAttachToDB: function(noteId) {
        var self = this;
        var attachs = self.loadedNoteAttachs[noteId]
        NoteService.updateAttach(noteId, attachs);
    },

    // 下载
    downloadAttach: function(fileId) {
        var self = this;
    },
    downloadAll: function() {},

    // 服务器端同步成功后调用
    attachSynced: function(attachs, attach, noteId) {
        var me = this;
        var fileId = attach.FileId;
        var note = Note.getNote(noteId);
        if (note) {
            note.Attachs = attachs;
            me.attachsMap[fileId] = attach;
            if (noteId == Note.curNoteId) {
                // 重新render之
                me.renderAttachs(noteId);
            }
        }
    }
};

//===============

// 批量操作
Note.inBatch = false;
Note.getBatchNoteIds = function() {
    var noteIds = [];
    var items = Note.$itemList.find('.item-active');
    for (var i = 0; i < items.length; ++i) {
        noteIds.push(items.eq(i).attr('noteId'));
    }
    return noteIds;
};
Note.batch = {
    $noteItemList: $("#noteItemList"),

    cancelInBatch: function() {
        Note.inBatch = false;
        this.$body.removeClass('batch');
    },
    setInBatch: function() {
        Note.inBatch = true;
        this.$body.addClass('batch');
    },

    // 是否是多选, 至少选了2个
    isInBatch: function() {
        var me = this;
        var items = me.$noteItemList.find('.item-active');
        if (items.length >= 2) {
            return true;
        }
        return false;
    },

    // 得到开始的笔记
    _startNoteO: null, // 开始选择的笔记
    getStartNoteO: function() {
        var me = this;
        if (!me._startNoteO) {
            me._startNoteO = me.getCurSelected();
        }
        return me._startNoteO;
    },

    // 清空以start开头已选择的
    // 用于shift
    _selectByStart: {}, // start.NoteId => [target1, target2]
    clearByStart: function(noteId) {
        var me = this;
        if (!noteId) {
            return;
        }
        var targets = this._selectByStart[noteId];
        if (isEmpty(targets)) {
            return;
        }
        for (var i = 0; i < targets.length; ++i) {
            me.clearTarget(targets[i]);
        }
    },
    selectTo: function($to) {
        var $start = this.getStartNoteO();

        var startSeq = +$start.data('seq');
        var toSeq = +$to.data('seq');

        var $start2, $to2, startSeq2, toSeq2;
        if (startSeq < toSeq) {
            $start2 = $start;
            $to2 = $to;
            startSeq2 = startSeq;
            toSeq2 = toSeq;
        } else {
            $start2 = $to;
            $to2 = $start;
            startSeq2 = toSeq;
            toSeq2 = startSeq;
        }

        // 先清空之
        // 清空以$start为首的, 已选的笔记
        var startNoteId = $start.attr('noteId');
        this.clearByStart(startNoteId);

        var $now = $start2;
        this._selectByStart[startNoteId] = [];
        for (var i = startSeq2; i <= toSeq2; ++i) {
            this.selectTarget($now);
            this._selectByStart[startNoteId].push($now);
            $now = $now.next();
        }
    },

    selectAll: function() {
        this.$noteItemList.find('li').addClass('item-active');
    },

    clearAllSelect: function() {
        Note.clearSelect();
    },

    selectTarget: function($target) {
        if ($target) {
            $target.addClass('item-active');
        }
    },
    clearTarget: function($target) {
        if ($target) {
            $target.removeClass('item-active');
        }
    },

    // multi操作
    // 选择之某一
    // 如果之前已选择了, 则取消选择
    select: function($target) {
        var me = this;
        // 之前已选中
        if ($target.hasClass('item-active')) {
            var isInBatch = this.isInBatch();
            if (isInBatch) {
                $target.removeClass('item-active');
            }
        } else {
            me._startNoteO = $target;
            this.selectTarget($target);
        }
    },

    // 得到当前选中的元素
    getCurSelected: function() {
        return this.$noteItemList.find('.item-active');
    },

    // 当重新render后
    reset: function() {
        this.cancelInBatch();
        this._selectByStart = {};
        this._startMove = false;
        this._startNoteO = null;
        this.clearRender();
    },

    // 可以多选
    canBatch: function() {
        return !Writting.isWriting();
    },

    init: function() {
        var me = this;
        me.$noteItemList.on("click", ".item", function(e) {
            var $this = $(this);
            var noteId = $this.attr("noteId");
            if (!noteId) {
                return;
            }

            var isMulti = false;
            var isConti = false;
            if (me.canBatch()) {
                if (e.shiftKey) {
                    isConti = true;
                } else {
                    isMulti = e.metaKey || e.ctrlKey;
                }
            }

            //----------
            // 多选操作
            //----------

            if (isMulti || isConti) {
                Note.curChangedSaveIt();
            }

            // 多选
            if (isMulti) {
                me.select($this);

                // 连续选
            } else if (isConti) {
                // 选择 开始位置到结束位置
                // 当前点击的是结束位置
                me.selectTo($this);
            }

            //---------
            // 单选
            //---------

            // 否则, 不是多选, 清空item-active
            else {
                Note.selectTarget($this);
            }

            me.finalFix();
        });

        //----------

        // 鼠标拖动开始
        me._startMove = false;
        me.$noteItemList.on("mousedown", ".item", function(e) {
            if (!me.canBatch()) {
                return;
            }

            // 右键
            if (me.isContextMenu(e)) {
                return;
            }

            if (!me._startMove && (e.metaKey || e.ctrlKey || e.shiftKey)) {
                return;
            }

            me._startNoteO = $(this);
            me._startMove = true;
        });

        // 鼠标正在拖动
        me.$noteItemList.on("mousemove", ".item", function(e) {
            if (me.canBatch() && me._startMove) {

                Note.curChangedSaveIt();

                me.clearAllSelect();

                me.selectTo($(this));

                me.finalFix(true);
            }
        });

        var $body = $('body');
        $body.on('mouseup', function() {
            me._startMove = false;
        });

        // ctrl + all
        $body.keydown(function(e) {
            if (e.target && e.target.nodeName === 'BODY') {
                if ((e.ctrlKey || e.metaKey) && e.which === 65) {
                    e.preventDefault();

                    if (me.canBatch()) {
                        Note.curChangedSaveIt();

                        me.selectAll();
                        me.finalFix();
                    }
                }
            }
        });

        // 不让拖动
        me.$noteItemList.on("dragstart", function(e) {
            e.preventDefault();
            e.stopPropagation();
        });

        me.initContextmenu();
        me.initBatchStatus();
    },

    initContextmenu: function() {
        var me = this;

        me.$batchMask.on('contextmenu', function(e) {
            e.preventDefault();
            Note.noteMenuSys.popup(e, null);
        });

        me.$batchMask.find('.batch-info .fa').click(function(e) {
            e.preventDefault();

            e.pageX -= 70;
            e.pageY += 10;

            e.stopPropagation();
            // 所以
            $(document).click();
            Note.noteMenuSys.popup(e, null);
        });
    },

    $body: $('body'),
    finalFix: function(isMove) {
        var me = this;
        // 选择了几个? 如果 >= 2则是批量操作
        if (me.isInBatch()) {
            // 清空当前笔记, 不让自动保存
            Note.clearCurNoteId();

            me.renderBatchNotes();
            me.setInBatch();

            // 单个处理
        } else {
            me.clearRender();
            me.cancelInBatch();

            // 为什么还要得到当前选中的, 因为有可能是取消选择
            // 得到当前选中的
            var $target = me.getCurSelected();
            if ($target) {
                var noteId = $target.attr('noteId');

                if (!isMove) {
                    me._startNoteO = $target;
                }

                // 手机端处理
                Mobile.changeNote(noteId);
                // 当前的和所选的是一个, 不改变
                if (Note.curNoteId != noteId) {
                    // 不用重定向到notebook
                    Note.changeNoteForPjax(noteId, true, false);
                }
            }
        }
    },

    // 判断是否是右击
    isContextMenu: function(evt) {
        if ((evt.which != undefined && evt.which == 1) || evt.button == 1)
            return false;
        else if ((evt.which != undefined && evt.which == 3) || evt.button == 2)
            return true;
        return false;
    },

    //==========
    _notes: {},
    clearRender: function() {
        this._notes = {};
        this.$batchCtn.html('');
        this.hideMask();
    },
    showMask: function() {
        this.$batchMask.css({ 'z-index': 99 }).show();
    },
    hideMask: function() {
        this.$batchMask.css({ 'z-index': -2 }).hide();
    },
    renderBatchNotes: function() {
        var me = this;
        me.showMask();

        var selectedTargets = me.$noteItemList.find('.item-active');
        me.$batchNum.html(selectedTargets.length);

        var ids = {};
        for (var i = 0; i < selectedTargets.length; ++i) {
            var noteId = selectedTargets.eq(i).attr('noteId');
            me.addTo(noteId);
            ids[noteId] = 1;
        }
        for (var noteId in me._notes) {
            if (!ids[noteId]) {
                var $tmp = me._notes[noteId];
                $tmp.css({ 'margin-left': '-800px' /*, 'margin-top': '100px'*/ });
                setTimeout(function() {
                    $tmp.remove();
                }, 500);
                delete me._notes[noteId];
            }
        }
    },
    $batchMask: $('#batchMask'),
    $batchCtn: $('#batchCtn'),

    initBatchStatus: function() {
        $('#batchMask .batch-status').html(getMsg('<span></span> notes selected'));
        this.$batchNum = $('#batchMask .batch-info span');
    },

    _i: 1,
    getRotate: function() {
        var me = this;
        var time = me._i++;
        var e = time % 2 === 0 ? 1 : -1;
        var rotate = e * Math.random() * 70;
        var margins = [0, 10, 20, 30, 40];
        var margin = e * margins[time % 5] * 3;
        // if (e < 0) {
        margin -= 80;
        // }
        return [e * Math.random() * 30, margin];
    },
    addTo: function(noteId) {
        var me = this;
        if (me._notes[noteId]) {
            return;
        }
        var note = Note.getNote(noteId);
        var title = note.Title || getMsg('unTitled');
        var desc = note.Desc || '...';
        // desc = substr(note.Content, 0, 200);

        var $note = $('<div class="batch-note"><div class="title">' + title + '</div><div class="content">' + desc + '</div></div>');
        me._notes[noteId] = $note;
        var rotate = me.getRotate();
        me.$batchCtn.append($note);
        setTimeout(function() {
            $note.css({ transform: 'rotate(' + rotate[0] + 'deg)', 'margin-left': rotate[1] + 'px' });
        });
    }
};

//------------------- 事件
$(function() {
    // 附件初始化
    Attach.init();

    Note.batch.init();

    //------------------
    // 新建笔记
    // 1. 直接点击新建 OR
    // 2. 点击nav for new note
    $("#newNoteBtn, #editorMask .note").click(function() {
        var notebookId = $("#curNotebookForNewNote").attr('notebookId');
        Note.newNote(notebookId);
    });
    $("#newNoteMarkdownBtn, #editorMask .markdown").click(function() {
        var notebookId = $("#curNotebookForNewNote").attr('notebookId');
        Note.newNote(notebookId, false, "", true);
    });
    $("#notebookNavForNewNote").on("click", "li div", function() {
        var notebookId = $(this).attr("notebookId");
        if ($(this).hasClass("new-note-right")) {
            Note.newNote(notebookId, false, "", true);
        } else {
            Note.newNote(notebookId);
        }
    });
    $("#searchNotebookForAdd").click(function(e) {
        e.stopPropagation();
    });
    $("#searchNotebookForAdd").keyup(function() {
        var key = $(this).val();
        Notebook.searchNotebookForAddNote(key);
    });
    $("#searchNotebookForList").keyup(function() {
        var key = $(this).val();
        Notebook.searchNotebookForList(key);
    });

    // 切换列表视图
    $("#viewModeDropdown").click(function() {
        var noteViewMenus = new gui.Menu();
        noteViewMenus.append(new gui.MenuItem({
            checked: Config.view === "snippet",
            label: Api.getMsg("Snippet View"),
            type: "checkbox",
            click: function() {
                Note.switchView('snippet');
            }
        }));
        noteViewMenus.append(new gui.MenuItem({
            checked: Config.view === "list",
            label: Api.getMsg("List View"),
            type: "checkbox",
            click: function() {
                Note.switchView('list');
            }
        }));
        noteViewMenus.append(new gui.MenuItem({type: "separator"}));
        noteViewMenus.append(new gui.MenuItem({
            checked: Config.sortType == "dateCreatedASC",
            label: Api.getMsg("Date Created - ASC"),
            type: "checkbox",
            click: function() {
            	Note.setNotesSorter('dateCreatedASC');
            }
        }));
        noteViewMenus.append(new gui.MenuItem({
            checked: Config.sortType == "dateCreatedDESC",
            label: Api.getMsg("Date Created - DESC"),
            type: "checkbox",
            click: function() {
            	Note.setNotesSorter('dateCreatedDESC');
            }
        }));
        noteViewMenus.append(new gui.MenuItem({type: "separator"}));
        noteViewMenus.append(new gui.MenuItem({
            checked: Config.sortType == "dateUpdatedASC",
            label: Api.getMsg("Date Updated - ASC"),
            type: "checkbox",
            click: function() {
            	Note.setNotesSorter('dateUpdatedASC');
            }
        }));
        noteViewMenus.append(new gui.MenuItem({
            checked: !Config.sortType || Config.sortType == "dateUpdatedDESC",
            label: Api.getMsg("Date Updated - DESC"),
            type: "checkbox",
            click: function() {
            	Note.setNotesSorter('dateUpdatedDESC');
            }
        }));
        noteViewMenus.append(new gui.MenuItem({type: "separator"}));
        noteViewMenus.append(new gui.MenuItem({
            checked: Config.sortType == "titleASC",
            label: Api.getMsg("Title - ASC"),
            type: "checkbox",
            click: function() {
            	Note.setNotesSorter('titleASC');
            }
        }));
        noteViewMenus.append(new gui.MenuItem({
            checked: Config.sortType == "titleDESC",
            label: Api.getMsg("Title - DESC"),
            type: "checkbox",
            click: function() {
            	Note.setNotesSorter('titleDESC');
            }
        }));

        var $this = $(this);
        var x = $this.offset().left;
        var y = $this.offset().top + $this.height();
        noteViewMenus.popup(gui.getCurrentWindow(), Math.round(x), Math.round(y));
    });


    //---------------------------
    // 搜索, 按enter才搜索
    /*
    $("#searchNoteInput").on("keyup", function(e) {
    	Note.searchNote();
    });
    */
    $("#searchNoteInput").on("keydown", function(e) {
        var theEvent = e; // window.event || arguments.callee.caller.arguments[0];
        if (theEvent.keyCode == 13 || theEvent.keyCode == 108) {
            theEvent.preventDefault();
            Note.searchNote();
            return false;
        }
    });

    $("#saveBtn").click(function() {
        Note.curChangedSaveIt(true);
    });

    // blog
    $("#noteItemList").on("click", ".item-blog", function(e) {
        e.preventDefault();
        e.stopPropagation();
        // 得到ID
        var noteId = $(this).closest('li').attr('noteId');
        var note = Note.getNote(noteId);
        if (note.ServerNoteId) {
            openExternal(UserInfo.Host + '/blog/post/' + note.ServerNoteId);
        }
    });

    // note setting
    $("#noteItemList").on("click", ".item-setting", function(e) {
        e.preventDefault();
        e.stopPropagation();
        Note.noteMenuSys.popup(e, $(this).closest('li'));
    });
    $("#noteItemList").on("contextmenu", "li", function(e) {
        e.preventDefault();
        e.stopPropagation();
        Note.noteMenuSys.popup(e, $(this));
    });

    // 收藏
    $("#noteItemList").on("click", ".item-star", function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $li = $(this).closest('li');
        var noteId = $li.attr('noteId');
        Note.star(noteId);
    });

    Note.starNotesO = $('#starNotes');
    // 取消收藏
    Note.starNotesO.on('click', '.delete-star', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var $li = $(this).closest('li');
        var noteId = $li.data('id');
        Note.star(noteId);
    });
    Note.starNotesO.on('click', 'a', function(e) {
        var $li = $(this).closest('li');
        Note.renderStarNote($li);
    });

    $("#noteItemList").on("click", ".item-conflict-info", function(e) {
        Note.showConflictInfo(this, e);
    });

    $("#noteItemList").on("click", ".item-warning", function(e) {
        var $li = $(this).closest('li');
        var noteId = $li.attr('noteId');
        var note = Note.getNote(noteId);
        if (!note) {
            return;
        }
        if (!note.Err) {
            $li.removeClass('item-err');
            return;
        }
        var err = note.Err;
        var msg = getMsg('Sync error') + '\n';
        err.err && (msg = getMsg('Error') + ': ' + err.err + '\n')
        err.msg && (msg += getMsg('Message') + ': ' + getMsg(err.msg));
        alert(msg);
    });

    Note._syncRefreshE = $('#syncRefresh');
    Note._syncWarningE = $('#syncWarning');
    // sync
    Note._syncRefreshE.click(function() {
        incrSync(true);
    });

    Note._syncWarningE.click(function() {
        Note.fixNetOrAuthError();
    });

    // readony
    // 修改
    // $('.toolbar-update').click(function() {
    // 	Note.toggleWriteable();
    // });
    $("#editBtn").click(function() {
        Note.toggleWriteableAndReadOnly();
    });

    // note title 里按tab, 切换到编辑区
    $('#noteTitle').on("keydown", function(e) {
        var keyCode = e.keyCode || e.witch;
        // tab
        if (keyCode == 9) {
            // 一举两得, 即切换到了writable, 又focus了
            Note.toggleWriteable();
            e.preventDefault();
        }
    });

});

// 定时器启动
Note.startInterval();

//----------------------
// 冲突解决, 增量sync时
// note是服务器端的笔记, newNote是本地复制后的笔记
Note.fixSyncConflict = function(note, newNote) {
    // Note.cache[note.NoteId] = note;
    // Note.cache[newNote.NoteId] = newNote;
    Note.addNoteCache(note);
    Note.addNoteCache(newNote);

    var target = $(tt('#noteItemList [noteId="?"]', note.NoteId)); //
    // 如果当前笔记在笔记列表中, 那么生成一个新笔记放在这个笔记上面
    if (target.length > 0) {
        var newHtmlObject = Note._getNoteHtmlObjct(note);
        if (newHtmlObject) {
            $(newHtmlObject).insertBefore(target);
        }
    }
    // 当前这个换成新复制的
    target.attr('noteId', newNote.NoteId);
    target.addClass('item-conflict');
    // 重新render 左侧下, 因为有冲突了, 不要render内容啊

    // 如果当前编辑的是这个笔记, 那切换到newNote上来
    if (Note.curNoteId == note.NoteId) {
        Note.setCurNoteId(newNote.NoteId);
    }
};

// 设置博客是否可以见
Note.setNoteBlogVisible = function(noteId, isBlog) {
    var target = $(tt('#noteItemList [noteId="?"]', noteId));
    if (target.length) {
        if (isBlog) {
            target.addClass('item-b');
        } else {
            target.removeClass('item-b');
        }
    }
};

// 为了博客
// 服务器上更新了, 前端也来更新
// changeAdds 有了serverId
// updates...
Note.updateNoteCacheForServer = function(notes) {
    if (isEmpty(notes)) {
        return;
    }
    for (var i in notes) {
        var note = notes[i];
        if (note && !note.IsTrash && !note.IsDeleted) {
            Note.setNoteCache({
                NoteId: note.NoteId,
                ServerNoteId: note.ServerNoteId,
                IsBlog: note.IsBlog,
            });
            Note.setNoteBlogVisible(note.NoteId, note.IsBlog);
        }
    }
};

// 更新
// push
// --> send changes
Note.updateSync = function(notes) {
    if (isEmpty(notes)) {
        return;
    }

    var curNotebookIsTrash = Notebook.curNotebookIsTrash();

    var currentIsDeleted = false;

    for (var i = 0; i < notes.length; ++i) {
        var note = notes[i];
        note.InitSync = true; // 需要重新获取内容
        Note.addNoteCache(note);

        // 如果当前修改的是本笔记, 那么重新render之
        /*
        这里是一个重大BUG
        	远程笔记sync -> 本地
        	是trash操作, 则前端先删除, delete cache, toggle next
        	但是会异步取content, 取到后, reRender现有笔记 -> renderContent, 那么重置为当前笔记
        */
        if (Note.curNoteId == note.NoteId && !(!curNotebookIsTrash && note.IsTrash)) {
            Note.reRenderNote(Note.curNoteId);
        }

        // 不是dirty的
        Note.setNoteDirty(note.NoteId, false);

        // 设置当前是否是博客
        // alert(note.NoteId + " " + note.IsBlog);
        Note.setNoteBlogVisible(note.NoteId, note.IsBlog);

        // 如果是trash, 且当前不在trash目录下, 且有该笔记, 则删除之
        if (!curNotebookIsTrash && note.IsTrash) {

            // 前端缓存也要删除!!
            // 先删除, 不然changeToNext()之前会先保存现在的, 导致僵尸note
            Note.deleteCache(note.NoteId);

            var target = $(tt('#noteItemList [noteId="?"]', note.NoteId));

            // 当前笔记要删除了, 如果有多个笔记要删除, 这就有问题了
            // 刚一切换到下一个, 就被删除了, 导致没有被选中
            if (target.length) {
                if (Note.curNoteId == note.NoteId) {
                    currentIsDeleted = true;
                    Note.changeToNext(target);
                }
                target.remove();
            }
        }
    }

    // 最后再删除
    if (currentIsDeleted) {
        // Note.changeToNext(target);
        setTimeout(function() {
            Note.checkHasSelectedNote();
        }, 100);
    }
};

Note.checkHasSelectedNote = function() {
    if (!$('#noteItemList .item-active').length) {
        if ($('#noteItemList .item').length > 0) {
            Note.changeNote($('#noteItemList .item').eq(0).attr("noteId"));
        } else {
            Note.showEditorMask();
        }
    }
};

// pull
// 添加同步的notes
// <-- server
Note.addSync = function(notes) {
    if (isEmpty(notes)) {
        return;
    }
    for (var i in notes) {
        var note = notes[i];
        // 避免trash的也加进来
        if (!note.IsDeleted) {
            if (
                (note.IsTrash && Notebook.curNotebookIsTrash()) || !note.IsTrash) {

                Note.addNoteCache(note);

                // 很可能其笔记本也是新添加的, 此时重新render notebooks' numberNotes
                Notebook.reRenderNotebookNumberNotesIfIsNewNotebook(note.NotebookId);

                // alert(note.ServerNoteId);
                // 添加到当前的笔记列表中
                var newHtmlObject = Note._getNoteHtmlObjct(note);
                if (newHtmlObject) {
                    $('#noteItemList').prepend(newHtmlObject);
                    Note.setNoteBlogVisible(note.NoteId, note.IsBlog);
                }
            }
        }
    }
};

// 删除
Note.deleteSync = function(notes) {
    if (isEmpty(notes)) {
        return;
    }
    for (var i in notes) {
        var noteId = notes[i];
        note = Note.getNote(noteId);
        if (note) {
            Note.clearCacheByNotebookId(note.NotebookId);
            delete Note.cache[noteId];
            // 如果在笔记列表中则删除
            $(tt('#noteItemList [noteId="?"]', note.NoteId)).remove();
        }

        // 前端缓存也要删除!!
        Note.deleteCache(noteId);
    }
};

// push

// 发送成功添加了的
Note.updateChangeAdds = function(notes) {
    if (isEmpty(notes)) {
        return;
    }
    for (var i = 0; i < notes.length; ++i) {
        var note = notes[i];
        this.setNoteDirty(note.NoteId, false);
    }
};

// 发送改变成功了的
Note.updateChangeUpdates = function(notes) {
    this.updateChangeAdds(notes);
};

// 返回 {err:'', msg: ''}
Note._getError = function(err, ret) {
    var Err = {};
    try {
        if (err && typeof err == 'object') {
            Err.err = JSON.stringify(err)
        }
    } catch (e) {}
    if (typeof ret == 'object' && 'Msg' in ret) {
        Err.msg = ret.Msg;
    } else {
        Err.msg = ret + '';
    }
    return Err;
};
Note.updateErrors = function(errs) {
    if (isEmpty(errs)) {
        return;
    }
    for (var i = 0; i < errs.length; ++i) {
        var err = errs[i]; // {err: err, ret: ret, note: note}
        var note = err.note;
        if (!note || !note.NoteId) {
            continue;
        }
        var Err = this._getError(err.err, err.ret);
        this.setNoteCache({ NoteId: note.NoteId, Err: Err }, false);

        var $leftNoteNav = $(tt('#noteItemList [noteId="?"]', note.NoteId));
        $leftNoteNav.addClass('item-err');
    }
}
