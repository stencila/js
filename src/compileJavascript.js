import { parse } from 'acorn'
import { generate as generateCode } from 'astring/src/astring'
import findGlobals from './findGlobals'
import packError from './packError'
import JSGLOBALS from './JSGLOBALS'

const GLOBALS = new Set(JSGLOBALS)

export default function compileJavascript (code, options = {}) {
  const exprOnly = Boolean(options.expr)

  let inputs = []
  let output = null
  let messages = []
  let valueExpr

  // Parse the code
  let ast
  try {
    ast = _parse(code)
  } catch (error) {
    messages.push(packError(error))
  }
  // simple expressions (such as in Sheet cells)
  if (messages.length === 0 && exprOnly) {
    if (!_isSimpleExpression(ast)) {
      messages.push(packError(new Error('Code is not a single, simple expression')))
    }
  }
  // dependency analysis
  if (messages.length === 0) {
    // Note: assumingFthat all variables used as globals are inputs
    let globals = findGlobals(ast, { ignore: GLOBALS })
    for (let name of globals) {
      inputs.push({ name })
    }
  }
  // output value extraction
  if (messages.length === 0) {
    ([output, valueExpr] = _extractOutput(ast, inputs))
  }
  let outputs = []
  if (output) outputs.push({ name: output })

  if (valueExpr) code = code + `;\nreturn ${valueExpr}`

  return {
    type: 'cell',
    code,
    inputs,
    outputs,
    messages
  }
}

// helpers

function _parse (source, options) {
  let parseOptions = Object.assign({}, options,
    {
      allowReturnOutsideFunction: true,
      allowImportExportEverywhere: true,
      allowHashBang: true
    }
  )
  return parse(source, parseOptions)
}

// See http://esprima.readthedocs.io/en/latest/syntax-tree-format.html#expressions-and-patterns
// for a list of expression types
const DISALLOWED_IN_SIMPLEXPRESSION = [
  'AssignmentExpression', 'UpdateExpression', 'AwaitExpression', 'Super'
]

function _isSimpleExpression (ast) {
  if (ast.body.length === 0) return true
  if (ast.body.length > 1) return false
  let node = ast.body[0]
  if (node.type === 'ExpressionStatement') {
    // Only allow simple expressions
    return (DISALLOWED_IN_SIMPLEXPRESSION.indexOf(node.expression.type) < 0)
  }
  // otherwise
  return false
}

function _extractOutput (ast, inputs) {
  let name, valueExpr
  // If the last top level node in the AST is a FunctionDeclaration,
  // VariableDeclaration or Identifier then use it's name as the name name
  let last = ast.body.pop()
  if (last) {
    switch (last.type) {
      case 'FunctionDeclaration':
        name = last.id.name
        // value = this._compileFunction(name, last, source, docs)
        valueExpr = name
        break
      case 'ExportDefaultDeclaration':
        // Currently, only handle exported functions
        const decl = last.declaration
        if (decl.type === 'FunctionDeclaration') {
          name = decl.id.name
          // value = this._compileFunction(name, decl, source, docs)
          valueExpr = name
        }
        break
      case 'VariableDeclaration':
        name = last.declarations[0].id.name
        valueExpr = name
        break
      case 'ExpressionStatement':
        if (last.expression.type === 'Identifier') {
          // If the identifier is not in inputs then use it as the output name
          const id = last.expression.name
          if (inputs.filter(({name}) => name === id).length === 0) {
            name = id
          }
        }
        valueExpr = generateCode(last)
        break
      case 'BlockStatement':
      case 'IfStatement':
        break
      default:
        // During development it can be useful to turn this on
        throw new Error('Unhandled AST node type: ' + last.type)
    }
  }
  return [name, valueExpr]
}