/**
 * plugin.js
 *
 * Copyright, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://www.tinymce.com/license
 * Contributing: http://www.tinymce.com/contributing
 */

/*global tinymce:true */

tinymce.PluginManager.add('image', function(editor, url) {
	// 弹框
	function showDialog() {
		insertLocalImage();
	}
	// 添加按钮
	editor.addButton('image', {
		icon: 'image',
		tooltip: 'Insert image',
		onclick: showDialog,
		stateSelector: 'img:not([data-mce-object])'
	});
});