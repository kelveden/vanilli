module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        complexity: {
            generic: {
                src: ['app/**/*.js'],
                options: {
                    errorsOnly: false,
                    cyclometric: 6,       // default is 3
                    halstead: 16,         // default is 8
                    maintainability: 100  // default is 100
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
                require: ['better-stack-traces']
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
        },
        bump: {
            options: {
                files: [ 'package.json' ],
                commitFiles: [ 'package.json' ],
                pushTo: "origin"
            }
        }
    });

    grunt.loadNpmTasks('grunt-complexity');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-mocha-cli');
    grunt.loadNpmTasks('grunt-bump');

    grunt.registerTask('ci', ['complexity', 'jshint', 'mochacli:test']);
    grunt.registerTask('tdd', ['complexity', 'jshint', 'mochacli:tdd', 'watch' ]);
    grunt.registerTask('release', ['ci', 'bump' ]);

    grunt.registerTask('default', ['ci']);
};
