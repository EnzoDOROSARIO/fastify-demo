import { test } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../helper.js'

test('Transaction should rollback on error', async (t) => {
  const app = await build(t)

  const { mock: mockCompare } = t.mock.method(app, 'compare')
  mockCompare.mockImplementationOnce((value: string, hash: string) => {
    throw new Error()
  })

  const { mock: mockLogError } = t.mock.method(app.log, 'error')

  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email: 'basic@example.com',
      password: 'password123$'
    }
  })

  assert.strictEqual(mockCompare.callCount(), 1)

  const arg = mockLogError.calls[0].arguments[0] as unknown as {
    err: Error
  }

  assert.strictEqual(res.statusCode, 500)
  assert.deepStrictEqual(arg.err.message, 'Transaction failed.')
})

test('POST /api/auth/login with valid credentials', async (t) => {
  const app = await build(t)

  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email: 'basic@example.com',
      password: 'password123$'
    }
  })

  assert.strictEqual(res.statusCode, 200)
  assert.ok(
    res.cookies.some((cookie) => cookie.name === app.config.COOKIE_NAME)
  )
})

test('POST /api/auth/login with invalid credentials', async (t) => {
  const app = await build(t)

  const testCases = [
    {
      email: 'invalid_email',
      password: 'password',
      description: 'invalid email'
    },
    {
      email: 'basic@example.com',
      password: 'wrong_password',
      description: 'invalid password'
    },
    {
      email: 'invalid_email',
      password: 'wrong_password',
      description: 'both invalid'
    }
  ]

  for (const testCase of testCases) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testCase.email,
        password: testCase.password
      }
    })

    assert.strictEqual(
      res.statusCode,
      401,
      `Failed for case: ${testCase.description}`
    )

    assert.deepStrictEqual(JSON.parse(res.payload), {
      message: 'Invalid email or password.'
    })
  }
})
