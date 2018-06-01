// This does not work anymore with `esm` (since 3.0.35)
// export * from './src/index'
// instead we have to export explicitly
export { default as compileJavascript } from './src/compileJavascript'
export { default as JavascriptContext } from './src/JavascriptContext'
