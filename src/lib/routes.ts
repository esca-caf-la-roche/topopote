import type { Route, RouteFilters } from '../types'

export const emptyFilters: RouteFilters = {
  relayId: '',
  colorId: '',
  gradeId: '',
}

export function filterRoutes(routes: Route[], filters: RouteFilters): Route[] {
  return routes
    .filter((route) => !filters.relayId || route.relayId === filters.relayId)
    .filter((route) => !filters.colorId || route.colorId === filters.colorId)
    .filter((route) => !filters.gradeId || route.gradeId === filters.gradeId)
    .sort(
      (left, right) =>
        left.relay.number - right.relay.number || left.grade.rank - right.grade.rank,
    )
}
