var fs = require('fs');
// var User = require('user');

// 为什么不存在?
// var dataBasePath = require('nw.gui').App.dataPath; //  + '/data';
/*
// 判断是否存在, 不存在则创建dir
if(!fs.existsSync(dataBasePath)) {
	fs.mkdirSync(dataBasePath);
}
*/
// dataBasePath = '';

var Evt = {
	defaultUrl: 'https://leanote.com',

	leanoteUrl: 'https://leanote.com',
	// leanoteUrl: 'http://localhost:9000',

	setHost: function(host) {
		if(!host) {
			this.leanoteUrl = this.defaultUrl;
		} else {
			this.leanoteUrl = host;
		}
		// leanote服务强制https
		if (this.leanoteUrl === 'http://leanote.com') {
			this.leanoteUrl = 'https://leanote.com';
		}
	},

	getHost: function() {
		return this.leanoteUrl;
	},

	port: 8912,
	localUrl: 'http://127.0.0.1:8912',
	dataBasePath: '',

	// 是否有这个方法, 就代表是否可以用(含callback)
	// https://github.com/atom/electron/commit/7d97bb6fe0a6feef886d927ea894bcb2f3521577
	// 老版本没有这个问题
	canUseProtocol: function () {
		return true;
		// return false;
		// return protocol.registerFileProtocol;
	},

	getImageLocalUrlPrefix: function () {
		return 'leanote://file/getImage';
	},

	getAttachLocalUrlPrefix: function () {
		return 'leanote://file/getAttach';
	},

	getAllAttachsLocalUrlPrefix: function () {
		return 'leanote://file/getAllAttachs';
	},

	getImageLocalUrl: function(fileId) {
		return 'leanote://file/getImage?fileId=' + fileId;
	},
	getAttachLocalUrl: function(fileId) {
		return 'leanote://file/getAttach?fileId=' + fileId;
	},
	getAllAttachLocalUrl: function(noteId) {
		return this.localUrl + '/api/file/getAllAttachs?noteId=' + noteId;
	},
	getProjectBasePath: function() { 
		var dirname = __dirname;
		// /app/node_modules
		return dirname.replace('/node_modules', '').replace('\\node_modules', ''); // windows情况
	},
	// 数据存储绝对地址
	getBasePath: function() {
		var me = this;
		return me.dataBasePath;
	},
	getAbsolutePath: function(relative) {
		var me = this;
		return me.getBasePath() + '/' + relative;
	},
	setDataBasePath: function(dataBasePath) {
		var me = this;
		// console.log('...........')
		// console.error(dataBasePath);
		me.dataBasePath = dataBasePath;

		try {
			fs.mkdirSync(dataBasePath);
		}
		catch(e) {};
	},

	getDBPath: function () {
		return this.getBasePath() + '/nedb55';
	}
};
module.exports = Evt; 
