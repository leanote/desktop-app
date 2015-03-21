var gulp = require('gulp');
var rename = require("gulp-rename");
var runSequence = require('run-sequence');
var clean = require('gulp-clean');

//-----------
// mac
//-----------

// 清理
gulp.task('clMac', function () {
	return gulp.src('dist/mac').pipe(clean({force: true}));
});	
gulp.task('cpMacNw', function () {
	gulp.src('nw/mac/nw.app/**/*').pipe(gulp.dest('dist/mac/leanote.app'));
});

// 复制源文件
gulp.task('cpMacSrc', function () {
	// mac
	gulp.src('src/public/**/*').pipe(gulp.dest('dist/mac/leanote.app/Contents/Resources/app.nw/public'));
	gulp.src('src/node_modules/**/*').pipe(gulp.dest('dist/mac/leanote.app/Contents/Resources/app.nw/node_modules'));
	gulp.src('src/package_mac.json').pipe(rename("package.json")).pipe(gulp.dest('dist/mac/leanote.app/Contents/Resources/app.nw/'));
	gulp.src(['src/note.html', 'src/login.html']).pipe(gulp.dest('dist/mac/leanote.app/Contents/Resources/app.nw/'));
});

//------------
// windows
//------------

gulp.task('clWindows', function () {
	return gulp.src('dist/windows').pipe(clean({force: true}));
});	
gulp.task('cpWindowsNw', function () {
	gulp.src('nw/windows/**/*').pipe(gulp.dest('dist/windows/'));
});

gulp.task('cpWindowsSrc', function () {
	// windows
	gulp.src('src/public/**/*').pipe(gulp.dest('dist/windows/public'));
	gulp.src('src/node_modules/**/*').pipe(gulp.dest('dist/windows/node_modules'));
	gulp.src('src/package_windows.json').pipe(rename("package.json")).pipe(gulp.dest('dist/windows/'));
	gulp.src(['src/note.html', 'src/login.html']).pipe(gulp.dest('dist/windows/'));
});

// mac & windows
gulp.task('mac', function(cb) {
	runSequence('clMac', 'cpMacNw', 'cpMacSrc', cb);
});

gulp.task('windows', function(cb) {
	runSequence('clWindows', 'cpWindowsNw', 'cpWindowsSrc', cb);
});

gulp.task('default', function(cb) {
	runSequence('mac', 'windows', cb);
});