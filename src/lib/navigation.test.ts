import { describe, expect, it } from 'vitest'
import { navigationItems } from './navigation'

describe('navigationItems', () => {
  it('limite la navigation publique à la connexion', () => {
    expect(navigationItems(false, false)).toEqual([{ page: 'carnet', label: 'Connexion' }])
  })

  it('affiche uniquement le classement et le carnet au pratiquant', () => {
    expect(navigationItems(true, false)).toEqual([
      { page: 'classement', label: 'Classement' },
      { page: 'carnet', label: 'Carnet' },
    ])
  })

  it('donne toutes les destinations à l’administrateur', () => {
    expect(navigationItems(true, true)).toEqual([
      { page: '', label: 'Topo' },
      { page: 'classement', label: 'Classement' },
      { page: 'carnet', label: 'Carnet' },
      { page: 'admin', label: 'Admin' },
    ])
  })
})
