/**
 * 导入evernote, 重构
 * @author life@leanote.com
 * @date 2015/04/09
 */
define(function() {
	var importService; //  = nodeRequire('./public/plugins/import_evernote/import');

	var evernote = {

		langs: {
			'en-us': {
				'importEvernote': 'Import Evernote',
			},
			'de-de': {
				'importEvernote': 'Evernote Datei importieren',
				'Choose Evernote files(.enex)': 'Evernote Dateien (.enex) auswählen',
				'Close': "Schliessen",
				'Import to': "Importiere in Notizbuch",
				"Done! %s notes imported!": "Abgeschlossen! Es wurden %s Notizen importiert!",
				"Import file: %s Success!": "Datei importieren: %s erfolgreich!",
				"Import file: %s Failure, is evernote file ?": "Datei importieren: %s fehlgeschlagen! Ist das eine Evernote Datei?",
				"Import: %s Success!": "Import: %s erfolgreich!"
			},
			'zh-cn': {
				'importEvernote': '导入Evernote',
				'Choose Evernote files(.enex)': '选择Evernote文件(.enex)',
				'Close': "关闭",
				'Import to': "导入至",
				"Done! %s notes imported!": "完成, 成功导入 %s 个笔记!",
				"Import file: %s Success!": "文件 %s 导入成功!",
				"Import file: %s Failure, is evernote file ?": "文件 %s 导入失败! 是Evernote文件?",
				"Import: %s Success!": "导入笔记: %s 成功!"
			},
			'zh-hk': {
				'importEvernote': '導入Evernote',
				'Choose Evernote files(.enex)': '選擇Evernote文件(.enex)',
				'Close': "關閉",
				"Import to": "導入至",
				"Done! %s notes imported!": "完成, 成功導入 %s 個筆記!",
				"Import file: %s Success!": "文件 %s 導入成功!",
				"Import file: %s Failure, is evernote file ?": "文件 %s 導入失敗! 是Evernote文件?",
				"Import: %s Success!": "導入筆記: %s 成功!"
			}
		},

		_tpl: `
		<style>
		#importEvernoteDialog .tab-pane {
		  text-align: center;
		  padding: 10px;
		  padding-top: 20px;
		}
		#importEvernoteDialog .alert {
		  margin-top: 10px;
		  padding: 0;
		  border: none;
		}
		</style>
	    <div class="modal fade bs-modal-sm" id="importEvernoteDialog" tabindex="-1" role="dialog" aria-labelledby="mySmallModalLabel">
	        <div class="modal-dialog modal-sm">
	          <div class="modal-content">
	          <div class="modal-header">
	              <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
	              <h4 class="modal-title" class="modalTitle"><span class="lang">Import to</span> <span id="importDialogNotebook"></span></h4>
	          </div>
	          <div class="modal-body" id="">
	            <div role="tabpanel">

	              <!-- Tab panes -->
	              <div class="tab-content">
	                <div role="tabpanel" class="tab-pane active" id="evernoteTab">
	                    <!-- import -->
	                    <a id="chooseEvernoteFile" class="btn btn-success btn-choose-file">
	                      <i class="fa fa-upload"></i>
	                      <span class="lang">Choose Evernote files(.enex)</span>
	                    </a>
	                    <!-- 消息 -->
	                    <div id="importEvernoteMsg" class="alert alert-info">
	                        <div class="curImportFile"></div>
	                        <div class="curImportNote"></div>
	                        <div class="allImport"></div>
	                    </div>
	                </div>
	                <div role="tabpanel" class="tab-pane" id="youdaoTab">
	                	<!-- 文件选择框 -->
				        <input id="importEvernoteInput" type="file" nwsaveas="" accept=".enex" multiple style="" style="display: none"/>
	                </div>
	              </div>

	            </div>
	          </div>
	          <div class="modal-footer ">
	            <button type="button" class="btn btn-default upgrade-cancel-btn lang" data-dismiss="modal">Close</button>
	          </div>
	          </div><!-- /.modal-content -->
	        </div><!-- /.modal-dialog -->
	    </div><!-- /.modal -->
		`,
		_importDialog: null,
		_curNotebook: null,
		_inited: false,

		getMsg: function(txt, data) {
			return Api.getMsg(txt, 'plugin.import_evernote', data)
		},

		init: function() {
			var me = this;
			me._inited = true;
			$('body').append(me._tpl);
			me._importDialog = $("#importEvernoteDialog");

			me._importDialog.find('.lang').each(function() {
				var txt = $.trim($(this).text());
				$(this).text(me.getMsg(txt));
			});

			// 导入, 选择文件
			$('#chooseEvernoteFile').click(function() {

				Api.gui.dialog.showOpenDialog(Api.gui.getCurrentWindow(), 
					{
						properties: ['openFile', 'multiSelections'],
						filters: [
							{ name: 'Evernote', extensions: ['enex'] }
						]
					},
					function(paths) {
						if(!paths) {
							return;
						}

						var notebookId = me._curNotebook.NotebookId;

						var n = 0;

						me.clear();
						if (!importService) {
							importService = nodeRequire('./public/plugins/import_evernote/import');
						}

						importService.importFromEvernote(notebookId, paths,
							// 全局
							function(ok) {
								// $('#importEvernoteMsg .curImportFile').html("");
								// $('#importEvernoteMsg .curImportNote').html("");
								setTimeout(function() {
									$('#importEvernoteMsg .allImport').html(me.getMsg('Done! %s notes imported!', n));
								}, 500);
							},
							// 单个文件
							function(ok, filename) {
								if(ok) {
									$('#importEvernoteMsg .curImportFile').html(me.getMsg("Import file: %s Success!", filename));
								} else {
									$('#importEvernoteMsg .curImportFile').html(me.getMsg("Import file: %s Failure, is evernote file ?", filename));
								}
							},
							// 单个笔记
							function(note) {
								if(note) {
									n++;
									$('#importEvernoteMsg .curImportNote').html(me.getMsg("Import: %s Success!", note.Title));

									// 不要是新的, 不然切换笔记时又会保存一次
									note.IsNew = false;
									// 插入到当前笔记中
									Note.addSync([note]);
								}
							}
						);
					}
				);

			});
		},

		clear: function() {
			$('#importEvernoteMsg .curImportFile').html("");
			$('#importEvernoteMsg .curImportNote').html("");
			$('#importEvernoteMsg .allImport').html('');
		},

		open: function(notebook) {
			var me = this;
			if(!notebook) {
				return;
			}
			if(!me._inited) {
				me.init();
			}
			me.clear();

			$('#importDialogNotebook').html(notebook.Title);

			me._curNotebook = notebook;
			var notebookId = notebook.NotebookId;
			me._importDialog.modal('show');
		},
		
		// 打开前要执行的
		onOpen: function() {
			var me = this;
			var gui = Api.gui;

			Api.addImportMenu({
		        label: Api.getMsg('plugin.import_evernote.importEvernote'),
		        click: (function() {
		        	return function(notebook) {
		        		me.open(notebook);
			        };
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

	return evernote;
});
