// Secure Web Crypto PBKDF2 password hashing compatible with Cloudflare Workers, Node.js, and browser environments.

export async function hashPassword(password: string): Promise<string> {
  const iterations = 100000
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  )

  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return `pbkdf2:${iterations}:${saltHex}:${hashHex}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split(':')
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
      return false
    }

    const iterations = parseInt(parts[1], 10)
    const saltHex = parts[2]
    const originalHashHex = parts[3]

    if (isNaN(iterations) || !saltHex || !originalHashHex) {
      return false
    }

    const salt = new Uint8Array(
      saltHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    )

    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    )

    const derivedHashHex = Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // Constant-time comparison
    if (derivedHashHex.length !== originalHashHex.length) {
      return false
    }

    let diff = 0
    for (let i = 0; i < derivedHashHex.length; i++) {
      diff |= derivedHashHex.charCodeAt(i) ^ originalHashHex.charCodeAt(i)
    }

    return diff === 0
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}
