Import = {
	importDialog: $("#importDialog"),
	// 初始化
	curNotebook: null,
	init: function() {
		var me = this;

		$('#chooseEvernoteFile').click(function() {
			$('#importEvernoteInput').click();
		});

		var evernoteMsg = $('#')
		$('#importEvernoteInput').change(function() {
			var paths = $(this).val();

			var notebookId = me.curNotebook.NotebookId;

			var n = 0;

			me.clear();

			ImportService.importFromEvernote(notebookId, paths,
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
		me.clear();

		$('#importDialogNotebook').html(notebook.Title);

		me.curNotebook = notebook;
		var notebookId = notebook.NotebookId;
		me.importDialog.modal('show');
	},

};

$(function() {
	Import.init();
});