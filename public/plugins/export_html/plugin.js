/**
 * 导出HTML插件
 * @author  life life@leanote.com
 * 选择目录, 将图片保存到文件夹中, 有个html文件(以笔记名命名)
 * 注意, fs.existsSync总返回false, readFileSync可用
 */
define(function() {
	var async = require('async');

	var exportHTML = {
		langs: {
			'en-us': {
				'export': 'Export HTML',
				'exportSuccess': 'HTML saved successful!',
				'exportFailure': 'HTML saved failure!',
				'notExists': 'Please sync your note to ther server firslty.'
			},
			'zh-cn': {
				'export': '导出HTML',
				'exportSuccess': 'HTML导出成功!',
				'exportFailure': 'HTML导出失败!'
			},
			'zh-hk': {
				'export': '導出HTML',
				'exportSuccess': 'HTML導出成功!',
				'exportFailure': 'HTML導出失敗!'
			}
		},

		_inited: false,
		init: function() {
			var me = this;
			me._inited = true;
		},

		getPluginPath: function() {
			return Api.evtService.getProjectBasePath() + '/public/plugins/export_html' ;
		},

		htmlTpl: '',
		markdownTpl: '',
		getTpl: function(isMarkdown) {
			var tpl = isMarkdown ? this.markdownTpl : this.htmlTpl;
			if(tpl) {
				return tpl;
			}
			var basePluginPath = this.getPluginPath();

			var tplName = isMarkdown ? 'markdown' : 'html';
			var tplPath = basePluginPath + '/tpl/' + tplName + '.tpl';
			tpl = Api.nodeFs.readFileSync(tplPath, 'utf-8');
			isMarkdown ? (this.markdownTpl = tpl) : (this.htmlTpl = tpl);
			return tpl;
		},
		// 生成html或markdown
		render: function(note) {
			var tpl = this.getTpl(note.IsMarkdown);
			var title = note.Title || getMsg('Untitled');
			tpl = tpl.replace(/\{title\}/g, title);
			tpl = tpl.replace(/\{content\}/g, note.Content);
			return tpl;
		},

		replaceAll: function(src, pattern, to) {
			if(!src) {
				return src;
			}
			while(true) {
				var oldSrc = src;
				src = src.replace(pattern, to);
				if(oldSrc === src) {
					return src;
				}
			}
		},

		fixFilename: function(filename) {
			var reg = new RegExp("/|#|\\$|!|\\^|\\*|'| |\"|%|&|\\(|\\)|\\+|\\,|/|:|;|<|>|=|\\?|@|\\||\\\\", 'g');
			filename = filename.replace(reg, "-");
			// 防止出现两个连续的-
			while(filename.indexOf('--') != -1) {
				filename = this.replaceAll(filename, '--', '-');
			}
			return filename;
		},

		// 写图片,并替换图片路径
		writeFiles: function(filesPath, content, callback) {
			var me = this;
			// http://127.0.0.1:8912/api/file/getImage?fileId=5581029f6289dc3301000000
			// 找到图片
			var reg = new RegExp(Api.evtService.localUrl + '/api/file/getImage\\?fileId=([0-9a-zA-Z]{24})', 'g');
			// console.log(Api.evtService.localUrl + '/api/file/getImage\\?fileId=([0-9a-zA-Z]{24})');
			var matches = content.match(reg);
			// content = content.replace(reg, Evt.leanoteUrl + '/api/file/getImage');

			if(matches && matches.length) {
				Api.nodeFs.mkdirSync(filesPath);
				// 取最后一个名字
				var pathInfo = Api.commonService.splitFile(filesPath);
				var dirName = pathInfo.name;

				async.eachSeries(matches, function(url, cb) {
					var fileId = url.substr(url.length - 24);
					Api.fileService.getImageLocalPath(fileId, function(err, imagePath) {
						// 将图片copy到filesPath下
						if(imagePath) {
							var distFileName = fileId + '.png';
							Api.commonService.copyFile(imagePath, filesPath + '/' + distFileName, function(ok) {
								content = me.replaceAll(content, url, dirName + '/' + distFileName);
								cb();
							});
						}
						else {
							cb();
						}
					});
				}, function() {
					callback(content);
				});

				return;
			}
			callback(content);
		},

		// 得到存放images, js, css的路径
		getFilesPath: function(basePath, nameNotExt, n, cb) {
			var me = this;
			var absPath = basePath + '/' + nameNotExt + '_files';
			if (n > 1) {
				absPath += '-' + n;
			}
			Api.nodeFs.exists(absPath, function(exists) {
				if(!exists) {
					cb(absPath);
				}
				else {
					me.getFilesPath(basePath, nameNotExt, n+1, cb);
				}
			});
		},

		// 得到可用的文件名, 避免冲突
		getHtmlFilePath: function(pathInfo, n, cb) {
			var me = this;
			if(n > 1) {
				pathInfo.nameNotExt = pathInfo.nameNotExtRaw + '-' + n; 
			}
			var absPath = pathInfo.getFullPath();
			// 总是覆盖
			return cb(absPath);

			// Api.nodeFs.existsSync(absPath) 总是返回false, 不知道什么原因
			// 在控制台上是可以的
			Api.nodeFs.exists(absPath, function(exists) {
				if(!exists) {
					cb(absPath);
				}
				else {
					me.getHtmlFilePath(pathInfo, n+1, cb);
				}
			});
		},

		exportHTML: function(note) {
			var me = this;
			if(!note) {
				return;
			}

			var name = note.Title ? note.Title + '.html' : getMsg('Untitled') + '.html';
			name = me.fixFilename(name);

			Api.gui.dialog.showSaveDialog(Api.gui.getCurrentWindow(), {title: name, defaultPath: name}, function(targetPath) {
				if(targetPath) {
					// 将路径和名字区分开
					var pathInfo = Api.commonService.splitFile(targetPath);
					pathInfo.nameNotExt = me.fixFilename(pathInfo.nameNotExt); // 重新修正一次
					var nameNotExt = pathInfo.nameNotExt;
					pathInfo.nameNotExtRaw = pathInfo.nameNotExt;
					// 得到可用文件的绝对路径
					me.getHtmlFilePath(pathInfo, 1, function(absHtmlFilePath) {
						me.getFilesPath(pathInfo.path, pathInfo.nameNotExt, 1, function(absFilesPath) {
							// alert(absHtmlFilePath + ' --- ' + absFilesPath);
							var html = me.render(note);
							// 写图片
							me.writeFiles(absFilesPath, html, function(html) {
								// 把文件写到
								Api.commonService.writeFile(absHtmlFilePath, html);
								Notify.show({title: 'Info', body: getMsg('plugin.export_html.exportSuccess')});
							});
						});
					});
				}
			});
		},

		// 打开前要执行的
		onOpen: function() {
			var me = this;
			var gui = Api.gui;

		    var menu = {
		        label: Api.getMsg('plugin.export_html.export'),
		        click: (function() {
		        	return function(note) {
		        		me.exportHTML(note);
		        	}
		        })()
		    };
		    Api.addExportMenu(menu);
		},
		// 打开后
		onOpenAfter: function() {
		},
		// 关闭时需要运行的
		onClose: function() {
		}
	};

	return exportHTML;

});
