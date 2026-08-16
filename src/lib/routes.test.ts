import { describe, expect, it } from 'vitest'
import { emptyFilters, filterRoutes } from './routes'
import type { Route } from '../types'

const routes: Route[] = [
  {
    id: 'hard',
    relayId: 'r1',
    colorId: 'blue',
    gradeId: '7a-plus',
    relay: { id: 'r1', number: 1 },
    color: { id: 'blue', name: 'Bleu', hex: '#2563eb' },
    grade: { id: '7a-plus', label: '7a+', rank: 20 },
  },
  {
    id: 'easy',
    relayId: 'r1',
    colorId: 'green',
    gradeId: '5c',
    relay: { id: 'r1', number: 1 },
    color: { id: 'green', name: 'Vert', hex: '#16a34a' },
    grade: { id: '5c', label: '5c', rank: 10 },
  },
  {
    id: 'other-relay',
    relayId: 'r2',
    colorId: 'blue',
    gradeId: '5c',
    relay: { id: 'r2', number: 2 },
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
})
