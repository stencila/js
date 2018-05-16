let b = require('substance-bundler')
let path = require('path')

b.task('clean', () => {
  b.rm('tmp')
  b.rm('dist')
})

b.task('default', ['clean', 'build'])

b.task('build', ['build:lib:browser', 'build:lib:node'])

b.task('test:browser', ['build:test:browser'])

// bundling doctrine with browserify
b.task('bundle:doctrine', () => {
  b.browserify('./node_modules/doctrine/lib/doctrine.js', {
    dest: './tmp/doctrine.browser.js',
    exports: ['default'],
    debug: false
  })
})

// bundling the lib with rollup
// the browser bundle needs an alias for 'doctrine'
// pointing to the generated doctrine browser bundle
b.task('build:lib:browser', ['bundle:doctrine'], () => {
  b.js('src/index.js', {
    output: [
      {
        file: 'dist/stencila-js.min.js',
        format: 'umd',
        name: 'StencilaJs',
      }
    ],
    alias: {
      'doctrine': path.join(__dirname, 'tmp', 'doctrine.browser.js')
    },
    commonjs: true,
    minify: true
  })
})

b.task('build:lib:node', () => {
  b.js('src/index.js', {
    output: [
      {
        file: 'dist/stencila-js.cjs.js',
        format: 'cjs',
      }
    ],
    external: ['doctrine'],
    commonjs: true
  })
})

b.task('build:test:browser', ['bundle:doctrine'], () => {
  b.js('test/index.js', {
    output: [
      {
        file: 'tmp/tests.js',
        format: 'umd',
        name: 'StencilaJsTests',
        globals: {
          'tape': 'substanceTest.test'
        }
      }
    ],
    alias: {
      'doctrine': path.join(__dirname, 'tmp', 'doctrine.browser.js')
    },
    external: [ 'tape' ],
    commonjs: true
  })
})
