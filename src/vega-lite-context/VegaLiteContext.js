const vegaLite = require('vega-lite')

const VegaContext = require('../vega-context/VegaContext')

/**
 * A Vega-Lite context
 *
 * Implements the Stencila `Context` API for rendering [Vega-Lite](https://vega.github.io/vega-lite/),
 * a high-level visualization grammar using JSON syntax.
 */
class VegaLiteContext extends VegaContext {

  /**
   * Execute (i.e. render) a Vega-Lite specification
   *
   * @param  {String} code   The code chunk
   * @param  {Object} inputs An object with a data package for each input variable
   * @return {Object}        An object with any `errors` (an object with line numbers as keys) and `outputs` (
   *                         a data package)
   *
   * @example
   *
   * // Evaluate an expression...
   * context.execute('{data: {values: ...}, encoding: {x: ...}}')
   */
  execute (code, inputs) {
    // Prepare code into a Vega-Lite spec
    let spec = this.prepare(code, inputs)
    // Compile Vega-Lite spec to Vega spec
    let vegaSpec
    if (spec) vegaSpec = vegaLite.compile(spec).spec
    else vegaSpec = null
    // Render it using base class method
    return super.execute(vegaSpec)
  }

}

module.exports = VegaLiteContext