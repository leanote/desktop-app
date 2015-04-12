// 只有api的插件才能访问
var Api = {
	notebook: Notebook,
	note: Note,
	tag: Tag,
	loading: Loading,
	gui: gui,
	nodeFs: NodeFs,
	evtService: EvtService,
	commonService: CommonService,
	fileService: FileService,
	noteService: NoteService,

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
		if(prefix) {
			key = prefix + '.' + key;
		}
		var msg = me._langs[me.curLang][key] || me._langs[me.defaultLang][key] || key;

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
		$.extend(me._langs[me.curLang], window.langData);

		// extend
		window.getMsg = function(key, prefix) { 
			return me.getMsg(key, prefix);
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

	_exportMenus: [],
	addExportMenu: function(menu) {
		var me = this;
		me._exportMenus.push(menu);
	},
	getExportMenus: function() {
		var me = this;
		return me._exportMenus;
	}
};

Api._init();