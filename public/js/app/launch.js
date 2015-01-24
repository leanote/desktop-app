/**
 * 入口, 转发
 */

// 服务器开启
ServerService.start();

// 判断是否登录	
UserService.init(function(userInfo) {
	if(userInfo) {
		UserInfo = userInfo;
		location.href = 'note.html';
	} else {
		location.href = 'login.html';
	}
});