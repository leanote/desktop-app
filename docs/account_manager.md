# 用户管理


## 用户数据分表存储

公共表: users, g

其它的表: notes, notebooks, noteHistories, attachs, images, tags
其实主要是notes, noteHistories 两个表的数据量

存储在:
nedb55/userId/

## noteHistories 数量限制

1) 数量限制可配置, 10-50
2) 自动保存不修改