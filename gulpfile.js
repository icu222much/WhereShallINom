'use strict';

const gulp = require('gulp');
const babel = require('gulp-babel'); // syntax transformer for ES2015+
const concat = require('gulp-concat'); // concat files
const connect = require('gulp-connect'); // run local dev server
const less = require('gulp-less'); // css pre processor
const lint = require('gulp-eslint'); // lint js files
const merge = require('merge-stream'); // merges files
const open = require('gulp-open'); // open url in browser
const path = require('path'); // joining paths
const source = require('vinyl-source-stream'); // conventional text gulp streams
const uglify = require('gulp-uglify'); // uglify js
const uglifyCss = require('gulp-uglifycss'); //uglify css

const config = {
    port: 9005,
    devBaseUrl: 'http://localhost',
    paths: {
        html: [
            './src/*.html',
        ],
        js: './src/**/*.js',
        images: './src/images/**/*',
        css: [
            'node_modules/reset-css/reset.css'
        ],
        less: [
            './src/*.less',
            './src/**/*.less'
        ],
        dist: './dist',
        js: [
            'node_modules/jquery/dist/jquery.min.js',
            './src/**/*.js'
        ]
    }
};

// start local dev
gulp.task('connect', function() {
    connect.server({
        root: ['dist'],
        port: config.port,
        base: config.devBaseUrl,
        livereload: true
    });
});

gulp.task('open', ['connect'], function() {
    gulp.src('dist/index.html')
        .pipe(open({uri: config.devBaseUrl + ':' + config.port + '/'}));
});

gulp.task('html', function() {
    gulp.src(config.paths.html)
        .pipe(gulp.dest(config.paths.dist))
        .pipe(connect.reload());
});

gulp.task('js', function() {
    gulp.src(config.paths.js)
        .pipe(concat('script.js'))
        .pipe(babel({
            presets: ['env']
        }))
        .pipe(uglify())
        .pipe(gulp.dest(config.paths.dist + '/scripts'))
        .pipe(connect.reload());
});

gulp.task('css', function() {
    var cssStream = gulp.src(config.paths.css)
        .pipe(concat('bundle.css'));

    var lessStream = gulp.src(config.paths.less)
        .pipe(less({
            paths: [ path.join(__dirname, 'less', 'includes') ]
        }));

    var streams = merge(cssStream, lessStream)
        .pipe(uglifyCss())
        .pipe(concat('style.css'))
        .pipe(gulp.dest(config.paths.dist + '/css'))
        .pipe(connect.reload());

    return streams;
});

gulp.task('images', function() {
    gulp.src(config.paths.images)
        .pipe(gulp.dest(config.paths.dist + '/images'))
        .pipe(connect.reload());
});

gulp.task('watch', function() {
    gulp.watch(config.paths.html, ['html']);
    gulp.watch(config.paths.js, ['js']);
    gulp.watch(config.paths.css, ['css']);
    gulp.watch(config.paths.less, ['css']);
    gulp.watch(config.paths.images, ['images']);
});

gulp.task('default', ['html', 'js', 'css', 'images', 'open', 'watch']);