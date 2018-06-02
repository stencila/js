import parseValue from './parseValue'
import extractFunctionSpecFromDoc from './extractFunctionSpecFromDoc'

// TODO: bring back features from the original implementation.
export default function compileFunction (name, decl, code, commentBlocks) {
  let params = []
  for (let node of decl.params) {
    let param = {}
    switch (node.type) {
      case 'Identifier':
        // TODO: what is an 'extensible' parameter?
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
        param.default = parseValue(code.substring(node.right.start, node.right.end))
        break
      default:
        throw new Error(`Unhandled parameter node type "${node.type}"`)
    }
    params.push(param)
  }

  // TODO: extract this from the comment block if available
  let description, title, summary, examples, _return

  let commentBlock = getDocForDecl(code, decl, commentBlocks)
  if (commentBlock) {
    let details = extractFunctionSpecFromDoc(commentBlock.text)
    if (details.name && name !== details.name) {
      console.error('@name does not match function name')
    }
    if (details.description) description = details.description
    if (details.title) title = details.title
    if (details.summary) summary = details.summary
    if (details.params) {
      let paramsMap = {}
      params.forEach(p => {
        paramsMap[p.name] = p
      })
      for (let [_name, _p] of details.params) {
        let p = paramsMap[_name]
        if (!p) {
          console.error('@param given for a parameter that is not contained in the signature')
          continue
        }
        Object.assign(p, _p)
      }
    }
    _return = details._return
    examples = details.examples
  }

  let method = {}
  let signature = name + '(' + params.map(param => {
    return param.name + (param.type ? `: ${param.type}` : '')
  }).join(', ') + ')'
  if (_return) signature += `: ${_return.type}`
  method.signature = signature
  method.params = params
  if (_return) method.return = _return
  if (examples) method.examples = examples

  let spec = {
    type: 'function',
    code,
    name
  }
  if (title) spec.title = title
  if (summary) spec.summary = summary
  if (description) spec.description = description
  // TODO: how would there be multiple method specs?
  let methods = {}
  methods[signature] = method
  spec.methods = methods

  return spec
}

// only a comment block directly in front of the function decl is considered
function getDocForDecl (code, decl, commentBlocks) {
  for (let i = 0; i < commentBlocks.length; i++) {
    let block = commentBlocks[i]
    // we can stop early as the blocks are sorted
    if (block.end > decl.start) return
    // only whitespace is allowed between the comment block and the declaration
    if (/^\s*$/.exec(code.slice(block.end, decl.start))) {
      return block
    }
  }
}
