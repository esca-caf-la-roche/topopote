import { describe, expect, it } from 'vitest'
import { profileErrorMessage } from './databaseErrors'

describe('profileErrorMessage', () => {
  it('explique clairement quand un pseudo est déjà pris', () => {
    expect(profileErrorMessage({
      code: '23505',
      message: 'duplicate key value violates unique constraint "profils_pseudo_unique_idx"',
    })).toBe('Ce pseudo est déjà utilisé. Choisis-en un autre.')
  })

  it('préserve les autres messages de la base de données', () => {
    expect(profileErrorMessage({ code: '42501', message: 'permission denied' })).toBe('permission denied')
  })
})
