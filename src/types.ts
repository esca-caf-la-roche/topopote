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
}

export type Route = {
  id: string
  seasonId: string
  relayId: string
  colorId: string
  gradeId: string
  season: Season
  relay: Relay
  color: Color
  grade: Grade
}

export type RouteFilters = {
  zoneId: string
  relayId: string
  colorId: string
  gradeId: string
}
