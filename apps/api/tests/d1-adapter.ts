import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface MockD1PreparedStatement {
  sql: string
  params: any[]
  bind(...params: any[]): MockD1PreparedStatement
  first<T = any>(): Promise<T | null>
  all<T = any>(): Promise<{ results: T[] }>
  run(): Promise<{ meta: { changes: number } }>
}

export class SqliteD1Adapter {
  public db: DatabaseSync

  constructor(dbPath: string = ':memory:') {
    this.db = new DatabaseSync(dbPath)
    this.db.exec('PRAGMA foreign_keys = ON;')
  }

  initSchema() {
    // Read and execute initial schema migrations
    const migration1 = fs.readFileSync(
      path.resolve(__dirname, '../migrations/0001_initial_schema.sql'),
      'utf-8'
    )
    this.db.exec(migration1)

    const migration2 = fs.readFileSync(
      path.resolve(__dirname, '../migrations/0002_flash_sales_and_triggers.sql'),
      'utf-8'
    )
    this.db.exec(migration2)
  }

  prepare(sql: string): MockD1PreparedStatement {
    return this.createPreparedStatement(sql, [])
  }

  private createPreparedStatement(sql: string, params: any[]): MockD1PreparedStatement {
    const self = this

    return {
      sql,
      params,
      bind(...newParams: any[]) {
        return self.createPreparedStatement(sql, newParams)
      },
      async first<T = any>(): Promise<T | null> {
        const stmt = self.db.prepare(sql)
        const row = stmt.get(...params) as T | undefined
        return (row !== undefined ? row : null)
      },
      async all<T = any>(): Promise<{ results: T[] }> {
        const stmt = self.db.prepare(sql)
        const results = stmt.all(...params) as T[]
        return { results }
      },
      async run(): Promise<{ meta: { changes: number } }> {
        const stmt = self.db.prepare(sql)
        const result = stmt.run(...params)
        return { meta: { changes: Number(result.changes) } }
      }
    }
  }

  async batch(statements: MockD1PreparedStatement[]): Promise<{ meta: { changes: number } }[]> {
    this.db.exec('BEGIN TRANSACTION;')
    try {
      const results: { meta: { changes: number } }[] = []
      for (const s of statements) {
        const stmt = this.db.prepare(s.sql)
        const res = stmt.run(...s.params)
        results.push({ meta: { changes: Number(res.changes) } })
      }
      this.db.exec('COMMIT;')
      return results
    } catch (error) {
      try {
        this.db.exec('ROLLBACK;')
      } catch (_) {}
      throw error
    }
  }
}
