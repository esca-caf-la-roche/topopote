export type Zone = {
  id: string
  name: string
  order: number
}

export type Season = {
  id: string
  name: string
  active: boolean
}

export type Relay = {
  id: string
  number: number
  zoneId: string
  zone: Zone
}

export type Color = {
  id: string
  name: string
  hex: string
}

export type Grade = {
  id: string
  label: string
  rank: number
  difficulty: 'Facile' | 'Modéré' | 'Difficile' | 'Extrême'
}

export type Route = {
  id: string
  isHalfRoute: boolean
  seasonId: string
  relayId: string
  colorId: string
  gradeId: string
  season: Season
  relay: Relay
  color: Color
  grade: Grade
}

export type RouteSort = 'relay' | 'grade'

export type RouteFilters = {
  zoneId: string
  relayId: string
  colorId: string
  gradeId: string
  difficulty: string
  showHalfRoutes: boolean
}
