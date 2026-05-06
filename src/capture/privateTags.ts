import { hasPrivateBlocks, stripPrivateBlocks } from '../util/secretRedact.js'

export function isEntirelyPrivate(text: string): boolean {
  const stripped = stripPrivateBlocks(text).trim().replace(/\[PRIVATE REDACTED\]/g, '').trim()
  return hasPrivateBlocks(text) && stripped.length === 0
}

export function sanitizeForCapture(text: string): string {
  return stripPrivateBlocks(text)
}
