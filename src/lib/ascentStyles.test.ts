import { describe, expect, it } from 'vitest'
import { allowedAscentStyles } from './ascentStyles'

describe('allowedAscentStyles', () => {
  it('autorise à vue et flash uniquement au premier essai', () => {
    expect(allowedAscentStyles(1)).toEqual(['a_vue', 'flash', 'apres_travail', 'moulinette'])
    expect(allowedAscentStyles(2)).toEqual(['apres_travail', 'moulinette'])
    expect(allowedAscentStyles(999)).toEqual(['apres_travail', 'moulinette'])
  })
})
