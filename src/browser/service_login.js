// dir base on note.html

const electron = require('electron')

const Common = require('./src/common');

const Evt = require('./src/evt');
const app = require('@electron/remote').app; // .require('app');
const basePath = app.getPath('appData') + '/leanote'; // /Users/life/Library/Application Support/Leanote'; // require('nw.gui').App.dataPath;
Evt.setDataBasePath(basePath);

// 所有service, 与数据库打交道
const Service = {
	userService: require('./src/user'),
	apiService: require('./src/api'),
};

const db = require('./src/db');
db.initGlobal();

// 全局变量
const ApiService = Service.apiService;
const UserService = Service.userService;
const EvtService = require('./src/evt');
const CommonService = Common;

const gui = require('./src/gui');