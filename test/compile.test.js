import test from 'tape'
import { map } from 'lodash-es'
import { compileJavascript } from '../index'

test('compile: empty string', t => {
  let code = ''
  let actual = compileJavascript(code)
  let expected = {
    inputs: [],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)
  t.end()
})

test('compile: syntax error', t => {
  let code, actual, expected

  code = 'foo bar()'
  actual = compileJavascript(code)
  expected = {
    messages: [{
      type: 'error',
      message: 'Syntax error in Javascript: Unexpected token (1:4)',
      line: 1,
      column: 4
    }]
  }
  _isFulfilled(t, actual, expected)

  code = 'for(){'
  actual = compileJavascript(code)
  expected = {
    messages: [{
      type: 'error',
      message: 'Syntax error in Javascript: Unexpected token (1:4)',
      line: 1,
      column: 4
    }]
  }
  _isFulfilled(t, actual, expected)

  t.end()
})

test('compile: Math.pi', t => {
  let code = 'Math.pi'
  let actual = compileJavascript(code)
  let expected = {
    inputs: [],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)
  t.end()
})

test('compile: require()', t => {
  let code = 'const foo = require("foo")\nfoo.bar'
  let actual = compileJavascript(code)
  let expected = {
    inputs: [],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)
  t.end()
})

test('compile: specialFunc()', t => {
  let code = 'const result = specialFunc()'
  let actual = compileJavascript(code)
  let expected = {
    inputs: [{name: 'specialFunc'}],
    outputs: [{name: 'result'}],
    messages: []
  }
  _isFulfilled(t, actual, expected)
  t.end()
})

test('compile: specialMath.pi', t => {
  let code = 'specialMath.pi'
  let actual = compileJavascript(code)
  let expected = {
    inputs: [{name: 'specialMath'}],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)
  t.end()
})

test('compile: last statement is a declaration', t => {
  let code = 'var foo'
  let actual = compileJavascript(code)
  let expected = {
    inputs: [],
    outputs: [{name: 'foo'}],
    messages: []
  }
  _isFulfilled(t, actual, expected)

  code = 'const foo = 1'
  actual = compileJavascript(code)
  expected = {
    inputs: [],
    outputs: [{name: 'foo'}],
    messages: []
  }
  _isFulfilled(t, actual, expected)

  t.end()
})

test('compile: last statement is not locally declared', t => {
  let code = 'foo'
  let actual = compileJavascript(code)
  let expected = {
    inputs: [{name: 'foo'}],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)
  t.end()
})

test('compile: last statement is a locally declared variable', t => {
  let code = 'var foo\nfoo'
  let actual = compileJavascript(code)
  let expected = {
    inputs: [],
    outputs: [{name: 'foo'}],
    messages: []
  }
  _isFulfilled(t, actual, expected)

  code = 'let foo\nfoo'
  actual = compileJavascript(code)
  _isFulfilled(t, actual, expected)

  code = 'const foo = 1\nfoo'
  actual = compileJavascript(code)
  _isFulfilled(t, actual, expected)

  code = 'var foo = 1\nfoo'
  actual = compileJavascript(code)
  _isFulfilled(t, actual, expected)

  t.end()
})

test('compile: last statement is not a declaration', t => {
  let code, actual, expected

  code = 'let foo\nfoo * 3'
  actual = compileJavascript(code)
  expected = {
    inputs: [],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)

  code = 'let foo\n{let baz}'
  actual = compileJavascript(code)
  _isFulfilled(t, actual, expected)

  code = 'let foo\nlet baz\ntrue'
  actual = compileJavascript(code)
  _isFulfilled(t, actual, expected)

  t.end()
})

// Last statement is a declaration with multiple declarations (first identifier used)
test('compile: last statement has multiple declarations', t => {
  let code = 'foo\nbar\nlet baz, urg\n\n'
  let actual = compileJavascript(code)
  let expected = {
    inputs: [{name: 'foo'}, {name: 'bar'}],
    outputs: [{name: 'baz'}],
    messages: []
  }
  _isFulfilled(t, actual, expected)
  t.end()
})

// Only top level variable declarations are considered when
// determining cell inputs
test('compile: complex example with nested and shadowed variables', t => {
  let code = `
    let a;
    { let c };
    for (let b in [1,2,3]){};
    if (true) { const d = 1 };
    function f () { let e = 2 };
    a * b * c * d * e;
  `
  let actual = compileJavascript(code)
  let expected = {
    inputs: [{name: 'b'}, {name: 'c'}, {name: 'd'}, {name: 'e'}],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)
  t.end()
})

// Last statement is not a declaration or identifier
test('compile: last statement is not a declaration or identifier', t => {
  let code = 'let foo\nbar\nlet baz\ntrue'
  let actual = compileJavascript(code)
  let expected = {
    inputs: [{name: 'bar'}],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)
  t.end()
})

test('compile: anoymous arrow function', t => {
  let code = '[1,2,3].map(n => n*2)'
  let actual = compileJavascript(code)
  let expected = {
    inputs: [],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)
  t.end()
})

test('compile: declaration after usage', t => {
  // ATTENTION: the former implementation of this test was expecting an input detected here
  // however this was not correct. While in ES6 variables are only initialised
  // after being declared explicitly, they declaration is hoisted within this block
  // i.e. shadowing access to the global variable
  // Thus the correct expectation is here to have no inputs.
  let code = 'foo\nlet foo\n'
  let actual = compileJavascript(code)
  let expected = {
    inputs: [],
    outputs: [{name: 'foo'}],
    messages: []
  }
  _isFulfilled(t, actual, expected)
  t.end()
})

test('compile: simple expressions', t => {
  let code, actual, expected

  code = '42'
  actual = compileJavascript(code, {expr: true})
  expected = {
    inputs: [],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)

  code = 'x * 3'
  actual = compileJavascript(code, {expr: true})
  expected = {
    inputs: [{name: 'x'}],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)

  t.end()
})

test('compile: not a simple expressions', t => {
  let code, actual, expected

  code = 'let y = x * 3'
  actual = compileJavascript(code, {expr: true})
  expected = {
    messages: [{ line: 0, column: 0, type: 'error', message: 'Error: Code is not a single, simple expression' }]
  }
  _isFulfilled(t, actual, expected)

  code = 'y = x * 3'
  actual = compileJavascript(code, {expr: true})
  _isFulfilled(t, actual, expected)

  code = 'x++'
  actual = compileJavascript(code, {expr: true})
  _isFulfilled(t, actual, expected)

  code = 'y--'
  actual = compileJavascript(code, {expr: true})
  _isFulfilled(t, actual, expected)

  code = 'function foo(){}'
  actual = compileJavascript(code, {expr: true})
  _isFulfilled(t, actual, expected)

  t.end()
})

test('compile: last statement is an expression', t => {
  let code, actual, expected

  code = 'true'
  actual = compileJavascript(code)
  expected = {
    inputs: [],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)

  code = 'foo * 3'
  actual = compileJavascript(code)
  expected = {
    inputs: [{name: 'foo'}],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)

  code = 'var foo = 1\nfoo * 3'
  actual = compileJavascript(code)
  expected = {
    inputs: [],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)

  code = 'let z = x * y;\n(z * 2)'
  actual = compileJavascript(code)
  expected = {
    inputs: [{name: 'x'}, {name: 'y'}],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)

  t.end()
})

test('compile: function', t => {
  let code, actual, expected

  code = 'function afunc (x, y) { return x * y }'
  actual = compileJavascript(code)
  expected = {
    inputs: [],
    outputs: [{
      name: 'afunc',
      spec: {
        type: 'function',
        code: code,
        name: 'afunc',
        methods: {
          'afunc(x, y)': {
            signature: 'afunc(x, y)',
            params: [
              { name: 'x' },
              { name: 'y' }
            ]
          }
        }
      }
    }],
    messages: []
  }
  _isFulfilled(t, actual, expected)

  t.end()
})

test('compile: multiple occurrence', t => {
  let code, actual, expected

  // should not result in multiple inputs of name 'x'
  code = 'x*x*x'
  actual = compileJavascript(code)
  expected = {
    inputs: [{ name: 'x' }],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)

  // symbols should be in order of occurrence
  code = 'x**y*x*y*x'
  actual = compileJavascript(code)
  expected = {
    inputs: [{ name: 'x' }, { name: 'y' }],
    outputs: [],
    messages: []
  }
  _isFulfilled(t, actual, expected)

  t.end()
})

function _isFulfilled (t, cell, expected) {
  let actual = {}
  Object.keys(expected).forEach(n => {
    switch (n) {
      case 'inputs': {
        actual[n] = map(cell[n])
        break
      }
      default:
        actual[n] = cell[n]
    }
  })
  t.deepEqual(actual, expected)
}
