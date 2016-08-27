/**
 * 导出PDF插件
 * @author  life life@leanote.com
 * 选择目录, 将图片保存到文件夹中, 有个html文件(以笔记名命名)
 * 注意, fs.existsSync总返回false, readFileSync可用
 */
define(function() {
	var async; // = require('async');

	var exportPDF = {
		langs: {
			'en-us': {
				'export': 'Export PDF',
				'Exporting': 'Exporting',
				'Exporting: ': 'Exporting: ',
				'exportSuccess': 'PDF saved successful!',
				'exportFailure': 'PDF saved failure!',
			},
			'de-de': {
				'export': 'Als PDF exportieren',
				'Exporting': 'Exportiere',
				'Exporting: ': 'Exportiere: ',
				'exportSuccess': 'PDF erfolgreich gespeichert!',
				'exportFailure': 'PDF speichern fehlgeschlagen!',
			},
			'zh-cn': {
				'export': '导出PDF',
				'Exporting': '正在导出',
				'Exporting: ': '正在导出: ',
				'exportSuccess': 'PDF导出成功!',
				'exportFailure': 'PDF导出失败!'
			},
			'zh-hk': {
				'export': '導出PDF',
				'Exporting': '正在導出',
				'Exporting: ': '正在導出: ',
				'exportSuccess': 'PDF導出成功!',
				'exportFailure': 'PDF導出失敗!'
			}
		},

		_inited: false,
		init: function() {
			var me = this;
			if (me._inited) {
				return;
			}
			async = require('async');
			me._inited = true;
			me._initExportPdf();
		},

		// 调用main导出pdf
		_exportPdfSeq: 1,
		_exportPdfCallback: {},
		_initExportPdf: function () {
			var me = this;
			// console.log('_initExportPdf');
			Api.ipc.on('export-pdf-ret', function(event, arg) {
				var seq = arg.seq;
				// console.log('export-pdf-ret');
				// console.log(arg);
				// console.log(me._exportPdfCallback[seq]);
				if (me._exportPdfCallback[seq]) {
					me._exportPdfCallback[seq](arg);
				}
			});
		},
	    exportPdf: function (htmlPath, targetPdfPath, isMarkdown, callback) {
	    	this._exportPdfSeq++;
	    	this._exportPdfCallback[this._exportPdfSeq] = callback;
	    	Api.ipc.send('export-pdf',
	    		{htmlPath: htmlPath, targetPdfPath: targetPdfPath, isMarkdown: isMarkdown, seq: this._exportPdfSeq});
	    },

		getPluginPath: function() {
			return Api.evtService.getProjectBasePath() + '/public/plugins/export_pdf' ;
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
			tpl = tpl.replace("{content}", function () {
				return note.Content; // 为什么要这样? 因为 $$ 替换后变成了一个!!
			});
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
			if (filename.length > 1) {
				// 最后一个-
				filename = filename.replace(/\-$/, '');
			}
			return filename;
		},

		// 得到可用的文件名, 避免冲突
		getPdfFilePath: function(pathInfo, n, cb) {
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
					me.getPdfFilePath(pathInfo, n+1, cb);
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

		exportPDFForNotebook: function (notebookId) {
			var me = this;
			if (!notebookId) {
				return;
			}
			me.getTargetPath(function(targetPath) {
				if (!targetPath) {
					return;
				}

				me.loadingIsClosed = false;
				Api.loading.show(Api.getMsg('plugin.export_pdf.Exporting'), 
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
						me._exportPDF(note, targetPath, function() {
							cb();
		        		}, i, total);
					}, function() {
						me.hideLoading();
						Notify.show({title: 'Info', body: getMsg('plugin.export_pdf.exportSuccess')});
					});
				});
			});
		},

		hideLoading: function () {
			setTimeout(function () {
				Api.loading.hide();
			}, 1000);
		},

		exportPDF: function (noteIds) {
			var me = this;
			if (!noteIds || noteIds.length == 0) {
				return;
			}
			me.getTargetPath(function(targetPath) {
				if (!targetPath) {
					return;
				}

				me.loadingIsClosed = false;
				Api.loading.show(Api.getMsg('plugin.export_pdf.Exporting'), 
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

		        		me._exportPDF(note, targetPath, function(ok) {
		        			cb();
		        		}, i, total);
	        		});

				}, function () {
					me.hideLoading();
					Notify.show({title: 'Info', body: getMsg('plugin.export_pdf.exportSuccess')});
				});
			});
		},

		_exportPDF: function(note, path, callback, i, total) {
			var me = this;
			setTimeout(function () {
				me._exportPDF(note, path, callback, i, total);
			}, 1000);
		},

		_exportPDF: function(note, path, callback, i, total) {
			var me = this;
			if(!note) {
				return;
			}

			if (me.loadingIsClosed) {
				callback();
				return;
			}

			setTimeout(function () {
				Api.loading.setMsg(Api.getMsg('plugin.export_pdf.Exporting: ') + (note.Title || getMsg('Untitled')));
				Api.loading.setProgressRate(i + '/' + total);
			}, 100);

			var name = note.Title ? note.Title + '.pdf' : getMsg('Untitled') + '.pdf';
			name = me.fixFilename(name);

			var targetPath = path + Api.commonService.getPathSep() + name;

			// 将路径和名字区分开
			var pathInfo = Api.commonService.splitFile(targetPath);
			pathInfo.nameNotExt = me.fixFilename(pathInfo.nameNotExt); // 重新修正一次
			var nameNotExt = pathInfo.nameNotExt;
			pathInfo.nameNotExtRaw = pathInfo.nameNotExt;

			// 得到可用文件的绝对路径
			me.getPdfFilePath(pathInfo, 1, function(absPdfFilePath) {
				// 得到存放assets的目录
				var html = me.render(note);
				var tempPath = Api.gui.app.getPath('temp');
				var last = tempPath[tempPath.length-1];
				if ( last == '/' || last == '\\') {
					tempPath = tempPath.substr(0, tempPath.length - 1);
				}
				var targetHtmlPath = tempPath + '/' + (new Date().getTime()) + '.html';

				// 把html文件写到tmp目录
				Api.commonService.writeFile(targetHtmlPath, html);
				me.exportPdf(targetHtmlPath, absPdfFilePath, note.IsMarkdown, function (args) {
					// console.log('export pdf ret');
					callback(args.ok);
				});
			});
		},

		// 打开前要执行的
		onOpen: function() {
			var me = this;
			var gui = Api.gui;

		    var menu = {
		        label: Api.getMsg('plugin.export_pdf.export'),
		        enabled: function(noteIds) {
		        	return true;
		        },
		        click: (function() {
		        	return function(noteIds) {
		        		me.init();
		        		me.exportPDF(noteIds);
		        	}
		        })()
		    };
		    Api.addExportMenu(menu);

		    Api.addExportMenuForNotebook({
		        label: Api.getMsg('plugin.export_pdf.export'),
		        enabled: function(notebookId) {
		        	return true;
		        },
		        click: (function() {
		        	return function(notebookId) {
		        		me.init();
		        		me.exportPDFForNotebook(notebookId);
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

	return exportPDF;

});
