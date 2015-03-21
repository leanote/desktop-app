var gulp = require('gulp');
var rename = require("gulp-rename");
var del = require('del');
var runSequence = require('run-sequence');
var clean = require('gulp-clean');

// 复制nw

gulp.task('cl', function () {
	return gulp.src('dist').pipe(clean({force: true}));
});	
gulp.task('cpNw', function () {
	// del(['dist/mac'], function (err, deletedFiles) {
	gulp.src('nw/mac/nw.app/**/*').pipe(gulp.dest('dist/mac/leanote.app'));
	// });
});

// 复制源文件
gulp.task('cpSrc', function () {
	// 复制文件到app中
	gulp.src('src/public/**/*').pipe(gulp.dest('dist/mac/leanote.app/Contents/Resources/app.nw/public'));
	gulp.src('src/node_modules/**/*').pipe(gulp.dest('dist/mac/leanote.app/Contents/Resources/app.nw/node_modules'));
	gulp.src('src/package_mac.json').pipe(rename("package.json")).pipe(gulp.dest('dist/mac/leanote.app/Contents/Resources/app.nw/'));
	gulp.src(['src/note.html', 'src/login.html']).pipe(gulp.dest('dist/mac/leanote.app/Contents/Resources/app.nw/'));

	/*
	gulp.src('app/styles/main.css').pipe(gulp.dest('dist/styles/'));
	gulp.src('app/scripts/jquery.treeview/jquery.treeview.css').pipe(gulp.dest('dist/styles/'))
	gulp.src('app/scripts/jquery.treeview/images/*').pipe(gulp.dest('dist/styles/images/'))
	gulp.src(['app/question.html', 'app/index.html', 'app/feedback.html', 'app/search.html', 'app/cate.html', 'app/search.html']).pipe(gulp.dest('dist/'))
	gulp.src('app/images/*').pipe(gulp.dest('dist/images'))
	gulp.src('app/scripts/require.js').pipe(gulp.dest('dist/scripts/'))
	*/
});

gulp.task('default', function(cb) {
	runSequence('cl', 'cpNw', 'cpSrc', cb);
});