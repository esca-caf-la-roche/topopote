import { describe, expect, it } from 'vitest'
import { resolveAuthenticatedRoles } from './authRoles'

describe('resolveAuthenticatedRoles', () => {
  it('conserve la session quand une table de rôle est indisponible', () => {
    const user = { id: 'pratiquant-1' }
    const result = resolveAuthenticatedRoles(
      user,
      { data: null, error: null },
      { data: null, error: { message: 'relation ouvreurs introuvable' } },
    )

    expect(result.user).toBe(user)
    expect(result.isAdmin).toBe(false)
    expect(result.isOpener).toBe(false)
    expect(result.error?.message).toBe('relation ouvreurs introuvable')
  })

  it('accorde uniquement les rôles confirmés sans erreur', () => {
    const result = resolveAuthenticatedRoles(
      { id: 'admin-1' },
      { data: { user_id: 'admin-1' }, error: null },
      { data: { user_id: 'admin-1' }, error: null },
    )

    expect(result.isAdmin).toBe(true)
    expect(result.isOpener).toBe(true)
    expect(result.error).toBeNull()
  })
})
