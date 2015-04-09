// 只有api的插件才能访问
var Api = {
	notebook: Notebook,
	note: Note,
	tag: Tag,
	gui: gui,
	nodeFs: NodeFs,
	evtService: EvtService,
	commonService: CommonService,

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
	curLang: 'en-us',
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
	// 国际化
	getMsg: function(key, prefix) {
		var me = this;
		if(!key) {
			return '';
		}
		if(prefix) {
			key = prefix + '.' + key;
		}
		return me._langs[me.curLang][key] || me._langs[me.defaultLang][key] || key;
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

	}
};