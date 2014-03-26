var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    mocha = require('gulp-mocha'),
    complexity = require('gulp-complexity');

gulp.task('complexity', function () {
    gulp.src('lib/**/*.js')
        .pipe(complexity({
            errorsOnly: false,
            cyclomatic: 1,
            halstead: 16,
            maintainability: 100
        }));
});

gulp.task('lint', function () {
    gulp.src(['gulpfile.js', 'lib/**/*.js', 'test/**/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('test', function () {
    gulp.src('test/**/*.js', { read: false })
        .pipe(mocha({
            reporter: 'spec'
        }))
        .on('error', function () {});
});

gulp.task('watch', function () {
    gulp.watch(['**/*.js', '!node_modules/**/*.js'], ['default']);
});

gulp.task('default', ['complexity', 'lint', 'test']);
gulp.task('tdd', ['default', 'watch']);
