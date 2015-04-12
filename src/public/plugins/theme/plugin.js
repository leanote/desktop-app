/**
 * 主题插件
 */
define(function() {

	// 改变css
	// var themes = {"Simple":'simple-no.css', 'Blue': 'blue.css', 'Black': 'black.css'};

	// dir => {}
	var themeMap = {
		'default': {
			name: Api.getMsg('default'),
			dir: ''
		}
	}
	var themes = [
		themeMap['default']
	];

	// 遍历主题目录, 得到主题
	var themeBaePath = Api.evtService.getProjectBasePath() +  "/public/themes/themes";
	var dirs = Api.nodeFs.readdirSync(themeBaePath);
	for(var i = 0; i < dirs.length; ++i) {
		var dir = dirs[i]; // 名称
		// 读出配置信息
		var json = Api.commonService.getFileJson(themeBaePath + '/' + dir + '/theme.json');
		if(!json) {
			continue;
		}

		var themePrefixLang = 'theme.' + dir;
		Api.addLangMsgs(json.langs, themePrefixLang);

		var name = Api.getMsg('name', themePrefixLang);

		if(!name) {
			continue;
		}

		themeMap[dir] = {
			name: name, // 主题名称
			dir: dir
		};

		themes.push(themeMap[dir]);
	}

	// 改变主题
	function changeTheme(themeDir) {
		themeDir || (themeDir = '');
		themeDir = themeDir.toLowerCase();
		if(themeDir && themeDir != 'default') {
			$('#theme').attr('href', 'public/themes/themes/' + themeDir + '/theme.css');
		} else {
			// 删除掉
			$('#theme').attr('href', '');
		}

		// 保存配置
		UserService.updateG({Theme: themeDir});

		// 将其它的不选中
		for(var i in themes) {
			var theme = themes[i];
			if(theme.dir != themeDir) {
				theme.menu.checked = false;
			} else {
				theme.menu.checked = true;
			}
		}
	}

	var theme = {
		langs: {
			'en-us': {
				'changeTheme': 'Change theme',
			},
			'zh-cn': {
				'changeTheme': '修改主题',
			},
			'zh-hk': {
				'changeTheme': '修改主题'
			}
		},
		// 打开前要执行的
		onOpen: function() {
			var me = this;
			var gui = Api.gui;

			var themeSubmenus = new gui.Menu();

		    for(var i in themes) {
		    	(function(curTheme) {
		    		curTheme.menu = new gui.MenuItem({
				        label: curTheme.name,
				        type: 'checkbox',
				        click: function(e) {
				        	// var themeCss = themes[t];
				        	changeTheme(curTheme.dir);
				        }
				    });
				    themeSubmenus.append(curTheme.menu);
		    	})(themes[i]);
		    }
		    var themeMenu = new gui.MenuItem({
		        label: Api.getMsg('plugin.theme.changeTheme'),
		    });
		    themeMenu.submenu = themeSubmenus;

		    // 设置
		    Api.setThemeMenu(themeMenu);
		},
		// 打开后
		onOpenAfter: function() {
			// 修改主题
			changeTheme(UserInfo.Theme);
		},
		// 关闭时需要运行的
		onClose: function() {

		}
	};

	return theme;

});
