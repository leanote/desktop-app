// 装饰, 不是立刻就需要的功能
// 1. 历史记录
// todo
// 2. history
// 3. note info
// requirejs.config({
//     paths: {
//         'history': 'public/js/dec/history',
//     }
// });

// 异步加载
var requireWeb = require;
setTimeout(function () {
    requireWeb(['public/js/dec/history']);
});
