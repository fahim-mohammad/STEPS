export type UserRole = 'member' | 'chairman' | 'accountant'

const ROLE_OVERRIDE_KEY = 'steps_role_override'

function storage() {
  if (typeof window === 'undefined') return null
  return window.sessionStorage
}

export function getRoleOverride(): UserRole | null {
  const s = storage()
  if (!s) return null

  const v = s.getItem(ROLE_OVERRIDE_KEY)
  return v === 'member' || v === 'chairman' || v === 'accountant' ? (v as UserRole) : null
}

export function setRoleOverride(role: UserRole | null) {
  const s = storage()
  if (!s) return

  if (role) s.setItem(ROLE_OVERRIDE_KEY, role)
  else s.removeItem(ROLE_OVERRIDE_KEY)
}

export function clearRoleOverride() {
  setRoleOverride(null)
}

export function getEffectiveRole(realRole: UserRole): UserRole {
  return getRoleOverride() ?? realRole
}