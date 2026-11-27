import { AxiosError, CanceledError } from 'axios'
import { describe, expect, it } from 'vitest'
import { isSessionExpired, normalizeError } from './normalize-error'

const withResponse = (status: number, data: unknown): AxiosError =>
  new AxiosError('x', undefined, undefined, undefined, {
    status,
    data,
  } as AxiosError['response'])

describe('normalizeError', () => {
  it('preserva envelope 4xx', () => {
    const err = normalizeError(
      withResponse(422, { code: 'VALIDATION', message: 'm', fieldErrors: { a: 'b' } }),
      { timedOut: false },
    )
    expect(err).toMatchObject({
      kind: 'http',
      status: 422,
      code: 'VALIDATION',
      fieldErrors: { a: 'b' },
    })
  })
  it('5xx, rede e timeout viram TRANSIENT', () => {
    expect(normalizeError(withResponse(503, {}), { timedOut: false })).toMatchObject({
      kind: 'http',
      code: 'TRANSIENT',
    })
    expect(normalizeError(new AxiosError('n'), { timedOut: false })).toMatchObject({
      kind: 'network',
      code: 'TRANSIENT',
    })
    expect(normalizeError(new CanceledError(), { timedOut: true })).toMatchObject({
      kind: 'timeout',
      code: 'TRANSIENT',
    })
  })
  it('código fora de ErrorCode vira TRANSIENT sem envelope', () => {
    expect(
      normalizeError(withResponse(400, { code: 'XPTO', message: 'm' }), { timedOut: false }),
    ).toMatchObject({ kind: 'http', status: 400, code: 'TRANSIENT' })
  })
  it('descarta fieldErrors inválido', () => {
    const err = normalizeError(
      withResponse(422, { code: 'VALIDATION', message: 'm', fieldErrors: { a: 1 } }),
      { timedOut: false },
    )
    expect(err.code).toBe('VALIDATION')
    expect(err.fieldErrors).toBeUndefined()
  })
  it('cancelamento', () => {
    expect(normalizeError(new CanceledError(), { timedOut: false }).kind).toBe('canceled')
  })
})

describe('isSessionExpired', () => {
  it('só o ApiError SESSION_EXPIRED tem aviso global', () => {
    const expired = normalizeError(withResponse(401, { code: 'SESSION_EXPIRED', message: 'x' }), {
      timedOut: false,
    })
    const unauthenticated = normalizeError(
      withResponse(401, { code: 'UNAUTHENTICATED', message: 'x' }),
      { timedOut: false },
    )
    expect(isSessionExpired(expired)).toBe(true)
    expect(isSessionExpired(unauthenticated)).toBe(false)
    expect(isSessionExpired(new Error('SESSION_EXPIRED'))).toBe(false)
  })
})
