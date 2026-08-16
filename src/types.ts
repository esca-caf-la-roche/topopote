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
  points: number
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

export type AscentStyle = 'a_vue' | 'flash' | 'apres_travail' | 'moulinette'

export type GradeFeeling = 'souple' | 'conforme' | 'dure'

export type ClimberProfile = {
  userId: string
  nickname: string
  publicRanking: boolean
}

export type Ascent = {
  id: string
  userId: string
  routeId: string
  seasonId: string
  climbedAt: string
  style: AscentStyle
  attempts: number
  gradeFeeling: GradeFeeling
  rating: number | null
  recommended: boolean
  comment: string | null
  route: Route
}

export type LeaderboardEntry = {
  rank: number
  nickname: string
  isCurrent: boolean
  score: number
  ascentCount: number
  bestGrade: string
  onsight: number
  flash: number
  redpoint: number
  topRope: number
}
