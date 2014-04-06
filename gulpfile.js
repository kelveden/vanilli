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

gulp.task('test', function () {
    return gulp.src('test/**/*.js', { read: false })
        .pipe(mocha({
            reporter: 'spec',
            bail: true
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

gulp.task('watch', function () {
    gulp.watch(['**/*.js', '!node_modules/**/*.js'], ['default']);
});

gulp.task('temp', function () {
    console.log(argv);
});

gulp.task('default', ['lint', 'test']);
gulp.task('tdd', ['default', 'watch']);