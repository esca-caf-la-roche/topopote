import { describe, expect, it } from 'vitest'
import { navigationItems } from './navigation'

describe('navigationItems', () => {
  it('limite la navigation publique à la connexion', () => {
    expect(navigationItems(false, false)).toEqual([{ page: 'carnet', label: 'Connexion' }])
  })

  it('donne accès au topo interactif, au classement et au carnet au pratiquant', () => {
    expect(navigationItems(true, false)).toEqual([
      { page: '', label: 'Topo' },
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
