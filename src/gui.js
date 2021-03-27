const {dialog, Menu, MenuItem, app} = require('@electron/remote')
var remote = require('@electron/remote');
const path = require('path')

// var dialog = require('dialog');
let _lastOpenPath = null
var gui = {
	Menu: Menu,
	MenuItem: MenuItem,
	remote: remote,
	app: app,
	dialog: dialog,

	getSeparatorMenu: function() {
		return new MenuItem({ type: 'separator' });
	},
	win: remote.getCurrentWindow(),
	getCurrentWindow: function() {
		return remote.getCurrentWindow();
	},
	Shell: require('electron').shell,
	on: function(type, callback) {

	}
};

module.exports = gui;