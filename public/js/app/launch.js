/**
 * 入口, 转发
 */

// 服务器开启
ServerService.start();

var gui = require('nw.gui');
// 窗口大小设置
var win = gui.Window.get();

function to(width, height) {
	win.resizeTo(width, height);
	win.setPosition('center');
}

function ani(callback) {
	var baseWidth = 400;
	var baseHeight = 300;
	var toWidth = 1100;
	var toHeight = 600;
	var t = 100;
	for(var i = 0; i < t; i++) {
		(function(i) {
			setTimeout(function() {
				to(baseWidth + (toWidth - baseWidth) * i / t, baseHeight + (toHeight - baseHeight) * i / t);
				if(i == t - 1) {
					callback && callback();
				}
			}, i);
		})(i);
	}
}

// 判断是否登录	
UserService.init(function(userInfo) {
	if(userInfo) {
		UserInfo = userInfo;
		// ani(function() {
			location.href = 'note.html';
		// });
	} else {
		location.href = 'login.html';
	}
});