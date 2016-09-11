// Tag

Tag.classes = {
	"蓝色": "label label-blue",
	"红色": "label label-red",
	"绿色": "label label-green",
	"黄色": "label label-yellow",
	"blue": "label label-blue",
	"red": "label label-red",
	"green": "label label-green",
	"yellow": "label label-yellow"
}

// 数据库中统一存En
Tag.mapCn2En = {
	"蓝色": "blue",
	"红色": "red",
	"绿色": "green",
	"黄色": "yellow",
}
Tag.mapEn2Cn = {
	"blue": "蓝色",
	"red": "红色",
	"green": "绿色",
	"yellow": "黄色",
}
Tag.isColorTag = function(tag) {
	return tag == 'blue' || tag == 'red' || tag == 'green' || tag == 'yellow';
}

Tag.t = $("#tags");

// called by Note
Tag.getTags = function() {
	var tags = [];
	Tag.t.children().each(function(){
		var text = $(this).data('tag');
		text = Tag.mapCn2En[text] || text;
		tags.push(text);
	});
	// 需要去重吗? 正常情况下不会重复
	return tags;
}

// called by Note
Tag.clearTags = function() {
	Tag.t.html("");
}

// 设置tags
// called by Note
Tag.renderTags = function(tags) {
	Tag.t.html("");
	if(isEmpty(tags)) {
		return;
	}
	// TODO 重构, 这样不高效
	for(var i = 0; i < tags.length; ++i) {
		var tag = tags[i];
		Tag.appendTag(tag);
	}
};

function hideTagList(event) {
	$("#tagDropdown").removeClass("open");
	if (event) {
		event.stopPropagation()
	}
}
function showTagList(event) {
	$("#tagDropdown").addClass("open");
	if (event) {
		event.stopPropagation()
	}
}

// 添加tag
// tag = {classes:"label label-red", text:"红色"}
// tag = life
Tag.appendTag = function(tag, save) {
	var isColor = false;
	var classes, text;
	
	if (typeof tag == "object") {
		classes = tag.classes;
		text = tag.text;
		if(!text) {
			return;
		}
	} else {
		tag = $.trim(tag);
		text = tag;
		if(!text) {
			return;
		}
		var classes = Tag.classes[text];
		if(classes) {
			isColor = true;
		} else {
			classes = "label label-default";
		}
	}
	var rawText = text;
	if(Tag.isColorTag(text)) {
		text = getMsg(text);
	}

	text = trimTitle(text);

	tag = tt('<span class="?" data-tag="?">?<i title="' + getMsg("delete") + '">X</i></span>', classes, rawText, text);

	// 避免重复
	var isExists = false;
	$("#tags").children().each(function() {
		if (isColor) {
			var tagHtml = $("<div></div>").append($(this).clone()).html();
			if (tagHtml == tag) {
				$(this).remove();
				isExists = true;
			}
		} else if (text + "X" == $(this).text()) {
			$(this).remove();
			isExists = true;
		}
	});

	$("#tags").append(tag);

	hideTagList();

	if (!isColor) {
		reRenderTags();
	}
	
	if(save) {
		// 如果之前不存, 则添加之
		if(!isExists) {
			Note.curChangedSaveIt(true, function() {
				TagService.addOrUpdateTag(rawText, function(ret) {
					if(typeof ret == 'object' && ret.Ok !== false) {
						Tag.addTagNav(ret);
					}
				});
			});
		}
	}
};

// nodejs端调用
Tag.addTagsNav = function(tags) {
	tags = tags || [];
	for(var i = 0; i <  tags.length; ++i) {
		Tag.addTagNav(tags[i]);
	}
};

// 删除, nodejs调用
Tag.deleteTagsNav = function(tags) {
	tags = tags || [];
	for(var i = 0; i <  tags.length; ++i) {
		var title = tags[i];
		$('#myTag li[data-tag="' + title + '"]').remove();
	}
};

// 为了颜色间隔, add, delete时调用
function reRenderTags() {
	var defautClasses = [ "label label-default", "label label-info" ];
	var i = 0;
	$("#tags").children().each(
		function() {
			var thisClasses = $(this).attr("class");
			if (thisClasses == "label label-default"
					|| thisClasses == "label label-info") {
				$(this).removeClass(thisClasses).addClass(
						defautClasses[i % 2]);
				i++;
			}
		});
};

// 删除tag
Tag.removeTag = function($target) {
	var tag = $target.data('tag');
	$target.remove();
	reRenderTags();
	Note.curChangedSaveIt(true, function() {
		TagService.addOrUpdateTag(tag, function(ret) {
			if(typeof ret == 'object' && ret.Ok !== false) {
				Tag.addTagNav(ret);
			}
		});
	});
}; 

//-----------
// 左侧nav en -> cn
Tag.tags = [];
Tag.renderTagNav = function(tags) {
	var me = this;
	tags = tags || [];
	Tag.tags = tags;
	$("#tagNav").html('');
	for(var i in tags) {
		var noteTag = tags[i];
		var tag = noteTag.Tag;
		var text = tag;

		if(Tag.isColorTag(text)) {
			text = getMsg(text);
		}
		
		text = trimTitle(text);
		var classes = Tag.classes[tag] || "label label-default";
		// 笔记数量先隐藏, 不准确
		$("#tagNav").append(tt('<li data-tag="?"><a> <span class="?">? <em style="display: none">(?)</em></span> <i class="tag-delete">X</i></li>', tag, classes, text, noteTag.Count));
	}

	if(tags.length == 0) {
		$("#tagNav").html('<p class="no-info">' + getMsg('No tag') + '</p>');
	}
};

// 添加的标签重新render到左边, 放在第一个位置
Tag.addTagNav = function(newTag) {
	var me = this;
	for(var i in me.tags) {
		var noteTag = me.tags[i];
		if(noteTag.Tag == newTag.Tag) {
			me.tags.splice(i, 1);
			break;
		}
	}
	me.tags.unshift(newTag);
	me.renderTagNav(me.tags);
};

Tag.searchTag = function(tag, noteId) {
	// 1
	Note.curChangedSaveIt();
	
	// 2 先清空所有
	// 也会把curNoteId清空
	Note.clearAll();
	
	var tagCn = tag;
	if(Tag.isColorTag(tag)) {
		tagCn = getMsg(tag);
	}

	var tagTitle = '<span class="' + (Tag.classes[tag] || 'label label-default') + '">' + trimTitle(tagCn) + '</span>';

	Notebook.changeCurNotebookTitle(tagTitle, false, '', true);
	Tag.curTag = tag;
	
	NoteService.searchNoteByTag(tag, function(notes) {
		hideLoading();
		if(notes) {
			// 和note搜索一样
			// 设空, 防止发生上述情况
			// Note.curNoteId = "";
			Note.renderNotes(notes);
			Note.renderNotesAndTargetNote(notes, noteId);
		}
	});
};


// 事件
$(function() {
	// tag input box
	$("#addTagTrigger").click(function() {
		$(this).hide();
		$("#addTagInput").show().focus().val("");
	});
	
	$("#addTagInput").click(function(event) {
		showTagList(event);
	});
	
	$("#addTagInput").blur(function() {
		var val = $(this).val();
		if(val) {
			Tag.appendTag(val, true);
		}
		return;
		// 下面不能有, 有就有问题
		$("#addTagTrigger").show();
		$("#addTagInput").hide();
		// revertTagStatus();
	});
	$('#addTagInput').keydown(function(e) {
		if (e.keyCode == 13) {
			hideTagList();
			// 如果有值, 再生成, 没值直接隐藏
			if ($("#addTagInput").val()) {
				$(this).trigger("blur");
				$("#addTagTrigger").trigger("click");
			} else {
				$(this).trigger("blur");
			}
		}
	});
	// 点击下拉时也会触发input的blur事件
	$("#tagColor li").click(function(event) {
		var a;
		if($(this).attr("role")) {
			a = $(this).find("span");
		} else {
			a = $(this);
		}
		Tag.appendTag({
			classes : a.attr("class"),
			text : a.text()
		}, true);
	});
	
	$("#tags").on("click", "i", function() {
		Tag.removeTag($(this).parent());
	});
  
	// tag nav
	function deleteTag() {
		$li = $(this).closest('li');
		var tag = $.trim($li.data("tag"));
		if(confirm(getMsg("Are you sure ?"))) {
			TagService.deleteTag(tag, function(re) {
				if(typeof re == "object" && re.Ok !== false) {
					Note.deleteNoteTag(re, tag);
					$li.remove();
				}
			});
		};
	}
	
	function searchTag() {
		var $li = $(this).closest('li');
		var tag = $.trim($li.data("tag"));
		Tag.searchTag(tag);
	};

	$("#tagNav").on("click", "li .label", searchTag);	
	$("#tagNav").on("click", "li .tag-delete", deleteTag);
});
