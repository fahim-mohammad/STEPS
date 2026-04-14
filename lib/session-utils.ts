/**
 * Safe Session Handling Utilities
 * Deals with refresh token errors gracefully
 */

export class SessionError extends Error {
  constructor(
    public code: 'REFRESH_TOKEN_NOT_FOUND' | 'SESSION_EXPIRED' | 'UNAUTHORIZED' | 'UNKNOWN',
    message: string
  ) {
    super(message)
    this.name = 'SessionError'
  }
}

/**
 * Parse Supabase auth errors and convert to known session errors
 */
export function parseAuthError(error: any): SessionError {
  if (!error) return new SessionError('UNKNOWN', 'Unknown authentication error')

  const message = error.message || String(error)

  if (message.includes('Refresh Token') || 
      message.includes('refresh_token') ||
      message.includes('Token not found')) {
    return new SessionError('REFRESH_TOKEN_NOT_FOUND', 'Refresh token is missing or invalid')
  }

  if (message.includes('Invalid') || 
      message.includes('expired') ||
      message.includes('session')) {
    return new SessionError('SESSION_EXPIRED', 'Your session has expired. Please log in again.')
  }

  if (message.includes('Unauthorized') || 
      message.includes('UNAUTHORIZED')) {
    return new SessionError('UNAUTHORIZED', 'Please log in to continue')
  }

  return new SessionError('UNKNOWN', message)
}

/**
 * Safe localStorage access with error handling
 */
export function safeGetFromStorage(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null
    return localStorage?.getItem(key) || null
  } catch {
    return null
  }
}

export function safeSetToStorage(key: string, value: string): boolean {
  try {
    if (typeof window === 'undefined') return false
    localStorage?.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemoveFromStorage(key: string): boolean {
  try {
    if (typeof window === 'undefined') return false
    localStorage?.removeItem(key)
    return true
  } catch {
    return false
  }
}

/**
 * Check if browser storage is available
 */
export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const test = '__storage_test__'
    localStorage?.setItem(test, test)
    localStorage?.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Safely clear all auth storage
 */
export function clearAuthStorage(): void {
  const keys = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token',
    'steps_auth',
    'steps_access_token',
    'steps_approved',
  ]

  keys.forEach((key) => {
    safeRemoveFromStorage(key)
  })

  // Also clear any supabase-related keys
  try {
    if (typeof window !== 'undefined' && localStorage) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key?.includes('supabase') || key?.includes('sb-')) {
          localStorage.removeItem(key)
        }
      }
    }
  } catch {
    // Ignore errors during cleanup
  }
}

/**
 * Get auth token from any available source
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null

  // Try common storage keys
  const token = 
    safeGetFromStorage('sb-access-token') ||
    safeGetFromStorage('steps_access_token') ||
    safeGetFromStorage('access_token')

  return token ? decodeURIComponent(token) : null
}
