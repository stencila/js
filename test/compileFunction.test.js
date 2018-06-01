import { testAsync } from 'substance-test'
import compileJavascript from '../src/compileJavascript'

function _getFunc (cell) {
  // HACK: assuming that there is only one
  if (cell.outputs.length > 0) {
    return cell.outputs[0].spec
  }
}

function _getParams (cell) {
  let func = _getFunc(cell)
  if (func) {
    let methods = Object.values(func.methods)
    if (methods.length > 0) {
      return methods[0].params
    }
  }
}

testAsync('compileFunction(): without docs', async t => {
  let code, expected, actual

  code = 'function func (){}'
  actual = _getParams(compileJavascript(code))
  expected = undefined
  t.deepEqual(actual, expected)

  code = 'function func (a){}'
  actual = _getParams(compileJavascript(code))
  expected = [{name: 'a'}]
  t.deepEqual(actual, expected)

  t.end()
})

// await checkParams('function func (a, b, c){}', [{name: 'a'}, {name: 'b'}, {name: 'c'}], 'three parameters')

// await checkParams('function func (...a){}', [{name: 'a', repeats: true}], 'one repeatable parameters')

// await checkParams('function func (___a){}', [{name: 'a', extends: true}], 'one extensible parameters')

// // Currently, do not attempt to parse parameter defaults into values
// await checkParams('function func (a=1){}', [{name: 'a', default: '1'}], 'a parameter with a number default')
// await checkParams('function func (a="foo"){}', [{name: 'a', default: '"foo"'}], 'a parameter with a number default')
// await checkParams('function func (a=[1, 2, 3]){}', [{name: 'a', default: '[1, 2, 3]'}], 'a parameter with an array default')
// await checkParams('function func (a={b:1, c:2}){}', [{name: 'a', default: '{b:1, c:2}'}], 'a parameter with an array default')

// await checkParams(`
//   /**
//    * @param a Description of parameter a
//    * @param {typeB} b Description of parameter b
//    */
//   function func (a, b){}
// `, [
//   {name: 'a', description: 'Description of parameter a'},
//   {name: 'b', type: 'typeB', description: 'Description of parameter b'}
// ], 'parameter descriptions and types from docs')

// await checkParams(`
//   /**
//    * @param {...number} pars Description of parameters
//    */
//   function func (...pars){}
// `, [
//   {name: 'pars', type: 'number', repeats: true, description: 'Description of parameters'}
// ], 'repeatable parameter with type specified and elipses')

// await checkParams(`
//   /**
//    * @param {___number} pars Description of parameters
//    */
//   function func (___pars){}
// `, [
//   {name: 'pars', type: 'number', extends: true, description: 'Description of parameters'}
// ], 'extensible parameter with type specified')

// // Check return parsed from doc comment
// async function checkReturn (source, expect, message) {
//   let cell = await context.compile(source)
//   let func = cell.outputs[0].value.data
//   let return_ = Object.values(func.methods)[0]['return']
//   assert.deepEqual(return_, expect, message)
// }

// await checkReturn(
//   `function func (){}`,
//   undefined,
//   'return can only come from doc comment'
// )

// await checkReturn(
//   `
//   /**
//    * @return {typeReturn} Description of return
//    */
//   function func (a, b){}
//   `,
//   {type: 'typeReturn', description: 'Description of return'},
//   'return description and type from docs'
// )

// // Check example parsed from doc comment
// assert.deepEqual(
//   Object.values((await context.compile(`
//   /**
//    * @example func(ex1)
//    * @example <caption>Example 2 function</caption> func(ex2)
//    */
//   function func (a, b){}
//   `)).outputs[0].value.data.methods)[0].examples,
//   [
//     {
//       usage: 'func(ex1)'
//     }, {
//       usage: 'func(ex2)',
//       caption: 'Example 2 function'
//     }
//   ],
//   'examples from docs'
// )

// // Kitchen sink test
// const src1 = `
//   /**
//    * Function description
//    *
//    * @title Function title
//    * @summary Function summary
//    *
//    * @example <caption>Example caption</caption>
//    *
//    * funcname(1, 2, 3, 4)
//    *
//    * @example
//    *
//    * funcname(x, y, z)
//    *
//    * @param  {par1Type} par1 Parameter one description
//    * @param  {...any} par2 Parameter two description
//    * @return {returnType} Return description
//    */
//   function funcname(par1, ...par2){
//     return par1 + sum(par2)
//   }
// `
// let func1 = (await context.compile(src1, false)).outputs[0].value.data
// assert.deepEqual(func1, {
//   type: 'function',
//   name: 'funcname',
//   title: 'Function title',
//   summary: 'Function summary',
//   description: 'Function description',
//   methods: {
//     'funcname(par1: par1Type, par2: any): returnType': {
//       signature: 'funcname(par1: par1Type, par2: any): returnType',
//       params: [
//         {
//           name: 'par1',
//           type: 'par1Type',
//           description: 'Parameter one description'
//         }, {
//           name: 'par2',
//           repeats: true,
//           type: 'any',
//           description: 'Parameter two description'
//         }
//       ],
//       return: {
//         type: 'returnType',
//         description: 'Return description'
//       },
//       examples: [
//         {
//           usage: 'funcname(1, 2, 3, 4)',
//           caption: 'Example caption'
//         }, {
//           usage: 'funcname(x, y, z)'
//         }
//       ]
//     }
//   }
// }, 'kitchensink example')

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
