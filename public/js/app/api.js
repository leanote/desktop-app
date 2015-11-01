// 只有api的插件才能访问
var Api = {
	notebook: Notebook,
	note: Note,
	tag: Tag,
	loading: Loading,
	gui: gui,
	onClose: onClose,
	reloadApp: reloadApp,
	isMac: isMac(),
	nodeFs: NodeFs,
	evtService: EvtService,
	commonService: CommonService,
	fileService: FileService,
	noteService: NoteService,
	userService: UserService,

	// 得到当前版本
	getCurVersion: function (callback) {
		var me = this;
		var vFile = me.evtService.getProjectBasePath() + '/data/version';
		// fs.writeFileSync('./output.json',JSON.stringify({a:1,b:2}));
		try {
			var v = JSON.parse(fs.readFileSync(vFile));
			return v;
		} catch(e) {
			return false;
		}
	},

	getConfigFilePath: function() {
		return __dirname + '/public/config.js';
	},
	writeConfig: function(config) {
		var me = this;
		var fileData = "var Config = " + JSON.stringify(config, null, 4) + ';';
		var ok = me.commonService.writeFile(me.getConfigFilePath(), fileData);
		return ok;
	},

	// data = {'en-us': {}, 'zh-cn' {}};
	// prefix = 'plugin.theme'
	_langs: {
		'en-us': {
			'default': 'Default',
		},
		'zh-cn': {
			'default': '默认',
		}
	},
	curLang: curLang,
	defaultLang: 'en-us',
	// 添加语言包
	addLangMsgs: function(data, prefix) {
		var me = this;
		if(!data) {
			return;
		}
		if(prefix) {
			prefix += '.'; // prefix.
		}
		for(var lang in data) {
			var msgs = data[lang] || {};
			me._langs[lang] || (me._langs[lang] = {});
			for(var key in msgs) {
				me._langs[lang][prefix + key] = msgs[key];
			}
		}
	},
	isArray: function(obj) {
		return Object.prototype.toString.call(obj) === '[object Array]';
	},
	// 国际化
	getMsg: function(key, prefix, data) {
		var me = this;
		if(!key) {
			return '';
		}
		var rawKey = key;
		if(prefix) {
			key = prefix + '.' + key;
		}
		
		var msg = me._langs[me.curLang][key] || me._langs[me.defaultLang][key] || rawKey;

		if(data) {
			if(!me.isArray(data)) {
				data = [data];
			}
			for(var i = 0; i < data.length; ++i) {
				msg = msg.replace("%s", data[i]);
			}
		}
		return msg;
	},

	// 与之前lang.js取出的数据合并
	_init: function() {
		var me = this;
		me._langs[me.curLang] || (me._langs[me.curLang] = {});
		$.extend(me._langs[me.curLang], window.langData);

		// extend
		window.getMsg = function(key, prefix, data) { 
			return me.getMsg(key, prefix, data);
		};
	},

	_callOpenAfter: function() {

	},

	_themeMenu: null,
	getThemeMenu: function() {
		var me = this;
		return me._themeMenu;
	},
	setThemeMenu: function(menus) {
		var me = this;
		me._themeMenu = menus;
	},

	_importMenus: [],
	addImportMenu: function(menu) {
		var me = this;
		me._importMenus.push(menu);
	},
	getImportMenus: function() { 
		var me = this;
		return me._importMenus;
	},
	// 添加用户menu
	addUserMenu: function(menus, pos) {


	},
	addNotebookMenu: function(menu, pos) {

	},
	addTrashMenu: function(menu, pos) {

	},

	// 导出
	_exportMenus: [],
	addExportMenu: function(menu) {
		var me = this;
		me._exportMenus.push(menu);
	},
	getExportMenus: function() {
		var me = this;
		return me._exportMenus;
	},

	// 导出, 笔记本下
	_exportMenusForNotebook: [],
	addExportMenuForNotebook: function(menu) {
		var me = this;
		me._exportMenusForNotebook.push(menu);
	},
	getExportMenusForNotebook: function() {
		var me = this;
		return me._exportMenusForNotebook;
	},

	// 更多菜单
	_moreMenus: [],
	getMoreMenus: function() {
		var me = this;
		return me._moreMenus;
	},
	addMoreMenu: function(menu) {
		var me = this;
		me._moreMenus.push(menu);
	}
};

Api._init();