var Common = require('common');

var Evt = require('evt');
var app = require('remote').require('app');
var basePath = app.getPath('appData') + '/leanote'; // /Users/life/Library/Application Support/Leanote'; // require('nw.gui').App.dataPath;
Evt.setDataBasePath(basePath);

if(!/login.html/.test(location.href)) {
	// 启动服务器, 图片
	var Server = require('server');
	Server.start();
}

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
var CommonService = require('common');

// NodeJs
var NodeFs = require('fs');

// 分发服务
// route = /note/notebook
// 过时
Service.dispatch = function() {};

var gui = require('gui');
// var remote = require('remote');
