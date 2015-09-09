// 1. notebook change
// notebook一改变, 当前的肯定要保存, ajax是异步的. 此时先清空所有note信息. -> 得到该notebook的notes, 显示出来, 并选中第一个!
// 在这期间定时器还会保存, curNoteId还没换, 所以会清空curNoteId的content!!!

// 2. note change, save cur, 立即curNoteId = ""!!

// 3. 什么时候设置curNoteId? 是ajax得到内容之后设置

// note
Note.curNoteId = "";

Note.interval = ""; // 定时器

// 这里, settings, blog, star
Note.itemIsBlog = '<div class="item-blog"><i class="fa fa-bold" title="' + getMsg('Blog') + '"></i></div><div class="item-conflict-info"><i class="fa fa-bug" title="' + getMsg('Conflict') + '!!"></i></div><div class="item-star"><i class="fa fa-star-o" title="' + getMsg('Star') + '"></i></div><div class="item-setting"><i class="fa fa-cog" title="' +  getMsg('Setting') + '"></i></div>';

// for render
Note.itemTplNoImg = '<li href="#" class="item ?" noteId="?">'
Note.itemTplNoImg += Note.itemIsBlog +'<div class="item-desc"><p class="item-title">?</p><p class="item-info"><i class="fa fa-book"></i> <span class="note-notebook">?</span> <i class="fa fa-clock-o"></i> <span class="updated-time">?</span></p><p class="desc">?</p></div></li>';

// 有image
Note.itemTpl = '<li href="#" class="item ? item-image" noteId="?"><div class="item-thumb" style=""><img src="?"/></div>'
Note.itemTpl +=Note.itemIsBlog + '<div class="item-desc" style=""><p class="item-title">?</p><p class="item-info"><i class="fa fa-book"></i> <span class="note-notebook">?</span> <i class="fa fa-clock-o"></i> <span class="updated-time">?</span></p><p class="desc">?</p></div></li>';

// for new
Note.newItemTpl = '<li href="#" class="item item-active ?" fromUserId="?" noteId="?">'
Note.newItemTpl += Note.itemIsBlog + '<div class="item-desc" style="right: 0px;"><p class="item-title">?</p><p class="item-info"><i class="fa fa-book"></i> <span class="note-notebook">?</span> <i class="fa fa-clock-o"></i> <span class="updated-time">?</span></p><p class="desc">?</p></div></li>';

Note.noteItemListO = $("#noteItemList");

// notbeookId => {"updatedTime" => [noteId1, noteId2], "title" => [noteId1, noteId2...]} 排序方式分组
// 一旦某notebook改变了就清空, 重新排序之. (用js排)
Note.cacheByNotebookId = {all: {}};
Note.notebookIds = {}; // notebookId => true

Note.isReadOnly = false;
// 定时保存信息
Note.intervalTime = 10 * 1000; // 600s, 10mins
Note.startInterval = function() {
	// 不要自动保存
	return;

	console.error("??");
	if(Note.interval) {
		clearInterval(Note.interval);
	}
	Note.interval = setInterval(function() {
		console.log("start save interval...");
		changedNote = Note.curChangedSaveIt(false);

	}, Note.intervalTime); // 600s, 10mins
};

// 停止, 当切换note时
// 但过5000后自动启动
Note.stopInterval = function(notStartAuto) {
	clearInterval(Note.interval);
	
	// 是否自动启动, 默认是自动启动
	if(!notStartAuto) {
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
	if(!Note.cache[content.NoteId]) {
		 Note.cache[content.NoteId] = content;
	} else {
		$.extend(Note.cache[content.NoteId], content);
	}
	
	if(clear == undefined) {
		clear = true;
	}
	if(clear) {
		Note.clearCacheByNotebookId(content.NotebookId);
	}
}

// 得到当前的笔记
Note.getCurNote = function() {
	var self = this;
	if(self.curNoteId == "") {
		return null;
	}
	return self.cache[self.curNoteId];
}
Note.getNote = function(noteId) {
	var self = this;
	return self.cache[noteId];
}

// 每当有notebookId相应的note改变时都要重新清空之
// 并设置该notebookId有值
Note.clearCacheByNotebookId = function(notebookId) {
	if(notebookId) {
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

// 得到notebook下的notes, 按什么排序 updatedTime?
Note.getNotesByNotebookId = function(notebookId, sortBy, isAsc) {
	if(!sortBy) {
		sortBy = "UpdatedTime";
	}
	if(isAsc == "undefined") {
		isAsc = false; // 默认是降序
	}
	
	if(!notebookId) {
		notebookId = "all";
	}
	
	if(!Note.cacheByNotebookId[notebookId]) {
		return [];
	}
	
	if(Note.cacheByNotebookId[notebookId][sortBy]) {
		return Note.cacheByNotebookId[notebookId][sortBy];
	} else {
	}
	
	// 从所有的notes中找到notebookId的, 并排序之
	var notes = [];
	var sortBys = [];
	for(var i in Note.cache) {
		if(!i) {
			continue;
		}
		var note = Note.cache[i];
		// 不要trash的not, 共享的也不要
		if(note.IsTrash || note.IsShared) {
			continue;
		}
		if(notebookId == "all" || note.NotebookId == notebookId) {
			notes.push(note);
		}
	}
	// 排序之
	notes.sort(function(a, b) {
		var t1 = a[sortBy];
		var t2 = b[sortBy];
		
		if(isAsc) {
			if(t1 < t2) {
				return -1;
			} else if (t1 > t2) {
				return 1;
			}	
		} else {
			if(t1 < t2) {
				return 1;
			} else if (t1 > t2) {
				return -1;
			}
		}
		return 0;
	});
	
	// 缓存之
	Note.cacheByNotebookId[notebookId][sortBy] = notes;
	return notes;
};

// 该笔记点击后已污染
Note.curNoteIsDirtied = function() {
	var me = this;
	var note = me.getCurNote();
	if(note) {
		note.isDirty = true;
	}
};

// 保存后不dirty
Note.curNoteIsNotDirtied = function() {
	var me = this;
	var note = me.getCurNote();
	if(note) {
		note.isDirty = false;
	}
};

// called by Notebook
// render 所有notes, 和第一个note的content
Note.renderNotesAndFirstOneContent = function(ret) {
	// 错误的ret是一个Object
	if(!isArray(ret)) {
		return;
	}
	
	// note 导航
	Note.renderNotes(ret);
	// 渲染第一个
	if(!isEmpty(ret[0])) {
		Note.changeNoteForPjax(ret[0].NoteId, true, false);
	} else {
	}
};

// 渲染并定位到特定的
Note.renderNotesAndTargetNote = function(ret, noteId) {
	// 错误的ret是一个Object
	if(!isArray(ret)) {
		return;
	}
	
	// note 导航
	Note.renderNotes(ret);
	// 渲染特定的
	if(!isEmpty(ret[0])) {
		if(noteId) {
			// Note.changeNoteForPjax(noteId, true, false);
			Note.changeNoteForPjax(noteId, true, false);
			if(!Note.directToNote(noteId)) {
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
// force bool true表示content比较是比较HTML, 否则比较text, 默认为true
// 定时保存用false
Note.curHasChanged = function(force) {
	if(force == undefined) {
		force = true;
	}
	var cacheNote = Note.cache[Note.curNoteId] || {};
	// 收集当前信息, 与cache比对
	var title = $("#noteTitle").val();
	var tags = Tag.getTags(); // TODO
	
	// 如果是markdown返回[content, preview]
	var contents = getEditorContent(cacheNote.IsMarkdown);
	if(contents === false) {
		// 表示编辑器未初始化, 此时肯定不能保存
		return false;
	}
	var content, preview;
	var contentText;
	if (isArray(contents)) {
		content = contents[0];
		preview = contents[1];
		contentText = content;
		// preview可能没来得到及解析
		if (content && previewIsEmpty(preview) && Converter) {
			preview = Converter.makeHtml(content);
		}
		if(!content) {
			preview = "";
		}
		cacheNote.Preview = preview; // 仅仅缓存在前台
	} else {
		content = contents;
		try {
			contentText = $(content).text();
		} catch(e) {
		}
	}
	
	var hasChanged = {
		hasChanged: false, // 总的是否有改变
		IsNew: cacheNote.IsNew, // 是否是新添加的
		IsMarkdown: cacheNote.IsMarkdown, // 是否是markdown笔记
		FromUserId: cacheNote.FromUserId, // 是否是共享新建的
		NoteId: cacheNote.NoteId,
		NotebookId: cacheNote.NotebookId
	};
	
	if(hasChanged.IsNew) {
		$.extend(hasChanged, cacheNote);
	} else {
		/*
		if(!cacheNote.isDirty) { // 不是dirty
			// dirty操作在后台控制吧, 因为有些命令如添加链接不会触发keydown的
			console.log("no dirty");
			hasChanged.hasChanged = false;
			return hasChanged;
		} else {
			// console.log("is dirty");
		}
		*/
	}
	
	if(cacheNote.Title != title) {
		hasChanged.hasChanged = true; // 本页使用用小写
		hasChanged.Title = title; // 要传到后台的用大写
		if(!hasChanged.Title) {
//			alert(1);
		}
	}
	
	// 这里, 总为true, 那么, 总会保存的
	// if(!arrayEqual(cacheNote.Tags, tags)) {
	hasChanged.hasChanged = true;
	hasChanged.Tags = tags;
	// }
	
	// 比较text, 因为note Nav会添加dom会导致content改变
	if((force && cacheNote.Content != content) || (!force && (/**/(!cacheNote.IsMarkdown && $(cacheNote.Content).text() != contentText) || (cacheNote.IsMarkdown && cacheNote.Content != contentText)) /**/) ) {
		hasChanged.hasChanged = true;
		hasChanged.Content = content;
		
		// 从html中得到...
		var c = preview || content;
		
		// 不是博客或没有自定义设置的
		if(!cacheNote.HasSelfDefined || !cacheNote.IsBlog) {
			hasChanged.Desc = Note.genDesc(c);
			hasChanged.ImgSrc = Note.getImgSrc(c);
			hasChanged.Abstract = Note.genAbstract(c);
		}
	} else {
		console.log("text相同");
		console.log(cacheNote.Content == content);
	}

	// console.error('hasChanged');
	// console.log(Note.curNoteId);
	// console.log(hasChanged);
	
	hasChanged["UserId"] = cacheNote["UserId"] || "";
	
	return hasChanged;
};

// 由content生成desc
// 换行不要替换
Note.genDesc = function(content) {
	if(!content) {
		return "";
	}
	
	// 将</div>, </p>替换成\n
	/*
	var token = "ALEALE";
	content = content.replace(/<\/p>/g, token); 
	content = content.replace(/<\/div>/g, token);
	content = content.replace(/<\/?.+?>/g," ");
	
	pattern = new RegExp(token, "g");
	content = content.replace(pattern, "<br />");
	content = content.replace(/<br \/>( *)<br \/>/g, "<br />"); // 两个<br />之间可能有空白
	content = content.replace(/<br \/>( *)<br \/>/g, "<br />");
	
	// 去掉最开始的<br />或<p />
	content = trimLeft(content, " ");
	content = trimLeft(content, "<br />");
	content = trimLeft(content, "</p>");
	content = trimLeft(content, "</div>");
	*/
	
	// 留空格
	content = content.replace(/<br \/>/g," <br />");
	content = content.replace(/<\/p>/g," </p>");
	content = content.replace(/<\/div>/g," </div>");
	
	// 避免其它的<img 之类的不完全
	content = $("<div></div>").html(content).text();

	content = $.trim(content);
	
	// pre下text()会将&lt; => < &gt; => >
	content = content.replace(/</g, "&lt;");
	content = content.replace(/>/g, "&gt;");
	
	if(content.length < 20) {
		return content;
	}
	return content.substring(0, 20);
}

// 得到摘要
Note.genAbstract = function(content, len) {
	if(!content) {
		return "";
	}
	if(len == undefined) {
		len = 1000;
	}
	if(content.length < len) {
		return content;
	}
	var isCode = false;
	var isHTML = false;
	var n = 0;
	var result = "";
	var maxLen = len;
	for(var i = 0; i < content.length; ++i) {
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

Note.getImgSrc = function(content) {
	if(!content) {
		return "";
	}
	try {
		var imgs = $(content).find("img");
		for(var i in imgs) {
			var src = imgs.eq(i).attr("src");
			if(src) {
				return src;
			}
		}
	} catch(e) {
	}
	return "";
};

// 如果当前的改变了, 就保存它
// 以后要定时调用
// force , 默认是true, 表强校验内容
// 定时保存传false
Note.saveInProcess = {}; // noteId => bool, true表示该note正在保存到服务器, 服务器未响应
Note.savePool = {}; // 保存池, 以后的保存先放在pool中, id => note
Note.curChangedSaveIt = function(force, callback) {
	var me = this;
	// 如果当前没有笔记, 不保存
	if(!Note.curNoteId || Note.isReadOnly) {
		callback && callback();
		return;
	}

	// console.error(">>");
	
	var hasChanged = Note.curHasChanged(force);

	// console.log(hasChanged + "---");
	
	if(hasChanged && (hasChanged.hasChanged || hasChanged.IsNew)) {
		// 把已改变的渲染到左边 item-list
		Note.renderChangedNote(hasChanged);
	
		delete hasChanged.hasChanged;
		
		// 先缓存, 把markdown的preview也缓存起来
		Note.setNoteCache(hasChanged, false);
		
		// 设置更新时间
		Note.setNoteCache({"NoteId": hasChanged.NoteId, "UpdatedTime": new Date()}, false);

		console.log('设置完成');

		// 表示有未完成的保存
		/*
		if(me.saveInProcess[hasChanged.NoteId]) {
			log("in process");
			me.savePool[hasChanged.NoteId] = hasChanged;
			me.startUpdatePoolNoteInterval();
			return;
		}
		*/
		
		// 保存之
		// showMsg(getMsg("saving"));
		
		me.saveInProcess[hasChanged.NoteId] = true;
		
		// console.error('保存当前的笔记: ' + hasChanged.NoteId);
		// 
		
		// console.error("why====================");
		// console.trace("why");

		NoteService.updateNoteOrContent(hasChanged, function(ret) {
			me.saveInProcess[hasChanged.NoteId] = false;
			if(hasChanged.IsNew) {
				// 缓存之, 后台得到其它信息
				ret.IsNew = false;
				Note.setNoteCache(ret, false);

				// 设置不为dirty
				Note.curNoteIsNotDirtied(hasChanged.NoteId);

				// 新建笔记也要change history
				Pjax.changeNote(ret);
			}
			showMsg(getMsg("saveSuccess"), 1000);

			callback && callback(ret);
		});
		
		return hasChanged;
	}
	
	callback && callback();
	return false;
};

// 更新池里的笔记
Note.updatePoolNote = function() {
	var me = this;
	for(var noteId in me.savePool) {
		if(!noteId) {
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
	if(me.updatePoolNoteInterval) {
		return;
	}
	me.updatePoolNoteInterval = setTimeout(function() { 
		log('update pool');
		me.updatePoolNote();
	}, 1000);
};


// 选中note
Note.selectTarget = function(target) {
	$(".item").removeClass("item-active");
	$(target).addClass("item-active");

	// 判断是否在star中
	var noteId = $(target).attr('noteId');
	Note.selectStar(noteId);
}

// 改变note
// 可能改变的是share note
// 1. 保存之前的note
// 2. ajax得到现在的note
Note.showContentLoading = function() {
	$("#noteMaskForLoading").css("z-index", 99999);
};
Note.hideContentLoading = function() {
	$("#noteMaskForLoading").css("z-index", -1);
};

// 定位到笔记
Note.directToNote = function(noteId) {
	// alert(noteId);
	var $t = $("[noteId='" + noteId + "']");
	if($t.length == 0) {
		return false;
	}

	var $p = $("#noteItemList");
	var pHeight = $p.height();

	var scrollTop = $p.scrollTop();
	var pTop = $t.position().top; // 相对于noteItemList的位置

	// 当前的可视范围的元素位置是[0, pHeight]
	if(pTop >= 0 && pTop <= pHeight) {
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
	var me = this;
	var note = me.getNote(noteId);
	if(!note) {
		return;
	}
	var isShare = note.Perm != undefined;
	if(needTargetNotebook == undefined) {
		needTargetNotebook = true;
	}
	me.changeNote(noteId, isShare, true, function(note) {
		// push state
		if(mustPush == undefined) {
			mustPush = true;
		}
		if(mustPush) {
			Pjax.changeNote(note);
		}
		
		// popstate时虽然选中了note, 但位置可能不可见
		if(needTargetNotebook) {
			Note.directToNote(noteId);
		}
	});
	
	// 第一次render时定位到第一个笔记的notebook 12.06 life
	// 或通过pop时
	// 什么时候需要? 1. 第一次changeNote, 2. pop时, 只有当点击了notebook后才不要
	
	// 这里, 万一是共享笔记呢?
	// 切换到共享中
	if(needTargetNotebook) {
		if(isShare) {
			if($("#myShareNotebooks").hasClass("closed")) {
				$("#myShareNotebooks .folderHeader").trigger("click");
			}
		} else {
			if($("#myNotebooks").hasClass("closed")) {
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
	Note.curNoteId = noteId;
	Note.inChangeNoteId = '';
};
Note.changeNote = function(selectNoteId, isShare, needSaveChanged, callback) {
	var self = this;
	
	// -1 停止定时器
	Note.stopInterval();
	
	// 0
	var target = $(tt('[noteId="?"]', selectNoteId))
	Note.selectTarget(target);

	// 如果 inChangeNoteId == selectNoteId, 表示之前的note的content还在加载中, 此时保存笔记肯定出错
	// if(Note.inChangeNoteId != Note.curNoteId) {

		// 1 之前的note, 判断是否已改变, 改变了就要保存之
		// 这里, 在搜索的时候总是保存, 搜索的话, 比较快, 肯定没有变化, 就不要执行该操作
		if(needSaveChanged == undefined) {
			needSaveChanged  = true;
		}
		if(needSaveChanged) {
			var changedNote = Note.curChangedSaveIt();
		}
	// }

	// 2. 设空, 防止在内容得到之前又发生保存
	Note.curNoteId = "";
	Note.inChangeNoteId = selectNoteId;
	
	// 2 得到现在的
	// ajax之
	var cacheNote = Note.cache[selectNoteId];
	
	var hasPerm = true; // !isShare || Share.hasUpdatePerm(selectNoteId); // 不是共享, 或者是共享但有权限
	
	// 有权限
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
	function setContent(ret, fromCache) {
		if(ret) {
			cacheNote.InitSync = false;
		}
		ret = ret || {};
		// log(">>")
		// log(ret);
		Note.contentAjax = null;
		if(seq != Note.contentAjaxSeq) {
			return;
		}
		if(!fromCache) {
			Note.setNoteCache(ret, false);
		}
		// 把其它信息也带上
		ret = Note.cache[selectNoteId]
		Note.renderNoteContent(ret, false);

		self.hideContentLoading();
		
		callback && callback(ret);
	}
	
	// 不是刚同步过来的, 且有内容
	if(!cacheNote.InitSync && cacheNote.Content) {
		setContent(cacheNote, true);
		return;
	}
	
	var url = "/note/getNoteContent";
	var param = {noteId: selectNoteId};
	if(isShare) {
		url = "/share/getShareNoteContent";
		param.sharedUserId = cacheNote.UserId // 谁的笔记
	}
	
	self.showContentLoading();

	// console.error('chage note..........');
	// console.trace();

	Service.noteService.getNoteContent(cacheNote.NoteId, setContent); // ajaxGet(url, param, setContent);
};

// 重新渲染笔记, 因为sync更新了
Note.reRenderNote = function(noteId) {
	var me = this;

	console.error("???")

	me.showContentLoading();
	var note = Note.getNote(noteId);
	Note.renderNote(note);
	NoteService.getNoteContent(noteId, function(noteContent) {
		if(noteContent) {
			Note.setNoteCache(noteContent, false);
			Attach.renderNoteAttachNum(noteId, true);
			Note.renderNoteContent(noteContent);
		}
		me.hideContentLoading();
	});
};

// 渲染

// 更改信息到左侧
// 定时更改 当前正在编辑的信息到左侧导航
// 或change select. 之前的note, 已经改变了
Note.renderChangedNote = function(changedNote) {
	if(!changedNote) {
		return;
	}

	// 找到左侧相应的note
	var $leftNoteNav = $(tt('[noteId="?"]', changedNote.NoteId));
	if(changedNote.Title) {
		$leftNoteNav.find(".item-title").html(trimTitle(changedNote.Title));
		// 如果标题改了, 如果也在star列表中, 那也要改star的标题啊
		Note.changeStarNoteTitle(changedNote.NoteId, trimTitle(changedNote.Title));
	}
	if(changedNote.Desc) {
		$leftNoteNav.find(".desc").html(changedNote.Desc);
	}
	if(changedNote.ImgSrc) {
		$thumb = $leftNoteNav.find(".item-thumb");
		// 有可能之前没有图片
		if($thumb.length > 0) {
			$thumb.find("img").attr("src", changedNote.ImgSrc);
		} else {
			$leftNoteNav.append(tt('<div class="item-thumb" style=""><img src="?"></div>', changedNote.ImgSrc));
			$leftNoteNav.addClass("item-image");
		}
		$leftNoteNav.find(".item-desc").removeAttr("style");
	} else if(changedNote.ImgSrc == "") {
		$leftNoteNav.find(".item-thumb").remove(); // 以前有, 现在没有了
		$leftNoteNav.removeClass("item-image");
	}

	
}

// 清空右侧note信息, 可能是共享的, 
// 此时需要清空只读的, 且切换到note edit模式下
Note.clearNoteInfo = function() {
	Note.curNoteId = "";
	Tag.clearTags();
	$("#noteTitle").val("");
	setEditorContent("");
	
	// markdown editor
	/*
	$("#wmd-input").val("");
	$("#wmd-preview").html("");
	*/
	
	// 只隐藏即可
	$("#noteRead").hide();
}
// 清除noteList导航
Note.clearNoteList = function() {
	Note.noteItemListO.html(""); // 清空
}

// 清空所有, 在转换notebook时使用
Note.clearAll = function() {
	// 当前的笔记清空掉
	Note.curNoteId = "";
	
	Note.clearNoteInfo();
	Note.clearNoteList();
}

// render到编辑器
// render note
Note.renderNote = function(note) {

	if(!note) {
		return;
	}
	// title
	$("#noteTitle").val(trimTitle(note.Title));
			
	// 当前正在编辑的
	// tags
	Tag.renderTags(note.Tags);
	
	// 笔记是新render的, 没有污染过
	note.isDirty = false;
};

// render content
// 这一步很慢
Note.renderNoteContent = function(content, needRenderToLeft) {
	// console.error('---------------- note:' + note.Title);
	// console.trace();

	setEditorContent(content.Content, content.IsMarkdown, content.Preview);

	var e = (new Date()).getTime();

	// 只有在renderNoteContent时才设置curNoteId
	Note.setCurNoteId(content.NoteId);

	// 重新渲染到左侧 desc, 因为笔记传过来是没有desc的
	var $leftNoteNav = $(tt('[noteId="?"]', content.NoteId));
	if($leftNoteNav.find(".desc").text() == "") {
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

// 初始化时渲染最初的notes
/**
    <div id="noteItemList">
	  <!--
      <div href="#" class="item">
        <div class="item-thumb" style="">
          <img src="images/a.gif"/>
        </div>

        <div class="item-desc" style="">
            <p class="item-title">?</p>
            <p class="item-text">
            	?
            </p>
        </div>
      </div>
      -->
*/

Note.showEditorMask = function() {
	$("#editorMask").css("z-index", 10).show();
	// 要判断是否是垃圾筒
	if(Notebook.curNotebookIsTrashOrAll()) {
		$("#editorMaskBtns").hide();
		$("#editorMaskBtnsEmpty").show();
	} else {
		$("#editorMaskBtns").show();
		$("#editorMaskBtnsEmpty").hide();
	}
}
Note.hideEditorMask = function() {
	$("#editorMask").css("z-index", -10).hide();
}

// 这里如果notes过多>100个将会很慢!!, 使用setTimeout来分解
Note.renderNotesC = 0;
Note.renderNotes = function(notes, forNewNote, isShared) {
	var renderNotesC = ++Note.renderNotesC;
	
	// 手机端不用
	// slimScroll使得手机端滚动不流畅
	if(!LEA.isMobile && !Mobile.isMobile()) {
		// $("#noteItemList").slimScroll({ scrollTo: '0px', height: "100%", onlyScrollBar: true});
		$("#noteItemList").scrollTop(0); // ({ scrollTo: '0px', height: "100%", onlyScrollBar: true});
	}
	
	if(!notes || typeof notes != "object" || notes.length <= 0) {
		// 如果没有, 那么是不是应该hide editor?
		if(!forNewNote) {
			Note.showEditorMask();
		}
		return;
	}
	Note.hideEditorMask();
	// 新建笔记时会先创建一个新笔记, 所以不能清空
	if(forNewNote == undefined) {
		forNewNote = false;
	}
	if(!forNewNote) {
		Note.noteItemListO.html(""); // 清空
	}
	
	// 20个一次
	var len = notes.length;
	var c = Math.ceil(len/20);
	
	Note._renderNotes(notes, forNewNote, isShared, 1);
	
	// 先设置缓存
	for(var i = 0; i < len; ++i) {
		var note = notes[i];
		// 不清空
		// 之前是addNoteCache, 如果是搜索出的, 会把内容都重置了
		Note.setNoteCache(note, false);
		
		// 如果是共享的笔记本, 缓存也放在Share下
		if(isShared) {
			Share.setCache(note);
		}
	}
	
	for(var i = 1; i < c; ++i) {
		setTimeout(
			(function(i) {
				// 防止还没渲染完就点击另一个notebook了
				return function() {
					if(renderNotesC == Note.renderNotesC) {
						Note._renderNotes(notes, forNewNote, isShared, i+1);
					}
				}
			})(i), i*2000);
	}
};


Note._getNoteHtmlObjct = function(note, isShared) {
	var baseClasses = "item-my";
	if(isShared) {
		baseClasses = "item-shared";
	}
	var classes = baseClasses;

	var tmp;
	if(note.ImgSrc) {
		tmp = tt(Note.itemTpl, classes, note.NoteId, note.ImgSrc, note.Title, Notebook.getNotebookTitle(note.NotebookId), goNowToDatetime(note.UpdatedTime), note.Desc);
	} else {
		tmp = tt(Note.itemTplNoImg, classes, note.NoteId, note.Title, Notebook.getNotebookTitle(note.NotebookId), goNowToDatetime(note.UpdatedTime), note.Desc);
	}
	// blog ?
	if(!note.IsBlog) {
		tmp = $(tmp);
		tmp.find(".item-blog").hide();
	}
	// star ?
	if(note.Star) {
		$(tmp).addClass('item-is-star');
	}

	return tmp;
},
Note._renderNotes = function(notes, forNewNote, isShared, tang) { // 第几趟
	var baseClasses = "item-my";
	if(isShared) {
		baseClasses = "item-shared";
	}
	
	var len = notes.length;
	for(var i = (tang-1)*20; i < len && i < tang*20; ++i) {
		var classes = baseClasses;
		if(!forNewNote && i == 0) {
			classes += " item-active";
		}
		var note = notes[i];
		note.Title = trimTitle(note.Title);

		if(note.InitSync) {
			Note.getNoteContentLazy(note.NoteId);
		}

		if(!note.Desc && note.Content) {
			note.Desc = Note.genDesc(note.Content);
		}

		var tmp;
		if(note.ImgSrc) {
			tmp = tt(Note.itemTpl, classes, note.NoteId, note.ImgSrc, note.Title, Notebook.getNotebookTitle(note.NotebookId), goNowToDatetime(note.UpdatedTime), note.Desc);
		} else {
			tmp = tt(Note.itemTplNoImg, classes, note.NoteId, note.Title, Notebook.getNotebookTitle(note.NotebookId), goNowToDatetime(note.UpdatedTime), note.Desc);
		}
		if(!note.IsBlog) {
			tmp = $(tmp);
			tmp.find(".item-blog").hide();
		}

		// 不是trash才要star, conflict fix
		if(!note.IsTrash) {
			// star ?
			if(note.Star) {
				$(tmp).addClass('item-is-star');
			}

			if(note.ConflictNoteId) {
				$(tmp).addClass('item-conflict');
			}
		} else {
			// 不准star
			$(tmp).find('.item-star').remove();
		}

		Note.noteItemListO.append(tmp);
		
		/*
		// 共享的note也放在Note的cache一份
		if(isShared) {
			note.IsShared = true; // 注明是共享的
		}
		
		// 不清空
		// 之前是addNoteCache, 如果是搜索出的, 会把内容都重置了
		Note.setNoteCache(note, false);
		
		// 如果是共享的笔记本, 缓存也放在Share下
		if(isShared) {
			Share.setCache(note);
		}
		*/
	}
} 

// 新建一个笔记
// 要切换到当前的notebook下去新建笔记
// isShare时fromUserId才有用
// 3.8 add isMarkdown
Note.newNote = function(notebookId, isShare, fromUserId, isMarkdown) {
	// 切换编辑器
	switchEditor(isMarkdown);
	Note.hideEditorMask();
	
	// 防止从共享read only跳到添加
	Note.hideReadOnly();
	
	Note.stopInterval();
	// 保存当前的笔记
	Note.curChangedSaveIt();
	
	var note = {NoteId: getObjectId(), 
		Title: "", 
		Tags:[], Content:"", 
		NotebookId: notebookId, 
		IsNew: true, 
		FromUserId: fromUserId, 
		IsMarkdown: isMarkdown, 
		CreatedTime: new Date(), 
		UpdatedTime: new Date()}; // 是新的

	// 添加到缓存中
	Note.addNoteCache(note);
	
	// 清空附件数
	Attach.clearNoteAttachNum();
	
	// 是否是为共享的notebook添加笔记, 如果是, 则还要记录fromUserId
	var newItem = "";
	
	var baseClasses = "item-my";
	if(isShare) {
		baseClasses = "item-shared";
	}
	
	var notebook = Notebook.getNotebook(notebookId);
	var notebookTitle = notebook ? notebook.Title : "";
	var curDate = getCurDatetime();
	if(isShare) {
		newItem = tt(Note.newItemTpl, baseClasses, fromUserId, note.NoteId, note.Title, notebookTitle, curDate, "");
	} else {
		newItem = tt(Note.newItemTpl, baseClasses, "", note.NoteId, note.Title, notebookTitle, curDate, "");
	}
	
	// notebook是否是Blog
	// if(!notebook.IsBlog) {
	newItem = $(newItem);
	newItem.find(".item-blog").hide();
	// }
	
	// 是否在当前notebook下, 不是则切换过去, 并得到该notebook下所有的notes, 追加到后面!
	if(!Notebook.isCurNotebook(notebookId)) {
		// 先清空所有
		Note.clearAll();
		
		// 插入到第一个位置
		Note.noteItemListO.prepend(newItem);
		
		// 改变为当前的notebookId
		// 会得到该notebookId的其它笔记
		if(!isShare) {
			Notebook.changeNotebookForNewNote(notebookId);
		} else {
			Share.changeNotebookForNewNote(notebookId);
		}
	} else {
		// 插入到第一个位置
		Note.noteItemListO.prepend(newItem);
	}
	
	Note.selectTarget($(tt('[noteId="?"]', note.NoteId)));
	
	setTimeout(function() {
		$("#noteTitle").focus();
	});

	Note.renderNote(note);
	Note.renderNoteContent(note);
	Note.setCurNoteId(note.NoteId);
	
	// 更新数量
	Notebook.incrNotebookNumberNotes(notebookId)
};

// 同步
Note._syncRefreshE = $('#syncRefresh');
Note._syncWarningE = $('#syncWarning');
Note.showSpin = function() {
	var me = this;
	me._syncRefreshE.addClass('fa-spin');

	// 如果超过30秒还在转, 证明有问题了
	setTimeout(function() {
		if(me._syncRefreshE.hasClass('fa-spin')) {
			me._syncRefreshE.removeClass('fa-spin');
			Note.hideSyncProgress();
		}
	}, 30 * 1000);

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
Note.syncFinished = function() {
	var me = this;
	me.hideSpin();
	me._syncWarningE.hide();

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
	SyncService.setSyncFinished();
	me.hideSpin();
	me._syncWarningE.data('reason', 'unConnected');
	me._syncWarningE.attr('title', 'Network error');
};
Note.notLogin = function() {
	var me = this;
	me._syncWarningE.show();
	me.hideSpin();
	SyncService.setSyncFinished();
	me._syncWarningE.data('reason', 'notLogin');
	me._syncWarningE.attr('title', 'You need sign in leanote');
};
// 点击感叹号, 处理错误
Note.fixNetOrAuthError = function() {
	var me = this;
	var reason = me._syncWarningE.data('reason');
	if(reason == 'unConnected') {
		alert('Network error, please check out your network.');
	} else if(reason == 'notLogin') {
		// 弹出登录框登录之, 重新弹出
		window.open('login.html?ref=needLogin');
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
    if((e.ctrlKey || e.metaKey) && num == 83 ) { // ctrl + s or command + s
		incrSync(true);
    	e.preventDefault();
    	return false;
    } else {
    }

    // copy, paste
    if(e.ctrlKey || e.metaKey) {
	    if(num == 67) { // ctrl + c
	    	document.execCommand('copy');
	    } else if(num == 86) { // ctrl + v
	    	// 不能要, 要的话会有两次paste
	    	// document.execCommand('paste');
	    } else if(num == 65) { // ctrl + a
	    	document.execCommand('selectAll');
	    } else if(num == 88) { // ctrl + x
	    	document.execCommand('cut');
	    }
    }
};

// 删除或移动笔记后, 渲染下一个或上一个
Note.changeToNext = function(target) {
	var $target = $(target);
	var next = $target.next();
	if(!next.length) {
		var prev = $target.prev();
		if(prev.length) {
			next = prev;
		} else {
			// 就它一个
			Note.showEditorMask();
			return;
		}
	}
	
	Note.changeNote(next.attr("noteId"));
}

// 删除笔记
// 1. 先隐藏, 成功后再移除DOM
// 2. ajax之 noteId
// Share.deleteSharedNote调用
Note.deleteNote = function(target, contextmenuItem, isShared) {
	// 如果删除的是已选中的, 赶紧设置curNoteId = null
	if($(target).hasClass("item-active")) {
		// -1 停止定时器
		Note.stopInterval();
		// 不保存
		Note.curNoteId = null;
		// 清空信息
		Note.clearNoteInfo();
	}
	
	noteId = $(target).attr("noteId");
	if(!noteId) {
		return;
	}

	// 取消star
	Note.unStar(noteId);

	// 1
	$(target).hide();
	
	// 2
	var note = Note.cache[noteId];
	var url = "/note/deleteNote"
	var serverFunc = NoteService.deleteNote;
	if(note.IsTrash) {
		url = "/note/deleteTrash";
		serverFunc = NoteService.deleteTrash;
	} else {
		// 减少数量
		Notebook.minusNotebookNumberNotes(note.NotebookId);
	}

	if(note.IsNew) {
		Note.changeToNext(target);
		$(target).remove();
		// 删除缓存
		if(note) {
			Note.clearCacheByNotebookId(note.NotebookId);
			delete Note.cache[noteId];
		}
		
		return;
	}

	serverFunc.call(NoteService, noteId, function(ret) {
		if(ret) {
			Note.changeToNext(target);
			
			$(target).remove();
			
			// 删除缓存
			if(note) {
				Note.clearCacheByNotebookId(note.NotebookId);
				delete Note.cache[noteId];
			}
			
			showMsg("删除成功!", 500);
		} else {
			// 弹出信息 popup 不用点确认的
			$(target).show();
			showMsg("删除失败!", 2000);
		}
	});
};


// 显示共享信息
Note.listNoteShareUserInfo = function(target) {
	var noteId = $(target).attr("noteId");
	showDialogRemote("/share/listNoteShareUserInfo", {noteId: noteId});
}
	
// 共享笔记
Note.shareNote = function(target) {
	var title = $(target).find(".item-title").text();
	showDialog("dialogShareNote", {title: getMsg("shareToFriends") + "-" + title});
	
	setTimeout(function() {
		$("#friendsEmail").focus();
	}, 500);
	
	var noteId = $(target).attr("noteId");
	shareNoteOrNotebook(noteId, true);
}

// 历史记录
Note.listNoteContentHistories = function() {
	// 弹框
	$("#leanoteDialog #modalTitle").html(getMsg("history"));
	$content = $("#leanoteDialog .modal-body");
	$content.html("");
	$("#leanoteDialog .modal-footer").html('<button type="button" class="btn btn-default" data-dismiss="modal">' + getMsg("close") + '</button>');
	options = {}
	options.show = true;
	$("#leanoteDialog").modal(options);
	
	NoteService.getNoteHistories(Note.curNoteId, function(re) {
		// console.log("histories.....");
		// console.log(re);
	// });
	// ajaxGet("/noteContentHistory/listHistories", {noteId: Note.curNoteId}, function(re) {
		if(!isArray(re)) {
			$content.html(getMsg("noHistories")); return;
		}
		// 组装成一个tab
		var str = /*"<p>" + getMsg("historiesNum") + '</p>' + */'<div id="historyList"><table class="table table-hover">';
		note = Note.cache[Note.curNoteId];
		var s = "div"
		if(note.IsMarkdown) {
			s = "pre";
		}
		for (i in re) {
			var content = re[i]
			content.Ab = Note.genAbstract(content.Content, 200);
			str += tt('<tr><td seq="?">#?<? class="each-content">?</?> <div class="btns">' + getMsg("datetime") + ': <span class="label label-default">?</span> <button class="btn btn-default all">' + getMsg("unfold") + '</button> <button class="btn btn-primary back">' + getMsg('restoreFromThisVersion') + '</button></div></td></tr>', i, (+i+1), s, content.Ab, s, goNowToDatetime(content.UpdatedTime))
		}
		str += "</table></div>";
		$content.html(str);
		$("#historyList .all").click(function() {
			$p = $(this).parent().parent();
			var seq = $p.attr("seq");
			var $c = $p.find(".each-content");
			var info = re[seq]; 
			if(!info.unfold) { // 默认是折叠的
				$(this).text(getMsg("fold")); // 折叠
				$c.html(info.Content);
				info.unfold = true;
			} else {
				$(this).text(getMsg("unfold")); // 展开
				$c.html(info.Ab);
				info.unfold = false
			}
		});
		
		// 还原
		$("#historyList .back").click(function() {
			$p = $(this).parent().parent();
			var seq = $p.attr("seq");
			if(confirm(getMsg("confirmBackup"))) {
				// 保存当前版本
				Note.curChangedSaveIt();
				// 设置之
				note = Note.cache[Note.curNoteId];
				setEditorContent(re[seq].Content, note.IsMarkdown);
				//
				hideDialog();
			}
		});
	});
};

//--------------
// read only

Note.showReadOnly = function() {
	Note.isReadOnly = true;
	$("#noteRead").show();
}
Note.hideReadOnly = function() {
	Note.isReadOnly = false;
	$("#noteRead").hide();
}
// read only
Note.renderNoteReadOnly = function(note) {
	Note.showReadOnly();
	$("#noteReadTitle").html(note.Title);
	
	Tag.renderReadOnlyTags(note.Tags);
	
	$("#noteReadCreatedTime").html(goNowToDatetime(note.CreatedTime));
	$("#noteReadUpdatedTime").html(goNowToDatetime(note.UpdatedTime));
}
Note.renderNoteContentReadOnly = function(note) {
	if(note.IsMarkdown) {
		$("#noteReadContent").html('<pre id="readOnlyMarkdown">' + note.Content + "</pre>");
	} else {
		$("#noteReadContent").html(note.Content);
	}
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
	if(!Note.lastKey || Note.lastKey != key || duration > 1000) {
		Note.lastKey = key;
		Note.lastSearchTime = now;
		return false;
	}
	
	if(key == Note.lastKey) {
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
		if(notes) {
			Note.searchKey = val;
			Notebook.changeCurNotebookTitle(getMsg('Search results'), false, notes.length, false, true);
			Note.renderNotes(notes);
			// markdown一旦setContent就focus, 导致搜索失去焦点
			setTimeout(function() {
				$("#searchNoteInput").focus();
			})
			if(!isEmpty(notes)) {
				Note.renderNotesAndTargetNote(notes, noteId);
			}
		} else {
			// abort的
		}
	});
};

Note.searchNote = function() {
	var val = $("#searchNoteInput").val();
	if(!val) {
		// 定位到all
		Notebook.changeNotebook("0");
		return;
	}
	// 判断是否与上一个是相同的搜索, 是则不搜索
	if(Note.isSameSearch(val)) {
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
		if(t == Note.searchSeq && notes) {
			Note.searchKey = val;
			Notebook.changeCurNotebookTitle(getMsg('Search results'), false, notes.length, false, true);
			Note.renderNotes(notes);
			// markdown一旦setContent就focus, 导致搜索失去焦点
			setTimeout(function() {
				$("#searchNoteInput").focus();
			})
			if(!isEmpty(notes)) {
				Note.changeNote(notes[0].NoteId, false/*, true || Note.isOver2Seconds*/); // isShare, needSaveChanged?, 超过2秒就要保存
			}
		} else {
			// abort的
		}
	});
	// Note.lastSearch.abort();
}

//----------
//设为blog/unset
Note.setNote2Blog = function(target) {
	var noteId = $(target).attr("noteId");
	var note = Note.cache[noteId];
	var isBlog = true;
	if(note.IsBlog != undefined) {
		isBlog = !note.IsBlog;
	}

	// 标志添加/去掉
	function setBlog() {
		// alert(noteId + " => " + isBlog);
		NoteService.setNote2Blog(noteId, isBlog, function(ret) {
			if(ret) {
				// 触发同步
				incrSync();

				// Note.setNoteCache({NoteId: noteId, IsBlog: isBlog}, false); // 不清空NotesByNotebookId缓存
				
				// 同步后会设置
				/*
				if(isBlog) {
					$(target).find(".item-blog").removeAttr('style');
				} else {
					$(target).find(".item-blog").hide();
				}
				*/
			}
		});
	}
	// 是新笔记 或 当前笔记就是它的, 则先保存之
	if(note.IsNew || note.curNoteId == noteId) {
		Note.curChangedSaveIt(true, function(note) {
			setBlog();
    	});
	} else {
		setBlog();
	}
};

// 设置notebook的blog状态
// 当修改notebook是否是blog时调用
Note.setAllNoteBlogStatus = function(notebookId, isBlog) {
	if(!notebookId) {
		return;
	}
	var notes = Note.getNotesByNotebookId(notebookId);
	if(!isArray(notes)) {
		return;
	}
	var len = notes.length;
	if(len == 0) {
		for(var i in Note.cache) {
			if(Note.cache[i].NotebookId == notebookId) {
				Note.cache[i].IsBlog = isBlog;
			}
		}
	} else {
		for(var i = 0; i < len; ++i) {
			notes[i].IsBlog = isBlog;
		}
	}
};

// 移动
Note.moveNote = function(target, data) {
	var noteId = $(target).attr("noteId");
	var note = Note.cache[noteId];
	var notebookId = data.notebookId;
	
	if(!note.IsTrash && note.NotebookId == notebookId) {
		return;
	}
	
	// 修改数量
	Notebook.incrNotebookNumberNotes(notebookId);
	if(!note.IsTrash) {
		Notebook.minusNotebookNumberNotes(note.NotebookId);
	}

	NoteService.moveNote(noteId, notebookId, function(ret) {
	// });
	// ajaxGet("/note/moveNote", {noteId: noteId, notebookId: notebookId}, function(ret) {
		if(ret && ret.NoteId) {
			if(note.IsTrash) {
				Note.changeToNext(target);
				$(target).remove();
				Note.clearCacheByNotebookId(notebookId);
			} else {
				// 不是trash, 移动, 那么判断是当前是否是all下
				// 不在all下, 就删除之
				// 如果当前是active, 那么clearNoteInfo之
				if(!Notebook.curActiveNotebookIsAll()) {
					Note.changeToNext(target);
					if($(target).hasClass("item-active")) {
						Note.clearNoteInfo();
					}
					$(target).remove();
				} else {
					// 不移动, 那么要改变其notebook title
					$(target).find(".note-notebook").html(Notebook.getNotebookTitle(notebookId));
				}
				
				// 重新清空cache 之前的和之后的
				Note.clearCacheByNotebookId(note.NotebookId);
				Note.clearCacheByNotebookId(notebookId);
			}
			
			// 改变缓存
			Note.setNoteCache(ret)
		}
	});
};

// 复制
// data是自动传来的, 是contextmenu数据 
Note.copyNote = function(target, data, isShared) {
	var noteId = $(target).attr("noteId");
	var note = Note.cache[noteId];
	var notebookId = data.notebookId;
	
	// trash不能复制, 不能复制给自己
	if(note.IsTrash || note.NotebookId == notebookId) {
		return;
	}
	
	/*
	var url = "/note/copyNote";
	var data = {noteId: noteId, notebookId: notebookId};
	if(isShared) {
		url = "/note/copySharedNote";
		data.fromUserId = note.UserId;
	}
	*/
	
	NoteService.copyNote(noteId, notebookId, function(newNote) {
		if(newNote && newNote.NoteId) {
			// 重新清空cache 之后的
			Note.clearCacheByNotebookId(notebookId);
			// 改变缓存, 添加之
			Note.setNoteCache(newNote)

			// 增加数量
			Notebook.incrNotebookNumberNotes(notebookId)
		} else {
			alert('error');
		}
	});
	
};


// 删除笔记标签
// item = {noteId => usn}
Note.deleteNoteTag = function(item, tag) {
	if(!item) {
		return;
	}
	for(var noteId in item) {
		var note = Note.getNote(noteId);
		if(note) {
			note.Tags = note.Tags || [];
			for(var i in note.Tags) {
				if(note.Tags[i] == tag) {
					note.Tags.splice(i, 1);
					continue;
				}
			}
			// 如果当前笔记是展示的笔记, 则重新renderTags
			if(noteId == Note.curNoteId) {
				Tag.renderTags(note.Tags);
			}
		}
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
	for(var i = 0; i < notes.length; ++i) {
		var note = notes[i];
		var t = tt(me.starItemT, note.NoteId, note.Title || getMsg('Untitled'));
		me.starNotesO.append(t);
	}

	if(notes.length == 0) {
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
	if(!noteId) {
		target = me.starNotesO.find('li').eq(0);
	}
	var noteId = target.data('id');
	if(!noteId) {
		return;
	}
	me.starNotesO.find('li').removeClass('selected');
	target.addClass('selected');


	// 大BUG start
	// 先保存现有的啊
	me.curChangedSaveIt();
	console.log('ok...');

	// 把当前笔记放在第一位
	me.clearAll();
	
	// 如果数据改了, me.starNotes 的content不是最新的
	me.starNotes || (me.starNotes = []);
	for(var i = 0; i < me.starNotes.length; ++i) {
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
	if(target.length == 1) { 
		target.find('a').html((title || 'Untitled') + '<span class="delete-star" title="'  + getMsg('Remove') + '">X</span>');
	}
};

// 取消star, note delete/trash时取消star
Note.unStar = function(noteId) {
	var me = this;

	// 删除该stars
	var has = false;
	for(var i  = 0; i < me.starNotes.length; ++i) {
		var tNote = me.starNotes[i];
		if(tNote.NoteId == noteId) { 
			var has = true;
			me.starNotes.splice(i, 1);
			break;
		}
	}

	if(has) {
		// 重新渲染之
		me.renderStars(me.starNotes);
	}
};

// 收藏或取消收藏
Note.star = function(noteId) {
	var me = this;
	var note = me.getNote(noteId);
	if(!note || note.IsTrash) { 
		return;
	}
	var $target = $('[noteId="' + noteId + '"]');
	NoteService.star(noteId, function(ok, isStarred) {
		if(ok) {
			note.Star = isStarred;
			if(isStarred) {
				me.starNotes.unshift(note);
				$target.addClass('item-is-star');
			} else {
				$target.removeClass('item-is-star');
				// 删除该stars
				for(var i  = 0; i < me.starNotes.length; ++i) {
					var tNote = me.starNotes[i];
					if(tNote.NoteId == noteId) { 
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
		if(!conflictNote) {
			alert('The note is not exists');
			return;
		}
		// 是否在该列表中?
		var target = $(tt('[noteId="?"]', conflictNoteId)); // 
		// 如果当前笔记在笔记列表中, 那么生成一个新笔记放在这个笔记上面
		if(target.length > 0) {
		} else {
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
	if(!note) {
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
	if(!conflictNoteId) {
		return conflictIsFixed();
	}

	var conflictNote = me.getNote(conflictNoteId);
	if(!conflictNote) {
		return conflictIsFixed();
	}

	me._curFixNoteId = noteId;
	me._curFixNoteTarget = $li;

	if(!me._showConflictInfoInited) {
		me._showConflictInfoInited = true;
		me._initshowConflictInfo();
	}

	// 初始化数据
	var titleElem = Note._conflictTipsElem.find('.conflict-title');
	titleElem.text(conflictNote.Title);
	titleElem.data('id', conflictNoteId);
	Note._conflictTipsElem.find('.conflict-resolved').prop('checked', false);

	ContextTips.show('#conflictTips', e, function() {
		if(Note._conflictTipsElem.find('.conflict-resolved').prop('checked')) {
			conflictIsFixed();
		}
	});
};

// 内容已同步成功
Note.contentSynced = function(noteId, content) {
	var me = this;
	var note = me.getNote(noteId);
	if(!note) {
		// 可能之前还没有
		// me.setNoteCache(noteId, {Content: content});
		return;
	}
	if(note.InitSync) {
		// 重新render内容
		note.InitSync = false;
		note.Content = content;
		if(me.curNoteId == noteId || me.inChangeNoteId == noteId) {
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

// 延迟加载内容
Note.getNoteContentLazy = function(noteId) {
	setTimeout(function() {
		NoteService.getNoteContent(noteId, function(contentO) {
			if(typeof contentO == 'object') {
				Note.contentSynced(noteId, contentO.Content);
			}
		});
	}, 10);
};


// 这里速度不慢, 很快
Note.getContextNotebooks = function(notebooks) {
	var moves = [];
	var copys = [];
	var copys2 = [];
	for(var i in notebooks) {
		var notebook = notebooks[i];
		var move = {text: notebook.Title, notebookId: notebook.NotebookId, action: Note.moveNote}
		var copy = {text: notebook.Title, notebookId: notebook.NotebookId, action: Note.copyNote}
		var copy2 = {text: notebook.Title, notebookId: notebook.NotebookId, action: Share.copySharedNote}
		if(!isEmpty(notebook.Subs)) {
			var mc = Note.getContextNotebooks(notebook.Subs);
			move.items = mc[0];
			copy.items = mc[1];
			copy2.items = mc[2];
			move.type = "group";
			move.width = 150;
			copy.type = "group";
			copy.width = 150;
			copy2.type = "group";
			copy2.width = 150;
		}
		moves.push(move);
		copys.push(copy);
		copys2.push(copy2);
	}
	return [moves, copys, copys2];
};

Note.target = null; // 当前处理的note
Note.menuItemsForMove = {}; // notebookId => menu
Note.menuItemsForCopy = {}; // notebookId => menu
Note.getContextNotebooksSys = function(notebooks) {
	var submenuMoves = new gui.Menu();
	var submenuCopys = new gui.Menu();

	for(var i in notebooks) {
		(function(j) {
			var notebook = notebooks[j];
			var move = new gui.MenuItem({label: notebook.Title, /*notebookId: notebook.NotebookId,*/ click: function() {
				Note.moveNote(Note.target, {notebookId: notebook.NotebookId});
			}});
			var copy = new gui.MenuItem({label: notebook.Title, /*notebookId: notebook.NotebookId, */click: function() {
				Note.copyNote(Note.target, {notebookId: notebook.NotebookId});
			}});

			Note.menuItemsForMove[notebook.NotebookId] = move;
			Note.menuItemsForCopy[notebook.NotebookId] = copy;

			if(!isEmpty(notebook.Subs)) {
				var mc = Note.getContextNotebooksSys(notebook.Subs);
				move.submenu = mc[0];
				copy.submenu = mc[1];
			}

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
	        	Note.setNote2Blog(self.target);
	        }
	    });

	    this.move = new gui.MenuItem({
	        label: getMsg("Move"),
	        click: function(e) {
	        }
	    });
	    this.copy = new gui.MenuItem({
	        label: getMsg("Copy"),
	        click: function(e) {
	        }
	    });

	    // 导出
	    this.exports = new gui.MenuItem({
	        label: getMsg('Export'),
	        click: function(e) {
	        }
	    });
	    var exportsSubMenus = new gui.Menu();
	    var exportMenus = Api.getExportMenus() || [];
	    for(var i = 0; i < exportMenus.length; ++i) {
	    	var menu = exportMenus[i];
	    	var clickBac = menu.click;
	    	var menuItem = new gui.MenuItem({
		        label: menu.label,
		        click: function(e) {
		        	var note = Note.getNote($(self.target).attr('noteId'));
		        	clickBac && clickBac(note);
		        }
		    });
		    exportsSubMenus.append(menuItem);
	    }
	    
	    var ms = Note.getContextNotebooksSys(notebooks);
	    this.move.submenu = ms[0];
	    this.copy.submenu = ms[1];

	    this.menu.append(this.publicBlog);
	    this.menu.append(this.del);
	    this.menu.append(this.move);
	    this.menu.append(this.copy);
	    if(exportMenus.length > 0) { 
		    this.exports.submenu = exportsSubMenus;
		    this.menu.append(this.exports);
	    }

	    // this.menu.append(ms[0]);
	    // this.menu.append(ms[1]);

		// You can have submenu!
		// var submenu = new gui.Menu();
		// submenu.append(new gui.MenuItem({ label: 'checkbox 啊' , type: 'checkbox'}));
		// submenu.append(new gui.MenuItem({ label: 'Item 2', type: 'checkbox'}));
		// submenu.append(new gui.MenuItem({ label: 'Item 3'}));

	    this.enable = function(name, ok) {
	    	this[name].enabled = ok;
	    }
	    this.popup = function(e, target) {
	    	self.target = target;
	    	var noteId = $(target).attr('noteId');

	    	var note = Note.getNote(noteId);
	    	if(!note) {
	    		return;
	    	}
	    	var notebookId = note.NotebookId;
	    	
	    	if(note.IsTrash) {
	    		this.copy.enabled = false;
	    	} else {
	    		this.copy.enabled = true;
	    	}

	    	if(note.IsBlog) {
	    		this.publicBlog['label'] = getMsg('Cancel public');
	    	} else {
	    		this.publicBlog['label'] = getMsg('Public as blog');
	    	}

			this.menu.popup(e.originalEvent.x, e.originalEvent.y);

	    	// notebookMenuForMove.enabled = true;
	    	// notebookMenuForCopy.enabled = true;

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
		$("#showAttach").click(function(){ 
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
			if(confirm(getMsg("Are you sure to delete it ?"))) {
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
			curAttachId = attachId;

			$('#downloadFileInput').attr('nwsaveas', $li.find('.attach-title').text()).click();
			// window.open(UrlPrefix + "/attach/download?attachId=" + attachId);
			// location.href = "/attach/download?attachId=" + attachId;
		});
		
		// 下载
		$('#downloadFileInput').change(function(e) {
			var value = $(this).val();
			$(this).val('');
			var curAttach = me.getAttach(curAttachId);
			if(curAttach) {
				FileService.download(curAttach.Path, value, function(ok, msg) {
					if(!ok) {
						// TODO 提示下载成功
						var notification = new window.Notification(getMsg('Warning'), {
					        body: getMsg('File saved failure!'),
					        // icon: appIcon
					    });
					} else {
						// TODO 提示下载成功
						var notification = new window.Notification(getMsg('Info'), {
					        body: getMsg('File saved successful!'),
					        // icon: appIcon
					    });
					}
				});
			} else {
				alert('error');
			}
		});
		
		// make link
		self.attachListO.on("click", ".link-attach", function(e) {
			e.stopPropagation();
			var attachId = $(this).closest('li').data("id");
			var attach = self.attachsMap[attachId];
			var src = EvtService.getAttachLocalUrl(attachId); // + "/attach/download?attachId=" + attachId;
			// http://leanote.com/attach/download?attachId=54f7481638f4112ff000170f
			
			if(LEA.isMarkdownEditor() && MD) {
				MD.insertLink(src, attach.Title);
			} else {
				tinymce.activeEditor.insertContent('<a target="_blank" href="' + src + '">' + attach.Title + '</a>');
			}
		});
		
		// make all link
		self.linkAllBtnO.on("click",function(e) {
			// 暂不支持
			return;
			e.stopPropagation();
			var note = Note.getCurNote();
			if(!note) {
				return;
			}
			var src = EvtService.getAllAttachLocalUrl(note.NoteId); // UrlPrefix +  "/attach/downloadAll?noteId=" + Note.curNoteId
			// src = 'http://leanote.com/attach/downloadAll?noteId=' + note.NoteId;
			var title = note.Title ? note.Title + ".tar.gz" : "all.tar.gz";
			
			if(LEA.isMarkdownEditor() && MD) {
				MD.insertLink(src, title);
			} else {
				tinymce.activeEditor.insertContent('<a target="_blank" href="' + src + '">' + title + '</a>');
			}
		});

		// 添加Attach
		$('#chooseFile').click(function() {
			$('#chooseFileInput').click();
		});
		// 得到路径, 保存文件即可
		$('#chooseFileInput').change(function() { 
			var files = $(this).val();
			$(this).val('');

			// 如果是新建的笔记, 必须先保存note
			var note = Note.getCurNote();
			if(note && note.IsNew) {
				Note.curChangedSaveIt(true);
			}

			FileService.addAttach(files, Note.curNoteId, function(files) {
				if(files) {
					me.addAttachs(files);
				}
			});
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
		if(attachNum) {
			self.attachNumO.html("(" + attachNum + ")").show();
			self.downloadAllBtnO.show();
			self.linkAllBtnO.show();
		} else {
			self.attachNumO.hide();
			self.downloadAllBtnO.hide();
			self.linkAllBtnO.hide();
		}
		
		// 隐藏掉
		if(needHide) {
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
		for(var i = 0; i < attachNum; ++i) {
			var each = attachs[i];
			var path = each.Path;
			// 本地是否有, 没有, 是否是在显示的时候才去从服务器上抓? 不
			var disabled = '';
			if(path) {
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
		if(note) {
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
		for(var i in attachInfos) {
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
		for(var i = 0; i < attachs.length; ++i) {
			if(attachs[i].FileId == attachId) {
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
	downloadAll: function() {
	},

	// 服务器端同步成功后调用
	attachSynced: function(attachs, attach, noteId) {
		var me = this;
		var fileId = attach.FileId;
		var note = Note.getNote(noteId);
		if(note) {
			note.Attachs = attachs;
			me.attachsMap[fileId] = attach;
			if(noteId == Note.curNoteId) {
				// 重新render之
				me.renderAttachs(noteId);
			}
		}
	}
}

//------------------- 事件
$(function() {
	// 附件初始化
	Attach.init();

	$("#noteItemList").on("click", ".item", function(event) {
		// event.stopPropagation();
		var noteId = $(this).attr("noteId");
		
		// 手机端处理
		// Mobile.changeNote(noteId);
		
		if(!noteId) {
			return;
		}
		// 当前的和所选的是一个, 不改变
		if(Note.curNoteId != noteId) {
			// 不用重定向到notebook
			Note.changeNoteForPjax(noteId, true, false);
		}
	});
	
	// 当前笔记可以已修改
	$('#editorContent, #wmd-input, #noteTitle').keyup(function() {
		Note.curNoteIsDirtied();
	});

	/*
	$('#addTagInput').click(function() {
		Note.curNoteIsDirtied();
	});
	*/
	
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
		if($(this).hasClass("new-note-right")) {
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
	
	//---------------------------
	// 搜索, 按enter才搜索
	/*
	$("#searchNoteInput").on("keyup", function(e) {
		Note.searchNote();
	});
	*/
	$("#searchNoteInput").on("keydown", function(e) {
		var theEvent = e; // window.event || arguments.callee.caller.arguments[0];
		if(theEvent.keyCode == 13 || theEvent.keyCode == 108) {
			theEvent.preventDefault();
			Note.searchNote();
			return false;
		}
	});
	
	//--------------------
	// Note.initContextmenu();
	
	//------------
	// 文档历史
	$("#contentHistory").click(function() {
		Note.listNoteContentHistories()
	});
	
	$("#saveBtn").click(function() {
		Note.curChangedSaveIt(true);
	});
	
	// blog
	$("#noteItemList").on("click", ".item-blog", function(e) {
		e.preventDefault();
		e.stopPropagation();
		// 得到ID
		var noteId = $(this).parent().attr('noteId');
		var note = Note.getNote(noteId);
		if(note.ServerNoteId) {
			openExternal(UserInfo.Host + '/blog/post/' + note.ServerNoteId);
		}
	});
	
	// note setting
	$("#noteItemList").on("click", ".item-my .item-setting", function(e) {
		e.preventDefault();
		e.stopPropagation();
		var $p = $(this).parent();
		Note.noteMenuSys.popup(e, $p);
	});
	$("#noteItemList").on("contextmenu", "li", function(e) {
		e.preventDefault();
		e.stopPropagation();
		Note.noteMenuSys.popup(e, $(this));
	});

	// 收藏
	$("#noteItemList").on("click", ".item-my .item-star", function(e) {
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

	$("#noteItemList").on("click", ".item-my .item-conflict-info", function(e) {
		Note.showConflictInfo(this, e);
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

	var target = $(tt('[noteId="?"]', note.NoteId)); // 
	// 如果当前笔记在笔记列表中, 那么生成一个新笔记放在这个笔记上面
	if(target.length > 0) {
		var newHtmlObject = Note._getNoteHtmlObjct(note);
		if(newHtmlObject) {
			$(newHtmlObject).insertBefore(target);
		}
	}
	// 当前这个换成新复制的
	target.attr('noteId', newNote.NoteId);
	target.addClass('item-conflict');
	// 重新render 左侧下, 因为有冲突了, 不要render内容啊

	// 如果当前编辑的是这个笔记, 那切换到newNote上来
	if(Note.curNoteId == note.NoteId) {
		Note.setCurNoteId(newNote.NoteId);
	}
};

// 设置博客是否可以见
Note.setNoteBlogVisible = function(noteId, isBlog) {
	var target = $(tt('[noteId="?"]', noteId));
	if(target.length) {
		if(isBlog) {
			target.find(".item-blog").removeAttr('style');
		} else {
			target.find(".item-blog").hide();
		}
	}
};

// --> adds
// changeAdds 有了serverId
Note.updateNoteCacheForServer = function(notes) {
	if(isEmpty(notes)) { 
		return;
	}
	for(var i in notes) {
		var note = notes[i];
		// alert(note.NoteId + " " + note.IsBlog);
		Note.setNoteCache({NoteId: note.NoteId, 
			ServerNoteId: note.ServerNoteId,
			IsBlog: note.IsBlog,
		});
		Note.setNoteBlogVisible(note.NoteId, note.IsBlog);
	}
};

// 更新
// --> send changes 
Note.updateSync = function(notes) {
	if(isEmpty(notes)) { 
		return;
	}

	var curNotebookIsTrash = Notebook.curNotebookIsTrash();

	for(var i in notes) {
		var note = notes[i];
		note.InitSync = true; // 需要重新获取内容
		Note.addNoteCache(note);
		// 如果当前修改的是本笔记, 那么重新render之
		// console.log('->>>');
		// console.log(Note.curNoteId);
		if(Note.curNoteId == note.NoteId) {
			// 这里, 如果当前就是更新的, 则重新render, 有个问题, server新内容已经在服务器上了
			Note.reRenderNote(Note.curNoteId);
		}

		// 设置当前是否是博客
		// alert(note.NoteId + " " + note.IsBlog);
		Note.setNoteBlogVisible(note.NoteId, note.IsBlog);

		// 如果是trash, 且当前不在trash目录下, 且有该笔记, 则删除之
		if(!curNotebookIsTrash && note.IsTrash) {
			var target = $(tt('[noteId="?"]', note.NoteId));
			if(target.length) {
				if(Note.curNoteId == note.NoteId) {
					Note.changeToNext(target);
				}
				target.remove();
			}
		}
	}
};


// 添加同步的notes
// <-- server
Note.addSync = function(notes) {
	if(isEmpty(notes)) { 
		return;
	}
	for(var i in notes) {
		var note = notes[i];
		Note.addNoteCache(note);

		// 很可能其笔记本也是新添加的, 此时重新render notebooks' numberNotes
		Notebook.reRenderNotebookNumberNotesIfIsNewNotebook(note.NotebookId);

		// alert(note.ServerNoteId);
		// 添加到当前的笔记列表中
		var newHtmlObject = Note._getNoteHtmlObjct(note);
		$('#noteItemList').prepend(newHtmlObject);

		Note.setNoteBlogVisible(note.NoteId, note.IsBlog);
	}
};

// 删除
Note.deleteSync = function(notes) {
	if(isEmpty(notes)) { 
		return;
	}
	for(var i in notes) {
		var noteId = notes[i];
		note = Note.getNote(noteId);
		if(note) {
			Note.clearCacheByNotebookId(note.NotebookId);
			delete Note.cache[noteId];
			// 如果在笔记列表中则删除
			$(tt('[noteId="?"]', note.NoteId)).remove();
		}
	}
}

