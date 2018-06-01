import parseValue from './parseValue'
import extractFunctionSpecFromDoc from './extractFunctionSpecFromDoc'

// TODO: bring back features from the original implementation.
export default function compileFunction (name, decl, code, commentBlocks) {
  let spec = {
    type: 'function',
    code,
    name
  }

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

  let method = {}
  let signature = name + '(' + params.map(param => {
    return param.name + (param.type ? `: ${param.type}` : '')
  }).join(', ') + ')'
  if (_return) signature += `: ${_return.type}`
  method.signature = signature
  method.params = params
  if (_return) method.return = _return
  if (examples) method.examples = examples

  // TODO: how would there be multiple method specs?
  let methods = {}
  methods[signature] = method

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
      if (!method.params) {
        console.error('signature does not have params but found @param in documentation')
      } else {
        let params = {}
        method.params.map(p => {
          params[p.name] = p
        })
        for (let [_name, _p] of details.params) {
          let p = params[_name]
          if (!p) {
            console.error('@param given for a parameter that is not contained in the signature')
            continue
          }
          Object.assign(p, _p)
        }
      }
    }
  }

  spec.methods = methods
  if (description) spec.description = description
  if (title) spec.title = title
  if (summary) spec.summary = summary

  // Ensure that there is always at least one method
  // if (Object.values(methods).length === 0) {
  //   let signature = name + '()'
  //   methods[signature] = { signature }
  // }

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
