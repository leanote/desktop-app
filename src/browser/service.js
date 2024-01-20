// dir base on note.html

const electron = require('electron')

var Evt = require('./src/evt');
var app = require('@electron/remote').app; // .require('app');
var basePath = app.getPath('appData') + '/leanote'; // /Users/life/Library/Application Support/Leanote'; // require('nw.gui').App.dataPath;
Evt.setDataBasePath(basePath);
var protocol = require('electron').protocol; // .require('protocol');
// 数据库初始化
var db = require('./src/db');
// db.init();
db.initGlobal();
// 所有service, 与数据库打交道
var Service = {
	notebookService: require('./src/notebook'),
	noteService: require('./src/note'),
	userService: require('./src/user'),
	tagService: require('./src/tag'),
	apiService: require('./src/api'),
	syncServie: require('./src/sync')
};
// 全局变量
var ApiService = Service.apiService;
var UserService = Service.userService;
var SyncService = Service.syncServie;
var NoteService = Service.noteService;
var NotebookService = Service.notebookService;
var TagService = Service.tagService;
var WebService = require('./src/web');
var FileService = require('./src/file');
var EvtService = Evt;
const CommonService = require('./src/common');
const Common = CommonService

// NodeJs
const NodeFs = require('fs');
const NodePath = require('path');
const Resanitize = require('./src/resanitize');
const Path = require('path');

// 分发服务
// route = /note/notebook
// 过时
Service.dispatch = function() {};
var gui = require('./src/gui');

var projectPath = __dirname;
