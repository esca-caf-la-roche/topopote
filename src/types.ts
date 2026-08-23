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
  shareActivity: boolean
  trainingAccess: boolean
}

export type TrainingLocation = 'mur' | 'exterieur'

export type TrainingActivityType = 'bloc_interieur' | 'bloc_exterieur' | 'poutre' | 'ppg' | 'cardio' | 'renforcement' | 'course' | 'randonnee' | 'competition' | 'autre'

export type PainType = 'sourde' | 'elancement' | 'tiraillement' | 'pincement' | 'brulure' | 'decharge_electrique' | 'fourmillement_engourdissement' | 'raideur' | 'sensibilite_toucher' | 'autre'

export type TrainingSession = {
  id: string
  userId: string
  date: string
  location: TrainingLocation
  crag: string | null
  durationMinutes: number | null
  startTime: string | null
  endTime: string | null
  perceivedEffort: number | null
  pain: number | null
  painLocation: string | null
  painType: PainType | null
  createdAt: string
}

export type TrainingActivity = {
  id: string
  userId: string
  date: string
  activityType: TrainingActivityType
  durationMinutes: number | null
  perceivedEffort: number | null
  pain: number | null
  painLocation: string | null
  painType: PainType | null
  createdAt: string
}

export type TrainingRouteEntry = {
  id: string
  sessionId: string
  routeId: string | null
  routeName: string | null
  grade: string | null
  comment: string | null
  attempts: number
  sent: boolean
  style: AscentStyle | null
  ascentId: string | null
  createdAt: string
  sessionDate: string
  sessionLocation: TrainingLocation
  sessionCrag: string | null
}

export type RouteAscentPrefill = {
  climbedAt: string
  style: AscentStyle
  attempts: number
}

export type RouteAscentSummary = {
  nickname: string
  isCurrent: boolean
  style: AscentStyle
  gradeFeeling: GradeFeeling
  rating: number | null
  comment: string | null
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

export type RouteFeedback = {
  route: Route
  averageRating: number | null
  ratingCount: number
  recommendationCount: number
  ascentCount: number
  commentCount: number
  comments: string[]
}

export type PractitionerRelation = {
  id: string
  nickname: string
  following: boolean
  followsMe: boolean
  canFollow: boolean
}

export type FollowedPractitioner = {
  id: string
  nickname: string
  followsMe: boolean
  score: number
  season: string | null
}

export type FriendActivity = {
  nickname: string
  climbedAt: string
  style: AscentStyle
  gradeFeeling: GradeFeeling
  rating: number | null
  recommended: boolean
  comment: string | null
  season: string
  zone: string
  relay: number
  color: string
  colorHex: string
  grade: string
}
