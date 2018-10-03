import { ancestor as ancestorWalk } from 'acorn/dist/walk'

/*
  Finds variables and function calls that are not declared locally.
*/
export default function findGlobals (ast, options = {}) {
  let ignore = options.ignore || new Set()

  if (!(ast && typeof ast === 'object' && ast.type === 'Program')) {
    throw new TypeError('Source must be either a string of JavaScript or an acorn AST')
  }
  let candidates = []
  function _captureCandidate (node, parents) {
    node.parents = parents.slice()
    candidates.push(node)
  }
  // First pass: capture declared variables and record potential candidates
  ancestorWalk(ast, {
    'VariableDeclaration': function (node, parents) {
      let parent = _getParentScope(node, parents)
      // TODO: what does this?
      node.declarations.forEach(function (declaration) {
        _declarePattern(declaration.id, parent)
      })
    },
    'FunctionDeclaration': function (node, parents) {
      let parent = _getParentScope(node, parents, 1)
      parent.locals[node.id.name] = true
      _declareFunction(node)
    },
    'Function': _declareFunction,
    'ClassDeclaration': function (node, parents) {
      let parent = _getParentScope(node, parents, 1)
      parent.locals[node.id.name] = true
    },
    'TryStatement': function (node) {
      const handler = node.handler
      if (handler === null) return
      _initScope(handler)
      handler.locals[handler.param.name] = true
    },
    'ImportDefaultSpecifier': _declareModuleSpecifier,
    'ImportSpecifier': _declareModuleSpecifier,
    'ImportNamespaceSpecifier': _declareModuleSpecifier,
    // collect candidates
    'VariablePattern': _captureCandidate,
    'Identifier': _captureCandidate,
    'ThisExpression': _captureCandidate,
    'FunctionExpression': _captureCandidate
  })

  let globals = new Set()
  candidates.forEach(node => {
    if (_isGlobal(node, node.parents)) {
      const name = node.type === 'ThisExpression' ? 'this' : node.name
      // skip ignored globals, which is useful to ignore built-ins for instance
      if (ignore.has(name)) return
      globals.add(name)
    }
  })
  return globals
}

const BLOCK_DECLS = new Set(['let', 'const'])
const BLOCKS_WITH_DECLS = new Set(['ForInStatement'])

function _getParentScope (node, parents, skipLast = 0) {
  let scope
  if (BLOCK_DECLS.has(node.kind)) {
    scope = __getParentBlockScope(node, parents, skipLast)
  } else {
    scope = __getToplevelScope(node, parents, skipLast)
  }
  return _initScope(scope)
}

function __getParentBlockScope (node, parents, skipLast) {
  for (let i = parents.length - 1 - skipLast; i >= 0; i--) {
    const parent = parents[i]
    if (BLOCKS_WITH_DECLS.has(parent.type)) {
      return parent.body
    } else if (_isBlockScope(parent)) {
      return parent
    }
  }
}

function __getToplevelScope (node, parents, skipLast) {
  for (let i = parents.length - 1 - skipLast; i >= 0; i--) {
    const parent = parents[i]
    if (_isScope(parent)) {
      return parent
    }
  }
}

function _initScope (scope) {
  if (!scope.locals) scope.locals = {}
  return scope
}

function _isGlobal (node, parents) {
  if (node.type === 'ThisExpression') {
    for (let i = parents.length - 1; i >= 0; i--) {
      let parent = parents[i]
      if (_declaresThis(parent)) {
        return false
      }
    }
  } else {
    let name = node.name
    // TODO: what is this?
    if (name === 'undefined') return
    for (let i = parents.length - 1; i >= 0; i--) {
      let parent = parents[i]
      let scope
      // TODO: do we want this? using a keyword for variables is not good practise
      if (name === 'arguments' && _declaresArguments(parent)) {
        return false
      }
      if (BLOCKS_WITH_DECLS.has(parent.type)) {
        scope = parent.body
      } else {
        scope = parent
      }
      if (scope.locals && name in scope.locals) {
        return false
      }
    }
  }
  return true
}

function _isScope (node) {
  return node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration' || node.type === 'ArrowFunctionExpression' || node.type === 'Program'
}

function _isBlockScope (node) {
  return node.type === 'BlockStatement' || _isScope(node)
}

function _declaresArguments (node) {
  return node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration'
}

function _declaresThis (node) {
  return node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration'
}

function _declareFunction (node) {
  let fn = node
  fn.locals = fn.locals || {}
  node.params.forEach(function (node) {
    _declarePattern(node, fn)
  })
  if (node.id) {
    fn.locals[node.id.name] = true
  }
}

function _declarePattern (node, scope) {
  switch (node.type) {
    case 'Identifier':
      scope.locals[node.name] = true
      break
    case 'ObjectPattern':
      node.properties.forEach(function (node) {
        _declarePattern(node.value, scope)
      })
      break
    case 'ArrayPattern':
      node.elements.forEach(function (node) {
        if (node) _declarePattern(node, scope)
      })
      break
    case 'RestElement':
      _declarePattern(node.argument, scope)
      break
    case 'AssignmentPattern':
      _declarePattern(node.left, scope)
      break
    // istanbul ignore next
    default:
      throw new Error('Unrecognized pattern type: ' + node.type)
  }
}

function _declareModuleSpecifier (ast, node) {
  ast.locals = ast.locals || {}
  ast.locals[node.local.name] = true
}
