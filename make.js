let b = require('substance-bundler')
let path = require('path')

b.rm('tmp')

b.browserify('./node_modules/doctrine/lib/doctrine.js', {
  dest: './tmp/doctrine.browser.js',
  exports: ['default'],
  debug: false
})

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
