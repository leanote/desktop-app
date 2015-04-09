/**
 * 导入evernote, 重构
 * @author life@leanote.com
 * @date 2015/04/09
 */
define(function() {
	var importService = nodeRequire('./public/plugins/import_evernote/import');

	var evernote = {

		langs: {
			'en-us': {
				'importEvernote': 'Import Evernote',
			},
			'zh-cn': {
				'importEvernote': '导入Evernote',
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
	              <h4 class="modal-title" class="modalTitle">Import to <span id="importDialogNotebook"></span></h4>
	          </div>
	          <div class="modal-body" id="">
	            <div role="tabpanel">

	              <!-- Nav tabs -->
	              <ul class="nav nav-tabs" role="tablist">
	                <li role="presentation" class="active"><a href="#evernoteTab" aria-controls="evernoteTab" role="tab" data-toggle="tab">Evernote</a></li>
	                <!--
	                <li role="presentation"><a href="#youdaoTab" aria-controls="youdaoTab" role="tab" data-toggle="tab">YouDao</a></li>
	                -->
	              </ul>

	              <!-- Tab panes -->
	              <div class="tab-content">
	                <div role="tabpanel" class="tab-pane active" id="evernoteTab">
	                    <!-- import -->
	                    <a id="chooseEvernoteFile" class="btn btn-success btn-choose-file">
	                      <i class="fa fa-upload"></i>
	                      <span>Choose Evernote files(.enex)</span>
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
	            <button type="button" class="btn btn-default upgrade-cancel-btn" data-dismiss="modal">Close</button>
	          </div>
	          </div><!-- /.modal-content -->
	        </div><!-- /.modal-dialog -->
	    </div><!-- /.modal -->
		`,
		_importDialog: null,
		_curNotebook: null,
		_inited: false,

		init: function() {
			var me = this;
			me._inited = true;

			$('body').append(me._tpl);

			me._importDialog = $("#importEvernoteDialog");

			$('#chooseEvernoteFile').click(function() {
				$('#importEvernoteInput').click();
			});

			var evernoteMsg = $('#')
			$('#importEvernoteInput').change(function() {
				var paths = $(this).val();

				var notebookId = me._curNotebook.NotebookId;

				var n = 0;

				me.clear();

				importService.importFromEvernote(notebookId, paths,
					// 全局
					function(ok) {
						// $('#importEvernoteMsg .curImportFile').html("");
						// $('#importEvernoteMsg .curImportNote').html("");
						setTimeout(function() {
							$('#importEvernoteMsg .allImport').html('Done! ' + n + ' notes imported!');
						}, 500);
					},
					// 单个文件
					function(ok, filename) {
						if(ok) {
							$('#importEvernoteMsg .curImportFile').html("Import file: " + filename + " Success!");
						} else {
							$('#importEvernoteMsg .curImportFile').html("Import file: " + filename + " Failure, is evernote file ?");
						}
					},
					// 单个笔记
					function(note) {
						if(note) {
							n++;
							$('#importEvernoteMsg .curImportNote').html("Import: " + note.Title + " Success!");

							// 插入到当前笔记中
							Note.addSync([note]);
						}
					}
				);

				$(this).val("");
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
