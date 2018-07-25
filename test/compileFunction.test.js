import { testAsync } from 'substance-test'
import { compileJavascript } from '../index'
import { _getFunc, _getParams, _getReturn, _getExamples } from './helpers'

testAsync('compile function: without docs', async t => {
  let code, expected, actual

  code = 'function func (){}'
  actual = _getParams(compileJavascript(code))
  expected = []
  t.deepEqual(actual, expected, 'no params')

  code = 'function func (a){}'
  actual = _getParams(compileJavascript(code))
  expected = [{name: 'a'}]
  t.deepEqual(actual, expected, 'one param')

  code = 'function func (a, b, c){}'
  actual = _getParams(compileJavascript(code))
  expected = [{name: 'a'}, {name: 'b'}, {name: 'c'}]
  t.deepEqual(actual, expected, 'three params')

  code = 'function func (...a){}'
  actual = _getParams(compileJavascript(code))
  expected = [{name: 'a', repeats: true}]
  t.deepEqual(actual, expected, 'one repeatable parameter')

  code = 'function func (___a){}'
  actual = _getParams(compileJavascript(code))
  expected = [{name: 'a', extends: true}]
  t.deepEqual(actual, expected, 'one extensible parameter')

  code = 'function func (a=1){}'
  actual = _getParams(compileJavascript(code))
  expected = [{name: 'a', default: 1}]
  t.deepEqual(actual, expected, 'a parameter with a number default')

  code = 'function func (a="foo"){}'
  actual = _getParams(compileJavascript(code))
  expected = [{name: 'a', default: 'foo'}]
  t.deepEqual(actual, expected, 'a parameter with a string default')

  code = 'function func (a=[1, 2, 3]){}'
  actual = _getParams(compileJavascript(code))
  expected = [{name: 'a', default: [1, 2, 3]}]
  t.deepEqual(actual, expected, 'a parameter with an array default')

  // ATTENTION: for now only JSON notation is supported for complex default values
  code = 'function func (a={"b":1, "c":2}){}'
  actual = _getParams(compileJavascript(code))
  expected = [{name: 'a', default: {b: 1, c: 2}}]
  t.deepEqual(actual, expected, 'a parameter with an object default')

  t.end()
})

testAsync('compile function: with docs', async t => {
  let code, expected, actual

  code = `
  /**
   * @param a Description of parameter a
   * @param b Description of parameter b
   */
  function func (a, b){}`

  actual = _getParams(compileJavascript(code))
  expected = [
    {name: 'a', description: 'Description of parameter a'},
    {name: 'b', description: 'Description of parameter b'}
  ]
  t.deepEqual(actual, expected, 'parameter with descriptions')

  code = `
  /**
   * @param {typeA} a Description of parameter a
   * @param {typeB} b Description of parameter b
   */
  function func (a, b){}`
  actual = _getParams(compileJavascript(code))
  expected = [
    {name: 'a', type: 'typeA', description: 'Description of parameter a'},
    {name: 'b', type: 'typeB', description: 'Description of parameter b'}
  ]
  t.deepEqual(actual, expected, 'parameter with descriptions and types')

  code = `
  /**
   * @param {...number} pars Description of parameters
   */
  function func (...pars){}
  `
  actual = _getParams(compileJavascript(code))
  expected = [
    {name: 'pars', type: 'number', repeats: true, description: 'Description of parameters'}
  ]
  t.deepEqual(actual, expected, 'repeatable parameter')

  code = `
  /**
   * @param {___number} pars Description of parameters
   */
  function func (___pars){}
  `
  actual = _getParams(compileJavascript(code))
  expected = [
    {name: 'pars', type: 'number', extends: true, description: 'Description of parameters'}
  ]
  t.deepEqual(actual, expected, 'extensible parameter')

  t.end()
})

testAsync('compile function: @return', async t => {
  let code, expected, actual

  code = `function func (){}`
  actual = _getReturn(compileJavascript(code))
  expected = undefined
  t.deepEqual(actual, expected, 'method.return comes only with doc')

  code = `
  /**
   * @return {typeReturn} Description of return
   */
  function func (a, b){}
  `
  actual = _getReturn(compileJavascript(code))
  expected = {type: 'typeReturn', description: 'Description of return'}
  t.deepEqual(actual, expected, '@return with type')

  t.end()
})

testAsync('compile function: @example', async t => {
  let code, expected, actual

  code = `
  /**
   * @example func(ex1)
   * @example <caption>Example 2 function</caption> func(ex2)
   */
  function func (a, b){}
  `
  actual = _getExamples(compileJavascript(code))
  expected = [
    {
      usage: 'func(ex1)'
    }, {
      usage: 'func(ex2)',
      caption: 'Example 2 function'
    }
  ]
  t.deepEqual(actual, expected, 'method.return comes only with doc')

  t.end()
})

testAsync('compile function: kitchensink', async t => {
  let code, expected, actual

  code = `
  /**
   * Function description
   *
   * @title Function title
   * @summary Function summary
   *
   * @example <caption>Example caption</caption>
   *
   * funcname(1, 2, 3, 4)
   *
   * @example
   *
   * funcname(x, y, z)
   *
   * @param  {par1Type} par1 Parameter one description
   * @param  {...any} par2 Parameter two description
   * @return {returnType} Return description
   */
  function funcname(par1, ...par2){
    return par1 + sum(par2)
  }
  `
  actual = _getFunc(compileJavascript(code))
  expected = {
    type: 'function',
    code,
    name: 'funcname',
    title: 'Function title',
    summary: 'Function summary',
    description: 'Function description',
    methods: {
      'funcname(par1: par1Type, par2: any): returnType': {
        signature: 'funcname(par1: par1Type, par2: any): returnType',
        params: [
          {
            name: 'par1',
            type: 'par1Type',
            description: 'Parameter one description'
          }, {
            name: 'par2',
            repeats: true,
            type: 'any',
            description: 'Parameter two description'
          }
        ],
        return: {
          type: 'returnType',
          description: 'Return description'
        },
        examples: [
          {
            usage: 'funcname(1, 2, 3, 4)',
            caption: 'Example caption'
          }, {
            usage: 'funcname(x, y, z)'
          }
        ]
      }
    }
  }
  t.deepEqual(actual, expected, 'method.return comes only with doc')

  t.end()
})

// TODO: While we want this feature on the long term it seems that
// overloaded functions are not supported yet by 'esdoc'
// I suggest to wait for this to be supported by esdoc so that we can rely on
// a standard syntax. Until then I would rather leave this feature.
// // Overloading
// const src2 = `
//   /**
//    * Function description: I have two methods
//    */
//   /**
//    * Overload A description
//    *
//    * @param  {parA1Type} parA1 Parameter A1 description
//    * @return {returnAType} Return A description
//    */
//   /**
//    * Overload B description
//    *
//    * @param  {parB1Type} parB1 Parameter B1 description
//    * @return {returnBType} Return B description
//    */
//   function funcname(...args){}
// `
// let func2 = (await context.compile(src2)).outputs[0].value.data
// assert.equal(func2.description, 'Function description: I have two methods')
// assert.equal(Object.keys(func2.methods).length, 2)
// assert.deepEqual(func2.methods, {
//   'funcname(parA1: parA1Type): returnAType': {
//     signature: 'funcname(parA1: parA1Type): returnAType',
//     description: 'Overload A description',
//     params: [
//       { name: 'parA1', type: 'parA1Type', description: 'Parameter A1 description' }
//     ],
//     return: { type: 'returnAType', description: 'Return A description' }
//   },
//   'funcname(parB1: parB1Type): returnBType': {
//     signature: 'funcname(parB1: parB1Type): returnBType',
//     description: 'Overload B description',
//     params: [
//       { name: 'parB1', type: 'parB1Type', description: 'Parameter B1 description' }
//     ],
//     return: { type: 'returnBType', description: 'Return B description' }
//   }
// })
