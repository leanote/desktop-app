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
				"Current": "当前"
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
				'open-db-dir': '',
				'open-files-dir': '',
				'delete': ''
			};

			// 事件
			me.tbody.on('click', 'button', function () {
				var $this = $(this);
				var userId = $this.closest('tr').data('id');
				var option = $this.data('op');

				var func = op2Func[option];
				if (func) {
					func(userId);
				}
			});
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

			var options = '<div class="btn-group" role="group">'
				+ '<button class="btn btn-default" data-op="db">' + me.getMsg('DB Optimization') + '</button>'
				+ '<button class="btn btn-default" data-op="open-db-dir">' + me.getMsg('Open DB Dir') + '</button>'
				+ '<button class="btn btn-default" data-op="open-files-dir">' + me.getMsg('Open Images/Attachs Dir') + '</button>'
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
					alert('Error');
					Api.loading.hide();
					return;
				}

				// 已经存在
				if (user.HasDB) {
					Api.loading.hide(3000);
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
		// 迁移到独立目录
		migrateAllDBs: function (userId, callback, msgCallbac) {
			var me = this;
			var names = ['notebooks', 'notes', 'tags', 'images', 'attachs', 'noteHistories'];
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
				callback();
			});
		}
	};

	return setLang;

});
