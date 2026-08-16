import type { Route, RouteFilters, RouteSort } from '../types'

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
