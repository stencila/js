import test from 'tape'

/**
 * Test an async function
 *
 * A convienience function that provides better
 * handling of errors when testing async funcions
 *
 * @param  {String} name Name of test
 * @param  {Function} func Async test function
 */

export function testAsync (name, func) {
  test(name, async assert => {
    try {
      await func(assert)
    } catch (error) {
      assert.fail(error.message)
      console.log(error.stack) // eslint-disable-line
      assert.end()
    }
  })
}
