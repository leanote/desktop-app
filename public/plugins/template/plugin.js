/**
 * 模版插件
 */
define(function() {
    var template = {
        langs: {
            'en-us': {
                'newNoteByTemplate': 'new Note by template',
                'template': 'Template',
                'close': 'Close',
                'newNote': 'New Note',
                'warning': 'Warning',
                'select-template': 'Select Template Please.',
                'new-note-fail': 'New note fail. ',
            },
            'de-de': {
                'newNoteByTemplate': 'Neue Notiz aus Vorlage',
                'template': 'Vorlage',
                'close': 'Schliessen',
                'newNote': 'Neue Notiz',
                'warning': 'Warnung',
                'select-template': 'Bitte Vorlage auswählen.',
                'new-note-fail': 'Notiz erstellen fehlgeschlagen. ',
            },
            'zh-cn': {
                'newNoteByTemplate': '通过模版创建笔记',
                'template': '模版',
                'close': '关闭',
                'newNote': '新建笔记',
                'warning': '警告',
                'select-template': '请先选择模版。',
                'new-note-fail': '新建笔记失败。',
            },
            'zh-hk': {
                'newNoteByTemplate': '通過模板創建筆記',
                'template': '模板',
                'close': '關閉',
                'newNote': '新建筆記',
                'warning': '警告',
                'select-template': '請先選擇模板。',
                'new-note-fail': '新建筆記失敗。',
            },
            'ja-jp': {
                'newNoteByTemplate': '雛形に基づいてノート新規',
                'template': '雛形',
                'close': '閉じる',
                'newNote': 'ノート新規',
                'warning': '警告',
                'select-template': '先ずに雛形を選択してください。',
                'new-note-fail': 'ノートを新規することが失敗でした。',
            }
        },
        _tpl: `
        <style>
        ul li {
            list-style-type: none;
            margin:0 -30px;
            border-bottom: 1px dashed #eee;
        }
        #template_list {
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 150px;
            overflow: hidden;
            border: 3px solid #2DB590;
            overflow: scroll;
        }
        #template_detail {
            position: absolute;
            bottom: 1px;
            top: 1px;
            right: 1px;
            left: 155px;
            border: 3px solid #B3BDC5;
            overflow: scroll;
        }
        ul li a:hover {
            color: #B3B2C5;
            backgroud-color: #E7E7E7;
        }    /* 当有鼠标悬停在链接上 */
        #templateDialog .modal-body {
            height: 400px;
        }       
        .custom_template {
            position: absolute;
            top: 10px;
            bottom: 10px;
            right: 10px;
            left: 10px;
        }
        </style>
        <div class="modal fade bs-modal-sm" id="templateDialog" tabindex="-1" role="dialog" aria-labelledby="mySmallModalLabel">
            <div class="modal-dialog">
              <div class="modal-content">
                  <div class="modal-header">
                      
                  </div>

                  <div class="modal-body">
                    <div id="template_list"></div>
                    <div id="template_detail">

                    </div>
                  </div>

                  <div class="modal-footer ">
                    
                  </div>
              </div><!-- /.modal-content -->
            </div><!-- /.modal-dialog -->
        </div><!-- /.modal -->
        `,
        getMsg: function(txt, data) {
            return Api.getMsg(txt, 'plugin.template', data)
        },
        // 获取模版列表
        getTemplates: function() {
            var ul = '<ul id="template_ul">'

            // 遍历模版目录，得到模版
            var templateBasePath = __dirname + "/public/templates";
            var dirs = Api.nodeFs.readdirSync(templateBasePath);
            for (index in dirs) {
                var dir = dirs[index];
                // 读取配置信息
                var json = Api.commonService.getFileJson(templateBasePath + '/' + dir + '/template.json');
                if (!json) {
                    continue;
                }
                if (json.released === false) {
                    continue;
                }

                var templatePrefixLang = 'template.' + dir;
                Api.addLangMsgs(json.langs, templatePrefixLang);
                var name = Api.getMsg('name', templatePrefixLang);
                if(!name) {
                    continue;
                }
                ul += '<li><a data-click="showTemplateDetail" data-name="'+dir+'" class="op"><span>'+name+'</span></a></li>'; 
            }
            return ul + '</ul>';
        },
        // 通过弹出框展示模版列表
        dialogTemplates: function() {
            var me = this;
            me.body = $('body');
            me.body.append(me._tpl);  
            me.dialog = $("#templateDialog");

            var modalHeader = 
                '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>\
                <h4 class="modal-title" class="modalTitle"><span class="lang">'+me.getMsg("template")+'</span></h4>\
                ';
            var modalFooter = 
                '<button id="newNoteByTemplate" type="button" class="btn btn-primary">'+me.getMsg("newNote")+'</button>\
                <button type="button" class="btn btn-default upgrade-cancel-btn lang" data-dismiss="modal" class="lang">'+me.getMsg("close")+'</button>\
                ';

            $('#templateDialog .modal-header').html(modalHeader);
            $('#templateDialog .modal-footer').html(modalFooter);            
            $('#template_list').html(me.getTemplates());
        },
        curTemplateName: '',
        init: function() {
            var me = this;
            me.dialogTemplates();
            me.dialog.modal('show');
            // 事件
            var op2Func = {
                // 显示模版
                showTemplateDetail: function(template_name) {
                    $('#template_detail').html(me.getTemplate(template_name));   
                    me.curTemplateName = template_name;                 
                },
                
            };
            $('#template_list').on('click', '.op', function () {
                var $this = $(this);
                var option = $this.data('click');
                var template_name = $this.data('name');

                var func = op2Func[option];
                if (func) {
                    func(template_name, $this);
                }
            });
            $('#newNoteByTemplate').on('click', function () {
                if(!me.curTemplateName) {
                    Api.gui.dialog.showErrorBox(me.getMsg("warning"), me.getMsg("select-template"));
                    return;
                }
                me.newNoteByTemplate();
                me.dialog.modal('hide');
                $('#template_detail').html();
            });
        },
        // 获取模版
        getTemplate: function(template_name) {
            var templateBasePath = __dirname + "/public/templates";
            var dir = templateBasePath + '/' + template_name + '/template.leanote';
            var templateFormat = fs.readFileSync(dir,'UTF-8');
            return templateFormat;
        },
        // 应用模版创建笔记
        newNoteByTemplate: function() {
            var me = this;
            // 新建笔记
            var notebookId = $("#curNotebookForNewNote").attr('notebookId');
            Api.note.newNote(notebookId);
            // 获取当前笔记
            var curNote = Api.note.getCurNote();
            if(!curNote) {
                Api.gui.dialog.showErrorBox(me.getMsg("warning"), me.getMsg("new-note-fail"));
                return;
            }

            $('#editorContent').html(me.getTemplate(me.curTemplateName));
        },

        // app 打开前
        onOpen: function() {
            var me = this;
            var gui = Api.gui;

            var menu = new gui.MenuItem({
                label: me.getMsg('newNoteByTemplate'),
                click: function () {                    
                    me.init();
                }
            });
            // 设置
            Api.addMoreMenu(menu);
        },

        // app 打开后
        onOpenAfter: function() {
        },

        // 关闭时需要运行的
        onClose: function() {
        }
    };
    return template;
});