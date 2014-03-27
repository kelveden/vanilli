module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        complexity: {
            generic: {
                src: ['lib/**/*.js'],
                options: {
                    cyclometric: 5,
                    halstead: 16,
                    maintainability: 100
                }
            }
        },
        jshint: {
            all: [
                'Gruntfile.js',
                'lib/**/*.js',
                'test/**/*.js'
            ],
            options: {
                jshintrc: '.jshintrc'
            }
        },
        mochacli: {
            options: {
                reporter: 'spec',
                ui: 'bdd',
                files: ['test/**/*.js'],
                require: ['better-stack-traces'],
                bail: false
            },
            tdd: {
                options: {
                    force: true
                }
            },
            test: { }
        },
        watch: {
            js: {
                files: [ '**/*.js', '!node_modules/**/*.js' ],
                tasks: [ 'tdd' ],
                options: {
                    nospawn: true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-complexity');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-mocha-cli');
    grunt.loadNpmTasks('grunt-release');

    grunt.registerTask('ci', ['jshint', 'mochacli:test']);
    grunt.registerTask('tdd', ['jshint', 'mochacli:tdd', 'watch' ]);
    grunt.registerTask('publish', ['ci', 'release' ]);

    grunt.registerTask('default', ['ci']);
};
