var fs = require('fs');
var Path = require('path');
var needle = require('needle');
var AdmZip = require('adm-zip');
var async = require('async');

// 可以用全局变量
// console.log(NoteService);
// console.log(process.cwd());

Upgrade = {
	basePath: process.cwd(),
	dataBasePath: process.cwd() + '/data',
	vFile: process.cwd() + '/data/version',
	infoUrl: 'http://app.leanote.com/getUpgradeInfo',
	packgeUrl: 'http://app.leanote.com/getUpgradePackage',

	e: function() {
		$('#upgradeDialogBody').html('Upgrade error!');
		console.error('upgrade error!');
		setTimeout(function() {
			$('.upgrade-cancel-btn').attr('disabled', false);
			$('#upgradeDialog').modal('hide');
		}, 2000);
	},

	updateVersion: function(v) {
		var me = this;
		fs.writeFileSync(me.vFile, JSON.stringify(v));
	},

	initModal: function() {
		var me = this;
		$('.next-version-info').hide();
		$('.upgrade-progress').hide();
		$('.upgrade-cancel-btn').attr('disabled', false);
		$('.upgrade-btn').attr('disabled', true);
		$('.get-next-version-info-loading').show();
	},

	checkForUpdates: function() {
		var me = this;
		me.getCurVersion(function(v) {
			if(!v) {
				return;
			}
			me.initModal();
			$('.cur-version').text(v.version);
			$('#upgradeDialog').modal({backdrop: 'static', keyboard: false});

			me.checkUpgrade(v.version, function(nextV) {
				var nextVersion = nextV.nextVersion;
				$('.get-next-version-info-loading').hide();
				if(!v || !v.version || v.version == nextVersion) {
					$('.next-version-info').html("No updates available.").show();
					return;
				}
				$('.next-version-info').html(`
					The latest version <b>` + nextVersion + `</b> is available! <br />
		              Updates:
		              <div>
		              	` + (nextV.desc || '') + `
		              </div>
		              Size: ` + nextV.size).show();
				$('.upgrade-btn').attr('disabled', false);
				$('.upgrade-btn').unbind('click').click(function() {
					$('.upgrade-cancel-btn').attr('disabled', true);
					$('.upgrade-btn').attr('disabled', true);
					me.upgrade(v.version, nextV);
				});
			});
		});
	},

	// 得到当前版本
	getCurVersion: function (callback) {
		var me = this;
		// fs.writeFileSync('./output.json',JSON.stringify({a:1,b:2}));
		try {
			var v = JSON.parse(fs.readFileSync(me.vFile));
			callback(v);
		} catch(e) {
			callback(false);
		}
	},

	// 检查是否可升级, 覆盖common.js的
	checkUpgrade: function (curVersion, callback) {
		var me = this;
		needle.get(me.infoUrl + '?version=' + curVersion, function(err, resp) {
			if(err) {
				return me.e();
			}
			var ret = resp.body;
			if(typeof ret != 'object') {
				return me.e();
			}
			callback(ret);
		});
	},
		
	upgrade: function(curVersion, ret) {
		var me = this;
		var $progress = $('.upgrade-progress');
		$progress.show();
		$progress.html('Download upgrade pacakge...');

		// 升级之
		// 下载最新的版本
		needle.get(me.packgeUrl + '?version=' + ret.nextVersion, function(err, resp) {
			if(err || resp.statusCode == 404) {
				return me.e();
			}

			var typeStr = resp.headers['content-type'];
			if(typeStr != 'application/zip') {
				return me.e();
			}

			// 1. 下载到data目录, 解压之, 得到所有文件
			var filename = ret.nextVersion + '.zip';
			var filePath = me.dataBasePath + '/' + filename;
			var err = fs.writeFileSync(filePath, resp.body);
			if(err) {
				return me.e();
			}

			$progress.html('Installing...');

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
						return me.e();
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

					$progress.html('Upgrade to ' + ret.nextVersion + ' successful!');
					$('.cur-version').text(ret.nextVersion);
					$('.upgrade-cancel-btn').attr('disabled', false);
					setTimeout(function() {
						$('#upgradeDialog').modal('hide');
					}, 3000);
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

	scanFolder: function (p) {
		var me = this;
	    var fileList = [];
	    var folderList = [];
	   
	    var walk = function(p, fileList, folderList) {
            files = fs.readdirSync(p);
            files.forEach(function(item) {  
                var tmpPath = p + '/' + item;
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


	    walk(p, fileList, folderList);

	    return fileList;
	},

	mkdirsSync: function(dirpath) {
		var me = this;
	    if(fs.existsSync(dirpath)) {
	    	return;
	    }
        // 尝试创建父目录，然后再创建当前目录
        me.mkdirsSync(Path.dirname(dirpath));
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
		if(fs.existsSync(src)) {
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
		console.log(nextVersionFilePath);
		console.log(fileList);
		
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

/*
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
*/

// checkUpgrade(true);