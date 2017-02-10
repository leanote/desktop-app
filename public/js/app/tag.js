/**
 * tag navigator
 */
var TagNav = function() {
  var me = this;
  this.tags = [];
  this.curTag = null;
  this.$element = $('#tagNav');

  // 搜索
  this.$element.on('click', 'li .label', function() {
    var tagValue = $(this).closest('li').data('tag').trim();
    me.searchByTag(tagValue);
  });

  // 删除
  this.$element.on('click', 'li .tag-delete', function () {
    var $li = $(this).closest('li');
    var tag = $.trim($li.data('tag'));
    if(confirm(getMsg('Are you sure ?'))) {
      TagService.deleteTag(tag, function(re) {
        console.log(' delete tag', re);
        if(typeof re == 'object' && re.Ok !== false) {
          // re == {noteId => note}
          // 笔记删除标签
          Note.deleteNoteTag(re, tag);

          // 导航删除
          $li.remove();
          me._deleteTag(tag);
        }
      });
    }
  });
};

TagNav.prototype = {
  constructor: TagNav,

  // 通过tag搜索
  searchByTag: function(tag, noteId) {
  	Note.curChangedSaveIt();
  	// 清空所有，也会把curNoteId清空
  	Note.clearAll();

  	var tagTitle = '<span class="label label-default">' + trimTitle(tag) + '</span>';

  	Notebook.changeCurNotebookTitle(tagTitle, false, '', true);
    this.curTag = tag;

  	NoteService.searchNoteByTag(tag, function(notes) {
  		hideLoading();
  		if(notes) {
  			// Note.renderNotes(notes);
  			Note.renderNotesAndTargetNote(notes, noteId);
  		}
  	});
  },

  _deleteTag: function (title) {
    var me = this;
    if (me.tags) {
      for(var i = me.tags.length - 1; i >= 0; --i) {
        if (me.tags[i].Tag == title) {
          me.tags.splice(i, 1);
        }
      }
    }
  },
  
  // called by node: web.js
  deleteTags: function(tags) {
    tags = tags || [];
    for(var i = 0; i < tags.length; ++i) {
      var title = tags[i];
      $('#myTag li[data-tag="' + title + '"]').remove();
      this._deleteTag(title);
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
      if (text) {
    		var classes = 'label label-default';
    		// 笔记数量先隐藏, 不准确
    		$('#tagNav').append(tt('<li data-tag="?"><a> <span class="?">? <em style="display: none">(?)</em></span> <i class="tag-delete">X</i></li>', tag, classes, text, noteTag.Count));
      }
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
  me.numSuggestions = 0;
  me.selectedSuggestion = 0;
  me.$tags = $("#tags");
  me.$input = $("#tagInput");
  me.$inputPrompt = $("#tagInputPrompt");
  me.$suggestions = $("#tagSuggestion");
  me._hideSuggestion();
  
  me.$inputPrompt.click(function(e) {
    me.$inputPrompt.hide();
    me.$input.show().focus().val("");
  });
  
  // 保存tag
  me.$input.blur(function() {
    var val = me.$input.val();
    me._hideSuggestion();
    if(val) {
      me.$input.val('');
      me._addTag(val, true);
    }
  });
  
  me.$input.keydown(function(e) {
    switch (e.keyCode) {
      case 8:
        me._onBackSpace(e);
        break;
      case 13:
        me._onEnter(e);
        break;
      case 27:
        me._onEscape(e);
        break;
      case 38:
        me._onUpArrow(e);
        break;
      case 40:
        me._onDownArrow(e);
        break;
      default:
    }
  });
  
  me.$input.on('input', function(e) {
    if(me.timer) {
      clearTimeout(me.timer);
    }
    me.timer = setTimeout(function() {
      var val = me.$input.val();
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

  // 使用click事件的话，就无法阻止input的blur事件触发
  me.$suggestions.on('mousedown', 'li', function(e) {
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
  	if(!Array.isArray(tags)) {
      tags = [];
  	}
    this.clearTags();
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

  // 保存tag, 到数据库
  _saveTag(text) {
    if (!text) {
      return;
    }
    console.log('save tag to db', text);
    Note.curChangedSaveIt(true, function() {
      console.log('save tag to db yes!!');
      TagService.addOrUpdateTag(text, function(ret) {
        console.log(ret);
        if(typeof ret == 'object' && ret.Ok !== false) {
          Tag.nav.addTags([ret]);
        }
      });
    });
  },
  
  // 删除tag
  _removeTag: function($target) {
    var text = $target.data('tag');
    $target.remove();
    if(text) {
      Note.curChangedSaveIt(true, function() {
        TagService.addOrUpdateTag(text, function(ret) {
          if(typeof ret == 'object' && ret.Ok !== false) {
            // 刚删除的tag不需要放到nav的第一个
            // Tag.nav.addTags([ret]);
          }
        });
      });
    }
  },
  
  _showSuggestion: function(keyword) {
    // alert("show suggest");
    var me = this;
    if(!keyword) {
      return;
    }
    keyword = keyword.toLowerCase();
    this.$suggestions.html('');
    TagService.getTags(function(tags) {
      var texts = tags
        .map(function(tag) {
          return tag.Tag + ''; 
        })
        .filter(function(text) {
          return text.toLowerCase().startsWith(keyword);
        })
        .sort()
        .slice(0, 6);
      texts.forEach(function(text) {
        me.$suggestions.append($(`<li>${text}</li>`));
      });
      
      // placeholder tag that represent current input
      me.$suggestions.prepend($(`<li class="hidden">${me.$input.val()}</li>`));
      me.selectedSuggestion = 0;
      me.numSuggestions = texts.length;
      
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
  
  _selectSuggestion: function(index) {
    if(this.numSuggestions) {
      this.$suggestions.children().eq(this.selectedSuggestion).removeClass("selected");
      var $suggestion = this.$suggestions.children().eq(index);      
      $suggestion.addClass("selected");
      this.$input.val($suggestion.text());
      this.$input[0].setSelectionRange($suggestion.text().length, $suggestion.text().length);
      this.selectedSuggestion = index;
    }
  },

  _onBackSpace: function(e) {
    var val = this.$input.val();
    if(!val) {
      this._removeTag(this.$tags.children().last());
      e.preventDefault();
    }
  },

  _onEnter: function(e) {
    var val = this.$input.val();
    this._hideSuggestion();
    if(val) {
      this.$input.val('');
      this._addTag(val, true);
    }
  },

  _onEscape: function(e) {
    this.$input.val('');
    this.$input.trigger('blur');
  },

  _onUpArrow: function(e) {
    var index = (this.selectedSuggestion - 1) % (this.numSuggestions + 1);
    this._selectSuggestion(index);
    e.preventDefault();
  },
  
  _onDownArrow: function(e) {
    var index = (this.selectedSuggestion + 1) % (this.numSuggestions + 1);
    this._selectSuggestion(index);
    e.preventDefault();
  }
};

Tag.nav = new TagNav();
Tag.input = new TagInput();
