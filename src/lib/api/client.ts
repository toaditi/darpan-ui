import type { ApiEnvelope, AuthTokenContract } from './types'

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params: Record<string, unknown>
}

interface JsonRpcResponse<T> {
  jsonrpc: '2.0'
  id: number
  result?: T
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

export class ApiCallError extends Error {
  status?: number
  details?: unknown

  constructor(message: string, status?: number, details?: unknown) {
    super(message)
    this.name = 'ApiCallError'
    this.status = status
    this.details = details
  }
}

export const AUTH_REQUIRED_EVENT = 'darpan:auth-required'

const AUTH_REQUIRED_MESSAGE = 'Your session has ended. Sign in again to continue.'
const UNREACHABLE_MESSAGE = 'Unable to connect to Darpan right now. Try again in a moment.'
const UNEXPECTED_RESPONSE_MESSAGE = 'Darpan returned an unexpected response. Try again in a moment.'
const EMPTY_RESULT_MESSAGE = 'Darpan did not return any data.'
const GENERIC_SERVICE_ERROR_MESSAGE = 'Darpan could not complete the request.'
const AUTH_SESSION_INFO_METHOD = 'facade.AuthFacadeServices.get#SessionInfo'
const AUTH_TOKEN_STORAGE_KEY = 'darpan.authToken'
const AUTH_TOKEN_HEADER_NAME = 'login_key'

interface StoredAuthToken {
  value: string
  headerName: string
  tokenType: string | null
  expiresAt: number | null
}

const rawApiBase =
  import.meta.env.VITE_DARPAN_API_BASE_URL ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080')
const apiBase = rawApiBase.replace(/\/$/, '')

function resolveApiOrigin(value: string): string {
  try {
    return new URL(value).origin
  } catch {
    if (typeof window !== 'undefined') {
      return window.location.origin
    }
    return value.replace(/\/$/, '')
  }
}

function resolveRpcUrl(value: string): string {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }

  const apiOrigin = resolveApiOrigin(apiBase)
  if (value.startsWith('/')) {
    return `${apiOrigin}${value}`
  }

  return `${apiOrigin}/${value}`
}

function resolvePrimaryRpcUrl(): string {
  const configured = (import.meta.env.VITE_DARPAN_RPC_URL ?? '').trim()
  if (!configured) return `${resolveApiOrigin(apiBase)}/rpc/json`
  return resolveRpcUrl(configured)
}

function buildRpcCandidates(): string[] {
  const configured = (import.meta.env.VITE_DARPAN_RPC_URL ?? '').trim()
  const origin = resolveApiOrigin(apiBase)
  const candidates = new Set<string>()

  if (configured) {
    candidates.add(resolveRpcUrl(configured))
  }

  if (!configured || import.meta.env.DEV) {
    candidates.add(`${apiBase}/rpc/json`)
    candidates.add(`${apiBase}/qapps/darpan/rpc/json`)
    candidates.add(`${origin}/rpc/json`)
    candidates.add(`${origin}/qapps/darpan/rpc/json`)
  }

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const protocol = window.location.protocol || 'http:'
    const host = window.location.hostname || 'localhost'
    const runtimeFallbackOrigins = new Set<string>([
      window.location.origin,
      `${protocol}//${host}:8080`,
      `${protocol}//${host}:8081`,
      `${protocol}//${host}:8085`,
      'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:8085',
    ])

    for (const runtimeOrigin of runtimeFallbackOrigins) {
      candidates.add(`${runtimeOrigin}/rpc/json`)
      candidates.add(`${runtimeOrigin}/qapps/darpan/rpc/json`)
    }
  }

  return Array.from(candidates).filter((item) => item.length > 0)
}

function normalizeTokenValue(value: unknown): string | null {
  const normalized = value?.toString()?.trim()
  if (!normalized || normalized.toLowerCase() === 'null' || normalized.toLowerCase() === 'undefined') {
    return null
  }
  return normalized
}

function normalizeHeaderName(value: unknown): string {
  const normalized = value?.toString()?.trim().toLowerCase()
  if (!normalized) return AUTH_TOKEN_HEADER_NAME
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(normalized) ? normalized : AUTH_TOKEN_HEADER_NAME
}

function normalizeExpiryTimestamp(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value <= 0) return null
  return Math.round(value)
}

function sanitizeStoredAuthToken(value: Partial<StoredAuthToken> | null | undefined): StoredAuthToken | null {
  const token = normalizeTokenValue(value?.value)
  if (!token) return null

  return {
    value: token,
    headerName: normalizeHeaderName(value?.headerName),
    tokenType: normalizeTokenValue(value?.tokenType),
    expiresAt: normalizeExpiryTimestamp(value?.expiresAt),
  }
}

function persistAuthTokenState(state: StoredAuthToken | null): void {
  if (typeof window === 'undefined') return
  try {
    if (state) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, JSON.stringify(state))
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    }
  } catch {
    // ignore storage failures; the in-memory token state still works for the active session
  }
}

function loadStoredAuthTokenState(): StoredAuthToken | null {
  if (typeof window === 'undefined') return null

  let rawValue: string | null = null
  try {
    rawValue = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }

  const rawToken = normalizeTokenValue(rawValue)
  if (!rawToken) return null

  try {
    const parsed = JSON.parse(rawToken) as Partial<StoredAuthToken> | null
    const tokenState = sanitizeStoredAuthToken(parsed)
    if (!tokenState) {
      persistAuthTokenState(null)
      return null
    }
    if (tokenState.expiresAt != null && tokenState.expiresAt <= Date.now()) {
      persistAuthTokenState(null)
      return null
    }
    return tokenState
  } catch {
    // Support the brief DAR-101 intermediate shape that stored only the raw token string.
    return {
      value: rawToken,
      headerName: AUTH_TOKEN_HEADER_NAME,
      tokenType: null,
      expiresAt: null,
    }
  }
}

function createAuthTokenState(token: string | null, contract: Partial<AuthTokenContract> = {}): StoredAuthToken | null {
  const normalizedToken = normalizeTokenValue(token)
  if (!normalizedToken) return null

  const expiresInSeconds =
    typeof contract.authTokenExpiresInSeconds === 'number' && Number.isFinite(contract.authTokenExpiresInSeconds)
      ? Math.max(0, Math.round(contract.authTokenExpiresInSeconds))
      : null

  return sanitizeStoredAuthToken({
    value: normalizedToken,
    headerName: contract.authTokenHeaderName,
    tokenType: contract.authTokenType,
    expiresAt: expiresInSeconds != null ? Date.now() + expiresInSeconds * 1000 : null,
  })
}

function getActiveAuthTokenState(): StoredAuthToken | null {
  if (authTokenState?.expiresAt != null && authTokenState.expiresAt <= Date.now()) {
    clearAuthToken()
  }
  return authTokenState
}

let authTokenState: StoredAuthToken | null = loadStoredAuthTokenState()

export function setAuthToken(token: string | null): void {
  authTokenState = createAuthTokenState(token)
  persistAuthTokenState(authTokenState)
}

export function setAuthTokenContract(contract: Partial<AuthTokenContract> | null): void {
  authTokenState = createAuthTokenState(contract?.authToken ?? null, contract ?? {})
  persistAuthTokenState(authTokenState)
}

export function clearAuthToken(): void {
  authTokenState = null
  persistAuthTokenState(null)
}

export function getAuthToken(): string | null {
  return getActiveAuthTokenState()?.value ?? null
}

const rpcUrl = resolvePrimaryRpcUrl()
const rpcCandidates = buildRpcCandidates()

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const tokenState = getActiveAuthTokenState()
  if (tokenState) {
    headers[tokenState.headerName] = tokenState.value
  }

  return headers
}

function normalizeEnvelope(result: unknown): ApiEnvelope {
  const payload = result as Partial<ApiEnvelope>
  return {
    ok: payload.ok !== false,
    messages: Array.isArray(payload.messages) ? payload.messages.map((item) => String(item)) : [],
    errors: Array.isArray(payload.errors) ? payload.errors.map((item) => String(item)) : [],
  }
}

function isAuthRequiredMessage(message: string | null | undefined): boolean {
  if (!message) return false
  const normalized = message.toLowerCase()
  return (
    normalized.includes('user must be logged in') ||
    normalized.includes('no active authenticated session') ||
    normalized.includes('authentication required') ||
    normalized.includes('login key not valid') ||
    normalized.includes('login key expired')
  )
}

function shouldDispatchAuthRequired(method: string): boolean {
  return method !== AUTH_SESSION_INFO_METHOD
}

function dispatchAuthRequiredEvent(payload: { message: string; method: string; candidateUrl: string; status?: number }): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(AUTH_REQUIRED_EVENT, {
      detail: payload,
    }),
  )
}

function withMethodDetails(method: string, details: Record<string, unknown>): Record<string, unknown> {
  return {
    method,
    ...details,
  }
}

export async function callService<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  }

  const parseFailures: Array<{ url: string; status?: number; raw?: string; error?: unknown }> = []

  for (const candidateUrl of rpcCandidates) {
    let response: Response
    try {
      response = await fetch(candidateUrl, {
        method: 'POST',
        headers: buildHeaders(),
        credentials: 'omit',
        body: JSON.stringify(request),
      })
    } catch (error) {
      parseFailures.push({
        url: candidateUrl,
        error,
      })
      continue
    }

    const bodyText = await response.text()

    let parsed: JsonRpcResponse<T>
    try {
      parsed = JSON.parse(bodyText) as JsonRpcResponse<T>
    } catch (error) {
      parseFailures.push({
        url: candidateUrl,
        status: response.status,
        raw: bodyText.slice(0, 400),
        error,
      })
      continue
    }

    if (!response.ok) {
      const message = parsed.error?.message ?? `Request failed with status ${response.status}`
      const authRequired = response.status === 401 || isAuthRequiredMessage(message)
      if (authRequired) {
        clearAuthToken()
        if (shouldDispatchAuthRequired(method)) {
          dispatchAuthRequiredEvent({
            message,
            method,
            candidateUrl,
            status: 401,
          })
        }
      }

      throw new ApiCallError(
        message,
        authRequired ? 401 : response.status,
        withMethodDetails(method, { candidateUrl, data: parsed.error?.data }),
      )
    }

    if (parsed.error) {
      const authRequired = response.status === 401 || isAuthRequiredMessage(parsed.error.message)
      if (authRequired) {
        clearAuthToken()
        if (shouldDispatchAuthRequired(method)) {
          dispatchAuthRequiredEvent({
            message: parsed.error.message,
            method,
            candidateUrl,
            status: 401,
          })
        }
      }

      throw new ApiCallError(
        parsed.error.message,
        authRequired ? 401 : response.status,
        withMethodDetails(method, { candidateUrl, data: parsed.error.data }),
      )
    }

    const result = parsed.result
    if (!result) {
      throw new ApiCallError(EMPTY_RESULT_MESSAGE, response.status, withMethodDetails(method, { candidateUrl }))
    }

    const envelope = normalizeEnvelope(result)
    if (!envelope.ok || envelope.errors.length > 0) {
      const message = envelope.errors[0] ?? GENERIC_SERVICE_ERROR_MESSAGE
      const authRequired = isAuthRequiredMessage(message)
      if (authRequired) {
        clearAuthToken()
        if (shouldDispatchAuthRequired(method)) {
          dispatchAuthRequiredEvent({
            message,
            method,
            candidateUrl,
            status: 401,
          })
        }
      }

      throw new ApiCallError(
        message,
        authRequired ? 401 : response.status,
        withMethodDetails(method, { candidateUrl, result }),
      )
    }

    return result
  }

  const attemptedUrls = rpcCandidates
  const allUnreachable = parseFailures.length > 0 && parseFailures.every((failure) => failure.status == null)
  const authLikeFailure = parseFailures.find((failure) => {
    const raw = failure.raw?.toLowerCase() ?? ''
    return (
      failure.status === 401 ||
      raw.includes('authentication required') ||
      raw.includes('user must be logged in') ||
      raw.includes('login key not valid') ||
      raw.includes('login key expired')
    )
  })

  if (authLikeFailure) {
    clearAuthToken()
    if (shouldDispatchAuthRequired(method)) {
      dispatchAuthRequiredEvent({
        message: AUTH_REQUIRED_MESSAGE,
        method,
        candidateUrl: authLikeFailure.url,
        status: authLikeFailure.status ?? 401,
      })
    }

    throw new ApiCallError(
      AUTH_REQUIRED_MESSAGE,
      401,
      withMethodDetails(method, {
        attemptedUrls,
        failures: parseFailures,
      }),
    )
  }

  if (allUnreachable) {
    throw new ApiCallError(
      UNREACHABLE_MESSAGE,
      503,
      withMethodDetails(method, {
        attemptedUrls,
        failures: parseFailures,
      }),
    )
  }

  throw new ApiCallError(
    UNEXPECTED_RESPONSE_MESSAGE,
    502,
    withMethodDetails(method, {
      attemptedUrls,
      failures: parseFailures,
    }),
  )
}

export function getRpcUrl(): string {
  return rpcUrl
}
