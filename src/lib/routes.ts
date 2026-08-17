import type { Grade, Route, RouteFilters, RouteSort } from '../types'

export type GradeDistribution = {
  label: string
  difficulty: Grade['difficulty']
  count: number
  completedCount: number
  percentage: number
  rank: number
}

export const emptyFilters: RouteFilters = {
  zoneId: '',
  relayId: '',
  colorId: '',
  gradeId: '',
  difficulty: '',
  showHalfRoutes: true,
}

export function filterRoutes(
  routes: Route[],
  filters: RouteFilters,
  activeSeasonId: string | null,
  sortBy: RouteSort = 'relay',
): Route[] {
  return routes
    .filter((route) => route.seasonId === activeSeasonId)
    .filter((route) => !filters.zoneId || route.relay.zoneId === filters.zoneId)
    .filter((route) => !filters.relayId || route.relayId === filters.relayId)
    .filter((route) => !filters.colorId || route.colorId === filters.colorId)
    .filter((route) => !filters.gradeId || route.gradeId === filters.gradeId)
    .filter((route) => !filters.difficulty || route.grade.difficulty === filters.difficulty)
    .filter((route) => filters.showHalfRoutes || !route.isHalfRoute)
    .sort(
      (left, right) =>
        left.relay.zone.order - right.relay.zone.order ||
        (sortBy === 'relay'
          ? left.relay.number - right.relay.number || left.grade.rank - right.grade.rank
          : left.grade.rank - right.grade.rank || left.relay.number - right.relay.number) ||
        left.id.localeCompare(right.id),
    )
}

function distributionLabel(grade: Grade): string {
  const label = grade.label.trim()
  const match = label.match(/^([6-9][a-c])\+?$/i)
  if (!match) return label

  const base = match[1].toLowerCase()
  return `${base} / ${base}+`
}

export function gradeDistribution(
  routes: Route[],
  grades: Grade[],
  completedRouteIds: ReadonlySet<string> = new Set(),
): GradeDistribution[] {
  const distribution = new Map<string, GradeDistribution>()

  for (const grade of grades) {
    const label = distributionLabel(grade)
    const current = distribution.get(label)
    if (current) {
      current.rank = Math.min(current.rank, grade.rank)
    } else {
      distribution.set(label, { label, difficulty: grade.difficulty, count: 0, completedCount: 0, percentage: 0, rank: grade.rank })
    }
  }

  for (const route of routes) {
    const label = distributionLabel(route.grade)
    const current = distribution.get(label)
    if (current) {
      current.count += 1
      current.completedCount += Number(completedRouteIds.has(route.id))
    } else {
      distribution.set(label, {
        label,
        difficulty: route.grade.difficulty,
        count: 1,
        completedCount: Number(completedRouteIds.has(route.id)),
        percentage: 0,
        rank: route.grade.rank,
      })
    }
  }

  return [...distribution.values()]
    .sort((left, right) => left.rank - right.rank || left.label.localeCompare(right.label))
    .map((group) => ({
      ...group,
      percentage: routes.length === 0 ? 0 : Math.round((group.count / routes.length) * 100),
    }))
}

export function completedRouteCount(routes: Route[], completedRouteIds: ReadonlySet<string>): number {
  return routes.reduce((count, route) => count + Number(completedRouteIds.has(route.id)), 0)
}
