// TODO: this should go into its own repo: `stencila/types`
import { isNil } from 'substance'

// Parent of each type
const parentTypes = {
  'any': null,
  'null': 'any',
  'boolean': 'any',
  'number': 'any',
  'integer': 'number',
  'string': 'any',
  'object': 'any',
  'array': 'any',
  'array[boolean]': 'array',
  'array[number]': 'array',
  'array[integer]': 'array[number]',
  'array[string]': 'array',
  'array[object]': 'array',
  'table': 'any'
}

// Children of each type
const childrenTypes = {}
for (let type of Object.keys(parentTypes)) {
  if (!childrenTypes[type]) childrenTypes[type] = []
  let base = parentTypes[type]
  if (!base) continue
  if (childrenTypes[base]) childrenTypes[base].push(type)
  else childrenTypes[base] = [type]
}

// Descendants (children, grandchildren etc) of each type
const descendantTypes = {}
for (let type of Object.keys(parentTypes)) {
  if (!descendantTypes[type]) descendantTypes[type] = []
  let parent = parentTypes[type]
  while (parent) {
    if (descendantTypes[parent]) descendantTypes[parent].push(type)
    else descendantTypes[parent] = [type]
    parent = parentTypes[parent]
  }
}

export { parentTypes, childrenTypes, descendantTypes }

export function coercedArrayType (arr) {
  let valType = arr.reduce(_mostSpecificType, undefined)
  if (valType === 'any') {
    return 'array'
  } else {
    return `array[${valType}]`
  }
}

/**
 * Get the type code for a value
 *
 * @memberof value
 * @param {*} value - A JavaScript value
 * @return {string} - Type code for value
 */
export function type (value) {
  let type = typeof value

  if (isNil(value) === null) {
    return 'null'
  } else if (type === 'boolean') {
    return 'boolean'
  } else if (type === 'number') {
    let isInteger = false
    if (value.isInteger) isInteger = value.isInteger()
    else isInteger = (value % 1) === 0
    return isInteger ? 'integer' : 'number'
  } else if (type === 'string') {
    return 'string'
  } else if (type === 'object') {
    if (value.constructor === Array) {
      return 'array'
    }
    if (value.type) return value.type
    else return 'object'
  } else {
    return 'unknown'
  }
}

/*
  A helper to get a coerced array value from a given array of values.
*/
export function coerceArray (arr) {
  return {
    type: coercedArrayType(arr),
    data: arr.map(v => {
      if (v) {
        return v.data
      } else {
        return undefined
      }
    })
  }
}

function _mostSpecificType (type, next) {
  if (!next) return 'any'
  let nextType = next.type
  if (!type) return nextType
  if (type === nextType) {
    return type
  }
  switch (type) {
    case 'number': {
      if (nextType === 'integer') {
        return 'number'
      }
      break
    }
    case 'integer': {
      if (nextType === 'number') {
        return 'number'
      }
      break
    }
    default:
      //
  }
  return 'any'
}

export function pack (value, opts = {}) {
  if (isNil(value)) {
    return { type: 'null', data: null }
  }
  if (typeof value === 'function') {
    let contextId
    if (opts.context) contextId = opts.context.id
    return {
      type: 'function',
      data: {
        id: value.id,
        name: value.name,
        context: contextId
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

export function unpack (pkg) {
  if (isNil(pkg)) return undefined
  return pkg.data
}
