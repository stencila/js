import test from 'tape'
import compileJavascript from '../src/compileJavascript'
import { pick } from 'lodash-es'

function _pick (result) {
  return pick(result, 'inputs', 'outputs', 'messages')
}

test('compileJavascript: empty string', t => {
  let code = ''
  let actual = _pick(compileJavascript(code))
  let expected = {
    inputs: [],
    outputs: [],
    messages: []
  }
  t.deepEqual(actual, expected)
  t.end()
})

test('compileJavascript: syntax error', t => {
  let code = 'foo bar()'
  let actual = _pick(compileJavascript(code))
  let expected = {
    inputs: [],
    outputs: [],
    messages: [{
      type: 'error',
      message: 'Syntax error in Javascript: Unexpected token (1:4)',
      line: 1,
      column: 4
    }]
  }
  t.deepEqual(actual, expected)
  t.end()
})

test('compileJavascript: Math.pi', t => {
  let code = 'Math.pi'
  let actual = _pick(compileJavascript(code))
  let expected = {
    inputs: [],
    outputs: [],
    messages: []
  }
  t.deepEqual(actual, expected)
  t.end()
})

test('compileJavascript: require()', t => {
  let code = 'const foo = require("foo")\nfoo.bar'
  let actual = _pick(compileJavascript(code))
  let expected = {
    inputs: [],
    outputs: [],
    messages: []
  }
  t.deepEqual(actual, expected)
  t.end()
})

test('compileJavascript: specialFunc()', t => {
  let code = 'const result = specialFunc()'
  let actual = _pick(compileJavascript(code))
  let expected = {
    inputs: [{name: 'specialFunc'}],
    outputs: [{name: 'result'}],
    messages: []
  }
  t.deepEqual(actual, expected)
  t.end()
})

test('compileJavascript: specialMath.pi', t => {
  let code = 'specialMath.pi'
  let actual = _pick(compileJavascript(code))
  let expected = {
    inputs: [{name: 'specialMath'}],
    outputs: [],
    messages: []
  }
  t.deepEqual(actual, expected)
  t.end()
})

test('compileJavascript: last statement is a declaration', t => {
  let code = 'var foo'
  let actual = _pick(compileJavascript(code))
  let expected = {
    inputs: [],
    outputs: [{name: 'foo'}],
    messages: []
  }
  t.deepEqual(actual, expected)

  code = 'const foo = 1'
  actual = _pick(compileJavascript(code))
  expected = {
    inputs: [],
    outputs: [{name: 'foo'}],
    messages: []
  }
  t.deepEqual(actual, expected)

  t.end()
})

test('compileJavascript: last is not locally declared', t => {
  let code = 'foo'
  let actual = _pick(compileJavascript(code))
  let expected = {
    inputs: [{name: 'foo'}],
    outputs: [],
    messages: []
  }
  t.deepEqual(actual, expected)
  t.end()
})

test('compileJavascript: last is locally declared variable', t => {
  let code = 'var foo\nfoo'
  let actual = _pick(compileJavascript(code))
  let expected = {
    inputs: [],
    outputs: [{name: 'foo'}],
    messages: []
  }
  t.deepEqual(actual, expected)

  code = 'let foo\nfoo'
  actual = _pick(compileJavascript(code))
  t.deepEqual(actual, expected)

  code = 'const foo = 1\nfoo'
  actual = _pick(compileJavascript(code))
  t.deepEqual(actual, expected)

  code = 'var foo = 1\nfoo'
  actual = _pick(compileJavascript(code))
  t.deepEqual(actual, expected)

  t.end()
})

// Last statement is a declaration with multiple declarations (first identifier used)
test('compileJavascript: last has multiple declarations', t => {
  let code = 'foo\nbar\nlet baz, urg\n\n'
  let actual = _pick(compileJavascript(code))
  let expected = {
    inputs: [{name: 'foo'}, {name: 'bar'}],
    outputs: [{name: 'baz'}],
    messages: []
  }
  t.deepEqual(actual, expected)
  t.end()
})

// Only top level variable declarations are considered when
// determining cell inputs
test('compileJavascript: complex example with nested and shadowed variables', t => {
  let code = `
    let a;
    { let c };
    for (let b in [1,2,3]){};
    if (true) { const d = 1 };
    function f () { let e = 2 };
    a * b * c * d * e;
  `
  let actual = _pick(compileJavascript(code))
  let expected = {
    inputs: [{name: 'b'}, {name: 'c'}, {name: 'd'}, {name: 'e'}],
    outputs: [],
    messages: []
  }
  t.deepEqual(actual, expected)
  t.end()
})

// Last statement is not a declaration or identifier
test('compileJavascript: last is not a declaration or identifier', t => {
  let code = 'let foo\nbar\nlet baz\ntrue'
  let actual = _pick(compileJavascript(code))
  let expected = {
    inputs: [{name: 'bar'}],
    outputs: [],
    messages: []
  }
  t.deepEqual(actual, expected)
  t.end()
})

test('compileJavascript: anoymous arrow function', t => {
  let code = '[1,2,3].map(n => n*2)'
  let actual = _pick(compileJavascript(code))
  let expected = {
    inputs: [],
    outputs: [],
    messages: []
  }
  t.deepEqual(actual, expected)
  t.end()
})
