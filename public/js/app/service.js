var Common = require('common');

// 所有service, 与数据库打交道
var Service = {
	notebookService: require('notebook'),
	noteService: require('note'),
	tagService: require('tag'),
	userService: require('user'),
	tagService: require('tag'),
	apiService: require('api'),
	syncServie: require('sync')
};

// 全局变量
var ApiService = Service.apiService;
var UserService = Service.userService;
var SyncService = Service.syncServie;
var NoteService = Service.noteService;
var NotebookService = Service.notebookService;
var TagService = Service.tagService;
var WebService = require('web');
var ServerService = require('server');
var FileService = require('file');
var EvtService = require('evt');

// 分发服务
// route = /note/notebook
// 过时
Service.dispatch = function() {};
/*
Service.dispatch = function(router, param, callback) {
	var me = this;
	router = $.trim(router);
	if(router.indexOf('/') >= 0) {
		router = router.substr(router.indexOf('/') + 1);
	}
	var routers = router.split('/');
	var controller = routers[0] + 'Service';
	var action = routers[1];
	if(Service[controller] && Service[controller][action]) {
		Service[controller][action].call(Service[controller], param, callback);
	} else {
		log('no such router: ' + router);
		callback && callback(false);
	}
};
*/

// 右键菜单
$(document).on('contextmenu', function (e) {
	e.preventDefault();
	var $target = $(e.target);
	// var selectionType = window.getSelection().type.toUpperCase();
	var selectionType = '';
	// if ($target.is(':text')) {   // TODO url/email/... 未加入判断哦
	  var clipData = gui.Clipboard.get().get();
	  menu.canPaste(true || clipData.length > 0);
	  menu.canCopy(true || selectionType === 'RANGE');
	  menu.popup(e.originalEvent.x, e.originalEvent.y);
	// }
});
  
var gui = require('nw.gui');
function Menu() {
this.menu = new gui.Menu();
this.cut = new gui.MenuItem({
  label: '剪切',
  click: function () {
    document.execCommand('cut');
  }
});
this.copy = new gui.MenuItem({
  label: '复制',
  click: function () {
    document.execCommand('copy');
  }
});
this.paste = new gui.MenuItem({
  label: '粘贴',
  click: function () {
    document.execCommand('paste');
  }
});
this.menu.append(this.cut);
this.menu.append(this.copy);
this.menu.append(this.paste);
}
Menu.prototype.canCopy = function (bool) {
this.cut.enabled = bool;
this.copy.enabled = bool;
};
Menu.prototype.canPaste = function (bool) {
this.paste.enabled = bool;
};
Menu.prototype.popup = function (x, y) {
this.menu.popup(x, y);
};
var menu = new Menu();
var FS = require('fs');