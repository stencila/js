/**
 * Global variable names that should be ignored when determining
 * cell inputs with the `compile()` method
 *
 * @type {Array}
 */
const GLOBALS = [
  // A list of ES6 globals obtained using: Object.keys(require('globals').es6)
  'Array', 'ArrayBuffer', 'Boolean', 'constructor', 'DataView', 'Date', 'decodeURI', 'decodeURIComponent',
  'encodeURI', 'encodeURIComponent', 'Error', 'escape', 'eval', 'EvalError', 'Float32Array', 'Float64Array',
  'Function', 'hasOwnProperty', 'Infinity', 'Int16Array', 'Int32Array', 'Int8Array', 'isFinite', 'isNaN',
  'isPrototypeOf', 'JSON', 'Map', 'Math', 'NaN', 'Number', 'Object', 'parseFloat', 'parseInt', 'Promise',
  'propertyIsEnumerable', 'Proxy', 'RangeError', 'ReferenceError', 'Reflect', 'RegExp', 'Set', 'String',
  'Symbol', 'SyntaxError', 'System', 'toLocaleString', 'toString', 'TypeError', 'Uint16Array', 'Uint32Array',
  'Uint8Array', 'Uint8ClampedArray', 'undefined', 'unescape', 'URIError', 'valueOf', 'WeakMap', 'WeakSet',
  // A list of Node.js globals obtained using: Object.keys(require('globals').node)
  '__dirname', '__filename', 'arguments', 'Buffer', 'clearImmediate', 'clearInterval', 'clearTimeout', 'console',
  'exports', 'GLOBAL', 'global', 'Intl', 'module', 'process', 'require', 'root', 'setImmediate', 'setInterval', 'setTimeout'
]

export default GLOBALS
