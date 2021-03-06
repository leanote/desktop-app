var fs = require('fs');

var Evt = require('./evt');
var db = require('./db');
var dbClient = require('./db_client');
var Common = require('./common');
var async;

function log(o) {
	console.log(o);
}

/**
UserId (主键)
Email
Username
Token
LastLoginTime
IsActive // 是否是活跃用户
*/
// var User = {}

var Api = null; // require('./api');
// 用户基本信息
User = {
	token: '',
	userId: '',
	email: '',
	username: '',
	host: '', // 服务
	LastSyncUsn: -1,
	LastSyncTime: null,
	// add local account support flag
	// see https://github.com/leanote/desktop-app/issues/36
	local: null,

	// 注销
	logout: function (callback) {
		var me = this;
		function u(callback) {
			db.users.update({_id: me.userId}, {$set:{IsActive: false}}, function () {
				callback();
			});
		}
		if (me.isLocal()) {
			return u(callback);
		}
		if(!Api) {
			Api = require('./api');
		}
		Api.logout(function() {
			u(callback);
		});
	},

	// 登录
	login: function(username, password, host, callback) {
		var me = this;
		// 先本地验证
		db.users.findOne({Username: username, IsLocal: true}, function(err, user) {
			if (!err && user && user.UserId && user.Pwd) {
				var md5Password = Common.md5(password, user.UserId);
				// 如果是32位的, 表示是md5
				if (user.Pwd.length == 32) {
					if (user.Pwd == md5Password) {
						// 本地用户
						me.saveCurUser(user, function() {
							callback(true);
						});
					}
					// 密码有误
					else {
						callback(false);
					}
				}
				// 如果不是32位的, 那表示保存的是之前的明文, 则将明文转成密文
				else if (user.Pwd == password) {
					user.Pwd = md5Password;
					me.saveCurUser(user, function() {
						callback(true);
					});
				}
				// 密码有误
				else {
					callback(false);
				}
			}
			// 本地用户没有, 则远程验证
			else {
				if(!Api) {
					Api = require('./api');
				}
				// 远程验证
				Api.auth(username, password, host, function(ret) {
					if(ret.Ok) {
						User.saveCurUser(ret, function () {
							callback(true);
						});
					} else {
						callback(false);
					}
				});
			}
		});
	},

	// 创建本地帐户
	createLocalUser: function(useranme, pwd, callback) {
		var me = this;
		db.users.count({Username: useranme}, function(err, count) {
			if(count == 0) {
				var user = {};
				user.Username = useranme;
				user.IsLocal = true;
				user.IsActive = true;
				user.UserId = Common.objectId();
				user._id = user.UserId;
				user.Pwd = Common.md5(pwd, user.UserId);
				// 有自己独立的数据库
				user.HasDB = true;
				db.users.insert(user, function(err, doc) {
					// 创建默认的笔记本
					if (!err) {
						// 设为当前user
						me.saveCurUser(doc, function () {
							// 为该用户初始化数据库
							db.initDBForUser(user.UserId, user);

							me.userId = user.UserId;
							var Notebook = require('./notebook');
							var notebookId = Common.objectId();
							Notebook.addNotebook(notebookId, 'Leanote', '', function (notebook) {
								if (notebook) {
									var Note = require('./note');
									var Tag = require('./tag');
									Tag.addOrUpdateTag('Leanote');
									Tag.addOrUpdateTag('Welcome');
									Note.updateNoteOrContent({
										IsNew: true,
										NoteId: Common.objectId(),
										"NotebookId": notebookId,
										"Title": "Welcome to Leanote 欢迎来到Leanote",
										"Content": "<h2>Leanote, Not Just A NotePad!</h2>Welcome!<h2>Leanote, 不只是笔记</h2>欢迎!",
										"Desc": "Leanote, Not Just A NotePad! Welcome",
										"Tags": ['Leanote', 'Welcome']
									}, function () {
										callback(true);
									});
								}
								else {
									callback(true);
								}
							});
						});
					} else {
						callback(false);
					}
				});
			} else {
				// log('save new user failed: username exists')
				// log(err);
				callback && callback(false, 'User exists');
			}
		});
	},

	// 不同host的userId可能一样, 潜在的bug
	/**
	 * 登录后保存为当前用户
	 * @param  {db.User}   user     [description]
	 * @param  {Function} callback [description]
	 * @return {[type]}            [description]
	 */
	saveCurUser: function(user, callback) {
		var me = this;

		me.token = user.Token;
		me.userId = user.UserId;
		me.email = user.Email;
		me.username = user.Username;
		me.host = user.Host; // http://leanote.com, http://localhost
		me.local = user.IsLocal;
		// 判断当前用户是否有文件夹
		me.setUserDataPath();

		// 1.
		// 设置其它用户为 not active
		db.users.update({_id: {$ne: user.UserId}}, {$set: {IsActive: false}}, {multi: true}, function(err, n) {

			// 2. 当前用户是否在数据库中
			db.users.count({_id: user.UserId}, function(err, count) {
				if(err || count == 0) {
					// 添加一个
					user['_id'] = user.UserId;
					user['IsActive'] = true;
					user['LastLoginTime'] = new Date();
					// 新添加的都是HasDB
					user['HasDB'] = true;
					db.users.insert(user, function(err, doc) {
						callback && callback(true);
					});
				} else {
					user.IsActive = true;
					user.LastLoginTime = new Date();
					delete user['Ok'];
					db.users.update({_id: user.UserId}, {$set: user}, function(err, cnt) {
						if(err || cnt == 0) {
							callback && callback(false);
						} else {
							callback && callback(true);
						}
					});
				}
			});
		});
	},

	// 打开软件时, 从db中获取当前用户
	init: function(callback) {
		console.log("......user init.......")
		var me = this;

		me.getG(function(g) {
			me.g = g;

			db.users.findOne({IsActive: true}, function(err, user) {
				if(err || !user || !user.UserId) {
					console.log('不存在');
					callback && callback(false);
				} else {

					me.token = user.Token;
					me.userId = user.UserId;
					me.email = user.Email;
					me.username = user.Username;
					me.LastSyncUsn = user.LastSyncUsn;
					me.LastSyncTime = user.LastSyncTime;
					me.host = user.Host;
					me.local = user.IsLocal;

					me.hasDB = user.HasDB; // 是否有自己的DB

					// 为该用户初始化数据库
					db.initDBForUser(me.hasDB ? me.userId : '', user);

					Evt.setHost(me.host);

					// 全局配置也在user中, 到web端
					for(var i in me.g) {
						user[i] = me.g[i];
					}

					// 设置当前用户数据路径
					me.setUserDataPath();

					callback && callback(user);
				}
			});

		});
	},
	// 得到当前活跃用户Id
	getCurActiveUserId: function() {
		return this.userId || "user1";
	},
	getToken: function() {
		return this.token || "user1";
	},
	getCurUserImagesPath: function() {
		return Evt.getBasePath() + '/' + this.getCurUserImagesAppPath();
	},
	getCurUserAttachsPath: function() {
		return Evt.getBasePath() + '/' + this.getCurUserAttachsAppPath();
	},
	getCurUserImagesAppPath: function() {
		return 'data/' + this.getCurActiveUserId() + '/images';
	},
	getCurUserAttachsAppPath: function() {
		return 'data/' + this.getCurActiveUserId() + '/attachs';
	},

	getUserImagesAndAttachBasePath: function(userId) {
		return Evt.getBasePath() + '/data/' + userId;
	},
	getUserImagesPath: function(userId) {
		return this.getUserImagesAndAttachBasePath(userId) + '/images';
	},
	getUserAttachsPath: function(userId) {
		return this.getUserImagesAndAttachBasePath(userId) + '/attachs';
	},

	getUserDBPath: function (userId) {
		var base = Evt.getDBPath();
		if (!base) {
			return false;
		}
		return base + '/' + userId;
	},

	// 得到用户真正的DBpath, 看是否有HasDB
	getUserRealDBPath: function (userId, callback) {
		var me = this;
		me.getUser(userId, function (user) {
			if (!user) {
				return callback(false);
			}
			if (user.HasDB) {
				callback(me.getUserDBPath(userId));
			}
			else {
				callback(Evt.getDBPath());
			}
		});
	},

	/**
	 * 得到用户的数据统计
	 * @param  {User} user 用户
	 * @return {Object}     {db: 1232, image: 3232, attach: 3232} // 以KB为单位
	 */
	getUserDataStats: function (user) {
		var me = this;
		var userId = user.UserId;
		var dbPath = user.HasDB ? me.getUserDBPath(userId) : Evt.getDBPath();
		var dbSize = Common.getFolderSize(dbPath);

		var imageSize = Common.getFolderSize(me.getUserImagesPath(userId));
		var attachSize = Common.getFolderSize(me.getUserAttachsPath(userId));

		return {
			db: dbSize, 
			image: imageSize,
			attach: attachSize
		};
	},

	// 加载用户的DB, 这样才能统计
	_loadUserDB: function (user) {
		var me = this;
		var sourceDB = {};
		var names = ['notebooks', 'notes', 'tags'];
		if (user.UserId === me.userId) {
			return db;
		}
		if (user.HasDB) {
			db.initIt(sourceDB, names, user.UserId, false);
		}
		else {
			if (!me.hasDB) {
				return db;
			}
			else {
				db.initIt(sourceDB, names, '', false);
			}
		}
		return sourceDB;
	},

	// notebook, note, tag统计
	getUserDBDataStats: function (user, callback) {
		var me = this;
		var data = {};
		var userId = user.UserId;

		var sourceDB = me._loadUserDB(user);

		var query = {UserId: userId, 
			$or:[
				{LocalIsDelete: {$exists: false}},
				{LocalIsDelete: false}
			],
			$or:[
				{IsDeleted: {$exists: false}},
				{IsDeleted: false}
			],
			$or:[
				{IsTrash: {$exists: false}},
				{IsTrash: false}
			]
		};

		sourceDB.notebooks.count(query, function (err, n) {
			data.notebook = n;
			sourceDB.notes.count(query, function (err, n) {
				data.note = n;
				sourceDB.tags.count(query, function (err, n) {
					data.tag = n;

					// 垃圾回收
					if (sourceDB != db) {
						sourceDB = null;
					}

					callback(data);
				});
			});
		});
	},

	setUserDataPath: function(userId) {
		var me = this;
		// 判断是否存在, 不存在则创建dir
		try {
			fs.mkdirSync(Evt.getBasePath() + '/data/');
		}
		catch(e) {};
		try {
			fs.mkdirSync(Evt.getBasePath() + '/data/' + this.getCurActiveUserId());
		} catch(e) {
		}
		try {
			fs.mkdirSync(Evt.getBasePath() + '/data/' + this.getCurActiveUserId() + '/images');
		} catch(e) {
		}
		try {
			fs.mkdirSync(Evt.getBasePath() + '/data/' + this.getCurActiveUserId() + '/attachs');
		} catch(e) {
		}
	},

	getCurUser: function(callback) {
		var me = this;
		db.users.findOne({_id: me.getCurActiveUserId()}, function(err, doc) {
			if(err) {
				callback(false);
			} else {
				callback(doc);
			}
		});
	},

	getLastSyncState: function(callback) {
		var me = this;
		me.getCurUser(function(user) {
			if(user) {
				callback(user.LastSyncUsn, user.LastSyncTime);
			} else {
				callback(false, false);
			}
		})
	},

	// 设为-1, 再刷新就会重新同步
	fullSyncForce: function(callback) {
		var me = this;
		var userId = me.getCurActiveUserId();
		// 设为HasDB为true
		db.users.update({UserId: userId}, {$set: {HasDB: true, LastSyncUsn: -1, NotebookUsn: -1, NoteUsn: -1, TagUsn: -1}}, function() {
			// 删除本地账户所有数据
			me.deleteUserAllData(userId, function () {
				callback && callback();
			});
		});
	},

	// 同步后更新同步状态
	// pull 后调用
	updateLastSyncState: function(callback) {
		var me = this;
		if(!Api) {
			Api = require('./api');
		}
		Api.getLastSyncState(function(state) {
			if(state) {
				me.LastSyncUsn = state.LastSyncUsn;
				me.LastSyncTime = state.LastSyncTime;
				me.NotebookUsn = -1;
				me.NoteUsn = -1;
				me.TagUsn = -1;
				db.users.update({UserId: me.getCurActiveUserId()}, {$set: state});
			}
			callback();
		});
	},
	isLocal: function() {
		var me = this;
		return me.local;
	},
	// send changes要用
	getLastSyncUsn: function() {
		var me = this;
		return me.LastSyncUsn;
	},

	getAllLastSyncState: function (callback) {
		var me = this;
		me.getCurUser(function (user) {
			if (!user) {
				return callback(false);
			}
			callback(user.LastSyncUsn, user.NotebookUsn, user.NoteUsn, user.TagUsn);
		});
	},

	// 更新 send changes要用
	updateLastSyncUsn: function(usn) {
		var me = this;
		me.LastSyncUsn = usn;
		db.users.update({UserId: me.getCurActiveUserId()}, {$set: {LastSyncUsn: usn}});
	},

	// 更新每一个类型的USN, 仅在全量同步时有用
	updateEachSyncState: function (type, usn, callback) {
		var me = this;
		var updates = {};
		updates[type] = usn;
		db.users.update({UserId: me.getCurActiveUserId()}, {$set: updates});
	},

	// 全局配置
	getG: function(callback) {
		var me = this;
		db.g.findOne({_id: '1'}, function(err, doc) {
			if(err || !doc) {
				callback({});
			} else {
				callback(doc);
			}
		});
	},
	// data = {Theme, NotebookWidth, NoteListWidth, MdEditorWidth, Version};
	updateG: function(data, callback) {
		db.g.update({_id: '1'}, {$set: data}, {upsert: true}, function() {
			callback && callback();
		});
	},
	/**
	 * [saveCurState description]
	 * @param  {[type]} state [description]
	 * @return {[type]}       [description]
	 User.saveCurState({
			StarredOpened: StarredOpened,
			NotebookOpened: NotebookOpened,
			TagOpened: TagOpened,
			CurNoteId: CurNoteId,
			CurIsStarred: CurIsStarred,
			CurNotebookId: CurNotebookId,
			CurTag: CurTag
		}, callback);
	 */
	saveCurState: function(state, callback) {
		var me = this;
		state = state || {};
		db.users.update({_id: me.getCurActiveUserId()}, {$set: {State: state}}, function() {
			callback && callback();
		});
	},

	// 获取所有用户, 当前active的在第一个
	getAllUsers: function(callback) {
		db.users.find({}).sort({'LastLoginTime': -1}).exec(function(err, users) {
			if(err) {
				return callback && callback(false);
			}
			return callback && callback(users);
		});
	},

	// 通过id得到用户
	getUser: function (userId, callback) {
		db.users.findOne({_id: userId}, function(err, user) {
			if(err) {
				return callback && callback(false);
			}
			return callback && callback(user);
		});
	},

	setUserHasDB: function (userId, callback) {
		db.users.update({_id: userId}, {$set: {HasDB: true}}, function(err, cnt) {
			callback();
		});
	},

	//-----------------------
	// 删除用户

	// 删除用户的文件目录
	deleteUserImagesAndAttachsPath: function (userId) {
		var me = this;

		// 防止误删
		if (!Evt.getBasePath()) {
			return;
		}

		var imagesAndAttachBasePath = me.getUserImagesAndAttachBasePath(userId);
		if (imagesAndAttachBasePath) {
			Common.deleteFolderRecursive(imagesAndAttachBasePath);
		}
	},

	// 删除用户
	deleteUser: function (userId, callback) {
		db.users.remove({_id: userId}, function () {
			callback && callback();
		});
	},

	// 删除用户+所有数据
	deleteUserAndAllData: function (userId, callback) {
		var me = this;
		me.deleteUserAllData(userId, function () {
			// 2. 删除之
			me.deleteUser(userId, function () {
				callback();
			});
		})
	},

	// 删除用户的所有数据
	deleteUserAllData: function(userId, callback) {
		var me = this;
		me.getUser(userId, function (userInfo) {
			if (!userInfo) {
				callback(false);
				return;
			}

			// 1. 删除附件,图片
			me.deleteUserImagesAndAttachsPath(userId);

			// 2. 删除数据库
			// 如果有自己独立的表, 则把文件夹删除即可
			if (userInfo.HasDB) {
				var dbPath = me.getUserDBPath(userId);
				if (dbPath) {
					Common.deleteFolderRecursive(dbPath);
				}
				callback(true);
			}
			// 没有, 那就要一个个删除了
			else {
				me._deleteDB(userId, function () {
					callback();
				});
			}
		});
	},

	// 从全局数据库中删除数据
	_deleteDB: function (userId, callback) {
		var me = this;

		// 判断当前db是否是全局的, 如果不是, 则初始化全局的
		var names = ['notebooks', 'notes', 'tags',/* 'images',*/ 'attachs', 'noteHistories'];
		var sourceDb = {};
		if (me.hasDB) {
			db.initIt(sourceDb, names, '', false);
		}
		else {
			sourceDb = db;
		}

		var names = ['notebooks', 'notes', 'tags', /*'images', */'attachs'];
		var query = {UserId: userId};

		if (!async) {
			async = require('async');
		}

		async.eachSeries(names, function (name, cb) {
			var dbIt = sourceDb[name];
			if (!dbIt) {
				cb();
				return;
			}
			// 如果是笔记, 则要删除note histories
			if (name == 'notes') {
				dbIt.find(query, function(err, docs) {
					if (err || !docs) {
						cb();
						return;
					}

					// 删除历史记录
					// me._deleteNoteHistories(sourceDb, docs, function () {
						// 删除自己
						dbIt.remove(query, { multi: true },function () {
							cb();
						});
					// });
				});
			}
			else {
				dbIt.remove(query, { multi: true }, function () {
					cb();
				});
			}
		}, function () {
			callback();
		});
	},

	// 删除笔记历史记录
	_deleteNoteHistories: function (sourceDb, notes, callback) {
		var me = this;
		sourceDb.noteHistories.loadDB(function (ok) {
			if (!ok) {
				return callback();
			}
			async.eachSeries(notes, function (note, cb) {
				sourceDb.noteHistories.remove( {_id: note.NoteId}, { multi: true }, function () {
					cb();
				});
			}, function () {
				callback();
			});
		});
	},

	// 1. User.updateAllBeLocal('tests3@a.com', 'abc123', 'http://localhost:9000');
	// 2. 同步之
	// 仅仅是为了强制本地化
	// 先同步到server, 再重新同步到本地
	updateAllBeLocal: function (email, password, host) {
		var me = this;
		if(!Api) {
			Api = require('./api');
		}
		Api.auth(email, password, host, function(user) {
			if(user.Ok) {

				var everUserId = me.userId;

				me.token = user.Token;
				// me.userId = user.UserId;
				// me.email = user.Email;
				// me.username = user.Username;
				me.host = host; // http://leanote.com, http://localhost
				me.local = false;
				me.LastSyncUsn = -1;

				// 判断当前用户是否有文件夹
				// me.setUserDataPath();
				var data = {
					// UserId: user.UserId,
					Token: me.token,
					// Email: user.Email,
					// Username: user.Username,
					Host: host,
					Local: false,
					IsActive: true,
					LastSyncUsn: -1,
				};

				db.users.update({_id: everUserId}, {$set: data}, function(err, cnt) {

					if(err || cnt == 0) {
						console.log('用户信息更新失败', err);

					} else {
						Evt.setHost(me.host);
						console.log('用户信息更新成功');

						db.notes.update({UserId: everUserId}, {$set: {UserId: me.userId, IsDirty: true, ServerNoteId: '', LocalIsNew: true}}, {multi: true}, function () {
							console.log('notes 数据更新成功');
						});

						db.notebooks.update({UserId: everUserId}, {$set: {UserId: me.userId, IsDirty: true, ServerNotebookId: '', LocalIsNew: true}}, {multi: true}, function () {
							console.log('notebooks 数据更新成功');
						});
						db.tags.update({UserId: everUserId}, {$set: {UserId: me.userId, IsDirty: true}}, {multi: true}, function () {
							console.log('tags 数据更新成功');
						});

						db.attachs.update({UserId: everUserId}, {$set: {UserId: me.userId, ServerFileId: '', IsDirty: true}}, {multi: true}, function () {
							console.log('attachs 数据更新成功');
						});

						dbClient.images.update({UserId: everUserId}, {$set: {UserId: me.userId, ServerFileId: '', IsDirty: true}}, {multi: true}, function () {
							console.log('images 数据更新成功');
						});
					}
				});
			} else {
				console.log('错误! 用户名密码不正确');
			}
		});
	},
};

module.exports = User;
