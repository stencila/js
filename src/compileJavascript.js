import { parse } from 'acorn'
import { generate as generateCode } from 'astring/src/astring'
import compileFunction from './compileFunction'
import findGlobals from './findGlobals'
import packError from './packError'
import JSGLOBALS from './JSGLOBALS'

const GLOBALS = new Set(JSGLOBALS)

export default function compileJavascript (code, options = {}) {
  const exprOnly = Boolean(options.expr)

  let inputs = []
  let messages = []

  // Parse the code
  let ast
  let docs = []
  let isExpr
  try {
    ast = _parse(code, {
      onComment: (block, text, start, end) => {
        if (block) {
          docs.push({ start, end, text })
        }
      }
    })
    isExpr = _isSimpleExpression(ast)
  } catch (error) {
    messages.push(packError(error))
  }

  // simple expressions (such as in Sheet cells)
  if (messages.length === 0 && exprOnly) {
    if (!isExpr) {
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
  let outputName, outputExpr, spec
  if (messages.length === 0) {
    ([outputName, outputExpr, spec] = _extractOutput(ast, inputs, code, docs))
  }
  let outputs = []
  // named output, i.e. exporting the result by name
  if (outputName) {
    let _output = {}
    // set name or expr (not both)
    if (outputName) {
      _output.name = outputName
    }
    if (spec) {
      _output.spec = spec
    }
    outputs.push(_output)
  }

  let cell = {
    type: 'cell',
    code,
    inputs,
    outputs,
    messages
  }

  if (isExpr) {
    cell.expr = true
  }
  // for complex expressions store the outputExpr
  // so that we can create a return statement
  if (outputExpr) {
    cell.implicitReturn = outputExpr
  }

  return cell
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

function _extractOutput (ast, inputs, code, docs) {
  let name, valueExpr, spec
  // If the last top level node in the AST is a FunctionDeclaration,
  // VariableDeclaration or Identifier then use it's name as the name name
  let last = ast.body.pop()
  if (last) {
    switch (last.type) {
      case 'FunctionDeclaration':
        name = last.id.name
        spec = compileFunction(name, last, code, docs)
        valueExpr = name
        break
      case 'ExportDefaultDeclaration':
        // Currently, only handle exported functions
        const decl = last.declaration
        if (decl.type === 'FunctionDeclaration') {
          name = decl.id.name
          spec = compileFunction(name, decl, code, docs)
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
  return [name, valueExpr, spec]
}
