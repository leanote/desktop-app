/**
 *
 * 帐户管理
 *
 */
var async;

define(function() {
	var setLang = {
		langs: {
			'en-us': {
				'Accounts': 'Accounts',
			},
			'zh-cn': {
				'Accounts': '帐户管理',
				"Username": "用户名",
				"Is Local": "本地帐户",
				"Yes": "是",
				"No": "否",
				"DB Optimization": "数据库优化",
				"Open DB Dir": "打开数据库目录",
				"Open Images/Attachs Dir": "打开图片附件目录",
				"Delete": "删除",
				"Options": "操作",
				"Current": "当前",

				"Data": "数据",
				"Open Dir": "打开目录",
				"Error": "错误",
				"No such account": "无该帐户",

			},
			'zh-hk': {
				'Accounts': '帐户管理',
			}
		},

		_tpl: `
		<style>
		#accountsDialog .tab-pane {
		  text-align: center;
		  padding: 10px;
		  padding-top: 20px;
		}
		#accountsDialog table {
			width: 100%;
		}
		#accountsDialog td button {
			padding: 5px 8px;
			
		}
		#accountsDialog .modal-dialog {
			width: 750px ;
		}
		#accountsDialog .user-data {
			margin: 0;
		    padding: 0;
		    list-style: none;
		}
		#accountsDialog .user-data a {
		    color: #428bca;
		    display: inline-block;
		    margin: 0 3px;
		}
		#accountsDialog .user-data a:hover {
			text-decoration: underline !important;
		}
		</style>
	    <div class="modal fade bs-modal-sm" id="accountsDialog" tabindex="-1" role="dialog" aria-labelledby="mySmallModalLabel">
	        <div class="modal-dialog">
	          <div class="modal-content">
		          <div class="modal-header">
		              <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
		              <h4 class="modal-title" class="modalTitle"><span class="lang">Accounts</span></h4>
		          </div>
		          <div class="modal-body" id="">
			          <table class="table table-hover">
			          	<thead>
				          	<tr>
					          	<th class="lang">Username</th>
					          	<th class="lang">Is Local</th>
					          	<th class="lang">Data</th>
					          	<th class="lang">Options</th>
				          	</tr>
			          	</thead>
			          	<tbody>
			          	</tbody>
			          </table>
		          </div>
		          <div class="modal-footer ">
		            <button type="button" class="btn btn-default upgrade-cancel-btn lang" data-dismiss="modal">Close</button>
		          </div>
	          </div><!-- /.modal-content -->
	        </div><!-- /.modal-dialog -->
	    </div><!-- /.modal -->
		`,

		getMsg: function(txt, data) {
			return Api.getMsg(txt, 'plugin.accounts', data)
		},

		// 初始化dialog
		_inited: false,
		init: function () {
			var me = this;
			if (me._inited) {
				return;
			}
			me._inited = true;
			$('body').append(me._tpl);
			me.dialog = $("#accountsDialog");

			me.dialog.find('.lang').each(function() {
				var txt = $.trim($(this).text());
				$(this).text(me.getMsg(txt));
			});

			me.tbody = me.dialog.find('tbody');

			var op2Func = {
				db: function (userId) {
					me.dbOptimization(userId);
				},
				'open-db-dir': function (userId) {
					Api.userService.getUserRealDBPath(userId, function(path) {
						if (!path) {
							Api.gui.dialog.showErrorBox(me.getMsg("Error"), me.getMsg("No such account"));
							return;
						}
						Api.gui.Shell.showItemInFolder(path);
					});
				},
				'open-attach-dir': function (userId) {
					Api.gui.Shell.showItemInFolder(Api.userService.getUserAttachsPath(userId));
				},
				'open-image-dir': function (userId) {
					Api.gui.Shell.showItemInFolder(Api.userService.getUserImagesPath(userId));
				},
				'delete': function (userId, $targetBtn) {
					me.deleteUser(userId);

					$targetBtn.closest('tr').remove();
				}
			};

			// 事件
			me.tbody.on('click', 'a', function () {
				var $this = $(this);
				var userId = $this.closest('tr').data('id');
				var option = $this.data('op');

				var func = op2Func[option];
				if (func) {
					func(userId, $this);
				}
			});
		},

		fixSize: function (size) {
			var unit = 'KB'
			if (size > 1000) {
				size = size / 1000;
				unit = 'MB';
			}
			return size.toFixed(2) + unit;
		},

		renderUser: function(user) {
			var me = this;
			var username = user.Username;
			if (user.IsActive) {
				username += ' <span class="label label-success">' + me.getMsg('Current') + '</span>';
			}
			if (user.Email) {
				username += '<br /><i>' + user.Email + '</i>';
			}
			var tr = '<tr data-id="' + user.UserId + '"><td>' + username + '</td>';
			tr += '<td>' + (user.IsLocal ? me.getMsg('Yes') : me.getMsg('No')) + '</td>';

			var disabled = user.IsActive ? 'disabled="disabled"' : '';

			// 得到用户的数据统计
			var userStats = Api.userService.getUserDataStats(user);

			var dataTd = '<ul class="user-data">';
			dataTd += '<li>数据库 '
				+ me.fixSize(userStats.db)
				+ '<a data-op="open-db-dir">' + me.getMsg('Open Dir') + '</a>'
				+ '<a data-op="db">' + me.getMsg('DB Optimization') + '</a>'
				+ ' </li>'
			dataTd += '<li>图片 '
				+ me.fixSize(userStats.image)
				+ '<a data-op="open-image-dir">' + me.getMsg('Open Dir') + '</a>'
				+ ' </li>'
			dataTd += '<li>附件 '
				+ me.fixSize(userStats.attach)
				+ '<a data-op="open-attach-dir">' + me.getMsg('Open Dir') + '</a>'
				+ ' </li>'
			dataTd += '</ul>';

			tr += '<td>' + dataTd + '</td>';

			var options = '<div class="btn-group" role="group">'
				+ '<button class="btn btn-danger" ' + disabled + ' data-op="delete">' + me.getMsg('Delete') + '</button>'
				+ '</div>';
			tr += '<td>' + options + '</td></tr>';
			return tr;
		},

		renderUsers: function (users) {
			var me = this;
			var tbody = '';
			for (var i = 0; i < users.length; ++i) {
				var user = users[i];
				tbody += me.renderUser(user);
			}
			me.tbody.html(tbody);
		},

		openModal: function () {
			var me = this;
			me.dialog.modal('show');

			Api.userService.getAllUsers(function (users) {
				me.renderUsers(users);
			});
		},

		// 打开前要执行的
		onOpen: function() {
			var me = this;
			var gui = Api.gui;

		    var menu = new gui.MenuItem({
		        label: me.getMsg('Accounts'),
		        click: function () {
		        	me.init();
		        	me.openModal();
		        }
		    });

		    // 设置
		    Api.addMoreMenu(menu);
		},
		// 打开后
		onOpenAfter: function() {
			var me = this;
		},
		// 关闭时需要运行的
		onClose: function() {
		},

		// 数据库优化
		// 1. 将数据库迁移到独立的目录
		// 2. 将数据库读写合并
		dbOptimization: function (userId) {
			var me = this;
			Api.loading.show();
			Api.userService.getUser(userId, function (user) {
				if (!user) {
					Api.gui.dialog.showErrorBox(me.getMsg("Error"), me.getMsg("No such account"));
					Api.loading.hide();
					return;
				}

				// 已经存在, 合并数据文件
				if (user.HasDB) {
					me.compactDatafile();
					Api.loading.hide(2000);
					Api.loading.setMsg('优化完成');
					return;
				}

				if (!async) {
					async = require('async');
				}

				me.migrateAllDBs(userId, function (ok) {
					// 迁移成功后, 更新HasDB
					Api.userService.setUserHasDB(userId, function () {
						Api.loading.setMsg('优化完成');
						Api.loading.hide(2000);
					});
				}, function (msg) {
					Api.loading.setMsg(msg);
				});

			});
		},

		// 合并数据
		compactDatafile: function () {
			var names = ['notebooks', 'notes', 'tags', 'images', 'attachs', 'noteHistories'];
			names.forEach(function (name) {
				if (Api.dbService[name]) {
					Api.dbService[name].persistence.compactDatafile();
				}
			});
			return true;
		},

		// 迁移历史记录
		migrateNoteHistories: function (noteId, sDB, dDB, callback) {
			var me = this;
			// 加载DB, 如果成功
			sDB.loadDB(function (ok) {
				if (ok) {
					sDB.findOne({_id: noteId}, function (err, doc) {
						dDB.insert(doc, function(err, retDoc) {
							callback();
						});
					});
				}
				else {
					callback();
				}
			});
		},

		migrateEach: function (userId, sourceDb, distDb, name, callback) {
			var me = this;

			var sDB = sourceDb[name];
			var dDB = distDb[name];

			var query = {UserId: userId};
			sDB.find(query, function(err, docs) {
				if(err) {
					return callback && callback(false);
				}

				if (name === 'notes') {
					me._notes = docs;
				}

				async.eachSeries(docs, function(doc, cb) {
					dDB.insert(doc, function(err, retDoc) {
						if (retDoc) {
							console.log(name + ' ok ' + retDoc._id);

							// 如果是笔记, 则迁移它的笔记历史记录
							if (name === 'notes') {
								me.migrateNoteHistories(
									doc.NoteId, 
									sourceDb['noteHistories'],
									distDb['noteHistories'],
									function () {
										cb();
									});
							}
							else {
								cb();
							}
						}
						else {
							console.log(name + ' NO ');
							cb();
						}
					});
				}, function () {
					callback(true);
				});
			});
			
		},

		dbNames: ['notebooks', 'notes', 'tags', 'images', 'attachs', 'noteHistories'],

		// 迁移到独立目录
		migrateAllDBs: function (userId, callback, msgCallbac) {
			var me = this;
			var names = me.dbNames;
			// notes, notebooks, tags, attachs, images, noteHistories
			// 判断当前db是否是全局的, 如果不是, 则初始化全局的
			var sourceDb = {};
			if (Api.userService.hasDB) {
				Api.dbService.initIt(sourceDb, names, '', false);
			}
			else {
				sourceDb = Api.dbService;
			}

			// 如果dist数据存在, 则删除之, 不用删除, 大不了插入失败

			// 初始化dist
			var distDb = {};
			Api.dbService.initIt(distDb, names, userId, true);

			// OK, 为每个表进行迁移
			async.eachSeries(names, function(name, cb) {
				msgCallbac('正在优化 ' + name);
				console.log('正在优化 ' + name);

				if (name === 'noteHistories') {
					cb();
					return;
				}
				
				me.migrateEach(userId, sourceDb, distDb, name, function(ok) {
					if (ok) {
						console.log(name + ' Over');
						msgCallbac(name + ' 优化完成');
					}
					else {
						console.log(name + ' 迁移失败');
					}
					cb();
				});
			}, function () {
				// 如果优化的是当前的用户, 则需要将db的表替换成distDb
				if (Api.userService.getCurActiveUserId() == userId) {
					for (var i = 0; i < names.length; ++i) {
						var name = names[i];
						Api.dbService[name] = distDb[name];
					}
				}
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

		_deleteDB: function (userId, callback) {
			var me = this;

			// 判断当前db是否是全局的, 如果不是, 则初始化全局的
			var names = me.dbNames;
			var sourceDb = {};
			if (Api.userService.hasDB) {
				Api.dbService.initIt(sourceDb, names, '', false);
			}
			else {
				sourceDb = Api.dbService;
			}

			var names = ['notebooks', 'notes', 'tags', 'images', 'attachs'];
			var db = sourceDb;
			var query = {UserId: userId};
			async.eachSeries(names, function (name, cb) {
				var dbIt = db[name];
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
						me._deleteNoteHistories(sourceDb, docs, function () {
							// 删除自己
							dbIt.remove(query, { multi: true },function () {
								cb();
							});
						});
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

		_deleteUser: function(userInfo, callback) {
			var me = this;
			var userId = userInfo.UserId;

			// 1. 删除附件,图片
			Api.userService.deleteUserImagesAndAttachsPath(userId);

			// 2. 删除之
			Api.userService.deleteUser(userId);

			// 3. 删除其它表
			// 如果有自己独立的表, 则把文件夹删除即可
			if (userInfo.HasDB) {
				var dbPath = Api.userService.getUserDBPath(userId);
				if (dbPath) {
					Api.commonService.deleteFolderRecursive(dbPath);
				}
				callback();
			}
			// 没有, 那就要一个个删除了
			else {

				me._deleteDB(userId, function () {
					callback();
				});
			}
		},

		// 删除用户
		// TODO 删除用户后, 要发事件, 通过menu更新切换账户的列表
		deleteUser: function(userId) {
			var me = this;
			if (confirm(me.getMsg("Are you sure, it can't be recovered after it has been deleted"))) {
				Api.loading.show();
				Api.userService.getUser(userId, function (user) {
					me._deleteUser(user, function() {
						Api.trigger('deleteUser');

						Api.loading.setMsg(me.getMsg('Deleted'));
						Api.loading.hide(2000);
					});
				});
			}
		}
	};

	return setLang;

});
