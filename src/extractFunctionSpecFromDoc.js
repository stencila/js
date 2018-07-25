import doctrine from 'doctrine'

export default function extractFunctionSpecFromDoc (doc) {
  let description, name, title, summary, examples, params, _return
  let parsed = doctrine.parse(doc, {
    unwrap: true, // let doctrine remove the comment stuff
    sloppy: true // allow optional parameters to be specified in brackets
  })
  description = parsed.description
  for (let tag of parsed.tags) {
    switch (tag.title) {
      // Tags which always apply to the function as a whole
      case 'name':
        if (name) console.error('duplicate @name')
        name = tag.name
        break
      case 'title':
        if (title) console.error('duplicate @title')
        title = tag.description
        break
      case 'summary':
        if (summary) console.error('duplicate @summary')
        summary = tag.description
        break
      case 'description':
        if (description) console.error('duplicate @description')
        description = tag.description
        break
      // Tags applied to indivdual methods
      case 'param':
        if (!tag.name) {
          console.error('@param should have a name:  expected format @param [type] <name> [description]')
        } else {
          let param = { name: tag.name }
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
          if (!params) params = new Map()
          if (params.has(param.name)) {
            console.error('duplicate @param for ' + param.name)
          }
          params.set(param.name, param)
        }
        break
      case 'return':
        if (!tag.type && !tag.description) {
          console.error('@return is empty')
        } else {
          if (_return) {
            console.error('duplicate @return')
          }
          _return = {}
          if (tag.type) _return.type = _extractType(tag)
          if (tag.description) _return.description = tag.description
        }
        break
      case 'example':
        let example = { usage: tag.description }
        if (tag.caption) example.caption = tag.caption
        if (!examples) examples = []
        examples.push(example)
        break
      default:
        //
    }
  }
  return { name, title, description, summary, examples, params, _return }
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
