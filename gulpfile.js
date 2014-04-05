var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    mocha = require('gulp-mocha'),
    complexity = require('gulp-complexity'),
    git = require('gulp-git'),
    bump = require('gulp-bump');

gulp.task('complexity', function () {
    gulp.src('lib/**/*.js')
        .pipe(complexity({
            cyclomatic: [5],
            halstead: [16],
            maintainability: [100]
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
            reporter: 'spec',
            bail: true
        }));
});

gulp.task('release', function () {
    var version = require('./package.json').version;

    return gulp.src('./package.json')
        .pipe(git.commit(version))
        .pipe(git.tag(version, version))
        .pipe(git.push("origin", "master"));
});

gulp.task('bump', function () {
    gulp.src('./package.json')
        .pipe(bump({ type: 'build'}))
        .pipe(gulp.dest('./'));
});

gulp.task('watch', function () {
    gulp.watch(['**/*.js', '!node_modules/**/*.js'], ['default']);
});

gulp.task('default', ['lint', 'test']);
gulp.task('tdd', ['default', 'watch']);
gulp.task('publish', ['bump', 'release']);
