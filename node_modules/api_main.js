var async = require('async');
var Common = require('common');
var needle = require('needle');
var fs = require('fs');
var Evt = require('evt_main');

function log(o) {
	// console.log(o);
}

// timeout 0无限等待, 60,000 1分钟
needle.defaults({
	timeout: 60000
});

// 远程数据服务
var Api = {
	// 检查错误
	checkError: function(error, resp) { 
		var me = this;
	},

	getUrl: function(url, param) {
		var url = Evt.leanoteUrl + '/api/' + url;
		var token = Evt.getToken();
		param = param || {};
		param.token = token;
		if(param) {
			var paramStr = '';
			for(var i in param) {
				paramStr += i + '=' + param[i] + '&';
			}
		}
		if(url.indexOf('?') >= 0) {
			url =  url + '&' + paramStr;
		}
		url =  url + '?' + paramStr;
		return url;
	},
	
	getImage: function(fileId, callback) {
		var me = this;
		var url = me.getUrl('file/getImage', {fileId: fileId});

		// console.log('getImage');
		// console.log(url);

		needle.get(url, function(err, resp) {
			me.checkError(err, resp);
			if(err) {
				return callback && callback(false);
			}
			else if (resp.statusCode != 200) {
				console.log(fileId + ' 图片返回状态错误: ' + resp.statusCode + ' ' + url);
				return callback && callback(false);
			}
			// log(resp);
			/*
			{ 'accept-ranges': 'bytes',
			  'content-disposition': 'inline; filename="logo.png"',
			  'content-length': '8583',
			  'content-type': 'image/png',
			  date: 'Mon, 19 Jan 2015 15:01:47 GMT',
  			*/
			// log(resp.headers);
			else {
				var typeStr = ('' + resp.headers['content-type']).toLowerCase();

				if (typeStr.indexOf('image') < 0) {
					console.log(fileId + ' 不是图片 ' + typeStr + ' ' + url);
					return callback && callback(false);
				}

				var type = 'png';
				if(typeStr) {
					var typeArr = typeStr.split('/');
					if(typeStr.length > 1) {
						type = typeArr[1];
					}
				}

				var filename = Common.uuid() + '.' + type;
				var imagePath = Evt.getCurUserImagesPath();
				var imagePathAll = imagePath + '/' + filename;
				fs.writeFile(imagePathAll, resp.body, function(err) {
					if(err) {
						log(err);
						log('local save image failed 本地保存失败');
						callback(false);
					} else {
						console.log('main save image success');
						callback(imagePathAll, filename);
					}
				});
			}
		});
	},
};
module.exports = Api;




