import { describe, expect, it } from 'vitest'
import { emptyFilters, filterRoutes, gradeDistribution } from './routes'
import type { Route } from '../types'

const routes: Route[] = [
  {
    id: 'hard',
    isHalfRoute: false,
    seasonId: 'summer',
    relayId: 'r1',
    colorId: 'blue',
    gradeId: '7a-plus',
    season: { id: 'summer', name: 'Été 2026', active: true },
    relay: { id: 'r1', number: 1, zoneId: 'vertical', zone: { id: 'vertical', name: 'Zone verticale', order: 1 } },
    color: { id: 'blue', name: 'Bleu', hex: '#2563eb' },
    grade: { id: '7a-plus', label: '7a+', rank: 20, difficulty: 'Difficile' },
  },
  {
    id: 'easy',
    isHalfRoute: true,
    seasonId: 'summer',
    relayId: 'r1',
    colorId: 'green',
    gradeId: '5c',
    season: { id: 'summer', name: 'Été 2026', active: true },
    relay: { id: 'r1', number: 1, zoneId: 'vertical', zone: { id: 'vertical', name: 'Zone verticale', order: 1 } },
    color: { id: 'green', name: 'Vert', hex: '#16a34a' },
    grade: { id: '5c', label: '5c', rank: 10, difficulty: 'Facile' },
  },
  {
    id: 'other-relay',
    isHalfRoute: false,
    seasonId: 'winter',
    relayId: 'r2',
    colorId: 'blue',
    gradeId: '5c',
    season: { id: 'winter', name: 'Hiver 2025', active: false },
    relay: { id: 'r2', number: 2, zoneId: 'overhang', zone: { id: 'overhang', name: 'Dévers', order: 2 } },
    color: { id: 'blue', name: 'Bleu', hex: '#2563eb' },
    grade: { id: '5c', label: '5c', rank: 10, difficulty: 'Facile' },
  },
]

describe('filterRoutes', () => {
  it('filters a relay and sorts its routes by grade', () => {
    expect(filterRoutes(routes, { ...emptyFilters, relayId: 'r1' }, 'summer').map(({ id }) => id)).toEqual([
      'easy',
      'hard',
    ])
  })

  it('combines filters', () => {
    expect(
      filterRoutes(routes, { ...emptyFilters, colorId: 'blue', gradeId: '7a-plus' }, 'summer').map(
        ({ id }) => id,
      ),
    ).toEqual(['hard'])
  })

  it('filters routes by difficulty', () => {
    expect(filterRoutes(routes, { ...emptyFilters, difficulty: 'Difficile' }, 'summer').map(({ id }) => id)).toEqual([
      'hard',
    ])
  })

  it('imposes the active season while filtering by zone', () => {
    expect(
      filterRoutes(routes, { ...emptyFilters, zoneId: 'vertical' }, 'summer').map(
        ({ id }) => id,
      ),
    ).toEqual(['easy', 'hard'])
  })

  it('shows no route when no season is active', () => {
    expect(filterRoutes(routes, emptyFilters, null)).toEqual([])
  })

  it('can hide half routes while keeping full routes', () => {
    expect(
      filterRoutes(routes, { ...emptyFilters, showHalfRoutes: false }, 'summer').map(({ id }) => id),
    ).toEqual(['hard'])
  })

  it('sorts by relay, then by grade by default', () => {
    expect(filterRoutes(routes, emptyFilters, 'summer').map(({ id }) => id)).toEqual(['easy', 'hard'])
  })

  it('can sort by grade before relay', () => {
    const sameSeasonRoutes = [
      ...routes,
      {
        ...routes[0],
        id: 'easy-other-relay',
        relayId: 'r3',
        gradeId: '5c',
        relay: { id: 'r3', number: 3, zoneId: 'vertical', zone: routes[0].relay.zone },
        grade: routes[1].grade,
      },
    ]

    expect(filterRoutes(sameSeasonRoutes, emptyFilters, 'summer', 'grade').map(({ id }) => id)).toEqual([
      'easy',
      'easy-other-relay',
      'hard',
    ])
  })

  it('groups normal and plus grades while keeping 4 and 5 grades separate', () => {
    const grades = [
      { id: '4', label: '4', rank: 1, difficulty: 'Facile' as const },
      { id: '4-plus', label: '4+', rank: 2, difficulty: 'Facile' as const },
      { id: '5a', label: '5a', rank: 3, difficulty: 'Facile' as const },
      { id: '5b', label: '5b', rank: 4, difficulty: 'Facile' as const },
      { ...routes[1].grade, rank: 5 },
      { id: '6a', label: '6a', rank: 6, difficulty: 'Modéré' as const },
      { id: '6a-plus', label: '6a+', rank: 7, difficulty: 'Modéré' as const },
      routes[0].grade,
    ]

    expect(gradeDistribution(routes.slice(0, 2), grades)).toMatchObject([
      { label: '4', count: 0, percentage: 0 },
      { label: '4+', count: 0, percentage: 0 },
      { label: '5a', count: 0, percentage: 0 },
      { label: '5b', count: 0, percentage: 0 },
      { label: '5c', count: 1, percentage: 50 },
      { label: '6a / 6a+', count: 0, percentage: 0 },
      { label: '7a / 7a+', count: 1, percentage: 50 },
    ])
  })
})
