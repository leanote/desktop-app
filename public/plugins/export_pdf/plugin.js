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
				'notExists': 'Please sync your note to ther server firslty.',
				'localUser': 'Not support for local user'
			},
			'zh-cn': {
				'export': '导出PDF',
				'exportSuccess': 'PDF导出成功!',
				'exportFailure': 'PDF导出失败!',
				'notExists': '请先同步该笔记!',
				'localUser': '本地用户不支持导出PDF'
			},
			'zh-hk': {
				'export': '導出PDF',
				'exportSuccess': 'PDF導出成功!',
				'exportFailure': 'PDF導出失敗!',
				'notExists': '請先同步該筆記!',
				'localUser': '本地用戶不支持導出PDF'
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

			var closed = false;
			var interval;
			Api.loading.show('', {hasProgress: true, onClose: function () {
				closed = true;
				clearInterval(interval);
			}});
			Api.loading.setProgress(1);
			var progress = 1;
			interval = setInterval(function () {
				progress += 5;
				if (progress > 90) {
					progress = 90;
				}
				Api.loading.setProgress(progress);
			}, 500);

			// 保存
		    Api.noteService.exportPdf(note.NoteId, function(curPath, filename, msg) {
		    	clearInterval(interval);
		    	if (closed) {
		    		return;
		    	}
				Api.loading.setProgress(99);
		    	Api.loading.hide();

		    	setTimeout(function() {
			    	if(curPath) {
			    		me.downloadPdfPath = curPath;

			    		Api.gui.dialog.showSaveDialog(Api.gui.getCurrentWindow(), {title: name, defaultPath: name}, function(targetPath) {
    						if(targetPath && me.downloadPdfPath) {
    							Api.fileService.download(me.downloadPdfPath, targetPath, function(ok, msg) {
									if(ok) {
									    Notify.show({title: 'Info', body: getMsg('plugin.export_pdf.exportSuccess')});
									} else {
									    Notify.show({type: 'warning', title: 'Warning', body: getMsg('plugin.export_pdf.exportFailure')});
									}
								});
    						}
    					});

			    	} else {
			    		var m = "";
			    		if(msg == "noteNotExists") {
			    			m = getMsg('plugin.export_pdf.notExists');
			    		}

					    Notify.show({type: 'warning', title: 'Warning', body: getMsg('plugin.export_pdf.exportFailure') + m});
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
		        enabled: function(noteIds) {
		        	if(UserInfo.IsLocal) {
		        		return false;
		        	}
		        	if (noteIds && noteIds.length == 1) {
		        		return true;
		        	}
		        	return false;
		        },
		        click: (function() {
		        	return function(noteIds) {
		        		if (UserInfo.IsLocal) {
		        			Notify.show({type: 'warning', title: 'Warning', body: getMsg('plugin.export_pdf.localUser')});
		        			return;
		        		}
		        		if (!noteIds || noteIds.length > 1) {
		        			return;
		        		}
		        		Api.noteService.getNote(noteIds[0], function(note) {
			        		me.exportPDF(note);
		        		});
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
