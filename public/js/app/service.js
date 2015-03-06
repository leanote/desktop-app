var Common = require('common');

// 启动服务器, 图片
var Server = require('server');
Server.start();

var Evt = require('evt');
var basePath = require('nw.gui').App.dataPath;
Evt.setDataBasePath(basePath);

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

var gui = require('nw.gui');

// 浏览器打开
function openExternal(url) {
    gui.Shell.openExternal(url);
}

// 窗口大小设置
var win = gui.Window.get();

$(function() {
	$('.tool-close, .tool-close-blur').click(function() {
		win.close();
	});
	$('.tool-min, .tool-min-blur').click(function() {
		win.minimize();
	});
	$('.tool-max, .tool-max-blur').click(function() {
		win.maximize();
		// win.toggleFullscreen(); // mac下是新屏幕
		// 全屏模式
		// win.toggleKioskMode();
	});
});

// bind close event
// 保存当前打开的笔记

function isURL(str_url) {
    var re = new RegExp("^((https|http|ftp|rtsp|mms|emailto)://).+");
    return re.test(str_url);
}

// 菜单
// 更多menu用法: http://www.cnblogs.com/xuanhun/p/3669216.html
function Menu() {
    this.menu = new gui.Menu();
    this.cut = new gui.MenuItem({
        label: 'Cut',
        click: function() {
            document.execCommand('cut');
        }
    });
    this.copy = new gui.MenuItem({
        label: 'Copy',
        click: function() {
            document.execCommand('copy');
        }
    });
    this.paste = new gui.MenuItem({
        label: 'Paste',
        click: function() {
            // document.execCommand("selectAll");
            document.execCommand('paste');
        }
    });
    this.openInBrowser = new gui.MenuItem({
        label: 'Open link in browser',
        click: function() {
            // document.execCommand("selectAll");
            // document.execCommand('paste');
            // https://github.com/nwjs/nw.js/wiki/Shell
            openExternal(winHref);
        }
    });
    this.menu.append(this.cut);
    this.menu.append(this.copy);
    this.menu.append(this.paste);
    this.menu.append(new gui.MenuItem({ type: 'separator' }));
    this.menu.append(this.openInBrowser);
    
    // You can have submenu!
    /*
	var submenu = new gui.Menu();
	submenu.append(new gui.MenuItem({ label: 'checkbox 啊' , type: 'checkbox'}));
	submenu.append(new gui.MenuItem({ label: 'Item 2', type: 'checkbox'}));
	submenu.append(new gui.MenuItem({ label: 'Item 3'}));
	this.openInBrowser.submenu = submenu;
	*/
}
Menu.prototype.canCopy = function(bool) {
    this.cut.enabled = bool;
    this.copy.enabled = bool;
};
Menu.prototype.canPaste = function(bool) {
    this.paste.enabled = bool;
};
Menu.prototype.canOpenInBroswer = function(bool) {
    this.openInBrowser.enabled = bool;
};
Menu.prototype.popup = function(x, y) {
    this.menu.popup(x, y);
};
var menu = new Menu();
var FS = require('fs');

// 右键菜单
var winHref = '';
$('#noteTitle, #searchNoteInput, #searchNotebookForList, #addTagInput, #wmd-input, #editorContent').on('contextmenu', function (e) {
	e.preventDefault();
	var $target = $(e.target);
	var text = $target.text();
	winHref = $target.attr('href');
	if(!winHref) {
		winHref = text;
	}
	// 判断是否满足http://leanote.com
	if(winHref) {
		if(winHref.indexOf('http://127.0.0.1') < 0 && isURL(winHref)) {
		} else {
			winHref = false;
		}
	}

	menu.canOpenInBroswer(!!winHref);
	var selectionType = window.getSelection().type.toUpperCase();
	// var clipData = gui.Clipboard.get().get();
	// menu.canPaste(clipData.length > 0);
	menu.canPaste(true);
	menu.canCopy(selectionType === 'RANGE');
	menu.popup(e.originalEvent.x, e.originalEvent.y);
});
