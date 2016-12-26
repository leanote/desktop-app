/**
 * Markdown主题插件
 */
define(function() {
	var mdTheme = {
		langs: {
			'en-us': {
				'changeTheme': 'Change markdown theme',
			},
			'de-de': {
				'changeTheme': 'Markdown auswählen',
			},
			'zh-cn': {
				'changeTheme': 'Markdown主题设置',
			},
			'zh-hk': {
				'changeTheme': 'Markdown主題設置'
			},
			'ja-jp': {
				'changeTheme': 'Markdown主題設定'
			}
		},

		// dir => {}
		_themeMap : {
		},
		_themes: [],
		getThemes: function() {
			var me = this;
			// 遍历主题目录, 得到主题列表 
			var themeFolder = __dirname + "/public/themes/markdown";
			Api.nodeFs.readdirSync(themeFolder)
                .filter(function(theme) {
                    return Api.nodeFs.statSync(themeFolder + "/" + theme).isDirectory();
                })
                .forEach(function(theme) {
    				me._themeMap[theme] = {
    					name: theme, // 主题名称
    					dir: theme
    				};
    				me._themes.push(me._themeMap[theme]);                    
                });
		},

		// 改变主题
		changeTheme: function (themeDir) {
			var me  = this;
			themeDir || (themeDir = 'default');
			themeDir = themeDir.toLowerCase();
			$('#md-theme').attr('href', 'public/themes/markdown/' + themeDir + '/index.css');

			Config.mdTheme = themeDir;
			var ok = Api.writeConfig(Config);

			// 选中目录
			for(var i in me._themes) {
				var theme = me._themes[i];
				if(theme.dir != themeDir) {
					theme.menu.checked = false;
				} else {
					theme.menu.checked = true;
				}
			}
		},

		onOpen: function() {
			var me = this;
			var gui = Api.gui;

			me.getThemes();

			var themeSubmenus = new gui.Menu();
		    for(var i in me._themes) {
		    	(function(curTheme) {
		    		curTheme.menu = new gui.MenuItem({
				        label: curTheme.name,
				        type: 'checkbox',
				        click: function(e) {
				        	// var themeCss = themes[t];
				        	me.changeTheme(curTheme.dir);
				        }
				    });
				   themeSubmenus.append(curTheme.menu);
		    	})(me._themes[i]);
		    }

		    me._themeMenu = new gui.MenuItem({
		    	submenu: themeSubmenus,
          label: Api.getMsg('plugin.md_theme.changeTheme'),
		    });

		    Api.setMdThemeMenu(me._themeMenu);
		},

		onOpenAfter: function() {
			var me = this;
			me.changeTheme(Config.mdTheme || '');
		},

		onClose: function() {
		}
	};

	return mdTheme;
});
