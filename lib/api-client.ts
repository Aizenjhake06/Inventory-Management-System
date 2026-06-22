/**
 * API Client - UPDATED WITH DEPARTMENT FILTERING
 * 
 * Client-side wrapper for making authenticated API requests
 * Automatically adds authentication headers INCLUDING assignedChannel
 */

/**
 * Add authentication headers to fetch requests
 * INCLUDES assignedChannel for department filtering
 */
function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {}

  try {
    const headers: Record<string, string> = {}

    // Get ALL user authentication from localStorage
    const username = localStorage.getItem('username')
    const role = localStorage.getItem('userRole')
    const displayName = localStorage.getItem('displayName')
    const assignedChannel = localStorage.getItem('assignedChannel')

    // DEBUG: Log what we're reading from localStorage
    console.log('[API Client] Reading from localStorage:', {
      username,
      role,
      displayName,
      assignedChannel
    })

    // Add headers
    if (username) headers['x-user-username'] = username
    if (role) headers['x-user-role'] = role
    if (displayName) headers['x-user-display-name'] = displayName
    if (assignedChannel) headers['x-assigned-channel'] = assignedChannel

    // DEBUG: Log final headers
    console.log('[API Client] Final headers:', headers)

    return headers
  } catch (error) {
    console.error('[API Client] Error reading auth from localStorage:', error)
    return {}
  }
}

/**
 * Authenticated fetch wrapper
 * Use this instead of fetch() for all API calls
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = getAuthHeaders()
  
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...options.headers,
  }

  console.log('[API Client] Making request to:', url)
  console.log('[API Client] With headers:', headers)

  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * Authenticated fetch with JSON response
 */
export async function apiGet<T = any>(url: string): Promise<T> {
  const response = await apiFetch(url)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    console.error(`[API Client] GET ${url} failed:`, response.status, error)
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * Authenticated POST request
 */
export async function apiPost<T = any>(url: string, data: any): Promise<T> {
  const response = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    // Try to get detailed error message
    let errorMessage = `HTTP ${response.status}`
    try {
      const error = await response.json()
      errorMessage = error.error || error.details || error.message || errorMessage
      console.error(`[API Client] POST ${url} failed:`, response.status, error)
    } catch (parseError) {
      // Response is not JSON, try to get text
      try {
        const errorText = await response.text()
        console.error(`[API Client] POST ${url} failed with non-JSON response:`, errorText)
        if (errorText) errorMessage = errorText
      } catch {
        console.error(`[API Client] POST ${url} failed and could not parse error`)
      }
    }
    throw new Error(errorMessage)
  }

  return response.json()
}

/**
 * Authenticated PUT request
 */
export async function apiPut<T = any>(url: string, data: any): Promise<T> {
  const response = await apiFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    // Try to get detailed error message
    let errorMessage = `HTTP ${response.status}`
    try {
      const error = await response.json()
      errorMessage = error.error || error.details || error.message || errorMessage
      console.error(`[API Client] PUT ${url} failed:`, response.status, error)
    } catch (parseError) {
      // Response is not JSON, try to get text
      try {
        const errorText = await response.text()
        console.error(`[API Client] PUT ${url} failed with non-JSON response:`, errorText)
        if (errorText) errorMessage = errorText
      } catch {
        console.error(`[API Client] PUT ${url} failed and could not parse error`)
      }
    }
    throw new Error(errorMessage)
  }

  return response.json()
}

/**
 * Authenticated DELETE request
 */
export async function apiDelete(url: string): Promise<void> {
  const response = await apiFetch(url, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
}
