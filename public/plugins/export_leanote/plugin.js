/**
 * 导出Leanote插件
 * @author  life life@leanote.com
 * 导出的格式为json, 后缀名为 .leanote

 {
	exportDate: '2015-10-12 12:00:00',
	app: 'leanote.desktop.app.mac',
	appVersion: '1.0',
	notes: [
		{
			title: 'life',
			content: 'laldfadf', // 图片, 附件链接为 leanote://file/getImage?fileId=xxxx, leanote://file/getAttach?fileId=3232323
			tags: [1,2,3],
			isMarkdown: true,
			author: 'leanote', // 作者, 没用
			createdTime: '2015-10-12 12:00:00',
			updatedTime: '2015-10-12 12:00:00',
			files: [
				{fileId: '', base64: '', md5: '', type: 'png', 'isAttach': false, createdTime: '2031-12-31 12:12:32'}
				{fileId: '', base64: '', md5: '', type: 'png', 'isAttach': false, createdTime: '2031-12-31 12:12:32'}
			]
		}
	]
 }

 * 
 */
define(function() {
	var async; //  = require('async');
	var resanitize; // = require('resanitize');

	//===========
	// start

	var exportLeanote = {
		langs: {
			'en-us': {
				'export': 'Export Leanote',
				'Exporting': 'Exporting',
				'Exporting: ': 'Exporting: ',
				'exportSuccess': 'Leanote saved successful!',
				'exportFailure': 'Leanote saved failure!',
				'notExists': 'Please sync your note to ther server firslty.'
			},
			'de-de': {
				'export': 'Als Leanote exportieren',
				'Exporting': 'Exportiere',
				'Exporting: ': 'Exportiere: ',
				'exportSuccess': 'Leanote erfolgreich gespeichert!',
				'exportFailure': 'Leanote speichern fehlgeschlagen!',
				'notExists': 'Bitte Notizen zuerst mit dem Server synchronisieren.'
			},
			'zh-cn': {
				'export': '导出Leanote',
				'Exporting': '正在导出',
				'Exporting: ': '正在导出: ',
				'exportSuccess': 'Leanote导出成功!',
				'exportFailure': 'Leanote导出失败!'
			},
			'zh-hk': {
				'export': '導出Leanote',
				'Exporting': '正在導出',
				'Exporting: ': '正在導出: ',
				'exportSuccess': 'Leanote導出成功!',
				'exportFailure': 'Leanote導出失敗!'
			}
		},

		_inited: false,
		init: function() {
			var me = this;
			if (me._inited) {
				return;
			}

			async = require('async');
			resanitize = require('resanitize');

			me._inited = true;
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
			if (filename.length > 1) {
				// 最后一个-
				filename = filename.replace(/\-$/, '');
			}
			return filename;
		},

		fixContent: function (content) {
			// srip unsage attrs
			var unsafeAttrs = ['id', , /on\w+/i, /data-\w+/i, 'clear', 'target'];
		    content = content.replace(/<([^ >]+?) [^>]*?>/g, resanitize.filterTag(resanitize.stripAttrs(unsafeAttrs)));

		    // strip unsafe tags
		    content = resanitize.stripUnsafeTags(content, 
		    	['wbr','style', 'comment', 'plaintext', 'xmp', 'listing',
			  'applet','base','basefont','bgsound','blink','body','button','dir','embed','fieldset','frameset','head',
			  'html','iframe','ilayer','input','isindex','label','layer','legend','link','marquee','menu','meta','noframes',
			  'noscript','object','optgroup','option','param','plaintext','script','select','style','textarea','xml']
			  );
		    return content;
		},

		getLeanoteTime: function(t) {
			// 20151026T033928Z
			// 2015 10 26 T 03 39 28 Z
			// console.log(t);
			if (!t) {
				t = new Date();
			}
			if (typeof t != 'object' || !('getTime' in t)) {
				try {
					t = new Date(t);
				}
				catch(e) {
					t = new Date();
				}
			}
			return t.format("yyyy-MM-dd hh:mm:ss");
		},
		
		render: function(note, callback) {
			var me = this;
			var appVersion = Api.getCurVersion() || {version: 'unknown'};
			var info = {
				exportDate: me.getLeanoteTime(),
				app: 'leanote.desktop.app.' + process.platform,
				appVersion: appVersion.version,
				apiVersion: '0.1',
				notes: []
			}
			me.fixFiles(note, function (content, files) {
				// 非markdown才需要这样, 补全html标签
				if (!note.IsMarkdown) {
					content = $('<div>' + content + '</div>').html();
				}

				var filesArr = [];
				files || (files = {});
				for (var fileId in files) {
					if (files.hasOwnProperty(fileId)) {
						files[fileId].fileId = fileId;
						filesArr.push(files[fileId]);
					}
				}

				var noteInfo = {
					title: note.Title,
					content: !note.IsMarkdown ? me.fixContent(content) : content,
					tags: note.Tags,
					author: Api.userService.email || Api.userService.username || '',
					isMarkdown: note.IsMarkdown,
					createdTime: me.getLeanoteTime(note.CreatedTime),
					updatedTime: me.getLeanoteTime(note.UpdatedTime),
					files: filesArr 
				};
				info.notes.push(noteInfo);
				callback(JSON.stringify(info, null, 2));
				/*
				enml.ENMLOfHTML(content, function(err, ENML) {
					if (err) {
						info.content = content;
					}
					else {
						info.content = ENML;
					}

					if (note.IsMarkdown) {
						info.content = '<pre>' + info.content + '</pre>';
					}

					callback(me.renderTpl(tpl, info, keys));
				});
				*/
			});
		},

		findAllImages: function (note) {
			var content = note.Content;
			var allMatchs = [];

			// markdown下
			// [](http://localhost://fileId=32);
			if (note.IsMarkdown) {
				var reg = new RegExp('!\\[([^\\]]*?)\\]\\(' + Api.evtService.getImageLocalUrlPrefix() + '\\?fileId=([0-9a-zA-Z]{24})\\)', 'g');
				var matches = reg.exec(content);
				while(matches) {
				    var all = matches[0];
				    var title = matches[1]; // img与src之间
				    var fileId = matches[2];
				    allMatchs.push({
				    	fileId: fileId,
				    	title: title,
				    	all: all
				    });
				    // 下一个
				    matches = reg.exec(content);
				}
			}
			else {
				var reg = new RegExp('<img([^>]*?)src=["\']?' + Api.evtService.getImageLocalUrlPrefix() + '\\?fileId=([0-9a-zA-Z]{24})["\']?(.*?)>', 'g');
				var matches = reg.exec(content);
				while(matches) {
				    var all = matches[0];
				    var pre = matches[1]; // img与src之间
				    var fileId = matches[2];
				    var back = matches[3]; // src与>之间
				    allMatchs.push({
				    	fileId: fileId,
				    	pre: pre,
				    	back: back,
				    	all: all
				    });
				    // 下一个
				    matches = reg.exec(content);
				}
			}

			return allMatchs;
		},

		findAllAttachs: function (note) {
			var content = note.Content;

			var allMatchs = [];
			// markdown下
			// ![](http://localhost://fileId=32);
			if (note.IsMarkdown) {
				var reg = new RegExp('\\[([^\\]]*?)\\]\\(' + Api.evtService.getAttachLocalUrlPrefix() + '\\?fileId=([0-9a-zA-Z]{24})\\)', 'g');
				var matches = reg.exec(content);
				while(matches) {
				    var all = matches[0];
				    var title = matches[1]; // img与src之间
				    var fileId = matches[2];
				    allMatchs.push({
				    	fileId: fileId,
				    	title: title,
				    	all: all,
				    	isAttach: true
				    });
				    // 下一个
				    matches = reg.exec(content);
				}
			}
			else {
				var reg = new RegExp('<a([^>]*?)href=["\']?' + Api.evtService.getAttachLocalUrlPrefix() + '\\?fileId=([0-9a-zA-Z]{24})["\']?(.*?)>([^<]*)</a>', 'g');
				var matches = reg.exec(content);

				while(matches) {
				    var all = matches[0];
				    var pre = matches[1]; // a 与href之间
				    var fileId = matches[2];
				    var back = matches[3] // href与>之间
				    var title = matches[4];

				    allMatchs.push({
				    	fileId: fileId,
				    	title: title,
				    	pre: pre,
				    	back: back,
				    	isAttach: true,
				    	all: all
				    });
				    // 下一个
				    matches = reg.exec(content);
				}
			}
			return allMatchs;
		},

		fixFiles: function (note, callback) {
			var me = this;

			var content = note.Content;
			
			var allImages = me.findAllImages(note) || [];
			var allAttachs = me.findAllAttachs(note) || [];

			var allMatchs = allImages.concat(allAttachs);

			if (allMatchs.length == 0) {
				callback(content, []);
				return;
			}

			var files = {}; // fileId => {}

			function replaceContent () {
				for (var i = 0; i < allMatchs.length; ++i) {
					var eachMatch = allMatchs[i];
					var fileInfo = files[eachMatch.fileId];

					var link;
					if (!fileInfo) {
						link = '';
					}
					else {
						if (note.IsMarkdown) {
							var href;
							if (!eachMatch.isAttach) {
								href = 'leanote://file/getImage?fileId=' + eachMatch.fileId;
								link = '![' + eachMatch.title + '](' + href + ')';
							}
							else {
								href = 'leanote://file/getAttach?fileId=' + eachMatch.fileId;
								link = '[' + eachMatch.title + '](' + href + ')';
							}
						}
						else {
							if (!eachMatch.isAttach) {
								var href = 'leanote://file/getImage?fileId=' + eachMatch.fileId;
								link = '<img ' + eachMatch.pre + 'src="' + href + '"' + eachMatch.back + '>';
							}
							else {
								var href = 'leanote://file/getAttach?fileId=' + eachMatch.fileId;
								link = '<a ' + eachMatch.pre + 'href="' + href + '"' + eachMatch.back + '>' + eachMatch.title + '</a>';
							}
						}
					}

					content = content.replace(eachMatch.all, link);
				}
			}

			// 附件
			var attachs = note.Attachs || [];
			for (var i = 0; i < attachs.length; ++i) {
				var attach = attachs[i];
				var base64AndMd5 = Api.fileService.getFileBase64AndMd5(attach.Path);
				if (base64AndMd5) {
					files[attach.FileId] = {
						base64: base64AndMd5.base64,
						md5: base64AndMd5.md5,
						type: attach.Type,
						title: attach.Title,
						createdTime: me.getLeanoteTime(attach.UpdatedTime || attach.CreatedTime),
						isAttach: true
					}
				}
			}

			// 得到图片资源
			var fileIdFixed = {};
			async.eachSeries(allImages, function(eachMatch, cb) {
			    var fileId = eachMatch.fileId;
			    if (fileIdFixed[fileId]) {
			    	cb();
			    	return;
			    }

			    Api.fileService.getImageInfo(fileId, function(err, doc) {
					fileIdFixed[fileId] = true;
					if(doc) {
						var base64AndMd5 = Api.fileService.getFileBase64AndMd5(doc.Path);
						if (base64AndMd5) {
							files[doc.FileId] = {
								base64: base64AndMd5.base64,
								md5: base64AndMd5.md5,
								type: doc.Type,
								title: doc.Title,
								createdTime: me.getLeanoteTime(doc.UpdatedTime || doc.CreatedTime),
							}
						}
						cb();
					}
					else {
						cb();
					}
				});

			}, function () {
				replaceContent();
				callback(content, files);
			});
		},

		//--------------

		// 得到可用的文件名, 避免冲突
		getExportedFilePath: function(pathInfo, n, cb) {
			var me = this;
			if(n > 1) {
				pathInfo.nameNotExt = pathInfo.nameNotExtRaw + '-' + n; 
			}
			var absPath = pathInfo.getFullPath();

			// Api.nodeFs.existsSync(absPath) 总是返回false, 不知道什么原因
			// 在控制台上是可以的
			Api.nodeFs.exists(absPath, function(exists) {
				if(!exists) {
					cb(absPath);
				}
				else {
					me.getExportedFilePath(pathInfo, n+1, cb);
				}
			});
		},

		getTargetPath: function(callback) {
			// showSaveDialog 不支持property选择文件夹
			Api.gui.dialog.showOpenDialog(Api.gui.getCurrentWindow(), 
				{
					defaultPath: Api.gui.app.getPath('userDesktop') + '/',
					properties: ['openDirectory']
				}, 
				function(targetPath) {
					callback(targetPath);
				}
			);
		},

		loadingIsClosed: false,

		exportLeanoteForNotebook: function (notebookId) {
			var me = this;
			if (!notebookId) {
				return;
			}
			me.getTargetPath(function(targetPath) {
				if (!targetPath) {
					return;
				}

				me.loadingIsClosed = false;
				Api.loading.show(Api.getMsg('plugin.export_leanote.Exporting'), 
					{
						hasProgress: true, 
						isLarge: true,
						onClose: function () {
							me.loadingIsClosed = true;
							setTimeout(function() {
								me.hideLoading();
						});
				}});
				Api.loading.setProgress(1);

				Api.noteService.getNotes(notebookId, function(notes) {
					if (!notes) {
						me.hideLoading();
						return;
					}

					var total = notes.length;
					var i = 0;
					async.eachSeries(notes, function(note, cb) {
						if (me.loadingIsClosed) {
							cb();
							me.hideLoading();
							return;
						}
						i++;
						Api.loading.setProgress(100 * i / total);
						me._exportLeanote(note, targetPath, function() {
							cb();
		        		}, i, total);
					}, function() {
						me.hideLoading();
						Notify.show({title: 'Info', body: getMsg('plugin.export_leanote.exportSuccess')});
					});
				});
			});
		},

		hideLoading: function () {
			setTimeout(function () {
				Api.loading.hide();
			}, 1000);
		},

		exportLeanote: function (noteIds) {
			var me = this;
			if (!noteIds || noteIds.length == 0) {
				return;
			}
			me.getTargetPath(function(targetPath) {
				if (!targetPath) {
					return;
				}

				me.loadingIsClosed = false;
				Api.loading.show(Api.getMsg('plugin.export_leanote.Exporting'), 
					{
						hasProgress: true, 
						isLarge: true,
						onClose: function () {
							me.loadingIsClosed = true;
							setTimeout(function() {
								me.hideLoading();
						});
				}});
				Api.loading.setProgress(1);

				var i = 0;
				var total = noteIds.length;

				async.eachSeries(noteIds, function(noteId, cb) {
					if (me.loadingIsClosed) {
						cb();
						return;
					}

					i++;
					Api.loading.setProgress(100 * i / total);
					Api.noteService.getNote(noteId, function(note) {
		        		me._exportLeanote(note, targetPath, function() {
		        			cb();
		        		}, i, total);
	        		});

				}, function () {
					me.hideLoading();
					Notify.show({title: 'Info', body: getMsg('plugin.export_leanote.exportSuccess')});
				});
			});
		},

		_exportLeanote: function(note, path, callback, i, total) {
			var me = this;
			if(!note) {
				return;
			}

			if (me.loadingIsClosed) {
				callback();
				return;
			}

			setTimeout(function () {
				Api.loading.setMsg(Api.getMsg('plugin.export_leanote.Exporting: ') + (note.Title || getMsg('Untitled')));
				Api.loading.setProgressRate(i + '/' + total);
			}, 100);

			var name = note.Title ? note.Title + '.leanote' : getMsg('Untitled') + '.leanote';
			name = me.fixFilename(name);

			var targetPath = path + Api.commonService.getPathSep() + name;

			// 将路径和名字区分开
			var pathInfo = Api.commonService.splitFile(targetPath);
			pathInfo.nameNotExt = me.fixFilename(pathInfo.nameNotExt); // 重新修正一次
			var nameNotExt = pathInfo.nameNotExt;
			pathInfo.nameNotExtRaw = pathInfo.nameNotExt;

			// 得到可用文件的绝对路径
			me.getExportedFilePath(pathInfo, 1, function(absLeanoteFilePath) {
				me.render(note, function (content) {
					Api.commonService.writeFile(absLeanoteFilePath, content);
					callback();
				});
			});
		},

		// 打开前要执行的
		onOpen: function() {
			var me = this;
			var gui = Api.gui;

		    var menu = {
		        label: Api.getMsg('plugin.export_leanote.export'),
		        enabled: function(noteIds) {
		        	return true;
		        },
		        click: (function() {
		        	return function(noteIds) {
		        		me.init();
		        		me.exportLeanote(noteIds);
		        	}
		        })()
		    };
		    Api.addExportMenu(menu);

		    Api.addExportMenuForNotebook({
		        label: Api.getMsg('plugin.export_leanote.export'),
		        enabled: function(notebookId) {
		        	return true;
		        },
		        click: (function() {
		        	return function(notebookId) {
		        		me.init();
		        		me.exportLeanoteForNotebook(notebookId);
		        	}
		        })()
		    });
		},
		// 打开后
		onOpenAfter: function() {
		},
		// 关闭时需要运行的
		onClose: function() {
		}
	};

	return exportLeanote;
});
