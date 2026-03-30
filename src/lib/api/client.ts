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

  // Keep broad fallback probing to local/dev environments only.
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

const rpcUrl = resolvePrimaryRpcUrl()
const rpcCandidates = buildRpcCandidates()
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
  const origin = getOriginFromUrl(candidateUrl ?? rpcUrl)
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
      if (finalResponse.status === 401 || isAuthRequiredMessage(message)) {
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
      if (finalResponse.status === 401 || isAuthRequiredMessage(parsed.error.message)) {
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
      throw new ApiCallError(`No result returned for ${method}`, finalResponse.status, { candidateUrl })
    }

    const envelope = normalizeEnvelope(result)
    if (!envelope.ok || envelope.errors.length > 0) {
      const message = envelope.errors[0] ?? `Service ${method} returned an error`
      const isAuthRequired = isAuthRequiredMessage(message)
      if (isAuthRequired) {
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
        { candidateUrl, result },
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
    dispatchAuthRequiredEvent({
      message: 'Authentication required',
      method,
      candidateUrl: authLikeFailure.url,
      status: authLikeFailure.status ?? 401,
    })
    throw new ApiCallError(`Authentication required for ${method}`, 401, {
      attemptedUrls,
      failures: parseFailures,
    })
  }

  if (allUnreachable) {
    throw new ApiCallError(`Unable to reach API endpoint for ${method}`, 503, {
      attemptedUrls,
      failures: parseFailures,
    })
  }

  throw new ApiCallError(`Received non-JSON response from ${method}`, 502, {
    attemptedUrls,
    failures: parseFailures,
  })
}

export function getRpcUrl(): string {
  return rpcUrl
}
