/**
 * 主题插件
 */
define(function() {
	var theme = {
		langs: {
			'en-us': {
				'changeTheme': 'Change theme',
			},
			'de-de': {
				'changeTheme': 'Design auswählen',
			},
			'zh-cn': {
				'changeTheme': '主题设置',
			},
			'zh-hk': {
				'changeTheme': '主題設置'
			},
			'ja-jp': {
				'changeTheme': '主題設定'
			}
		},

		// dir => {}
		_themeMap : {
			'default': {
				name: Api.getMsg('default'),
				dir: ''
			}
		},
		_themes: [],
		getThemes: function() {
			var me = this;
			me._themes = [
				me._themeMap['default']
			];

			// 遍历主题目录, 得到主题
			var themeBaePath = __dirname + "/public/themes/themes";
			var dirs = Api.nodeFs.readdirSync(themeBaePath);
			for(var i = 0; i < dirs.length; ++i) {
				var dir = dirs[i]; // 名称
				// 读出配置信息
				var json = Api.commonService.getFileJson(themeBaePath + '/' + dir + '/theme.json');
				if(!json) {
					continue;
				}

				if(json.released === false) { // 还没成功
					continue;
				}

				var themePrefixLang = 'theme.' + dir;
				Api.addLangMsgs(json.langs, themePrefixLang);

				var name = Api.getMsg('name', themePrefixLang);

				if(!name) {
					continue;
				}

				me._themeMap[dir] = {
					name: name, // 主题名称
					dir: dir
				};

				me._themes.push(me._themeMap[dir]);
			}
		},

		// 改变主题
		changeTheme: function (themeDir) {
			var me  = this;
			themeDir || (themeDir = '');
			themeDir = themeDir.toLowerCase();
			if(themeDir && themeDir != 'default') {
				$('#theme').attr('href', 'public/themes/themes/' + themeDir + '/theme.css');
			} else {
				// 删除掉
				$('#theme').attr('href', '');
			}

			Config.theme = themeDir;
			var ok = Api.writeConfig(Config);

			// 将其它的不选中
			for(var i in me._themes) {
				var theme = me._themes[i];
				if(theme.dir != themeDir) {
					theme.menu.checked = false;
				} else {
					theme.menu.checked = true;
				}
			}
		},

		// 打开前要执行的
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
		        label: Api.getMsg('plugin.theme.changeTheme'),
		    });
			
		    // 设置
		    Api.setThemeMenu(me._themeMenu);
		},

		// 打开后
		onOpenAfter: function() {
			var me = this;
			
			// 修改主题
			me.changeTheme(Config.theme || '');
		},
		// 关闭时需要运行的
		onClose: function() {
		}
	};

	return theme;

});
