import { QueryCache, QueryClient } from '@tanstack/vue-query'
import { ApiCallError } from './api/client'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError(error) {
      if (error instanceof ApiCallError && error.status === 401) {
        console.warn('[QueryCache] Auth required:', error.message)
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 15_000,
    },
  },
})

/** Clears all TanStack Query cache entries (use after login, logout, or tenant switch). */
export function clearApiResponseCache(): void {
  queryClient.clear()
}
