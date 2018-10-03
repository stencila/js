export function _getFunc (cell) {
  // HACK: assuming that there is only one
  if (cell.outputs.length > 0) {
    return cell.outputs[0].spec
  }
}

export function _getMethod (cell) {
  let func = _getFunc(cell)
  if (func) {
    let methods = Object.values(func.methods)
    if (methods.length > 0) {
      return methods[0]
    }
  }
}

export function _getParams (cell) {
  let method = _getMethod(cell)
  if (method) {
    return method.params
  }
}

export function _getReturn (cell) {
  let method = _getMethod(cell)
  if (method) {
    return method.return
  }
}

export function _getExamples (cell) {
  let method = _getMethod(cell)
  if (method) {
    return method.examples
  }
}

export function _getOutput (cell) {
  let output = cell.outputs[0]
  if (output) {
    return output.value
  }
}

export function _getMessages (cell) {
  return cell.messages
}

export async function _execute (jsContext, cell, inputs) {
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

export function _pick (obj, ...keys) {
  let result = {}
  if (obj) {
    for (let key of keys) {
      result[key] = obj[key]
    }
  }
  return result
}

export async function throwsAsync (t, asyncFun, expected) {
  try {
    await asyncFun()
    t.fail('Expected an exception.')
  } catch (err) {
    let pass = !expected
    if (expected) {
      if (expected instanceof RegExp) {
        pass = Boolean(expected.exec(err.message))
      } else if (typeof expected === 'string') {
        pass = err.message === expected
      }
    }
    if (pass) {
      t.pass('Caught exception as expected.')
    } else {
      t.fail('Caught exception but with unexpected message: ' + err.message)
    }
  }
}
