import { describe, expect, it } from 'vitest'
import { emptyFilters, filterRoutes } from './routes'
import type { Route } from '../types'

const routes: Route[] = [
  {
    id: 'hard',
    seasonId: 'summer',
    relayId: 'r1',
    colorId: 'blue',
    gradeId: '7a-plus',
    season: { id: 'summer', name: 'Été 2026', startDate: '2026-04-01', endDate: null, active: true },
    relay: { id: 'r1', number: 1, zoneId: 'vertical', zone: { id: 'vertical', name: 'Zone verticale', order: 1 } },
    color: { id: 'blue', name: 'Bleu', hex: '#2563eb' },
    grade: { id: '7a-plus', label: '7a+', rank: 20 },
  },
  {
    id: 'easy',
    seasonId: 'summer',
    relayId: 'r1',
    colorId: 'green',
    gradeId: '5c',
    season: { id: 'summer', name: 'Été 2026', startDate: '2026-04-01', endDate: null, active: true },
    relay: { id: 'r1', number: 1, zoneId: 'vertical', zone: { id: 'vertical', name: 'Zone verticale', order: 1 } },
    color: { id: 'green', name: 'Vert', hex: '#16a34a' },
    grade: { id: '5c', label: '5c', rank: 10 },
  },
  {
    id: 'other-relay',
    seasonId: 'winter',
    relayId: 'r2',
    colorId: 'blue',
    gradeId: '5c',
    season: { id: 'winter', name: 'Hiver 2025', startDate: '2025-10-01', endDate: '2026-03-31', active: false },
    relay: { id: 'r2', number: 2, zoneId: 'overhang', zone: { id: 'overhang', name: 'Dévers', order: 2 } },
    color: { id: 'blue', name: 'Bleu', hex: '#2563eb' },
    grade: { id: '5c', label: '5c', rank: 10 },
  },
]

describe('filterRoutes', () => {
  it('filters a relay and sorts its routes by grade', () => {
    expect(filterRoutes(routes, { ...emptyFilters, relayId: 'r1' }).map(({ id }) => id)).toEqual([
      'easy',
      'hard',
    ])
  })

  it('combines filters', () => {
    expect(
      filterRoutes(routes, { ...emptyFilters, colorId: 'blue', gradeId: '7a-plus' }).map(
        ({ id }) => id,
      ),
    ).toEqual(['hard'])
  })

  it('filters by season and zone', () => {
    expect(
      filterRoutes(routes, { ...emptyFilters, seasonId: 'summer', zoneId: 'vertical' }).map(
        ({ id }) => id,
      ),
    ).toEqual(['easy', 'hard'])
  })
})
