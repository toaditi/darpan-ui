import type { ApiEnvelope } from './types'

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
const AUTH_SESSION_INFO_METHOD = 'facade.AuthFacadeServices.get#SessionInfo'
const AUTH_LOGOUT_METHOD = 'facade.AuthFacadeServices.logout#Session'
const AUTH_REQUIRED_MESSAGE = 'Your session has ended. Sign in again to continue.'
const UNREACHABLE_MESSAGE = 'Unable to connect to Darpan right now. Try again in a moment.'
const UNEXPECTED_RESPONSE_MESSAGE = 'Darpan returned an unexpected response. Try again in a moment.'
const EMPTY_RESULT_MESSAGE = 'Darpan did not return any data.'
const GENERIC_SERVICE_ERROR_MESSAGE = 'Darpan could not complete the request.'

const rawApiBase = import.meta.env.VITE_DARPAN_API_BASE_URL ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080')
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

function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]'
}

function isLoopbackUrl(value: string): boolean {
  try {
    return isLoopbackHostname(new URL(value).hostname)
  } catch {
    return false
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

function buildSameOriginProxyCandidates(): string[] {
  if (typeof window === 'undefined') return []

  const origin = window.location.origin.replace(/\/$/, '')
  return [`${origin}/rpc/json`, `${origin}/qapps/darpan/rpc/json`]
}

function shouldPreferSameOriginProxy(targetUrl: string): boolean {
  if (typeof window === 'undefined') return false
  if (!isLoopbackUrl(targetUrl) || !isLoopbackUrl(window.location.origin)) return false

  return getOriginFromUrl(targetUrl) !== window.location.origin
}

function buildRpcCandidates(): string[] {
  const configured = (import.meta.env.VITE_DARPAN_RPC_URL ?? '').trim()
  if (configured) {
    const configuredUrl = resolveRpcUrl(configured)
    const preferredCandidates = shouldPreferSameOriginProxy(configuredUrl) ? buildSameOriginProxyCandidates() : []
    return Array.from(new Set<string>([...preferredCandidates, configuredUrl])).filter((item) => item.length > 0)
  }

  const origin = resolveApiOrigin(apiBase)
  const preferredCandidates = shouldPreferSameOriginProxy(origin) ? buildSameOriginProxyCandidates() : []
  return Array.from(
    new Set<string>([
      ...preferredCandidates,
      `${apiBase}/rpc/json`,
      `${apiBase}/qapps/darpan/rpc/json`,
      `${origin}/rpc/json`,
      `${origin}/qapps/darpan/rpc/json`,
    ]),
  ).filter((item) => item.length > 0)
}

const rpcCandidates = buildRpcCandidates()
const rpcUrl = rpcCandidates[0] ?? `${resolveApiOrigin(apiBase)}/rpc/json`
let csrfToken: string | null = null

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
  }
  return headers
}

function updateCsrfFromResponse(response: Response): void {
  const headerToken = response.headers.get('X-CSRF-Token') ?? response.headers.get('moquiSessionToken')
  if (headerToken && headerToken.trim().length > 0) {
    csrfToken = headerToken.trim()
  }
}

function extractCsrfFromHtml(body: string): string | null {
  const tokenPatterns = [
    /name=["']moquiSessionToken["']\s+value=["']([^"']+)["']/i,
    /moquiSessionToken["']?\s*[:=]\s*["']([^"']+)["']/i,
    /X-CSRF-Token["']?\s*[:=]\s*["']([^"']+)["']/i,
  ]

  for (const pattern of tokenPatterns) {
    const match = body.match(pattern)
    if (match?.[1]?.trim()) return match[1].trim()
  }
  return null
}

function isHtmlResponse(response: Response, body: string): boolean {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
    return true
  }
  return /^\s*</.test(body)
}

function looksLikeAuthHtml(body: string): boolean {
  const normalized = body.toLowerCase()
  return (
    normalized.includes('moquisessiontoken') ||
    normalized.includes('<title>login') ||
    normalized.includes('name="username"') ||
    normalized.includes('name="password"') ||
    normalized.includes('sign in')
  )
}

function getOriginFromUrl(urlValue: string): string {
  try {
    return new URL(urlValue).origin
  } catch {
    return resolveApiOrigin(apiBase)
  }
}

async function bootstrapCsrfToken(candidateUrl?: string): Promise<boolean> {
  const origin = getOriginFromUrl(candidateUrl ?? rpcUrl)
  const loginUrl = `${origin}/Login`
  try {
    const response = await fetch(loginUrl, {
      method: 'GET',
      credentials: 'include',
      redirect: 'manual',
    })
    updateCsrfFromResponse(response)
    if (!csrfToken) {
      const bodyText = await response.text()
      const htmlToken = extractCsrfFromHtml(bodyText)
      if (htmlToken) csrfToken = htmlToken
    }
    return !!csrfToken
  } catch {
    return false
  }
}

async function resetSession(candidateUrl?: string): Promise<void> {
  const targetUrl = candidateUrl ?? rpcUrl

  try {
    const bootstrapped = csrfToken ? true : await bootstrapCsrfToken(targetUrl)
    if (bootstrapped) {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: buildHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: AUTH_LOGOUT_METHOD,
          params: {},
        }),
      })
      updateCsrfFromResponse(response)
      await response.text()
      csrfToken = null
      return
    }
  } catch {
    // fall through to legacy logout path
  }

  const origin = getOriginFromUrl(targetUrl)
  const logoutUrl = `${origin}/Login/logout`
  try {
    const response = await fetch(logoutUrl, {
      method: 'GET',
      credentials: 'include',
      redirect: 'manual',
    })
    updateCsrfFromResponse(response)
  } catch {
    // ignore; next bootstrap attempt decides final outcome
  }
  csrfToken = null
}

async function retryWithCsrfToken(
  candidateUrl: string,
  request: JsonRpcRequest,
  initialBody: string,
): Promise<{ response: Response; body: string } | null> {
  if (!csrfToken) {
    const inlineToken = extractCsrfFromHtml(initialBody)
    if (inlineToken) csrfToken = inlineToken
  }

  let bootstrapped = !!csrfToken
  if (!bootstrapped) {
    bootstrapped = await bootstrapCsrfToken(candidateUrl)
  }
  if (!bootstrapped) {
    await resetSession(candidateUrl)
    bootstrapped = await bootstrapCsrfToken(candidateUrl)
  }
  if (!bootstrapped) return null

  const retryResponse = await fetch(candidateUrl, {
    method: 'POST',
    headers: buildHeaders(),
    credentials: 'include',
    body: JSON.stringify(request),
  })
  updateCsrfFromResponse(retryResponse)
  return {
    response: retryResponse,
    body: await retryResponse.text(),
  }
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
    normalized.includes('authentication required')
  )
}

function dispatchAuthRequiredEvent(payload: { message: string; method: string; candidateUrl: string; status?: number }): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(AUTH_REQUIRED_EVENT, {
      detail: payload,
    }),
  )
}

function shouldDispatchAuthRequired(method: string): boolean {
  // Session bootstrap is resolved through get#SessionInfo itself. Dispatching the global
  // auth-required event for that method creates redirect races and bypasses the contract
  // classification in src/lib/auth.ts.
  return method !== AUTH_SESSION_INFO_METHOD
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
        credentials: 'include',
        body: JSON.stringify(request),
      })
    } catch (error) {
      parseFailures.push({
        url: candidateUrl,
        error,
      })
      continue
    }

    updateCsrfFromResponse(response)
    const bodyText = await response.text()

    let finalResponse = response
    let finalBody = bodyText

    if (
      (response.status === 401 && finalBody.toLowerCase().includes('session token required')) ||
      (isHtmlResponse(response, finalBody) && looksLikeAuthHtml(finalBody))
    ) {
      try {
        const retryResult = await retryWithCsrfToken(candidateUrl, request, finalBody)
        if (retryResult) {
          finalResponse = retryResult.response
          finalBody = retryResult.body
        }
      } catch (error) {
        parseFailures.push({
          url: candidateUrl,
          error,
        })
        continue
      }
    }

    let parsed: JsonRpcResponse<T>
    try {
      parsed = JSON.parse(finalBody) as JsonRpcResponse<T>
    } catch (error) {
      parseFailures.push({
        url: candidateUrl,
        status: finalResponse.status,
        raw: finalBody.slice(0, 400),
        error,
      })
      continue
    }

    if (!finalResponse.ok) {
      const message = parsed.error?.message ?? `Request failed with status ${finalResponse.status}`
      if (shouldDispatchAuthRequired(method) && (finalResponse.status === 401 || isAuthRequiredMessage(message))) {
        dispatchAuthRequiredEvent({
          message,
          method,
          candidateUrl,
          status: finalResponse.status,
        })
      }
      throw new ApiCallError(
        message,
        finalResponse.status,
        { candidateUrl, data: parsed.error?.data },
      )
    }

    if (parsed.error) {
      if (shouldDispatchAuthRequired(method) && (finalResponse.status === 401 || isAuthRequiredMessage(parsed.error.message))) {
        dispatchAuthRequiredEvent({
          message: parsed.error.message,
          method,
          candidateUrl,
          status: finalResponse.status,
        })
      }
      throw new ApiCallError(parsed.error.message, finalResponse.status, { candidateUrl, data: parsed.error.data })
    }

    const result = parsed.result
    if (!result) {
      throw new ApiCallError(EMPTY_RESULT_MESSAGE, finalResponse.status, withMethodDetails(method, { candidateUrl }))
    }

    const envelope = normalizeEnvelope(result)
    if (!envelope.ok || envelope.errors.length > 0) {
      const message = envelope.errors[0] ?? GENERIC_SERVICE_ERROR_MESSAGE
      const isAuthRequired = isAuthRequiredMessage(message)
      if (shouldDispatchAuthRequired(method) && isAuthRequired) {
        dispatchAuthRequiredEvent({
          message,
          method,
          candidateUrl,
          status: 401,
        })
      }
      throw new ApiCallError(
        message,
        isAuthRequired ? 401 : finalResponse.status,
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
      raw.includes('session token required') ||
      raw.includes('moquisessiontoken') ||
      raw.includes('login') ||
      raw.includes('sign in') ||
      raw.includes('authentication required')
    )
  })

  if (authLikeFailure) {
    if (shouldDispatchAuthRequired(method)) {
      dispatchAuthRequiredEvent({
        message: 'Authentication required',
        method,
        candidateUrl: authLikeFailure.url,
        status: authLikeFailure.status ?? 401,
      })
    }
    throw new ApiCallError(AUTH_REQUIRED_MESSAGE, 401, withMethodDetails(method, {
      attemptedUrls,
      failures: parseFailures,
    }))
  }

  if (allUnreachable) {
    throw new ApiCallError(UNREACHABLE_MESSAGE, 503, withMethodDetails(method, {
      attemptedUrls,
      failures: parseFailures,
    }))
  }

  throw new ApiCallError(UNEXPECTED_RESPONSE_MESSAGE, 502, withMethodDetails(method, {
    attemptedUrls,
    failures: parseFailures,
  }))
}

export function getRpcUrl(): string {
  return rpcUrl
}
