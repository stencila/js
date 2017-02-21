const buble = require('buble')

const {pack, unpack} = require('../packing')
const require_ = typeof window !== 'undefined' ? require('../need') : require

/**
 * A Javascript context
 *
 * Implements the Stencila `Context` API for executing chunks
 * of Javascript code. The main (and currently, only!) method is `execute`.
 * It takes a chunck of code and, optionally, any inputs (i.e. arguments).
 * It returns any errors and an output value (i.e. return value).
 * See the examples given below.
 */
class JsContext {

  constructor (options) {
    this.options = options || {}

    if (typeof this.options.transform === 'undefined') {
      // By default transform code chunks whenin the browser
      this.options.transform = typeof window !== 'undefined'
    }

    this.globals = {}
  }

  /**
   * Execute a chunk of code
   *
   * @param {string} code  The code chunk
   * @param {object} inputs - An object with a data package for each input variable
   * @param {object} options - Any execution options
   * @return {object}        An object with any `errors` (an object with line numbers as keys) and `outputs` (
   *                         a data package)
   *
   * @example
   *
   * // Evaluate an expression...
   * context.execute('6*7') // { errors: {}, output: { type: 'int', format: 'text', value: '42' } }
   *
   * // Output is the value of the last line,
   * context.execute('let x = 6\nx*7') // { errors: {}, output: { type: 'int', format: 'text', value: '42' } }
   *
   * // If the last line is blank there is no output (this is intended for code chunks that have side effects e.g. set up data),
   * context.execute('let x = 6\nx*7\n\n') // { errors: {}, output: null }
   *
   * // You can specify input variables (that are local to that call),
   * context.execute('Math.PI*radius', {radius:{type:'flt', format:'text', value: '21.4'}}) // { errors: {}, output: { type: 'flt', format: 'text', value: '67.23008278682157' } }
   * context.execute('radius') // { errors: { '1': 'ReferenceError: radius is not defined' }, output: null }
   *
   * // You can also assign global variables which are available in subsequent calls,
   * context.execute('globals.foo = "bar"\n\n') // { errors: {}, output: null }
   * context.execute('foo') // { errors: {}, output: { type: 'str', format: 'text', value: 'bar' } }
   */
  execute (code, inputs, options) {
    code = code || ''
    inputs = inputs || {}
    options = options || {}
    if (options.pack !== false) options.pack = true

    let error = null

    // Add inputs to `locals` i.e. the execution's local scope
    let locals = {}
    for (let name in inputs) {
      locals[name] = unpack(inputs[name])
    }

    // Generate a function body. The [IIFE](https://en.wikipedia.org/wiki/Immediately-invoked_function_expression)
    // prevents errors during `buble.transform` associated with any return statements (must be within a func)
    let body = '(function(){\n' + code + '\n})()'

    // Transform the code
    if (this.options.transform) {
      try {
        body = buble.transform(body).code
      } catch (e) {
        // Catch a syntax error
        error = e
      }
    }

    // Create a function to be executed with locals and globals
    let func = null
    try {
      func = Function('require', 'locals', 'globals', 'with(globals){ with(locals){ return ' + body + '}}') // eslint-disable-line no-new-func
    } catch (e) {
      // Catch a syntax error (not caught above if no transformation)
      error = e
    }

    // Execute function capturing errors and any output
    let output = null
    if (func) {
      try {
        output = func(require_, locals, this.globals)
      } catch (e) {
        // Catch any errors
        error = e
      }
    }

    let errors = null
    if (error) {
      // Parse the error stack to get message and line number
      let lines = error.stack.split('\n')
      let message = lines[0]
      let match = lines[1].match(/<anonymous>:(\d+):\d+/)
      let line = 0
      if (match) line = parseInt(match[1]) - 3
      errors = {}
      errors[line] = message
    }

    if (output === undefined) output = null
    else if (output && options.pack) output = pack(output)

    return {
      errors: errors,
      output: output
    }
  }

}

module.exports = JsContext