# 判断内容Dirty

page.js 绑定tinymce keydown事件, 在not readonly下, 只要按键就设为dirty = true
在切换笔记前, dirty=false
保存后, dirty=false

ace editor
只要keydown就是dirty