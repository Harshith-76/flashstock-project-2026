import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import worker from '../src/index'

const executionContext = {
  waitUntil() {},
  passThroughOnException() {}
} as unknown as ExecutionContext

function emptyDatabase() {
  return {} as D1Database
}

test('unknown API routes return JSON 404 responses', async () => {
  const response = await worker.fetch(
    new Request('https://flashstock.test/api/v1/not-a-real-route'),
    { DB: emptyDatabase(), ENVIRONMENT: 'production' } as unknown as Env,
    executionContext
  )

  assert.equal(response.status, 404)
  assert.match(response.headers.get('content-type') || '', /application\/json/)
  assert.deepEqual(await response.json(), { success: false, message: 'API endpoint not found' })
})

test('production CORS excludes localhost unless explicitly configured', async () => {
  const response = await worker.fetch(
    new Request('https://flashstock.test/api/v1/not-a-real-route', {
      headers: { Origin: 'http://localhost:3000' }
    }),
    { DB: emptyDatabase(), ENVIRONMENT: 'production' } as unknown as Env,
    executionContext
  )

  assert.equal(response.headers.get('access-control-allow-origin'), null)
})

test('development CORS includes Vite localhost and preserves configured origins', async () => {
  for (const origin of ['http://localhost:3000', 'https://store.example.test']) {
    const response = await worker.fetch(
      new Request('https://flashstock.test/api/v1/not-a-real-route', { headers: { Origin: origin } }),
      {
        DB: emptyDatabase(),
        ENVIRONMENT: 'development',
        CORS_ALLOWED_ORIGINS: 'https://store.example.test'
      } as unknown as Env,
      executionContext
    )

    assert.equal(response.headers.get('access-control-allow-origin'), origin)
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true')
  }
})

test('production CORS allows only explicitly configured external origins', async () => {
  const response = await worker.fetch(
    new Request('https://flashstock.test/api/v1/not-a-real-route', {
      headers: { Origin: 'https://store.example.test' }
    }),
    {
      DB: emptyDatabase(),
      ENVIRONMENT: 'production',
      CORS_ALLOWED_ORIGINS: 'https://store.example.test'
    } as unknown as Env,
    executionContext
  )

  assert.equal(response.headers.get('access-control-allow-origin'), 'https://store.example.test')
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true')
})

test('Wrangler config keeps same-origin API routes on Hono and React routes on the SPA fallback', () => {
  const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'))

  assert.equal(config.assets.directory, '../web/dist')
  assert.equal(config.assets.not_found_handling, 'single-page-application')
  assert.deepEqual(config.assets.run_worker_first, ['/api', '/api/*'])
  assert.equal(config.d1_databases[0].database_name, 'flashstock-db')
  assert.equal(config.d1_databases[0].database_id, '90b77993-51a2-4b83-834e-4966c5c06e4d')
})

test('production admin demo-seeding endpoint is unavailable to an authenticated admin', async () => {
  const adminRow = {
    session_id: 'session-test',
    user_id: 'user-test',
    expires_at: '2099-01-01T00:00:00.000Z',
    session_created_at: '2026-01-01T00:00:00.000Z',
    id: 'user-test',
    name: 'Test Admin',
    email: 'admin@example.test',
    role: 'admin',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  }
  const db = {
    prepare() {
      return {
        bind() {
          return this
        },
        async first() {
          return adminRow
        }
      }
    }
  } as unknown as D1Database

  const response = await worker.fetch(
    new Request('https://flashstock.test/api/v1/admin/seed-demo-data', {
      method: 'POST',
      headers: { Authorization: 'Bearer session-test' }
    }),
    { DB: db, ENVIRONMENT: 'production' } as unknown as Env,
    executionContext
  )

  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { success: false, message: 'Not found' })
})
