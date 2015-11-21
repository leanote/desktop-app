/**
 *
 * 帐户管理
 * 
 * @author life life@leante.com
 * @date 2015/11/21
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
				"Open Dir": "打开目录",
				"Data": "数据",
				"Options": "操作",
				"Current": "当前",
				"Delete": "删除",
				"Close": "关闭",

				"Optimizing": "正在优化",
				"Completed": "优化完成",

				"Error": "错误",
				"No such account": "无该帐户",
				"Are you sure, it can't be recovered after it has been deleted": "确定要删除该帐户? 本地的数据将彻底删除",
			},
			'zh-hk': {
				'Accounts': '帳戶管理',
				"Username": "用戶名",
				"Is Local": "本地帳戶",
				"Yes": "是",
				"No": "否",
				"DB Optimization": "數據庫優化",
				"Open Dir": "打開目錄",
				"Data": "數據",
				"Options": "操作",
				"Current": "當前",
				"Delete": "刪除",
				"Close": "關閉",

				"Optimizing": "正在優化",
				"Completed": "優化完成",

				"Error": "錯誤",
				"No such account": "無該帳戶",
				"Are you sure, it can't be recovered after it has been deleted": "確定要刪除該帳戶? 本地的數據將徹底刪除",
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
		            <button type="button" class="btn btn-default upgrade-cancel-btn lang" data-dismiss="modal" class="lang">Close</button>
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
					me.deleteUser(userId, function (ok) {
						if (ok) {
							$targetBtn.closest('tr').remove();
						}
					});
				}
			};

			// 事件
			me.tbody.on('click', '.op', function () {
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

		userLength: 0,
		curUser: null,

		renderUser: function(user, renderToExists) {
			var me = this;
			var username = user.Username;
			if (user.IsActive) {
				username += ' <span class="label label-success">' + me.getMsg('Current') + '</span>';
			}
			if (user.Email) {
				username += '<br /><i>' + user.Email + '</i>';
			}
			
			var tr = '<td>' + username + '</td>';

			tr += '<td>' + (user.IsLocal ? me.getMsg('Yes') : me.getMsg('No')) + '</td>';

			// 当用户只有一个时, 也可以删除自己
			var disabled = user.IsActive && me.userLength > 1 ? 'disabled="disabled"' : '';

			if (user.IsActive) {
				me.curUser = user;
			}

			// 得到用户的数据统计
			var userStats = Api.userService.getUserDataStats(user);

			var dataTd = '<ul class="user-data">';
			dataTd += '<li>数据库 '
				+ me.fixSize(userStats.db)
				+ '<a data-op="open-db-dir" class="op">' + me.getMsg('Open Dir') + '</a>'
				+ '<a data-op="db" class="op">' + me.getMsg('DB Optimization') + '</a>'
				+ ' </li>'
			dataTd += '<li>图片 '
				+ me.fixSize(userStats.image)
				+ '<a data-op="open-image-dir" class="op">' + me.getMsg('Open Dir') + '</a>'
				+ ' </li>'
			dataTd += '<li>附件 '
				+ me.fixSize(userStats.attach)
				+ '<a data-op="open-attach-dir" class="op">' + me.getMsg('Open Dir') + '</a>'
				+ ' </li>'
			dataTd += '</ul>';

			tr += '<td>' + dataTd + '</td>';

			var options = '<div class="btn-group" role="group">'
				+ '<button class="op btn btn-danger" ' + disabled + ' data-op="delete">' + me.getMsg('Delete') + '</button>'
				+ '</div>';
			tr += '<td>' + options + '</td>';

			if (renderToExists) {
				me.tbody.find('[data-id="' + user.UserId + '"]').html(tr);
				return;
			}

			var trContainer = '<tr data-id="' + user.UserId + '">'
				+ tr
				+ '</tr>';
			return trContainer;
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
				me.userLength = users.length;
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
			Api.loading.show('', {hideClose: true});
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
					Api.loading.setMsg(me.getMsg('Completed'), false);

					me.renderUser(user, true);
					return;
				}

				if (!async) {
					async = require('async');
				}

				me.migrateAllDBs(userId, function (ok) {
					// 迁移成功后, 更新HasDB
					Api.userService.setUserHasDB(userId, function () {
						Api.loading.setMsg(me.getMsg('Completed'), false);
						Api.loading.hide(2000);

						me.renderUser(user, true);
					});
				}, function (msg) {
					Api.loading.setMsg(msg, false);
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
				msgCallbac(me.getMsg('Optimizing') + ' ' + name);
				// console.log('正在优化 ' + name);

				if (name === 'noteHistories') {
					cb();
					return;
				}
				
				me.migrateEach(userId, sourceDb, distDb, name, function(ok) {
					if (ok) {
						// console.log(name + ' Over');
						msgCallbac(name + ' ' + me.getMsg('Completed'));
					}
					else {
						// console.log(name + ' 迁移失败');
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
		deleteUser: function(userId, callback) {
			var me = this;
			if (confirm(me.getMsg("Are you sure, it can't be recovered after it has been deleted"))) {

				Api.loading.show('', {hideClose: true});

				Api.userService.getUser(userId, function (user) {
					me._deleteUser(user, function() {
						Api.trigger('deleteUser');

						Api.loading.setMsg(me.getMsg('Deleted'), false);
						Api.loading.hide(2000);

						callback(true);

						// 当前是活跃用户删除的, 回到登录页
						if (user.IsActive) {
							Api.switchToLoginWhenNoUser();
							return;
						}

						me.userLength--;
						// 当只有一个用户时, 重新renderActive行, 可以删除
						if (me.userLength == 1) {
							me.renderUser(me.curUser, true);
						}
					});
				});
			}
			else {
				callback(false);
			}
		}
	};

	return setLang;

});
