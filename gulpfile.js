var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    mocha = require('gulp-mocha'),
    complexity = require('gulp-complexity'),
    git = require('gulp-git'),
    bump = require('gulp-bump'),
    debug = require('gulp-debug'),
    argv = require('minimist')(process.argv.slice(3));

gulp.task('complexity', function () {
    return gulp.src('lib/**/*.js')
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
    return gulp.src('test/unit/*.js', { read: false })
        .pipe(mocha({
            reporter: 'spec',
            bail: false
        }));
});

gulp.task('test', [ 'test-unit' ], function () {
    return gulp.src('test/e2e/*.js', { read: false })
        .pipe(mocha({
            reporter: 'spec',
            bail: false
        }));
});

gulp.task('bump', function () {
    var packageFile = "./package.json";

    gulp.src(packageFile)
        .pipe(bump({ type: argv.type || 'build'}))
        .pipe(gulp.dest('./'))
        .on('end', function () {
            var newVersion = require(packageFile).version;

            gulp.src(packageFile)
                .pipe(git.commit(newVersion));

            git.tag(newVersion, newVersion);
            git.push("origin", "master", { args: "--tags" })
                .end();
        });
});

gulp.task('tdd-watch', function () {
    gulp.watch([ 'lib/*.js', 'test/**/*.js' ], [ 'test' ]);
});

gulp.task('default', [ 'lint', 'test' ]);
gulp.task('tdd', [ 'test', 'tdd-watch' ]);
