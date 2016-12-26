var Common = require('common');

var Evt = require('evt');
var app = require('electron').remote.app; // .require('app');
var basePath = app.getPath('appData') + '/leanote'; // /Users/life/Library/Application Support/Leanote'; // require('nw.gui').App.dataPath;
Evt.setDataBasePath(basePath);
var protocol = require('electron').protocol; // .require('protocol');
// 数据库初始化
var db = require('db');
// db.init();
db.initGlobal();
// 所有service, 与数据库打交道
var Service = {
	notebookService: require('notebook'),
	noteService: require('note'),
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

var projectPath = __dirname;
