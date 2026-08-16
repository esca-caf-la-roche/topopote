export type Relay = {
  id: string
  number: number
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
  relayId: string
  colorId: string
  gradeId: string
  relay: Relay
  color: Color
  grade: Grade
}

export type RouteFilters = {
  relayId: string
  colorId: string
  gradeId: string
}
