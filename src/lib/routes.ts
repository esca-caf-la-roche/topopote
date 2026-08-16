import type { Route, RouteFilters } from '../types'

export const emptyFilters: RouteFilters = {
  zoneId: '',
  relayId: '',
  colorId: '',
  gradeId: '',
}

export function filterRoutes(routes: Route[], filters: RouteFilters, activeSeasonId: string | null): Route[] {
  return routes
    .filter((route) => route.seasonId === activeSeasonId)
    .filter((route) => !filters.zoneId || route.relay.zoneId === filters.zoneId)
    .filter((route) => !filters.relayId || route.relayId === filters.relayId)
    .filter((route) => !filters.colorId || route.colorId === filters.colorId)
    .filter((route) => !filters.gradeId || route.gradeId === filters.gradeId)
    .sort(
      (left, right) =>
        left.relay.zone.order - right.relay.zone.order ||
        left.relay.number - right.relay.number ||
        left.grade.rank - right.grade.rank,
    )
}
