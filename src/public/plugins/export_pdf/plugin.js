/**
 * 导出插件
 */
define(function() {
	var exportPdf = {
		langs: {
			'en-us': {
				'export': 'Export PDF',
			},
			'zh-cn': {
				'export': '导出PDF',
			},
			'zh-hk': {
				'export': '導出PDF',
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
				var name = $(this).val();
				$(this).val(''); // 为防止重名不触发
				console.log(me.downloadPdfPath);
				if(me.downloadPdfPath) {
					Api.fileService.download(me.downloadPdfPath, name, function(ok, msg) {
						// console.log(ok + ' -=-');
						if(ok) {
							new window.Notification('Info', {
						        body: 'PDF saved successful!'
						    });
						} else {
							new window.Notification('Warning', {
						        body: msg || 'PDF saved failure!'
						    });
						}
					});
				}
			});

			me._inited = true;
		},

		exportPDF: function(note) {
			var me = this;
			if(!note) {
				return;
			}

			var name = note.Title ? note.Title + '.pdf' : 'Untitled.pdf';

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
			    		me._input.attr('nwsaveas', name);
			    		me._input.click();
			    	} else {
			    		var m = "";
			    		if(msg == "noteNotExists") {
			    			m = "Please sync your note to ther server firslty."
			    		}

			    		// alert会死?
			    		// alert('File not exists');
			    		// https://github.com/nwjs/nw.js/wiki/Notification
			    		var notification = new window.Notification('Warning', {
					        body: 'Export PDF error! ' + m
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
