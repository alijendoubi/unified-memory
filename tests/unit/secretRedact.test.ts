import { describe, it, expect } from 'vitest'
import { redact, stripPrivateBlocks, hasPrivateBlocks } from '../../src/util/secretRedact.js'
import { isEntirelyPrivate as captureIsPrivate } from '../../src/capture/privateTags.js'
describe('secretRedact', () => {
  it('redacts long API-key-like strings', () => {
    const text = 'token: tok_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
    const result = redact(text)
    expect(result).not.toContain('tok_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
    expect(result).toContain('[REDACTED]')
  })

  it('redacts env assignments with sensitive names', () => {
    const text = 'export API_KEY=supersecretvalue123'
    const result = redact(text)
    expect(result).not.toContain('supersecretvalue123')
  })

  it('redacts JSON secret fields', () => {
    const text = '{"api_key": "secret-value-here", "name": "test"}'
    const result = redact(text)
    expect(result).not.toContain('secret-value-here')
  })

  it('strips private blocks', () => {
    const text = 'public content\n<private>\nthis is secret\n</private>\nmore public'
    const result = stripPrivateBlocks(text)
    expect(result).not.toContain('this is secret')
    expect(result).toContain('public content')
    expect(result).toContain('more public')
  })

  it('detects private blocks', () => {
    expect(hasPrivateBlocks('<private>secret</private>')).toBe(true)
    expect(hasPrivateBlocks('no private content')).toBe(false)
  })

  it('redacts URL passwords', () => {
    const text = 'connect to postgres://user:password123@localhost/db'
    const result = redact(text)
    expect(result).not.toContain('password123')
  })

  it('redacts PEM private keys', () => {
    const text = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA\n-----END RSA PRIVATE KEY-----'
    const result = redact(text)
    expect(result).not.toContain('MIIEpAIBAAKCAQEA')
    expect(result).toContain('[KEY REDACTED]')
  })
})

describe('privateTags', () => {
  it('detects entirely private content', () => {
    const text = '<private>\nthis should not be stored\n</private>'
    expect(captureIsPrivate(text)).toBe(true)
  })

  it('does not mark mixed content as entirely private', () => {
    const text = 'public info\n<private>\nthis is secret\n</private>'
    expect(captureIsPrivate(text)).toBe(false)
  })
})
