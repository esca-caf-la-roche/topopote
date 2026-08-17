import { describe, expect, it } from 'vitest'
import { routeAscentAction, routeAscentBackgrounds } from './routeAscents'

describe('présentation des enchaînements sur le topo', () => {
  it('associe une couleur claire distincte à chaque type', () => {
    expect(routeAscentBackgrounds).toEqual({
      a_vue: '#b8ebeb',
      flash: '#ffe1ad',
      apres_travail: '#f8b4cb',
      moulinette: '#e8e8e8',
    })
  })

  it('propose un ajout uniquement pour une voie absente du carnet', () => {
    expect(routeAscentAction()).toBe('Ajouter mon enchaînement')
    expect(routeAscentAction('flash')).toBe('Voir mon enchaînement')
  })
})
