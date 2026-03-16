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
  const runtimeFallbackOrigins: string[] = []
  if (typeof window !== 'undefined') {
    runtimeFallbackOrigins.push(window.location.origin)
    const protocol = window.location.protocol || 'http:'
    const host = window.location.hostname || 'localhost'
    runtimeFallbackOrigins.push(`${protocol}//${host}:8080`)
    runtimeFallbackOrigins.push(`${protocol}//${host}:8085`)
    runtimeFallbackOrigins.push('http://localhost:8080')
    runtimeFallbackOrigins.push('http://localhost:8085')
  }

  const candidates = [
    configured ? resolveRpcUrl(configured) : '',
    `${apiBase}/rpc/json`,
    `${apiBase}/qapps/darpan/rpc/json`,
    `${origin}/rpc/json`,
    `${origin}/qapps/darpan/rpc/json`,
    ...runtimeFallbackOrigins.map((item) => `${item}/rpc/json`),
    ...runtimeFallbackOrigins.map((item) => `${item}/qapps/darpan/rpc/json`),
  ].filter((item) => item.length > 0)

  return [...new Set(candidates)]
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

function normalizeEnvelope(result: unknown): ApiEnvelope {
  const payload = result as Partial<ApiEnvelope>
  return {
    ok: payload.ok !== false,
    messages: Array.isArray(payload.messages) ? payload.messages.map((item) => String(item)) : [],
    errors: Array.isArray(payload.errors) ? payload.errors.map((item) => String(item)) : [],
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

    if (response.status === 401 && finalBody.includes('Session token required')) {
      let bootstrapped = await bootstrapCsrfToken(candidateUrl)
      if (!bootstrapped) {
        await resetSession(candidateUrl)
        bootstrapped = await bootstrapCsrfToken(candidateUrl)
      }
      if (bootstrapped) {
        try {
          const retryResponse = await fetch(candidateUrl, {
            method: 'POST',
            headers: buildHeaders(),
            credentials: 'include',
            body: JSON.stringify(request),
          })
          updateCsrfFromResponse(retryResponse)
          finalResponse = retryResponse
          finalBody = await retryResponse.text()
        } catch (error) {
          parseFailures.push({
            url: candidateUrl,
            error,
          })
          continue
        }
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
      throw new ApiCallError(
        parsed.error?.message ?? `Request failed with status ${finalResponse.status}`,
        finalResponse.status,
        { candidateUrl, data: parsed.error?.data },
      )
    }

    if (parsed.error) {
      throw new ApiCallError(parsed.error.message, finalResponse.status, { candidateUrl, data: parsed.error.data })
    }

    const result = parsed.result
    if (!result) {
      throw new ApiCallError(`No result returned for ${method}`, response.status, { candidateUrl })
    }

    const envelope = normalizeEnvelope(result)
    if (!envelope.ok || envelope.errors.length > 0) {
      throw new ApiCallError(
        envelope.errors[0] ?? `Service ${method} returned an error`,
        finalResponse.status,
        { candidateUrl, result },
      )
    }

    return result
  }

  throw new ApiCallError(`Invalid JSON response from ${method}`, 500, {
    attemptedUrls: rpcCandidates,
    failures: parseFailures,
  })
}

export function getRpcUrl(): string {
  return rpcUrl
}
