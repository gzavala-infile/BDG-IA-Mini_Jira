const blocklist = new Map<string, number>() // jti → expiresAt (epoch ms)

export function revokeToken(jti: string, expiresAt: number): void {
  blocklist.set(jti, expiresAt)
  const now = Date.now()
  for (const [key, exp] of blocklist) {
    if (exp < now) blocklist.delete(key)
  }
}

export function isTokenRevoked(jti: string): boolean {
  const exp = blocklist.get(jti)
  if (exp === undefined) return false
  if (exp < Date.now()) {
    blocklist.delete(jti)
    return false
  }
  return true
}
