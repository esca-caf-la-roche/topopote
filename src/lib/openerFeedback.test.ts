import { describe, expect, it } from 'vitest'
import type { RouteFeedback } from '../types'
import { emptyOpenerFeedbackFilters, filterAndSortRouteFeedback } from './openerFeedback'

function feedback(overrides: Partial<RouteFeedback> & { id: string; relay: number; gradeRank: number }): RouteFeedback {
  return {
    route: {
      id: overrides.id, isHalfRoute: false, seasonId: 'season-a', relayId: `relay-${overrides.relay}`,
      colorId: 'blue', gradeId: `grade-${overrides.gradeRank}`,
      season: { id: 'season-a', name: 'Hiver', active: true },
      relay: { id: `relay-${overrides.relay}`, number: overrides.relay, zoneId: 'zone-a', zone: { id: 'zone-a', name: 'Dévers', order: 1 } },
      color: { id: 'blue', name: 'Bleu', hex: '#0000ff' },
      grade: { id: `grade-${overrides.gradeRank}`, label: overrides.gradeRank === 7 ? '7a' : '6a', rank: overrides.gradeRank, points: 400, difficulty: 'Modéré' },
    },
    averageRating: overrides.averageRating ?? null,
    ratingCount: overrides.ratingCount ?? 0,
    recommendationCount: overrides.recommendationCount ?? 0,
    ascentCount: overrides.ascentCount ?? 0,
    commentCount: overrides.commentCount ?? 0,
    comments: overrides.comments ?? [],
  }
}

const entries = [
  feedback({ id: 'quiet', relay: 2, gradeRank: 6 }),
  feedback({ id: 'popular', relay: 1, gradeRank: 7, averageRating: 4.5, ascentCount: 8, commentCount: 1, comments: ['Mouvements très variés'] }),
]

describe('filterAndSortRouteFeedback', () => {
  it('recherche aussi dans les commentaires sans tenir compte des accents', () => {
    const result = filterAndSortRouteFeedback(entries, { ...emptyOpenerFeedbackFilters, query: 'varies' }, 'relay')
    expect(result.map((entry) => entry.route.id)).toEqual(['popular'])
  })

  it('peut limiter aux voies commentées et classer par activité', () => {
    const result = filterAndSortRouteFeedback(entries, { ...emptyOpenerFeedbackFilters, commentsOnly: true }, 'ascents')
    expect(result.map((entry) => entry.route.id)).toEqual(['popular'])
  })

  it('place les voies sans note après les voies notées', () => {
    expect(filterAndSortRouteFeedback(entries, emptyOpenerFeedbackFilters, 'rating').map((entry) => entry.route.id))
      .toEqual(['popular', 'quiet'])
  })
})
