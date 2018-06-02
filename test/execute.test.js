import { testAsync } from 'substance-test'
import { JavascriptContext } from '../index'

function _setup () {
  // TODO: we want a stub host so we can test host context interaction
  let jsContext = new JavascriptContext(null, 'test')
  return { jsContext }
}

function _getOutput (cell) {
  let output = cell.outputs[0]
  if (output) {
    return output.value
  }
}

async function _execute (jsContext, cell, inputs) {
  let compiled = await jsContext.compile(cell)
  if (inputs) {
    Object.keys(inputs).forEach(name => {
      let input = cell.inputs.find(i => i.name === name)
      input.value = jsContext.pack(inputs[name])
    })
  }
  let executed = await jsContext.execute(compiled)
  return executed
}

testAsync('execute: no output', async t => {
  let { jsContext } = _setup()
  let code, actual, expected

  code = ''
  actual = _getOutput(await _execute(jsContext, { code }))
  expected = undefined
  t.deepEqual(actual, expected, 'empty string')

  code = 'if(true){\n  let x = 4\n}\n'
  actual = _getOutput(await _execute(jsContext, { code }))
  expected = undefined
  t.deepEqual(actual, expected, 'last statement is no value expression')

  t.end()
})

testAsync('execute: unnamed output', async t => {
  let { jsContext } = _setup()
  let code, actual, expected

  code = '42'
  actual = _getOutput(await _execute(jsContext, { code }))
  expected = { type: 'number', data: 42 }
  t.deepEqual(actual, expected, code)

  code = '1.1 * 2'
  actual = _getOutput(await _execute(jsContext, { code }))
  expected = { type: 'number', data: 2.2 }
  t.deepEqual(actual, expected, code)

  code = 'let x = 3\nMath.sqrt(x*3)'
  actual = _getOutput(await _execute(jsContext, { code }))
  expected = { type: 'number', data: 3 }
  t.deepEqual(actual, expected, code)

  code = '// Multiple lines and comments\nlet x = {}\nObject.assign(x, {\na:1\n})\n'
  actual = _getOutput(await _execute(jsContext, { code }))
  expected = { type: 'object', data: { a: 1 } }
  t.deepEqual(actual, expected, code)

  // Falsy output values

  code = 'false'
  actual = _getOutput(await _execute(jsContext, { code }))
  expected = { type: 'boolean', data: false }
  t.deepEqual(actual, expected, code)

  code = 'null'
  actual = _getOutput(await _execute(jsContext, { code }))
  expected = { type: 'null', data: null }
  t.deepEqual(actual, expected, code)

  code = '0'
  actual = _getOutput(await _execute(jsContext, { code }))
  expected = { type: 'number', data: 0 }
  t.deepEqual(actual, expected, code)

  // Output value and name

  code = 'let b = 1'
  actual = _getOutput(await _execute(jsContext, { code }))
  expected = { type: 'number', data: 1 }
  t.deepEqual(actual, expected, code)

  code = 'let c = 1\nc'
  actual = _getOutput(await _execute(jsContext, { code }))
  expected = { type: 'number', data: 1 }
  t.deepEqual(actual, expected, code)

  // Inputs value and name
  code = 'x * 3'
  actual = _getOutput(await _execute(jsContext, { code }, { x: 6 }))
  expected = { type: 'number', data: 18 }
  t.deepEqual(actual, expected, code)

  code = 'let z = x * y;\n(z * 2).toString()'
  actual = _getOutput(await _execute(jsContext, { code }, { x: 2, y: 3 }))
  expected = { type: 'string', data: '12' }
  t.deepEqual(actual, expected, code)

  t.end()
})

/*
  // Undefined output values create an error message
  const undefinedMessages = [ { type: 'error', message: 'Cell output value is undefined' } ]
  assert.deepEqual(
    (await context.execute('undefined')).messages,
    undefinedMessages
  )
  assert.deepEqual(
    (await context.execute('Math.non_existant')).messages,
    undefinedMessages
  )

*/
