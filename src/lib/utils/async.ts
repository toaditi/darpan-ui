export interface RequestGuard {
  /** Reserve a new request id, marking it as the latest in-flight request. */
  getRequestId: () => number
  /** Returns true when `requestId` is still the latest one reserved. */
  isCurrentRequest: (requestId: number) => boolean
}

/**
 * Create a counter-based guard for discarding stale async responses.
 *
 * Usage:
 *   const guard = makeRequestGuard()
 *   const id = guard.getRequestId()
 *   const response = await something()
 *   if (!guard.isCurrentRequest(id)) return  // a newer request superseded us
 */
export function makeRequestGuard(): RequestGuard {
  let latest = 0
  return {
    getRequestId(): number {
      latest += 1
      return latest
    },
    isCurrentRequest(requestId: number): boolean {
      return requestId === latest
    },
  }
}
