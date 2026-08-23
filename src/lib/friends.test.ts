import { describe, expect, it } from 'vitest'
import { filterPractitioners, practitionerCounts } from './friends'
import type { PractitionerRelation } from '../types'

const practitioners: PractitionerRelation[] = [
  { id: 'lea', nickname: 'Léa', following: true, followsMe: false, canFollow: true },
  { id: 'noe', nickname: 'Noé', following: true, followsMe: true, canFollow: true },
  { id: 'zoe', nickname: 'Zoé', following: false, followsMe: true, canFollow: false },
]

describe('practitioner social helpers', () => {
  it('compte séparément les suivis et les abonnés', () => {
    expect(practitionerCounts(practitioners)).toEqual({ following: 2, followers: 2 })
  })

  it('filtre les relations sans être sensible à la casse', () => {
    expect(filterPractitioners(practitioners, 'noÉ')).toEqual([practitioners[1]])
    expect(filterPractitioners(practitioners, '  lea  ')).toEqual([practitioners[0]])
    expect(filterPractitioners(practitioners, '')).toEqual(practitioners)
    expect(filterPractitioners(practitioners, 'introuvable')).toEqual([])
  })
})
