import type { RouteFeedback } from '../types'

export type OpenerFeedbackFilters = {
  seasonId: string
  zoneId: string
  relayId: string
  colorId: string
  gradeId: string
  query: string
  commentsOnly: boolean
}

export type OpenerFeedbackSort =
  | 'relay'
  | 'grade'
  | 'rating'
  | 'recommendations'
  | 'ascents'
  | 'comments'

export const emptyOpenerFeedbackFilters: OpenerFeedbackFilters = {
  seasonId: '',
  zoneId: '',
  relayId: '',
  colorId: '',
  gradeId: '',
  query: '',
  commentsOnly: false,
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR')
}

function routeOrder(left: RouteFeedback, right: RouteFeedback) {
  return left.route.relay.zone.order - right.route.relay.zone.order
    || left.route.relay.number - right.route.relay.number
    || right.route.grade.rank - left.route.grade.rank
    || left.route.color.name.localeCompare(right.route.color.name, 'fr')
}

export function filterAndSortRouteFeedback(
  feedback: RouteFeedback[],
  filters: OpenerFeedbackFilters,
  sort: OpenerFeedbackSort,
) {
  const query = normalize(filters.query.trim())
  const filtered = feedback.filter((entry) => {
    const route = entry.route
    if (entry.ascentCount === 0) return false
    if (filters.seasonId && route.seasonId !== filters.seasonId) return false
    if (filters.zoneId && route.relay.zoneId !== filters.zoneId) return false
    if (filters.relayId && route.relayId !== filters.relayId) return false
    if (filters.colorId && route.colorId !== filters.colorId) return false
    if (filters.gradeId && route.gradeId !== filters.gradeId) return false
    if (filters.commentsOnly && entry.commentCount === 0) return false
    if (!query) return true
    return normalize([
      route.season.name,
      route.relay.zone.name,
      `relais ${route.relay.number}`,
      route.color.name,
      route.grade.label,
      ...entry.comments,
    ].join(' ')).includes(query)
  })

  return [...filtered].sort((left, right) => {
    const descending = (leftValue: number | null, rightValue: number | null) =>
      (rightValue ?? -1) - (leftValue ?? -1)
    const metricOrder = sort === 'rating' ? descending(left.averageRating, right.averageRating)
      : sort === 'recommendations' ? descending(left.recommendationCount, right.recommendationCount)
        : sort === 'ascents' ? descending(left.ascentCount, right.ascentCount)
          : sort === 'comments' ? descending(left.commentCount, right.commentCount)
            : sort === 'grade' ? right.route.grade.rank - left.route.grade.rank
              : routeOrder(left, right)
    return metricOrder || routeOrder(left, right)
  })
}
