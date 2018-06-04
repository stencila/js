import test from 'tape'

import { childrenTypes, descendantTypes } from '../index'

test('types: childrenTypes', t => {
  t.deepEqual(childrenTypes['number'], ['integer'])
  t.deepEqual(childrenTypes['table'], [])

  t.end()
})

test('types: descendantTypes', t => {
  t.deepEqual(descendantTypes['table'], [])

  t.end()
})
