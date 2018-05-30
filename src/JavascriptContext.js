import compileJavascript from './compileJavascript'
import packError from './packError'
import collectArgs from './collectArgs'

/**
 * An execution context for Javascript.
 */
export default class JavascriptContext {
  constructor (host, id) {
    this._host = host
    if (!id) throw new Error('id is required')
    this._id = id
    /**
     * Values residing in this context
     *
     * @type {Object}
     */
    this._values = new Map()

    // TODO: might be that we are interested in a more general approach
    // involving 'library' type values.
    this._libraries = new Map()
  }

  get id () {
    return this._id
  }

  importLibrary (lib) {
    this._libraries.set(lib.name, lib)
  }

  pack (value, cell) {
    if (value === null) {
      return { type: 'null', data: null }
    }
    if (typeof value === 'function') {
      return {
        type: 'function',
        data: {
          // a function is registered via this id
          // so it is possible to have a function with the same name in
          // different documents
          id: `${cell.id}@${value.name}`,
          // TODO: how
          name: value.name,
          // so that the host knows to call this context
          context: this._id,
          // full specification created by compileFunction()
          spec: value._spec
        }
      }
    }
    if (value.type === 'image') {
      return { type: 'image', src: value.src }
    } else {
      let type = value.type || typeof value
      return { type, data: value }
    }
  }

  // NOTE: this is async because we envisage to support pointer types
  async unpack (value) {
    const type = value.type
    switch (type) {
      default: return value.data
    }
  }

  async compile (cell) {
    Object.assign(cell, compileJavascript(cell.code, cell))
    return cell
  }

  async execute (cell) {
    let code = cell.code
    if (cell.outputs) {
      code += `;\nreturn [${cell.outputs.map(o => o.name).join(', ')}]`
    }
    // Get the names and values of cell inputs
    let {inputNames, inputValues} = this._collectInputs(cell.inputs)

    // Construct a function from them
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
    const func = new AsyncFunction(...inputNames, code) // eslint-disable-line no-new-func
    // Execute the function, using input values as arguments
    // an converting exceptions into error messages
    let result
    try {
      result = await func(...inputValues)
    } catch (error) {
      let { message, line, column } = packError(error)
      cell.messages.push({
        type: 'error',
        line,
        column,
        message
      })
    }
    if (cell.outputs) {
      for (let idx = 0; idx < cell.outputs.length; idx++) {
        let output = cell.outputs[idx]
        let outputValue = result[idx]
        let packedValue = await this.pack(outputValue, cell)
        output.value = packedValue
        // TODO: rethink. Polluting the global scope without any awareness
        // of scopes is not sufficient.
        // For instance a  user could run two notebooks which
        // happen to contain a local function with the same name
        // Instead the function should be stored maybe with
        // an id derived from cell and output name
        if (outputValue && outputValue.type === 'function') {
          this._values.set(packedValue.data.id, output.value)
        }
      }
    }
    return cell
  }

  async evaluateCall (call) {
    const func = this.resolve(call.func)
    let { args, namedArgs } = await collectArgs(func, call, { unpack: (v) => this.unpack(v) })
    let value
    if (namedArgs) {
      value = func.body(...args, namedArgs)
    } else {
      value = func.body(...args)
    }
    // Execute the actual function call
    if (value !== undefined) {
      call.value = await this.pack(value)
    }
    return call
  }

  async _collectInputs (inputs) {
    let inputNames = []
    let inputValues = []
    for (let { name, value } of inputs) {
      let type = value.type
      let data = value.data
      let inputValue
      // TODO: if it is a local function, then take it from
      // otherwise create a call proxy
      if (type === 'function') {
        if (data.context === this._id) {
          inputValue = this.resolve(value)
        } else {
          console.error('SUPPORT CALLING ACROSS CONTEXTS VIA HOST AND FUNCTION VALUES')
          inputValue = function () {}
        }
      } else {
        inputValue = await this.unpack(value)
      }
      inputNames.push(name)
      inputValues.push(inputValue)
    }
    return { inputNames, inputValues }
  }

  resolve (node) {
    let value
    // allow for values that are stored by id
    if (node.id) {
      value = this._values[node.id]
    } else if (node.library) {
      // allow for lookup for a specific library value
      let library = this._libraries.get(node.library)
      // TODO: library should just have values
      // for sake of consistency, we should think about a similar
      // layout as other value types
      value = library.funcs[node.name]
    } else {
      // look in all libraries
      console.error('TODO: would prefer to reference a specific library')
      const name = node.name
      // TODO: rethink. This is a bit too implicit
      // IMO the engine should be aware when a library symbol
      // is used and add everything to resolve this explicitly
      for (let library of this._libraries.values()) {
        value = library.funcs[name]
        if (value) break
      }
    }
    if (!value) throw new Error(`Could not resolve value "${node.id || node.name}"`)
    return value
  }
}
