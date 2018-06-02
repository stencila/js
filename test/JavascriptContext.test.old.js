import { testAsync } from './helpers'

// ATTENTION: this is here just as a reference for tests
// that I want to transfer into a new test case

testAsync('JavascriptContext.execute', async assert => {
  let context
  async function check (source, inputs = [], expectedOutput = undefined) {
    for (let input of inputs) {
      input.value = await context.pack(input.value)
    }
    const cell = await context.compile({code: source})
    cell.inputs = inputs
    const result = await context.execute(cell)

    let outputs = expectedOutput ? [expectedOutput] : []
    for (let output of outputs) {
      output.value = await context.pack(output.value)
    }

    assert.deepEqual(result.outputs, outputs, source)
  }

  // No output
  await check('')
  await check('if(true){\n  let x = 4\n}\n')

  // Output value but no name
  await check('42', [], {value: 42})
  await check('1.1 * 2', [], {value: 2.2})
  await check('let x = 3\nMath.sqrt(x*3)', [], {value: 3})
  await check('// Multiple lines and comments\nlet x = {}\nObject.assign(x, {\na:1\n})\n', [], {value: { a: 1 }})

  // Falsy output values
  await check('false', [], {value: false})
  await check('null', [], {value: null})
  await check('0', [], {value: 0})

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

  // Output value and name
  await check('let b = 1', [], {name: 'b', value: 1})
  await check('let c = 1\nc', [], {name: 'c', value: 1})

  // Inputs value and name
  await check('x * 3', [{name: 'x', value: 6}], {value: 18})
  await check('let z = x * y;\n(z * 2).toString()', [
    {name: 'x', value: 2},
    {name: 'y', value: 3}
  ], {value: '12'})

  assert.end()
})

testAsync('JavascriptContext.evaluateCall', async assert => {
  let context

  async function testCall (call, expect, message) {
    let result = await context.evaluateCall(call)
    assert.deepEqual(result.value, expect, message)
  }

  async function testCallThrows (call, expect, message) {
    try {
      await context.evaluateCall(call)
      assert.fail(message)
    } catch (error) {
      assert.equal(error.message, expect, message)
    }
  }

  function no_pars () { // eslint-disable-line camelcase
    return 'Hello!'
  }
  await context.execute(no_pars)

  await testCall(
    {
      type: 'call',
      func: {type: 'get', name: 'no_pars'}
    }, {
      type: 'string',
      data: 'Hello!'
    },
    'no_pars()'
  )

  await testCallThrows(
    {
      type: 'call',
      func: {type: 'get', name: 'no_pars'},
      args: [
        {type: 'number', data: 42}
      ]
    },
    'Function was supplied 1 extra arguments',
    'no_pars(42)'
  )

  function one_par (par) { // eslint-disable-line camelcase
    return par * 3
  }
  await context.execute(one_par)

  await testCallThrows(
    {
      type: 'call',
      func: {type: 'get', name: 'one_par'}
    },
    'Function parameter "par" must be supplied'
  )

  await testCall(
    {
      type: 'call',
      func: {type: 'get', name: 'one_par'},
      args: [
        {type: 'number', data: 1}
      ]
    }, {
      type: 'number',
      data: 3
    },
    'one_par(1)'
  )

  await testCall(
    {
      type: 'call',
      func: {type: 'get', name: 'one_par'},
      namedArgs: {
        par: {type: 'number', data: 2}
      }
    }, {
      type: 'number',
      data: 6
    },
    'one_par(par=1)'
  )

  await testCallThrows(
    {
      type: 'call',
      func: {type: 'get', name: 'one_par'},
      args: [
        {type: 'number', data: 1}
      ],
      namedArgs: {
        par: {type: 'number', data: 2}
      }
    },
    'Function was supplied 1 extra arguments',
    'one_par(1, par=2)'
  )

  await testCallThrows(
    {
      type: 'call',
      func: {type: 'get', name: 'one_par'},
      namedArgs: {
        par: {type: 'number', data: 1},
        extra1: {type: 'number', data: 2},
        extra2: {type: 'number', data: 3}
      }
    },
    'Function was supplied extra named arguments "extra1", "extra2"',
    'one_par(par=1, extra1=2, extra2=3)'
  )

  function three_pars (par1, par2, par3) { // eslint-disable-line camelcase
    return {par1, par2, par3}
  }
  await context.execute(three_pars)

  await testCall(
    {
      type: 'call',
      func: {type: 'get', name: 'three_pars'},
      namedArgs: {
        par1: {type: 'number', data: 1},
        par2: {type: 'string', data: 'a'},
        par3: {type: 'number', data: 3}
      }
    }, {
      type: 'object',
      data: {par1: 1, par2: 'a', par3: 3}
    },
    'three_pars(par1=1, par2="a", par3=3)'
  )

  function default_par (par1, par2 = 'beep') { // eslint-disable-line camelcase
    return par1 + ' ' + par2
  }
  await context.execute(default_par)

  await testCall(
    {
      type: 'call',
      func: {type: 'get', name: 'default_par'},
      args: [
        {type: 'string', data: 'beep'},
        {type: 'string', data: 'bop'}
      ]
    }, {
      type: 'string',
      data: 'beep bop'
    },
    'default_par("beep", "bop")'
  )

  await testCall(
    {
      type: 'call',
      func: {type: 'get', name: 'default_par'},
      args: [
        {type: 'string', data: 'beep'}
      ]
    }, {
      type: 'string',
      data: 'beep beep'
    },
    'default_par("beep")'
  )

  function repeats_par (arg1, ...args) { // eslint-disable-line camelcase
    return `${arg1} ${args.join(',')}`
  }
  await context.execute(repeats_par)

  await testCall(
    {
      type: 'call',
      func: {type: 'get', name: 'repeats_par'},
      args: [
        {type: 'string', data: 'bar'},
        {type: 'string', data: 'baz'},
        {type: 'string', data: 'boop'}
      ]
    }, {
      type: 'string',
      data: 'bar baz,boop'
    },
    'repeats_par("bar", "baz", "boop")'
  )

  await testCall(
    {
      type: 'call',
      func: {type: 'get', name: 'repeats_par'},
      args: [
        {type: 'string', data: 'bar'}
      ]
    }, {
      type: 'string',
      data: 'bar '
    },
    'repeats_par("bar")'
  )

  function extends_par (arg1, ___args) { // eslint-disable-line camelcase
    return `${arg1} ${___args ? Object.entries(___args).map(entry => entry.join(':')).join(' ') : ''}`
  }
  await context.execute(extends_par)

  await testCall(
    {
      type: 'call',
      func: {type: 'get', name: 'extends_par'},
      args: [
        {type: 'number', data: 1}
      ]
    }, {
      type: 'string',
      data: '1 '
    },
    'extends_par(1)'
  )

  await testCall(
    {
      type: 'call',
      func: {type: 'get', name: 'extends_par'},
      args: [
        {type: 'number', data: 1}
      ],
      namedArgs: {
        a: {type: 'number', data: 1},
        b: {type: 'number', data: 2},
        c: {type: 'number', data: 3}
      }
    }, {
      type: 'string',
      data: '1 a:1 b:2 c:3'
    },
    'extends_par(1, a=1, b=2, c=3)'
  )

  assert.end()
})
