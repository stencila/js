import { testAsync } from 'substance-test'
import { JavascriptContext } from '../index'
import { _getOutput, _pick, throwsAsync } from './helpers'

function _setup () {
  // TODO: we want a stub host so we can test host context interaction
  let jsContext = new JavascriptContext(null, 'test')
  return { jsContext }
}

async function _registerFunction (jsContext, code, id) {
  let compiled = await jsContext.compile({ id, code })
  let result = await jsContext.execute(compiled)
  return _getOutput(result)
}

async function _noParams (jsContext, id = 'no_params') {
  let code = `
  function no_params () {
    return 'Hello!'
  }
  `
  return _registerFunction(jsContext, code, id)
}

async function _oneParam (jsContext, id = 'one_param') {
  let code = `
  function one_param (par) {
    return par * 3
  }
  `
  return _registerFunction(jsContext, code, id)
}

async function _threeParams (jsContext, id = 'three_params') {
  let code = `
  function three_params (par1, par2, par3) {
    return [par1, par2, par3]
  }
  `
  return _registerFunction(jsContext, code, id)
}

async function _defaultParam (jsContext, id = 'default_param') {
  let code = `
  function default_param (par1, par2 = 'beep') {
    return par1 + ' ' + par2
  }
  `
  return _registerFunction(jsContext, code, id)
}

async function _repeatsParam (jsContext, id = 'repeats_param') {
  let code = `
  function repeats_param (arg1, ...args) {
    return arg1 + " " + args.join(',')
  }
  `
  return _registerFunction(jsContext, code, id)
}

async function _extendsParam (jsContext, id = 'extends_param') {
  let code = `
  function extends_param (arg1, ___args) {
    return arg1 + " " + (___args ? Object.entries(___args).map(entry => entry.join(':')).join(' ') : '')
  }
  `
  return _registerFunction(jsContext, code, id)
}

function _createCall (func, args, namedArgs) {
  let call = {
    type: 'call',
    func,
    args,
    namedArgs,
    value: {}
  }
  return call
}

async function _callFunction (jsContext, func, args, namedArgs) {
  let call = _createCall(func, args, namedArgs)
  call = await jsContext.evaluateCall(call)
  return call.value
}

testAsync('evaluate call: register a function', async t => {
  let { jsContext } = _setup()
  let actual, expected

  let func = await _noParams(jsContext)

  actual = func
  expected = { type: 'function', data: { name: 'no_params', id: 'no_params', context: jsContext.id } }
  t.deepEqual(func, expected, 'returned value should contain all necessary information for RPC')

  actual = _pick(jsContext.resolve(func), 'id', 'type')
  expected = {
    id: 'no_params',
    type: 'function'
  }
  t.deepEqual(actual, expected, 'function should be resolvable')

  t.end()
})

testAsync('evaluate call: no_params()', async t => {
  let { jsContext } = _setup()

  let func = await _noParams(jsContext)
  let actual = await _callFunction(jsContext, func)
  let expected = { type: 'string', data: 'Hello!' }
  t.deepEqual(actual, expected, 'Hello!')

  t.end()
})

testAsync('evaluate call: too many arguments', async t => {
  let { jsContext } = _setup()

  let func = await _noParams(jsContext)
  await throwsAsync(t, async () => {
    return _callFunction(jsContext, func, [
      { type: 'number', data: 42 }
    ])
  }, /extra arguments/)
  t.end()
})

testAsync('evaluate call: too few arguments', async t => {
  let { jsContext } = _setup()

  let func = await _oneParam(jsContext)
  await throwsAsync(t, async () => {
    return _callFunction(jsContext, func, [])
  }, /'one_param'.*'par'/)
  t.end()
})

testAsync('evaluate call: one_param(1)', async t => {
  let { jsContext } = _setup()

  let func = await _oneParam(jsContext)
  let actual = await _callFunction(jsContext, func, [
    { type: 'number', data: 1 }
  ])
  let expected = { type: 'integer', data: 3 }
  t.deepEqual(actual, expected, 'one_param(1)')

  t.end()
})

testAsync('evaluate call: one_param(1, par=2)', async t => {
  let { jsContext } = _setup()

  let func = await _oneParam(jsContext)
  await throwsAsync(t, async () => {
    return _callFunction(jsContext, func, [
      { type: 'number', data: 1 }
    ], {
      'par': { type: 'number', data: 2 }
    })
  }, /extra arguments/)
  t.end()
})

testAsync('evaluate call: one_param(par=1, extra1=2, extra2=3)', async t => {
  let { jsContext } = _setup()

  let func = await _oneParam(jsContext)
  await throwsAsync(t, async () => {
    return _callFunction(jsContext, func, [], {
      par: { type: 'number', data: 1 },
      extra1: { type: 'number', data: 2 },
      extra2: { type: 'number', data: 3 }
    })
  }, /extra named arguments.*extra1.*extra2/)
  t.end()
})

testAsync('evaluate call: three_params(par1=1, par2="a", par3=3)', async t => {
  let { jsContext } = _setup()

  let func = await _threeParams(jsContext)
  let actual = await _callFunction(jsContext, func, [], {
    par1: {type: 'number', data: 1},
    par2: {type: 'string', data: 'a'},
    par3: {type: 'number', data: 3}
  })
  // TODO: shouldn't this be type 'array'
  let expected = { type: 'array', data: [1, 'a', 3] }
  t.deepEqual(actual, expected, 'three_params(par1=1, par2="a", par3=3)')
  t.end()
})

testAsync('evaluate call: default_param("beep", "bop")', async t => {
  let { jsContext } = _setup()

  let func = await _defaultParam(jsContext)
  let actual = await _callFunction(jsContext, func, [
    {type: 'string', data: 'beep'},
    {type: 'string', data: 'bop'}
  ])
  // TODO: shouldn't this be type 'array'
  let expected = { type: 'string', data: 'beep bop' }
  t.deepEqual(actual, expected, 'default_param("beep", "bop")')
  t.end()
})

testAsync('evaluate call: default_param("beep")', async t => {
  let { jsContext } = _setup()

  let func = await _defaultParam(jsContext)
  let actual = await _callFunction(jsContext, func, [
    {type: 'string', data: 'beep'}
  ])
  // TODO: shouldn't this be type 'array'
  let expected = { type: 'string', data: 'beep beep' }
  t.deepEqual(actual, expected, 'default_param("beep")')
  t.end()
})

testAsync('evaluate call: repeats_param("bar", "baz", "boop")', async t => {
  let { jsContext } = _setup()

  let func = await _repeatsParam(jsContext)
  let actual = await _callFunction(jsContext, func, [
    {type: 'string', data: 'bar'},
    {type: 'string', data: 'baz'},
    {type: 'string', data: 'boop'}
  ])
  // TODO: shouldn't this be type 'array'
  let expected = { type: 'string', data: 'bar baz,boop' }
  t.deepEqual(actual, expected, 'repeats_param("bar", "baz", "boop")')
  t.end()
})

testAsync('evaluate call: repeats_param("bar")', async t => {
  let { jsContext } = _setup()

  let func = await _repeatsParam(jsContext)
  let actual = await _callFunction(jsContext, func, [
    {type: 'string', data: 'bar'}
  ])
  // TODO: shouldn't this be type 'array'
  let expected = { type: 'string', data: 'bar ' }
  t.deepEqual(actual, expected, 'repeats_param("bar")')
  t.end()
})

testAsync('evaluate call: extends_param(1)', async t => {
  let { jsContext } = _setup()

  let func = await _extendsParam(jsContext)
  let actual = await _callFunction(jsContext, func, [
    {type: 'number', data: 1}
  ])
  // TODO: shouldn't this be type 'array'
  let expected = { type: 'string', data: '1 ' }
  t.deepEqual(actual, expected, 'extends_param(1)')
  t.end()
})

testAsync('evaluate call: extends_param(1, a=1, b=2, c=3)', async t => {
  let { jsContext } = _setup()

  let func = await _extendsParam(jsContext)
  let actual = await _callFunction(jsContext, func, [
    {type: 'number', data: 1}
  ], {
    a: {type: 'number', data: 1},
    b: {type: 'number', data: 2},
    c: {type: 'number', data: 3}
  })
  // TODO: shouldn't this be type 'array'
  let expected = { type: 'string', data: '1 a:1 b:2 c:3' }
  t.deepEqual(actual, expected, 'extends_param(1, a=1, b=2, c=3)')
  t.end()
})
