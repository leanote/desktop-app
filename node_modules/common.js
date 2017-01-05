var fs = require('fs');
var crypto = require('crypto');
// var User = require('user');
// var Evt = require('evt');
var ObjectId = require('objectid');

// var gui = require('nw.gui');
// console.log(gui.App);

// 开发版
/*
process.on('uncaughtException', function (err) {
  // 打印出错误
  console.log('~!!~ uncaughtException ~!!~');
  console.log(err);
  // 打印出错误的调用栈方便调试
  console.log(err.stack);
  // Web = require('web');
  // Web.debug('错误!!');
});
*/

function log(o) {console.log(o)}
Date.prototype.format = function(fmt) { //author: meizz   
  var o = {   
    "M+" : this.getMonth()+1,                 //月份   
    "d+" : this.getDate(),                    //日   
    "h+" : this.getHours(),                   //小时   
    "m+" : this.getMinutes(),                 //分   
    "s+" : this.getSeconds(),                 //秒   
    "q+" : Math.floor((this.getMonth()+3)/3), //季度   
    "S"  : this.getMilliseconds()             //毫秒   
  };   
  if(/(y+)/.test(fmt))   
    fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));   
  for(var k in o)   
    if(new RegExp("("+ k +")").test(fmt))   
  fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));   
  return fmt; 
}
// log("<>>>>>>>>>>>>>>>>>>>>");
var Common = {
	objectId: function() {
		return ObjectId()
	},

	// 是否是数组
	isArray: function(obj) {  
		return Object.prototype.toString.call(obj) === '[object Array]';   
	},
	/**
	 * 是否为空
	 * 可判断任意类型，string array
	 */
	isEmpty: function(obj) {
		if(!obj) {
			return true;
		}
		
		if(isArray(obj)) {
			if(obj.length == 0) {
				return true;
			}
		}
		
		return false;
	},
	isValidDate: function (d) {
		return Object.prototype.toString.call(d) === "[object Date]" && !isNaN(d.getTime());
	},
	_uuid: 1,
	uuid: function() {
		this._uuid++;
		return ((new Date()).getTime()) + '_' + this._uuid;
	},
	isWin: function() {
		return process.platform.toLowerCase().indexOf('win') === 0;
	},
	isMac: function() {
		return process.platform.toLowerCase().indexOf('mac') === 0;
	},
	// 得到目录分隔符
	getPathSep: function() {
		// windows下
		if(process.platform.toLowerCase().indexOf('win') === 0) {
			return "\\";
		}
		// linux下
		return '/';
	},
	isOk: function(ret) {
		if(!ret) {
			return ret;
		}
	
		if(typeof ret == 'object') {
			// 数组
			if('length' in ret) {
				return true;
			}
			if('Ok' in ret && !ret.Ok) { // 指明了Ok
				return false;
			}
			return true;
		}
		return false;
	},
	// 复制文件
	copyFile: function(src, dist, callback) {
		if(!src || !dist) {
			return callback && callback(false);
		}
		var readStream = fs.createReadStream(src);
		var writeStream = fs.createWriteStream(dist);
		readStream.pipe(writeStream);
		var ok = true;
		// windows下, end没用, 可能writeStream还没end
		readStream.on('end', function () {
			// callback && callback(true);
		});
		writeStream.on('close', function() {
	        ok && callback && callback(true);
	    });
		readStream.on('error', function () {
			ok = false;
			callback && callback(false);
		});
	},
	inArray: function(arr, item) {
		var me = this;
		if(!arr) {
			return false;
		}
		for(var i = 0; i < arr.length; i++) {
			if(arr[i] == item) {
				return true;
			}
		}
		return false;
	},
	isImageExt: function(ext) {
		var me = this;
		if(!ext) {
			return false;
		}
		ext = ext.toLowerCase();
		return me.inArray(['jpg', 'jpeg', 'bmp', 'png', 'gif'], ext);
	},
	// 拆分filePath的各个部分
	splitFile: function(fullFilePath) {
		var pme = this;
		var ret = {
			path: "", // a/b
			name: "", // c.js
			nameNotExt: "", // a
			ext: "", // js
			getFullPath: function() {
				var me = this;
				if(me.path) {
					if(me.ext) {
						return me.path + pme.getPathSep() + me.nameNotExt + '.' + me.ext;
					} else {
						return me.path + pme.getPathSep() + me.nameNotExt;
					}
				} else {
					if(me.ext) {
						return me.nameNotExt + '.' + me.ext;
					} else {
						return me.nameNotExt;
					}
				}
			}
		}
		if(!fullFilePath) {
			return ret;
		}
		var strs = fullFilePath.split(this.getPathSep());
		if(strs.length == 1) {
			ret.name = strs[0];
		} else {
			ret.name = strs[strs.length - 1];
			strs.pop();
			ret.path = strs.join(pme.getPathSep());
		}
		// console.log("---");
		// console.log(ret);
		var names = ret.name.split('.');
		if(names.length > 1) {
			ret.ext = names[names.length - 1];
			names.pop();
			ret.nameNotExt = names.join('.');
		} else {
			ret.nameNotExt = ret.name;
		}
		return ret;
	},
	// 2014-01-06T18:29:48.802+08:00
	goNowToDate: function (goNow) {
		if(!goNow) {
			return new Date();
		}
		// new Date();
		if(typeof goNow == 'object') {
			return date;
		}
		var str = goNow.substr(0, 10) + " " + goNow.substr(11, 8);
		try {
			return new Date(str);
		} catch(e) {
			return new Date();
		}
	},

	formatDatetime: function (t) {
		if (!t) {
			t = new Date();
		}
		try {
			return t.format("yyyy-MM-dd hh:mm:ss");
		} catch(e) {
			return '';
		}
	},

	// 获取文件的json数据
	getFileJson: function(filepath) {
		var me = this;
		try {
			var data = fs.readFileSync(filepath, 'utf-8');
			return JSON.parse(data);
		} catch(e) { 
			return false;
		}
	},

	writeFile: function(filepath, data) {
		var me = this;
		try {
			fs.writeFileSync(filepath, data);
			return true;
		} catch(e) { 
			return false;
		}
	},

	// 执行命令
	cmd: function(args, exitFunc) {
		var me = this;
		var exec = require('child_process').exec;
		var binPath = process.cwd() + '/public/bin/leanote-mac';
		if(me.isWin()) { 
			var binPath = process.cwd() + '/public/bin/leanote.exe';
			go();
		} else {
			// 先chmod +x
			var chmod = exec('chmod +x "' + binPath + '"');
			chmod.on('exit', function(code) { 
				go();
			});
		}

		function go() {
			var cmd = '"' + binPath + '"'; // "' + txtPath + '" "' + filePath + '"'
			for(var i in args) {
				cmd += ' "' + args[i] + '"';
			}

			last = exec(cmd); 
			last.on('exit', exitFunc);
		}
	},

	md5: function(str, salt) {
		var md5sum = crypto.createHash('md5');
		var key = str;
		if (salt) {
			key += salt;
		}
		md5sum.update(key);
		str = md5sum.digest('hex');
		return str;
	},

	// 删除文件夹
	deleteFolderRecursive: function(path) {
		var me = this;
	    var files = [];
	    if( fs.existsSync(path) ) {
	        files = fs.readdirSync(path);
	        files.forEach(function(file,index){
	            var curPath = path + "/" + file;
	            if(fs.statSync(curPath).isDirectory()) { // recurse
	                me.deleteFolderRecursive(curPath);
	            } else { // delete file
	                fs.unlinkSync(curPath);
	            }
	        });
	        fs.rmdirSync(path);
	    }
	},

	/**
	 * 得到目录下的文件大小
	 * @param  {string}  path   路径
	 * @param  {boolean} isRecursive 是否递归子目录
	 * @return {number}         大小, 以KB为单位
	 */
	getFolderSize: function (path, isRecursive) {
		var me = this;
	    var size = 0;
	    var fies;
	    if ( fs.existsSync(path) ) {
	        files = fs.readdirSync(path);
	        files.forEach(function(file, index) {
	            var curPath = path + '/' + file;
	            var stat = fs.statSync(curPath);
	            if(stat.isDirectory() && isRecursive) {
	                size += me.getFolderSize(curPath, isRecursive);
	            } else {
	            	size += stat.size / 1000;
	            }
	        });
	    }
	    return size;
	}
};
module.exports = Common; 
