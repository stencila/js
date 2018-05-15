import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import uglify from 'rollup-plugin-uglify'

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/stencila-js.min.js',
      format: 'umd',
      name: 'StencilaJs'
    }, {
      file: 'dist/stencila-js.cjs.js',
      format: 'cjs'
    }
  ],
  external: ['doctrine'],
  plugins: [
    resolve(),
    commonjs(),
    uglify()
  ]
}
