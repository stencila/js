import doctrine from 'doctrine'

export default function compileFunction (name, decl, code, docs) {
  let methods = {}
  let description, title, summary
  for (let doc of docs) {
    let method = {}
    let params = []
    let _return
    let examples = []
    if (doc) {
      // Strip spaces and asterisks from front of each line
      let jsdoc = doc.replace(/^\s*\*?/mg, '')
      // Parse JSDoc documentation
      const {_description, _tags} = doctrine.parse(jsdoc, {
        sloppy: true // allow optional parameters to be specified in brackets
      })
      if (!description) description = _description
      else method.description = _description
      // Process tags
      for (let tag of _tags) {
        switch (tag.title) {
          // Tags which always apply to the function as a whole
          case 'name':
            if (tag.name !== name) throw new Error(`Documentation tag @name with name "${tag.name}" differs from name in function definition`)
            break
          case 'title':
            title = tag.description
            break
          case 'summary':
            summary = tag.description
            break
          case 'description':
            description = tag.description
            break
          // Tags applied to indivdual methods
          case 'param':
            let param = {
              name: tag.name || `par${params.length + 1}`
            }
            if (tag.type) {
              if (tag.type.type === 'RestType') {
                param.type = _extractType(tag)
                param.repeats = true
              } else if (tag.type.type === 'NameExpression' && tag.type.name.substring(0, 3) === '___') {
                param.type = tag.type.name.substring(3)
                param.extends = true
              } else {
                param.type = _extractType(tag)
              }
            }
            if (tag.description) param.description = tag.description
            params.push(param)
            break
          case 'return':
            _return = {}
            if (tag.type) _return.type = _extractType(tag)
            if (tag.description) _return.description = tag.description
            break
          case 'example':
            let example = {
              usage: tag.description
            }
            if (tag.caption) example.caption = tag.caption
            examples.push(example)
            break
        }
      }
    } else {
      // Process each parameter declaration node into a parameter spec
      for (let node of decl.params) {
        let param = {}
        switch (node.type) {
          case 'Identifier':
            if (node.name.substring(0, 3) === '___') {
              param.name = node.name.substring(3)
              param.extends = true
            } else {
              param.name = node.name
            }
            break
          case 'RestElement':
            param.name = node.argument.name
            param.repeats = true
            break
          case 'AssignmentPattern':
            param.name = node.left.name
            param.default = code.substring(node.right.start, node.right.end)
            break
          default:
            throw new Error(`Unhandled parameter node type "${node.type}"`)
        }
        params.push(param)
      }
    }

    if (params.length || _return || examples.length) {
      let signature = name + '(' + params.map(param => {
        return param.name + (param.type ? `: ${param.type}` : '')
      }).join(', ') + ')'
      if (_return) signature += `: ${_return.type}`
      method.signature = signature

      if (params.length) method.params = params
      if (_return) method.return = _return
      if (examples.length) method.examples = examples

      methods[signature] = method
    }
  }
  // Ensure that there is always at least one method
  if (Object.values(methods).length === 0) {
    let signature = name + '()'
    methods[signature] = { signature }
  }
  return {
    type: 'function',
    code,
    name,
    methods,
    description,
    title,
    summary
  }
}

// Extract the type specification for a `@param` or `@return` tag
function _extractType (tag) {
  switch (tag.type.type) {
    case 'AllLiteral':
      return 'any'
    case 'NameExpression':
      return tag.type.name
    case 'UnionType':
      return tag.type.elements.map((element) => element.name).join('|')
    case 'TypeApplication':
      return tag.type.expression.name + '[' +
             tag.type.applications.map((application) => application.name).join(',') + ']'
    case 'OptionalType':
      return tag.default ? tag.type.expression.name : 'null'
    case 'RestType':
      return tag.type.expression.name
    default:
      throw new Error('Unhandled type specification: ' + tag.type.type)
  }
}
