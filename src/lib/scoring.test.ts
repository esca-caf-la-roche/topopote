import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ascentPoints, seasonScore } from './scoring'
import type { Ascent, AscentStyle } from '../types'

function ascent(id: string, points: number, style: AscentStyle = 'apres_travail', attempts = 3): Ascent {
  return {
    id,
    userId: 'user',
    routeId: `route-${id}`,
    seasonId: 'season',
    climbedAt: '2026-08-17',
    style,
    attempts,
    gradeFeeling: 'conforme',
    rating: null,
    recommended: false,
    comment: null,
    route: {
      id: `route-${id}`,
      isHalfRoute: false,
      seasonId: 'season',
      relayId: 'relay',
      colorId: 'color',
      gradeId: 'grade',
      season: { id: 'season', name: 'Saison', active: true },
      relay: { id: 'relay', number: 1, zoneId: 'zone', zone: { id: 'zone', name: 'Zone', order: 1 } },
      color: { id: 'color', name: 'Rose', hex: '#ff90e8' },
      grade: { id: 'grade', label: '7a', rank: 1, difficulty: 'Difficile', points },
    },
  }
}

describe('ascentPoints', () => {
  it('applique le barème Vertical-Life 2026 aux styles', () => {
    expect(ascentPoints(700, 'a_vue', 1)).toBe(847)
    expect(ascentPoints(700, 'flash', 1)).toBe(753)
    expect(ascentPoints(700, 'apres_travail', 2)).toBe(702)
    expect(ascentPoints(700, 'apres_travail', 4)).toBe(700)
    expect(ascentPoints(700, 'moulinette', 1)).toBe(650)
  })

  it('ne produit jamais de score négatif', () => {
    expect(ascentPoints(25, 'moulinette', 1)).toBe(0)
  })
})

describe('seasonScore', () => {
  it('additionne uniquement les dix meilleurs enchaînements', () => {
    const ascents = Array.from({ length: 12 }, (_, index) => ascent(String(index), 100 + index * 50))
    expect(seasonScore(ascents)).toBe(4250)
  })

  it('compte toutes les voies lorsqu’il y en a moins de dix', () => {
    expect(seasonScore([ascent('one', 400), ascent('two', 500, 'flash', 1)])).toBe(953)
  })

  it('écarte la moins bonne voie quand une onzième entre dans le Top 10', () => {
    const firstTen = Array.from({ length: 10 }, (_, index) => ascent(String(index), 100 + index * 10))
    expect(seasonScore([...firstTen, ascent('better', 1000)])).toBe(2350)
  })
})

describe('parité du barème client et SQL', () => {
  it('conserve les mêmes valeurs structurantes dans la migration', () => {
    const migration = readFileSync(new URL('../../supabase/migrations/20260816221927_add_climber_logbook.sql', import.meta.url), 'utf8')
    expect(migration).toContain("when '6a' then 400")
    expect(migration).toContain("when '7a' then 700")
    expect(migration).toContain("when '8a' then 1000")
    expect(migration).toContain("when 'a_vue' then 147")
    expect(migration).toContain("when 'flash' then 53")
    expect(migration).toContain("when 'moulinette' then -50")
    expect(migration).toContain('position_score <= 10')
  })
})
