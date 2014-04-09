var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    mocha = require('gulp-mocha'),
    complexity = require('gulp-complexity'),
    git = require('gulp-git'),
    bump = require('gulp-bump'),
    argv = require('minimist')(process.argv.slice(3));

gulp.task('complexity', function () {
    gulp.src('lib/**/*.js')
        .pipe(complexity({
            cyclomatic: [5],
            halstead: [16],
            maintainability: [100]
        }));
});

gulp.task('lint', function () {
    return gulp.src(['gulpfile.js', 'lib/**/*.js', 'test/**/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('test-unit', function () {
    gulp.src('test/unit/*.js', { read: false })
        .pipe(mocha({
            reporter: 'spec',
            bail: false
        }));
});

gulp.task('test-e2e', function () {
    gulp.src('test/e2e/*.js', { read: false })
        .pipe(mocha({
            reporter: 'spec',
            bail: false
        }));
});

gulp.task('release', [ 'bump' ], function () {
    var version = require('./package.json').version;

    gulp.src('./package.json')
        .pipe(git.commit(version));

    git.tag(version, version);

    return git.push("origin", "master");
});

gulp.task('bump', function () {
    return gulp.src('./package.json')
        .pipe(bump({ type: argv.type || 'build'}))
        .pipe(gulp.dest('./'));
});

gulp.task('tdd-watch', function () {
    gulp.watch(['**/*.js', '!node_modules/**/*.js'], ['test-unit']);
});

gulp.task('default', ['lint', 'test-unit', 'test-e2e']);
gulp.task('tdd', ['test-unit', 'tdd-watch']);
