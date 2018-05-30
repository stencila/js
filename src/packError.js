export default function extractDetailsFromError (error) {
  let line = 0
  let column = 0
  let message = error.message
  if (error instanceof SyntaxError) {
    message = 'Syntax error in Javascript: ' + message
    if (error.loc) {
      line = error.loc.line
      column = error.loc.column
    }
  } else if (error.stack) {
    // Parse the error stack to get message, line and columns numbers
    let lines = error.stack.split('\n')
    let match = lines[1].match(/<anonymous>:(\d+):(\d+)/)
    if (match) {
      line = parseInt(match[1], 10) - 2
      column = parseInt(match[2], 10)
    }
    message = lines[0] || error.message
  }
  return {
    type: 'error',
    message,
    line,
    column
  }
}
