import { isString } from 'substance'

const TICK = '\''.charCodeAt(0)
const QUOTES = '"'.charCodeAt(0)
const BRACKET = '['.charCodeAt(0)
const BRACE = '{'.charCodeAt(0)
const STR_TICK_RE = /^['](.*)[']$/
const STR_QUOTES_RE = /^["](.*)["]$/

export default function parseValue (text) {
  if (!isString(text)) return text
  text = text.trim()
  // detect boolean
  if (text === 'false') {
    return false
  }
  if (text === 'true') {
    return true
  }
  // detect numbers
  if (!isNaN(text)) {
    let _int = Number.parseInt(text, 10)
    if (_int == text) { // eslint-disable-line
      return _int
    } else {
      return Number.parseFloat(text)
    }
  }
  if (text.charCodeAt(0) === TICK) {
    let m = STR_TICK_RE.exec(text)
    if (m) {
      return String(m[1])
    } else {
      throw new Error('Illegal format')
    }
  }
  if (text.charCodeAt(0) === QUOTES) {
    let m = STR_QUOTES_RE.exec(text)
    if (m) {
      return String(m[1])
    } else {
      throw new Error('Illegal format')
    }
  }
  // ATTENTION: for arrays and object we support only JSON notation for now
  if (text.charCodeAt(0) === BRACKET || text.charCodeAt(0) === BRACE) {
    return JSON.parse(text)
  }

  throw new Error('Illegal format')
}
