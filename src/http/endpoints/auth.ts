import { request } from '@/http/client'
import type { AuthResponse, LoginRequest, RegisterRequest, SessionResponse } from '@/contracts'

export function register(body: RegisterRequest): Promise<AuthResponse> {
  return request<AuthResponse>({ method: 'POST', url: '/auth/register', data: body })
}

export function login(body: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>({ method: 'POST', url: '/auth/login', data: body })
}

export function getSession(signal: AbortSignal): Promise<SessionResponse> {
  return request<SessionResponse>({ method: 'GET', url: '/auth/session', signal })
}

export function logout(): Promise<void> {
  return request<void>({ method: 'POST', url: '/auth/logout' })
}
