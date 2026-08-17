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

  it('ajoute les retours des voies au rôle ouvreur', () => {
    expect(navigationItems(true, false, true)).toEqual([
      { page: '', label: 'Topo' },
      { page: 'classement', label: 'Classement' },
      { page: 'carnet', label: 'Carnet' },
      { page: 'ouvreurs', label: 'Retours voies' },
    ])
  })

  it('donne toutes les destinations à l’administrateur', () => {
    expect(navigationItems(true, true)).toEqual([
      { page: '', label: 'Topo' },
      { page: 'classement', label: 'Classement' },
      { page: 'carnet', label: 'Carnet' },
      { page: 'ouvreurs', label: 'Retours voies' },
      { page: 'admin', label: 'Admin' },
    ])
  })
})
