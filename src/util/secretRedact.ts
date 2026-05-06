const PRIVATE_BLOCK_RE = /<private>[\s\S]*?<\/private>/gi
const API_KEY_RE = /[A-Za-z0-9_\-]{32,}/g
const ENV_ASSIGN_RE = /(?:^|[\s;|&])(\w*(SECRET|TOKEN|KEY|PASS|PWD|API)\w*)\s*=\s*\S+/gim
const JSON_SECRET_RE = /"(?:[^"]*(?:SECRET|TOKEN|KEY|PASS|PWD|API)[^"]*)":\s*"[^"]+"/gi
const URL_PASS_RE = /([a-z][a-z0-9+\-.]*:\/\/[^:@\s]+:)[^@\s]+(@[^\s]+)/gi
const PEM_HEADER_RE = /-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/gi

export function hasPrivateBlocks(text: string): boolean {
  return PRIVATE_BLOCK_RE.test(text)
}

export function stripPrivateBlocks(text: string): string {
  return text.replace(PRIVATE_BLOCK_RE, '[PRIVATE REDACTED]')
}

export function redact(text: string): string {
  let result = stripPrivateBlocks(text)

  // redact PEM private keys first (before the long-string rule strips too much)
  result = result.replace(PEM_HEADER_RE, '[KEY REDACTED]')

  // redact URL passwords
  result = result.replace(URL_PASS_RE, '$1[REDACTED]$2')

  // redact env assignments with sensitive names
  result = result.replace(ENV_ASSIGN_RE, (match, name: string) => {
    return match.replace(new RegExp(`(${name}\\s*=\\s*)\\S+`), '$1[REDACTED]')
  })

  // redact JSON secret fields
  result = result.replace(JSON_SECRET_RE, (match) => {
    return match.replace(/"[^"]+"$/, '"[REDACTED]"')
  })

  // redact long api-key-like strings (only those that look like tokens, not words/paths)
  result = result.replace(API_KEY_RE, (match) => {
    if (/^[A-Za-z0-9_\-]{40,}$/.test(match)) return '[REDACTED]'
    return match
  })

  return result
}
