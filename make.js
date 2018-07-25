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

const COMMONJS_OPTS = {
  namedExports: { 'acorn/dist/walk.js': [ 'simple', 'base', 'ancestor' ] }
}

// bundling the lib with rollup for browsers
// the browser bundle needs an alias for 'doctrine'
// pointing to the generated doctrine browser bundle
b.task('build:lib:browser', ['bundle:doctrine'], () => {
  b.js('index.js', {
    output: [
      {
        file: 'dist/stencila-js.js',
        format: 'umd',
        name: 'stencilaJs'
      }
    ],
    alias: {
      'doctrine': path.join(__dirname, 'tmp', 'doctrine.browser.js')
    },
    commonjs: COMMONJS_OPTS
    // minify: true
  })
})

// bundling the lib with rollup for node
b.task('build:lib:node', () => {
  b.js('index.js', {
    output: [{
      file: 'dist/stencila-js.cjs.js',
      format: 'cjs'
    }],
    external: ['doctrine'],
    commonjs: COMMONJS_OPTS
  })
})

// bundling tests for use in the browser
b.task('build:test:browser', ['bundle:doctrine', 'build:lib:browser'], () => {
  const INDEX_JS = path.join(__dirname, 'index.js')
  let globals = {
    'tape': 'substanceTest.test',
    'substance-test': 'substanceTest',
    'lodash-es': 'substance'
  }
  globals[INDEX_JS] = 'stencilaJs'
  b.js('test/index.js', {
    output: [{
      file: 'tmp/tests.js',
      format: 'umd',
      name: 'StencilaJsTests',
      globals
    }],
    alias: {
      'doctrine': path.join(__dirname, 'tmp', 'doctrine.browser.js')
    },
    external: [ 'tape', 'substance-test', 'lodash-es', INDEX_JS ],
    commonjs: COMMONJS_OPTS
  })
})
