/**
* A helper method interpreting a given function definition
* following the function spec from TODO:link-to-func-specification
*/
export default async function collectArgs (func, call, hooks) {
  // HACK: just use the first method
  // TODO: why would there be multiple ones?
  // FIXME: this might be very bad, because Object does
  // not have a guaranteed order
  const method = Object.values(func.methods)[0]
  const unpack = hooks.unpack
  let args = []
  let namedArgs

  // Using `method.params` specification, map the call's arguments onto the method's parameters
  let argsIndex = 0
  let argsUsed = 0
  let namedArgsUsed = []
  if (method.params) {
    for (let param of method.params) {
      if (param.repeats) {
        // Put the remaining arguments into an array
        let remaining = []
        for (; argsIndex < call.args.length; argsIndex++) {
          remaining.push(await unpack(call.args[argsIndex]))
          argsUsed++
        }
        args.push(remaining)
        break
      } else if (param.extends) {
        // Put the remaining named arguments into an object
        if (call.namedArgs) {
          namedArgs = {}
          for (let name of Object.keys(call.namedArgs)) {
            if (namedArgsUsed.indexOf(name) < 0) {
              namedArgs[name] = await unpack(call.namedArgs[name])
              namedArgsUsed.push(param.name)
            }
          }
        }
        break
      } else {
        // Get the argument for the parameter either by name or by index
        let arg
        if (call.namedArgs) {
          arg = call.namedArgs[param.name]
          if (arg) namedArgsUsed.push(param.name)
        }
        if (!arg && call.args) {
          arg = call.args[argsIndex]
          if (arg) argsUsed++
        }
        if (!arg && !param.default) {
          let msg = `Function '${func.name}' requires parameter '${param.name}'`
          throw new Error(msg)
        }
        if (arg) args.push(await unpack(arg))
        else args.push(undefined)
      }
      argsIndex++
    }
  }

  // Check that there are no extra, unused arguments in call
  if (call.args && argsUsed < call.args.length) {
    const extra = call.args.length - argsUsed
    console.error(`Function was supplied ${extra} extra arguments`, call, func)
    throw new Error(`Function was supplied ${extra} extra arguments`)
  }
  if (call.namedArgs && namedArgsUsed.length < Object.keys(call.namedArgs).length) {
    const extra = Object.keys(call.namedArgs).filter((arg) => namedArgsUsed.indexOf(arg) < 0)
      .map((arg) => `"${arg}"`)
      .join(', ')
    throw new Error(`Function was supplied extra named arguments ${extra}`)
  }
  return { args, namedArgs }
}
