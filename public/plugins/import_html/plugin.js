/**
 * 导入html, 重构
 * @author life@leanote.com
 * @date 2015/04/09
 */
define(function() {
	var importService; //  = nodeRequire('./public/plugins/import_html/import');

	var html = {

		langs: {
			'en-us': {
				'importHTML': 'Import HTML',
			},
			'de-de': {
				'importHTML': 'HTML Datei importieren',
				'Choose HTML files(.html)': 'HTML Dateien (.html) auswählen',
				'Close': "Schliessen",
				'Import to': "Importiere in Notizbuch",
				"Done! %s notes imported!": "Abgeschlossen! Es wurden %s Notizen importiert!",
				"Import file: %s Success!": "Datei importieren: %s erfolgreich!",
				"Import file: %s Failure, is html file ?": "Datei importieren: %s fehlgeschlagen! Ist das eine HTML Datei?",
				"Import: %s Success!": "Import: %s erfolgreich!"
			},
			'zh-cn': {
				'importHTML': '导入HTML/为知笔记',
				'Choose HTML files(.html)': '选择HTML文件(.html)',
				'Close': "关闭",
				'Import to': "导入至",
				"Done! %s notes imported!": "完成, 成功导入 %s 个笔记!",
				"Import file: %s Success!": "文件 %s 导入成功!",
				"Import file: %s Failure, is html file ?": "文件 %s 导入失败! 是HTML文件?",
				"Import: %s Success!": "导入笔记: %s 成功!"
			},
			'zh-hk': {
				'importHTML': '導入HTML',
				'Choose HTML files(.html)': '選擇HTML文件(.html)',
				'Close': "關閉",
				"Import to": "導入至",
				"Done! %s notes imported!": "完成, 成功導入 %s 個筆記!",
				"Import file: %s Success!": "文件 %s 導入成功!",
				"Import file: %s Failure, is html file ?": "文件 %s 導入失敗! 是HTML文件?",
				"Import: %s Success!": "導入筆記: %s 成功!"
			}
		},

		_tpl: `
		<style>
		#importHTMLDialog .tab-pane {
		  text-align: center;
		  padding: 10px;
		  padding-top: 20px;
		}
		#importHTMLDialog .alert {
		  margin-top: 10px;
		  padding: 0;
		  border: none;
		}
		</style>
	    <div class="modal fade bs-modal-sm" id="importHTMLDialog" tabindex="-1" role="dialog" aria-labelledby="mySmallModalLabel">
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
	                <div role="tabpanel" class="tab-pane active" id="htmlTab">
	                    <!-- import -->
	                    <a id="chooseHTMLFile" class="btn btn-success btn-choose-file">
	                      <i class="fa fa-upload"></i>
	                      <span class="lang">Choose HTML files(.html)</span>
	                    </a>
	                    <!-- 消息 -->
	                    <div id="importHTMLMsg" class="alert alert-info">
	                        <div class="curImportFile"></div>
	                        <div class="curImportNote"></div>
	                        <div class="allImport"></div>
	                    </div>
	                </div>
	                <div role="tabpanel" class="tab-pane" id="youdaoTab">
	                	<!-- 文件选择框 -->
				        <input id="importHTMLInput" type="file" nwsaveas="" accept=".html" multiple style="" style="display: none"/>
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
			return Api.getMsg(txt, 'plugin.import_html', data)
		},

		init: function() {
			var me = this;
			me._inited = true;
			$('body').append(me._tpl);
			me._importDialog = $("#importHTMLDialog");

			me._importDialog.find('.lang').each(function() {
				var txt = $.trim($(this).text());
				$(this).text(me.getMsg(txt));
			});

			// 导入, 选择文件
			$('#chooseHTMLFile').click(function() {

				Api.gui.dialog.showOpenDialog(Api.gui.getCurrentWindow(), 
					{
						properties: ['openFile', 'multiSelections'],
						filters: [
							{ name: 'HTML', extensions: ['html'] }
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
							importService = nodeRequire('./public/plugins/import_html/import');
						}

						importService.importFromHTML(notebookId, paths,
							// 全局
							function(ok) {
								// $('#importHTMLMsg .curImportFile').html("");
								// $('#importHTMLMsg .curImportNote').html("");
								setTimeout(function() {
									$('#importHTMLMsg .allImport').html(me.getMsg('Done! %s notes imported!', n));
								}, 500);
							},
							// 单个文件
							function(ok, filename) {
								if(ok) {
									$('#importHTMLMsg .curImportFile').html(me.getMsg("Import file: %s Success!", filename));
								} else {
									$('#importHTMLMsg .curImportFile').html(me.getMsg("Import file: %s Failure, is html file ?", filename));
								}
							},
							// 单个笔记
							function(note) {
								if(note) {
									n++;
									$('#importHTMLMsg .curImportNote').html(me.getMsg("Import: %s Success!", note.Title));

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
			$('#importHTMLMsg .curImportFile').html("");
			$('#importHTMLMsg .curImportNote').html("");
			$('#importHTMLMsg .allImport').html('');
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
		        label: Api.getMsg('plugin.import_html.importHTML'),
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

	return html;
});
