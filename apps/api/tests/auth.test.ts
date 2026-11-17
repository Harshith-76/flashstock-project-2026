import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { SqliteD1Adapter } from './d1-adapter'
import { AuthService } from '../src/services/auth.service'
import { extractBearerToken } from '../src/middleware/auth'

describe('Auth Service Suite', () => {
  let adapter: SqliteD1Adapter
  let authService: AuthService

  beforeEach(() => {
    adapter = new SqliteD1Adapter(':memory:')
    adapter.initSchema()
    authService = new AuthService(adapter as any)
  })

  test('Successful registration creates user with hashed password and session', async () => {
    const res = await authService.register({
      name: 'Alice Customer',
      email: 'alice@example.com',
      password: 'password123',
      role: 'customer'
    })

    assert.ok(res.user.id)
    assert.equal(res.user.name, 'Alice Customer')
    assert.equal(res.user.email, 'alice@example.com')
    assert.equal(res.user.role, 'customer')
    assert.ok(res.session.id)
    assert.equal(res.session.userId, res.user.id)

    // Verify password is not plaintext in DB
    const dbUser = adapter.db.prepare('SELECT password_hash FROM users WHERE id = ?').get(res.user.id) as any
    assert.ok(dbUser.password_hash.startsWith('pbkdf2:'))
    assert.notEqual(dbUser.password_hash, 'password123')
  })

  test('Duplicate email registration is rejected', async () => {
    await authService.register({
      name: 'User 1',
      email: 'duplicate@example.com',
      password: 'password123'
    })

    await assert.rejects(
      async () => {
        await authService.register({
          name: 'User 2',
          email: 'duplicate@example.com',
          password: 'password456'
        })
      },
      (err: any) => {
        assert.equal(err.statusCode, 409)
        return true
      }
    )
  })

  test('Login with valid credentials succeeds and returns session', async () => {
    await authService.register({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'mypassword'
    })

    const loginRes = await authService.login({
      email: 'bob@example.com',
      password: 'mypassword'
    })

    assert.ok(loginRes.session.id)
    assert.equal(loginRes.user.email, 'bob@example.com')
  })

  test('Login with invalid credentials fails with 401', async () => {
    await authService.register({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'mypassword'
    })

    await assert.rejects(
      async () => {
        await authService.login({
          email: 'bob@example.com',
          password: 'wrongpassword'
        })
      },
      (err: any) => {
        assert.equal(err.statusCode, 401)
        return true
      }
    )
  })

  test('Authorization bearer tokens are parsed case-insensitively', () => {
    assert.equal(extractBearerToken('Bearer abc123'), 'abc123')
    assert.equal(extractBearerToken('bearer abc123'), 'abc123')
    assert.equal(extractBearerToken('Basic abc123'), undefined)
  })

  test('Logout terminates session', async () => {
    const { session } = await authService.register({
      name: 'Charlie',
      email: 'charlie@example.com',
      password: 'password123'
    })

    // Session is valid
    const userBefore = await authService.getSessionUser(session.id)
    assert.ok(userBefore)

    // Logout
    await authService.logout(session.id)

    // Session is now gone
    const userAfter = await authService.getSessionUser(session.id)
    assert.equal(userAfter, null)
  })
})
