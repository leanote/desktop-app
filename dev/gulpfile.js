'use strict';

var fs = require('fs')
var path = require('path')
var gulp = require('gulp')
var gutil = require('gulp-util')
var less = require('gulp-less');
var cleanCSS = require('gulp-clean-css');

var styleDir = '../public/themes';
var styleDir2 = '../public/css';

// 解析less
gulp.task('less', function() {
    gulp.src(styleDir + '/**/*.less')
        .pipe(less())
        .pipe(cleanCSS({compatibility: 'ie8', processImportFrom: ['!icon/iconfont.css', '!inhope-icon/style.css']}))
        .pipe(gulp.dest(styleDir))
        .pipe(gulp.dest(styleDir));

    gulp.src(styleDir2 + '/**/*.less')
        .pipe(less())
        .pipe(cleanCSS({compatibility: 'ie8', processImportFrom: ['!icon/iconfont.css', '!inhope-icon/style.css']}))
        .pipe(gulp.dest(styleDir2))
        .pipe(gulp.dest(styleDir2));

    gutil.log(gutil.colors.green('less ok'));
});

// 开发服务
gulp.task('dev', ['less'], function() {
    gulp.watch(styleDir + '/**/*.less', ['less']);
    gulp.watch(styleDir2 + '/**/*.less', ['less']);
});

gulp.task('default', ['dev']);
