export default class Context {
  constructor (host, name) {
    this._host = host
    this._name = name
  }

  /**
   * Pack a native Javascript value into a Stencila document value
   *
   * @param  {Object} value A native Javascript value (e.g. `3.14`)
   * @return {*}            A document value (e.g. `{type: 'number', data: 3.14}`)
   */
  async pack (value) {
    let type
    if (value === null) type = 'null'
    else type = value.type || typeof value
    switch (type) {
      case 'image':
        return {type, src: value.src}
      default:
        return {type, data: value}
    }
  }

  /**
   * Unpack a Stencila document value into a native Javascript value
   *
   * @param  {Object} value A document value (e.g. `{type: 'number', data: 3.14}`)
   * @return {*}            A native Javascript value (e.g. `3.14`)
   */
  async unpack (value) {
    const type = value.type
    switch (type) {
      default: return value.data
    }
  }

  async compile (cell) {
    let source
    if (typeof cell === 'string' || cell instanceof String) {
      source = cell
    } else if (typeof cell === 'function') {
      source = cell.toString()
    } else {
      source = cell.source.data
    }

    return {
      source: {
        type: 'string',
        data: source
      },
      expr: false,
      global: false,
      options: {},
      inputs: [],
      outputs: [],
      messages: []
    }
  }

  async execute (cell) {
    return cell
  }

  async evaluate (node) {
    switch (node.type) {
      case 'get': return this.evaluateGet(node)
      case 'call': return this.evaluateCall(node)
      default: return this.unpack(node)
    }
  }
}
