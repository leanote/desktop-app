/**
 * 语言设置插件
 */
define(function() {
	var setLang = {
		langs: {
			'en-us': {
				'setLang': 'Langs',
			},
			'de-de': {
				'setLang': 'Sprache',
			},
			'zh-cn': {
				'setLang': '语言设置',
			},
			'zh-hk': {
				'setLang': '語言設置',
			},
			'ja-jp': {
				'setLang': '语言设置'
			}
		},
		_langsMenu: {}, // // name => menu
		setLang: function(langFileName) {
			var me = this;
			if(langFileName == Api.curLang) {
				return;
			}
			for(var langN in me._langsMenu) {
				var langMenu = me._langsMenu[langN];
				if(langN == langFileName) {
					langMenu.checked = true;
				} else {
					langMenu.checked = false;
				}
			}
			// 设置完后, 将langName写到Config.js中
			Config.lang = langFileName;
			var ok = Api.writeConfig(Config);
			if(ok) {
				Api.reloadApp();
			} else {
				alert(getMsg('error'));
			}
		},
		// 启动后
		setLangChecked: function(langFileName) {
			var me = this;
			me._langsMenu[langFileName].checked = true;
		},
		// 打开前要执行的
		onOpen: function() {
			var me = this;
			var gui = Api.gui;

			var langSubmenus = new gui.Menu();

			var langs = Config.langs;
			for(var i = 0; i < langs.length; ++i) {
				var lang = langs[i];
				(function(lang2) { 
					// alert(lang2.name)
					me._langsMenu[lang2.filename] = new gui.MenuItem({
				        label: lang2.name,
				        type: 'checkbox',
				        click: function(e) {
				        	me.setLang(lang2.filename);
				        }
				    });

				    langSubmenus.append(me._langsMenu[lang2.filename]);
				})(lang);
			}

		    var langMenu = new gui.MenuItem({
		    	submenu: langSubmenus,
		        label: Api.getMsg('plugin.langs.setLang'),
		    });

		    // 设置
		    Api.addMoreMenu(langMenu);
		},
		// 打开后
		onOpenAfter: function() {
			var me = this;
			me.setLangChecked(Api.curLang);
		},
		// 关闭时需要运行的
		onClose: function() {

		}
	};

	return setLang;

});
