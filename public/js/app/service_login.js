var Common = require('common');

var Evt = require('evt');
var app = require('electron').remote.app; // .require('app');
var basePath = app.getPath('appData') + '/leanote'; // /Users/life/Library/Application Support/Leanote'; // require('nw.gui').App.dataPath;
Evt.setDataBasePath(basePath);

// 所有service, 与数据库打交道
var Service = {
	userService: require('user'),
	apiService: require('api'),
};

var db = require('db');
db.initGlobal();

// 全局变量
var ApiService = Service.apiService;
var UserService = Service.userService;
var EvtService = require('evt');
var CommonService = Common;

var gui = require('gui');