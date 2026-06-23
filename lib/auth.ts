// Role-based access control system

export type UserRole = 'admin' | 'logistics-admin'

export interface User {
  username: string
  role: UserRole
  displayName: string
  email?: string
  phone?: string
  profileImage?: string | null
}

// Role definitions
export const ROLES = {
  admin: {
    id: 'admin' as const,
    name: 'Main Administrator',
    description: 'Full system access - Dashboard, POS, Products, Sales, Business Contacts, Logs',
    icon: '👔'
  },
  'logistics-admin': {
    id: 'logistics-admin' as const,
    name: 'Logistics Admin',
    description: 'POS and Products management',
    icon: '📦'
  }
} as const

// Page permissions per role - supports wildcards for nested routes
export const ROLE_PERMISSIONS = {
  admin: [
    '/dashboard',
    '/dashboard/pos',
    '/dashboard/inventory/**',
    '/dashboard/analytics',
    '/dashboard/log',
    '/dashboard/settings'
  ],
  'logistics-admin': [
    '/dashboard/pos',
    '/dashboard/inventory/**',
    '/dashboard/settings'
  ]
} as const

// Default passwords per role
export const DEFAULT_PASSWORDS: Record<UserRole, string> = {
  admin: 'admin123',
  'logistics-admin': 'logistic123',
  'dept-manager': 'manager123'
}

// Auth helpers
/**
 * Check if a role has permission to access a path.
 * Supports exact matches and wildcard patterns (e.g., /dashboard/inventory/**)
 * 
 * Pattern matching rules:
 * - Exact: /dashboard/sales matches only /dashboard/sales
 * - Wildcard: /dashboard/inventory/** matches /dashboard/inventory and all sub-routes
 * 
 * @param role - User role to check
 * @param path - Path to validate access for
 * @returns true if role has permission, false otherwise
 */
export function hasPermission(role: UserRole, path: string): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  if (!permissions) return false
  
  // Normalize path (remove trailing slash)
  const normalizedPath = path.replace(/\/$/, '')
  
  return permissions.some(pattern => {
    // Normalize pattern
    const normalizedPattern = pattern.replace(/\/$/, '')
    
    // Exact match
    if (normalizedPattern === normalizedPath) return true
    
    // Wildcard match: /dashboard/inventory/** matches /dashboard/inventory/create
    if (normalizedPattern.endsWith('/**')) {
      const basePattern = normalizedPattern.slice(0, -3)
      return normalizedPath === basePattern || normalizedPath.startsWith(basePattern + '/')
    }
    
    return false
  })
}

export function getDefaultRoute(role: UserRole): string {
  if (role === 'logistics-admin') {
    return '/dashboard/pos'
  }
  return '/dashboard'
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null
  
  // CRITICAL: Check for logout parameter FIRST
  // If logout is in progress, ALWAYS return null regardless of localStorage
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const logoutParam = urlParams.get('logout')
    
    if (logoutParam) {
      console.log('[Auth] Logout parameter detected, forcing null user')
      return null
    }
  } catch (e) {
    console.error('[Auth] Error checking logout parameter:', e)
  }
  
  try {
    // Check for admin/logistics-admin session
    const isLoggedIn = localStorage.getItem('isLoggedIn')
    const username = localStorage.getItem('username')
    const role = localStorage.getItem('userRole') as UserRole
    const displayName = localStorage.getItem('displayName')
    
    if (isLoggedIn === 'true' && username && role) {
      // Validate role is valid
      if (!['admin', 'logistics-admin'].includes(role)) {
        console.warn('[Auth] Invalid role in session, clearing...')
        clearCurrentUser()
        return null
      }
      
      return { 
        username, 
        role, 
        displayName: displayName || username
      }
    }
  } catch (error) {
    console.error('[Auth] Error reading user from localStorage:', error)
    clearCurrentUser()
  }
  
  return null
}

export function setCurrentUser(user: User): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('username', user.username)
    localStorage.setItem('userRole', user.role)
    localStorage.setItem('displayName', user.displayName)
  } catch (error) {
    console.error('Error saving user to localStorage:', error)
  }
}

export function validateRolePassword(role: UserRole, password: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    // Check custom stored password first
    const storedPassword = localStorage.getItem(`${role}Password`)
    if (storedPassword) {
      return password === storedPassword
    }
    // Fall back to default password
    return password === DEFAULT_PASSWORDS[role]
  } catch (error) {
    console.error('Error validating password:', error)
    return false
  }
}

export function clearCurrentUser(): void {
  if (typeof window === 'undefined') return
  
  try {
    console.log('[Auth] Clearing all user sessions...')
    
    // Clear admin/logistics-admin session
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('username')
    localStorage.removeItem('userRole')
    localStorage.removeItem('displayName')
    localStorage.removeItem('currentUser')
    
    console.log('[Auth] All sessions cleared successfully')
  } catch (error) {
    console.error('Error clearing user from localStorage:', error)
  }
}

/**
 * Check if current user can edit tracking/packing status
 * Only admins can edit
 */
export function canEditTracking(): boolean {
  const user = getCurrentUser()
  return user?.role === 'admin'
}

/**
 * Check if current user can edit warehouse dispatch
 * Only admins can edit
 */
export function canEditWarehouseDispatch(): boolean {
  const user = getCurrentUser()
  return user?.role === 'admin'
}
