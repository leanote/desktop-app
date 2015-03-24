var fs = require('fs');
var path = require('path');
var needle = require('needle');
var AdmZip = require('adm-zip');
var async = require('async');

// 可以用全局变量
// console.log(NoteService);

console.log(process.cwd());

var Upgrade = {
	basePath: process.cwd(),
	dataBasePath: process.cwd() + '/data',
	vFile: process.cwd() + '/data/version',
	updateVersion: function(v) {
		var me = this;
		fs.writeFileSync(me.vFile, JSON.stringify(v));
	},

	// 得到当前版本
	getCurVersion: function (callback) {
		var me = this;
		// fs.writeFileSync('./output.json',JSON.stringify({a:1,b:2}));
		try {
			var v = JSON.parse(fs.readFileSync(me.vFile));
			console.log(v);
			callback(v);
		} catch(e) {
			console.log(e);
			callback(false);
		}
	},

	// 检查是否可升级, 覆盖common.js的
	checkUpgrade: function (isForce) {
		var me = this;
		function e() {
			if(isForce) {
				alert('Check upgrade error!')
			}
			console.trace('error');
		}

		console.log('checkUpgrade');
		
		me.getCurVersion(function(v) {
			if(!v) {
				return e();
			}

			var curVersion = v.version;

			var url = 'http://d.leanote.com/getUpgradeInfo';

			var infoUrl = 'http://localhost:3001/getUpgradeInfo';
			var packgeUrl = 'http://localhost:3001/getUpgradePackage';

			needle.get(infoUrl + '?version=' + curVersion, function(err, resp) {
				if(err) {
					return e();
				}
				var ret = resp.body;
				if(typeof ret != 'object') {
					return e();
				}

				if(ret.nextVersion == curVersion) {
					if(isForce) {
						alert("Not need to upgrade.");
						return;
					}
				}

				// 升级之
				// 下载最新的版本
				needle.get(packgeUrl + '?version=' + ret.nextVersion, function(err, resp) {
					if(err || resp.statusCode == 404) {
						return e();
					}

					var typeStr = resp.headers['content-type'];
					if(typeStr != 'application/zip') {
						return e();
					}

					// 1. 下载到data目录, 解压之, 得到所有文件
					var filename = ret.nextVersion + '.zip';
					var filePath = me.dataBasePath + '/' + filename;
					var err = fs.writeFileSync(filePath, resp.body);
					if(err) {
						return e();
					}
					// https://github.com/cthackers/adm-zip
					try {
						me.rmdir(me.dataBasePath + '/' + ret.nextVersion);
					} catch(e) {
						console.error(e);
					}
					var zip = new AdmZip(filePath);
					zip.extractAllTo(me.dataBasePath + '/' + ret.nextVersion, true);
					try {
						fs.unlinkSync(filePath);
					} catch(e) {
					}

					// 2. 先保存之前的文件作备份
					me.backup(me.dataBasePath + '/' + ret.nextVersion, ret.nextVersion, curVersion, function(fileList) {
						// 3. 覆盖
						me.overWrite(fileList, ret.nextVersion, function(ok) {
							if(!ok) {
								return e();
							}
							var lastVersionFilePath = curVersion;
							// 4. 更新v
							me.updateVersion(
								{
									version: ret.nextVersion, // 当前版本
									lastVersion: curVersion, // 上一版本
									lastVersionFilePath: lastVersionFilePath, // 备份的文件夹名称
									updatedTime: new Date() // 更新日期
								}
							);
						});
					});
				});
			});
		});
	},

	rmdir: function (path) {
	    var walk = function(path) {
            files = fs.readdirSync(path);
            files.forEach(function(item) {  
                var tmpPath = path + '/' + item;
                var stats = fs.statSync(tmpPath);

                if (stats.isDirectory()) {  
                    walk(tmpPath); 
                    fs.rmdirSync(tmpPath);
                }
                else {  
                	fs.unlinkSync(tmpPath);
                }
            });  
        };
        try {
		    walk(path);
        } catch(e) {
        	console.log(e);
        }
	},

	scanFolder: function (path) {
	    var fileList = [];
	    var folderList = [];
	    var walk = function(path, fileList, folderList) {
            files = fs.readdirSync(path);
            files.forEach(function(item) {  
                var tmpPath = path + '/' + item;
                var stats = fs.statSync(tmpPath);

                if (stats.isDirectory() && item.indexOf('_') == -1) {  
                    walk(tmpPath, fileList, folderList); 
                    folderList.push(tmpPath); 
                }
                else if (item.indexOf('_') == -1) {  
                    fileList.push(tmpPath); 
                }
            });  
        };  

	    walk(path, fileList, folderList);

	    return fileList;
	},

	mkdirsSync: function(dirpath) {
		var me = this;
	    if(path.existsSync(dirpath)) {
	    	return;
	    }
        // 尝试创建父目录，然后再创建当前目录
        me.mkdirsSync(path.dirname(dirpath));
        fs.mkdirSync(dirpath);
	},

	// 复制文件
	copyFile: function(src, dist, callback) {
		var me = this;
		if(!src || !dist) {
			return callback && callback(false);
		}

		var filePathNameArrs = dist.split('/');
		var filename = filePathNameArrs.pop();
		var filePath = filePathNameArrs.join('/');
		// 创建文件夹
		me.mkdirsSync(filePath);

		// 如果src存在
		if(path.existsSync(src)) {
			var readStream = fs.createReadStream(src);
			var writeStream = fs.createWriteStream(dist);
			readStream.pipe(writeStream);
			readStream.on('end', function () {
				callback && callback(true);
			});
			readStream.on('error', function () {
				callback && callback(false);
			});
		} else {
			callback && callback(true);
		}
	},

	// backup curVersion file 
	// 一一对应备份
	// nextVersionFilePath == /a/data/1.0
	backup: function(nextVersionFilePath, nextVersion, curVersion, callback) {
		var me = this;

		// 先删除本地的
		try {
			me.rmdir(me.dataBasePath + '/' + curVersion);
		} catch(e) {}

		var fileList = me.scanFolder(nextVersionFilePath); // 每一个文件都包含路径, /a/data/1.0/src/note.html
		
		async.eachSeries(fileList, function(filePathName, cb) {
			// /a/data/1.0/src/a.html <=> /a/data/1.1/src/a.html
			// /a/src/a.html => /a/data/1.1/src/a.html
			var source = filePathName.replace('/data/' + nextVersion, '');
			var targetPathName = filePathName.replace('/data/' + nextVersion, '/data/' + curVersion);
			me.copyFile(source, targetPathName, function() {
				cb();
			});
		}, function() {
			callback(fileList);
		});
	},

	// 覆盖之
	overWrite: function(fileList, version, callback) {
		var me = this;
		async.eachSeries(fileList, function(filePathName, cb) {
			// /a/data/1.0/src/a.html => /a/src/a.html
			var targetPathName = filePathName.replace('/data/' + version, '');
			console.log(filePathName + ' => ' + targetPathName);
			me.copyFile(filePathName, targetPathName, function() {
				cb();
			});
		}, function() {
			callback(true);
		});
	},

	// 回滚到上一版本, for test
	rollabackUpgrade: function () {
		var me = this;
		me.getCurVersion(function(v) {
			if(!v.lastVersion || !v.lastVersionFilePath) {
				return;
			}

			// 解压上一version文件, 并覆盖之
			var path = me.dataBasePath + '/' + v.lastVersionFilePath;
			var fileList = me.scanFolder(path); // 每一个文件都包含路径, /a/data/1.0/src/note.html
			
			me.overWrite(fileList, v.lastVersion, function() {

				me.updateVersion(
					{
						version: v.lastVersion, // 当前版本
						lastVersion: '', // 上一版本
						lastVersionFilePath: '', // 备份的文件夹名称
						updatedTime: new Date() // 更新日期
					}
				);

			});
		});
	}
};

var checkUpgrade = function() {
	Upgrade.checkUpgrade();
};
var rollabackUpgrade = function() {
	Upgrade.rollabackUpgrade();
};

(function() {
	function _check() {
		setTimeout(function() {
			if(State.recoverEnd) {
				checkUpgrade();
			} else {
				_check();
			}
		}, 2000);
	}
	// _check();
})();

checkUpgrade(true);

/*
var fs = require('fs');

fs.readdir('/', function(err, files) {
	console.log(files);
});

var Note = require('note');
/*
Note.getTrashNotes(function(notes) {
	console.error('trash--------------')
	console.log(notes);
});
*/