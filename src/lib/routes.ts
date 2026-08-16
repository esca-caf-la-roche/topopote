import type { Route, RouteFilters } from '../types'

export const emptyFilters: RouteFilters = {
  seasonId: '',
  zoneId: '',
  relayId: '',
  colorId: '',
  gradeId: '',
}

export function filterRoutes(routes: Route[], filters: RouteFilters): Route[] {
  return routes
    .filter((route) => !filters.seasonId || route.seasonId === filters.seasonId)
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
