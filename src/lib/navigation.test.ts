import { describe, expect, it } from 'vitest'
import { navigationItems, pageFromHash } from './navigation'

describe('pageFromHash', () => {
  it('replie l’ancien lien entraînement et les destinations inconnues sur le topo', () => {
    expect(pageFromHash('#entrainement')).toBe('')
    expect(pageFromHash('#inconnue')).toBe('')
    expect(pageFromHash('')).toBe('')
  })

  it('conserve les destinations existantes', () => {
    for (const page of ['carnet', 'classement', 'potes', 'ouvreurs', 'admin']) {
      expect(pageFromHash(`#${page}`)).toBe(page)
    }
  })
})

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

  it('affiche Potes seulement lorsque le profil partage son activité', () => {
    expect(navigationItems(true, false, false, true)).toContainEqual({ page: 'potes', label: 'Potes' })
  })

  it('ne propose plus Entraînement, quel que soit le rôle', () => {
    for (const isAdmin of [false, true]) {
      for (const isOpener of [false, true]) {
        expect(navigationItems(true, isAdmin, isOpener, true).map((item) => item.page)).not.toContain('entrainement')
      }
    }
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
    expect(navigationItems(true, true, false, true)).toEqual([
      { page: '', label: 'Topo' },
      { page: 'classement', label: 'Classement' },
      { page: 'carnet', label: 'Carnet' },
      { page: 'potes', label: 'Potes' },
      { page: 'ouvreurs', label: 'Retours voies' },
      { page: 'admin', label: 'Admin' },
    ])
  })
})
