/**
 * tag navigator
 */
var TagNav = function() {
  this.tags = [];
  this.curTag = null;
  this.$element = $('#tagNav');
  this.$element.on('click', 'li .label', function() {
    var tagValue = $(this).closest('li').data('tag').trim();
    this._searchByTag(tagValue);
  });
  this.$element.on('click', 'li .tag-delete', this._deleteTag);    
};

TagNav.prototype = {
  constructor: TagNav,
  _searchByTag: function(tag, noteId) {
  	Note.curChangedSaveIt();
  	// 清空所有，也会把curNoteId清空
  	Note.clearAll();

  	var tagTitle = '<span class="label label-default">' + trimTitle(tag) + '</span>';

  	Notebook.changeCurNotebookTitle(tagTitle, false, '', true);
    this.curTag = tag;

  	NoteService.searchNoteByTag(tag, function(notes) {
  		hideLoading();
  		if(notes) {
  			Note.renderNotes(notes);
  			Note.renderNotesAndTargetNote(notes, noteId);
  		}
  	});
  },
  
  _deleteTag: function() {
    $li = $(this).closest('li');
    var tag = $.trim($li.data('tag'));
    if(confirm(getMsg('Are you sure ?'))) {
      TagService.deleteTag(tag, function(re) {
        if(typeof re == 'object' && re.Ok !== false) {
          Note.deleteNoteTag(re, tag);
          $li.remove();
        }
      });
    };
  },
  
  // called by node: web.js
  deleteTags: function(tags) {
    tags = tags || [];
    for(var i = 0; i < tags.length; ++i) {
      var title = tags[i];
      $('#myTag li[data-tag="' + title + '"]').remove();
    }
  },

  // called by node: web.js
  // 添加标签，并重绘到左侧
  addTags: function(tags) {
    tags = tags || [];
    // 去重，将添加的标签放在第一个位置
    for(var i = 0; i < tags.length; ++i) {
      for(var j in this.tags) {
        if(this.tags[j].Tag == tags[i].Tag) {
          this.tags.splice(j, 1);
          break;
        }
      }
      this.tags.unshift(tags[i]);
    }
    this.setTags(this.tags);
  },

  // called by page.js
  // 更新tags，并重绘到左侧
  setTags: function(tags) {
  	this.tags = tags || [];
  	$('#tagNav').html('');
  	for(var i in this.tags) {
  		var noteTag = this.tags[i];
  		var tag = noteTag.Tag;
  		var text = tag;
  		
  		text = trimTitle(text);
  		var classes = 'label label-default';
  		// 笔记数量先隐藏, 不准确
  		$('#tagNav').append(tt('<li data-tag="?"><a> <span class="?">? <em style="display: none">(?)</em></span> <i class="tag-delete">X</i></li>', tag, classes, text, noteTag.Count));
  	}

  	if(this.tags.length == 0) {
  		$('#tagNav').html('<p class="no-info">' + getMsg('No tag') + '</p>');
  	}
  },
};


/**
 * tag edit area of editor
 */
var TagInput = function() {
  var me = this;
  me.tags = []; //array of strings
  me.$tags = $("#tags");
  me.$input = $("#tagInput");
  me.$inputPrompt = $("#tagInputPrompt");
  me.$suggestion = $("#tagSuggestion");
  me._hideSuggestion();
  
  me.$inputPrompt.click(function(e) {
    me.$inputPrompt.hide();
    me.$input.show().focus().val("");
    e.preventDefault();
  });
  
  // 保存tag
  me.$input.blur(function() {
    var val = me.$input.val();
    if(val) {
      me.$input.val("");
      me._addTag(val, true);
      me._hideSuggestion();
    }
  });
  
  me.$input.keydown(function(e) {
    if (e.keyCode == 13) {
      $(this).trigger("blur");
      e.preventDefault();
    }
    // TODO tag颜色调淡
    // TODO arrow key up
    // TODO arrow key down
    // TODO delete with backspace
  });
  
  me.$input.on('input', function(e) {
    me.timer = setTimeout(function() {
      const val = me.$input.val();
      if(val) {
        me._showSuggestion(val);
      }
      else {
        me._hideSuggestion();
      }
    }, 200);
  });
  
  me.$tags.on('click', 'i', function() {
    me._removeTag($(this).parent());
  });

  // 不能使用click事件，否则会在input的blur事件之后触发
  me.$suggestion.on('mousedown', 'li', function(e) {
    var $li = $(this);
    me._addTag($li.text(), true);
    e.preventDefault();
    me.$input.val('');
  });
}

TagInput.prototype = {
  constructor: TagInput,
  
  // called by Note
  getTags: function() {
  	var tags = [];
  	this.$tags.children().each(function(){
  		var text = $(this).data('tag');
  		tags.push(text);
  	});
  	// 正常情况下不会重复
  	return tags;
  },
  
  // called by Note
  clearTags: function() {
  	this.$tags.html('');
  },

  // called by Note
  setTags: function(tags) {
  	if(isEmpty(tags) || !Array.isArray(tags)) {
  		return;
  	}
    this.$tags.html('');
  	for(var i = 0; i < tags.length; ++i) {
  		this._addTag(tags[i]);
  	}
  },
  
  // tag应该是string的，也可能是number
  _addTag: function(tag, save) {
    if(!tag) {
      return;
    }
    var classes = "label label-default",
      text = (tag + "").trim(),
      escapedText = trimTitle(text);
    
    // 取出tags中重复
    var duplicate = false;
    this.$tags.children().each(function() {
      if (escapedText + "X" == $(this).text()) {
        $(this).remove();
        duplicate = true;
      }
    });

    this.$tags.append(tt('<span class="?" data-tag="?">?<i title="' + getMsg("delete") + '">X</i></span>', classes, text, escapedText));
        
    if(save && !duplicate) {
      this._saveTag(text);
    }
  },

  // 保存tag
  _saveTag(text) {
    Note.curChangedSaveIt(true, function() {
      TagService.addOrUpdateTag(text, function(ret) {
        if(typeof ret == 'object' && ret.Ok !== false) {
          Tag.nav.addTags([ret]);
        }
      });
    });    
  },
  
  // 删除tag
  _removeTag: function($target) {
    // TODO 这里调的服务不对吧
    var tag = $target.data('tag');
    $target.remove();
    Note.curChangedSaveIt(true, function() {
      TagService.addOrUpdateTag(tag, function(ret) {
        if(typeof ret == 'object' && ret.Ok !== false) {
          Tag.nav.addTags([ret]);
        }
      });
    });
  },
  
  _showSuggestion: function(keyword) {
    var me = this;
    if(!keyword) {
      return;
    }
    this.$suggestion.html('');
    TagService.getTags(function(tags) {
      var texts = tags
        .map(function(tag) {
          return tag.Tag + ''; 
        })
        .filter(function(text) {
          return text.startsWith(keyword);
        })
        .sort()
        .slice(0, 6);
      texts.forEach(function(text) {
        me.$suggestion.prepend($('<li>' + text + '</li>'));
      });
      me.$suggestion.children().last().addClass("selected");

      if(texts.length > 0) {
        $('#tagInputGroup').addClass('open');      
      }
      else {
        $('#tagInputGroup').removeClass('open');      
      }      
    });
  },
  
  _hideSuggestion: function() {
    $('#tagInputGroup').removeClass('open');
  },
};

Tag.nav = new TagNav();
Tag.input = new TagInput();
