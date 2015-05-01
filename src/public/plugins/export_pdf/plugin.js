/**
 * 导出插件
 */
define(function() {
	var exportPdf = {
		langs: {
			'en-us': {
				'export': 'Export PDF',
				'exportSuccess': 'PDF saved successful!',
				'exportFailure': 'PDF saved failure!',
				'notExists': 'Please sync your note to ther server firslty.'
			},
			'zh-cn': {
				'export': '导出PDF',
				'exportSuccess': 'PDF导出成功!',
				'exportFailure': 'PDF导出失败!',
				'notExists': '请先同步该笔记!'
			},
			'zh-hk': {
				'export': '導出PDF',
				'exportSuccess': 'PDF導出成功!',
				'exportFailure': 'PDF導出失敗!',
				'notExists': '請先同步該筆記!'
			}
		},

		_inited: false,
		_input: null,

		init: function() {
			var me = this;

			me._input = $('<input id="exportPdf" type="file" nwsaveas="" style=""/>');
			$('#hiddenZone').append(me._input);
			// 下载pdf输入框
			me._input.change(function() {
				
			});

			me._inited = true;
		},

		exportPDF: function(note) {
			var me = this;
			if(!note) {
				return;
			}

			var name = note.Title ? note.Title + '.pdf' : getMsg('Untitled') + '.pdf';

			window.downloadPdfPath = false;
			if(!me._inited) {
				me.init();
			}

			Api.loading.show();

			// 保存
		    Api.noteService.exportPdf(note.NoteId, function(curPath, filename, msg) {
		    	Api.loading.hide();

		    	setTimeout(function() {
			    	if(curPath) {
			    		me.downloadPdfPath = curPath;

			    		Api.gui.dialog.showSaveDialog(Api.gui.getCurrentWindow(), {title: name, defaultPath: name}, function(targetPath) {
    						if(targetPath && me.downloadPdfPath) {
    							Api.fileService.download(me.downloadPdfPath, targetPath, function(ok, msg) {
									if(ok) {
										new window.Notification(getMsg('Info'), {
									        body: getMsg('plugin.export_pdf.exportSuccess')
									    });
									} else {
										new window.Notification(getMsg('Warning'), {
									        body: getMsg('plugin.export_pdf.exportFailure')
									    });
									}
								});
    						}
    					});

			    	} else {
			    		var m = "";
			    		if(msg == "noteNotExists") {
			    			m = getMsg('plugin.export_pdf.notExists');
			    		}

			    		// alert会死?
			    		// alert('File not exists');
			    		// https://github.com/nwjs/nw.js/wiki/Notification
			    		var notification = new window.Notification(getMsg('Warning'), {
					        body: getMsg('plugin.export_pdf.exportFailure') + m
					        // icon: appIcon
					    });
			    	}
		    	}, 100);
		    });
		},

		// 打开前要执行的
		onOpen: function() {
			var me = this;
			var gui = Api.gui;

		    var menu = {
		        label: Api.getMsg('plugin.export_pdf.export'),
		        click: (function() {
		        	return function(note) {
		        		me.exportPDF(note);
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

	return exportPdf;

});
