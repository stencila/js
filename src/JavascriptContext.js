import { isNil } from 'substance'
import compileJavascript from './compileJavascript'
import packError from './packError'
import collectArgs from './collectArgs'
import { pack, unpack } from './types'

/**
 * An execution context for Javascript.
 */
export default class JavascriptContext {
  constructor (host, id) {
    this._host = host

    // every context needs to have a unique id
    if (!id) throw new Error('id is required')
    this._id = id

    /**
     * Values residing in this context.
     *
     * @type {Map} a map of packed values
     */
    this._values = new Map()

    // TODO: might be that we are interested in a more general approach
    // involving 'library' type values.
    this._libraries = new Map()
  }

  get id () {
    return this._id
  }

  // NOTE: not clear yet if this will stay
  importLibrary (lib) {
    this._libraries.set(lib.name, lib)
  }

  pack (value, opts = {}) {
    opts.context = this
    return pack(value, opts)
  }

  unpack (pkg) {
    return unpack(pkg)
  }

  async compile (cell) {
    Object.assign(cell, compileJavascript(cell.code, cell))
    return cell
  }

  async execute (cell) {
    // don't execute empty code
    if (!cell.code) return cell

    let outputs = cell.outputs
    // TODO: we need some kind of sourcemap here, e.g. using magicstring
    // TODO: support multi-outputs by returning an array of values
    let code
    // exporting a named expression
    if (outputs.length > 0 && outputs[0].name) {
      code = [cell.code, ';\nreturn ', outputs[0].name].join('')
    // simple expression (unnamed)
    } else if (cell.expr) {
      code = ['return (', cell.code, ')'].join('')
    // multi-line with implicit return
    } else if (cell.implicitReturn) {
      code = [cell.code, ';\nreturn ', cell.implicitReturn].join('')
    } else {
      code = cell.code
    }
    // Get the names and values of cell inputs
    let {inputNames, inputValues} = await this._collectInputs(cell.inputs)
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

    const setValue = async (output, value) => {
      let packedValue = await this.pack(value, { cell })
      output.value = packedValue
      // TODO: rethink. Polluting the global scope is not a good idea.
      // For instance a  user could run two notebooks which
      // happen to contain a local function with the same name
      // Instead the function should be stored maybe with
      // an id derived from cell and output name
      if (value && packedValue.type === 'function') {
        const spec = output.spec
        let funcEntry = {
          id: packedValue.data.id,
          type: 'function',
          name: spec.name,
          methods: spec.methods,
          body: value
        }
        this._values.set(funcEntry.id, funcEntry)
      }
    }

    if (typeof result === 'undefined') {
      // If the cell has an output but that output is undefined
      // then treat it as an error
      cell.messages.push({
        type: 'error',
        message: 'Cell output value is undefined'
      })
    } else {
      // TODO: thing about multi-outputs. When the time has come.
      // implicit returns: either if cells.expr or cells. there are two cases
      if (cell.implicitReturn) {
        outputs.push({})
      }
      if (outputs.length > 0) {
        await setValue(outputs[0], result)
      }
    }

    return cell
  }

  async evaluateCall (call) {
    const func = this.resolveFunction(call.func)
    let { args, namedArgs } = await collectArgs(func, call, { unpack: v => this.unpack(v) })
    let value
    if (namedArgs) {
      value = func.body(...args, namedArgs)
    } else {
      value = func.body(...args)
    }
    if (value !== undefined) {
      call.value = await this.pack(value)
    }
    return call
  }

  async _collectInputs (inputs) {
    let inputNames = []
    let inputValues = []
    for (let {name, value} of inputs) {
      let inputValue
      if (isNil(value)) {
        inputValue = null
      } else {
        let type = value.type
        let data = value.data
        // TODO: if it is a local function, then take it from
        // otherwise create a call proxy
        if (type === 'function') {
          if (data.context === this._id) {
            inputValue = this.resolveFunction(value)
          } else {
            console.error('SUPPORT CALLING ACROSS CONTEXTS VIA HOST AND FUNCTION VALUES')
            inputValue = function () {}
          }
        } else {
          inputValue = await this.unpack(value)
        }
      }

      inputNames.push(name)
      inputValues.push(inputValue)
    }
    return { inputNames, inputValues }
  }

  resolve (node) {
    // ATM we only support function types
    if (node.type === 'function') {
      return this.resolveFunction(node)
    }
  }

  resolveFunction (node) {
    // TODO: there is
    const { id, name, library } = node.data
    let value
    // first try to look up via id
    if (id) {
      let entry = this._values.get(id)
      value = entry
    }
    // TODO: if we want something like this
    // then try to find the value in a specific library
    if (!value && library && name) {
      // allow for lookup for a specific library value
      let lib = this._libraries.get(library)
      // TODO: library should just have values
      // for sake of consistency, we should think about a similar
      // layout as other value types
      value = lib.funcs[name]
    }
    // finally look for the value in all registered libraries
    if (!value && name) {
      // look in all libraries
      console.error('TODO: would prefer to reference a specific library')
      // TODO: rethink. This is a bit too implicit
      // IMO the engine should be aware when a library symbol
      // is used and add everything to resolve this explicitly
      for (let lib of this._libraries.values()) {
        value = lib.funcs[name]
        if (value) break
      }
    }
    if (!value) throw new Error(`Could not resolve value "${id || name}"`)
    return value
  }
}
