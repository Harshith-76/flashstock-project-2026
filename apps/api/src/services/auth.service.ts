import { hashPassword, verifyPassword } from './crypto.service'
import { User, Session, UserRole } from '../types'

export class AuthService {
  constructor(private db: D1Database) {}

  async register(data: {
    name: string
    email: string
    password: string
    role?: UserRole
  }): Promise<{ user: User; session: Session }> {
    const existing = await this.db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(data.email.toLowerCase()).first()

    if (existing) {
      const error = new Error('An account with this email already exists')
      ;(error as any).statusCode = 409
      throw error
    }

    const userId = crypto.randomUUID()
    const passwordHash = await hashPassword(data.password)
    const role: UserRole = data.role || 'customer'
    const now = new Date().toISOString()

    const sessionId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const statements = [
      this.db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(userId, data.name, data.email.toLowerCase(), passwordHash, role, now, now),

      this.db.prepare(`
        INSERT INTO sessions (id, user_id, expires_at, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(sessionId, userId, expiresAt, now)
    ]

    await this.db.batch(statements)

    const user: User = {
      id: userId,
      name: data.name,
      email: data.email.toLowerCase(),
      role,
      createdAt: now,
      updatedAt: now
    }

    const session: Session = {
      id: sessionId,
      userId,
      expiresAt,
      createdAt: now
    }

    return { user, session }
  }

  async login(data: {
    email: string
    password: string
  }): Promise<{ user: User; session: Session }> {
    const row = await this.db.prepare(`
      SELECT id, name, email, password_hash, role, created_at, updated_at
      FROM users
      WHERE email = ?
    `).bind(data.email.toLowerCase()).first<{
      id: string
      name: string
      email: string
      password_hash: string
      role: UserRole
      created_at: string
      updated_at: string
    }>()

    if (!row) {
      const error = new Error('Invalid email or password')
      ;(error as any).statusCode = 401
      throw error
    }

    const isValid = await verifyPassword(data.password, row.password_hash)
    if (!isValid) {
      const error = new Error('Invalid email or password')
      ;(error as any).statusCode = 401
      throw error
    }

    const sessionId = crypto.randomUUID()
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await this.db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(sessionId, row.id, expiresAt, now).run()

    const user: User = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }

    const session: Session = {
      id: sessionId,
      userId: row.id,
      expiresAt,
      createdAt: now
    }

    return { user, session }
  }

  async logout(sessionId: string): Promise<void> {
    await this.db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
  }

  async getSessionUser(sessionId: string): Promise<{ user: User; session: Session } | null> {
    const row = await this.db.prepare(`
      SELECT
        s.id AS session_id,
        s.user_id,
        s.expires_at,
        s.created_at AS session_created_at,
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        u.updated_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
        AND s.expires_at > datetime('now')
    `).bind(sessionId).first<{
      session_id: string
      user_id: string
      expires_at: string
      session_created_at: string
      id: string
      name: string
      email: string
      role: UserRole
      created_at: string
      updated_at: string
    }>()

    if (!row) return null

    return {
      session: {
        id: row.session_id,
        userId: row.user_id,
        expiresAt: row.expires_at,
        createdAt: row.session_created_at
      },
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    }
  }
}
