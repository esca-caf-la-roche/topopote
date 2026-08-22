import type { AscentStyle, TrainingRouteEntry } from '../types'

const allAscentStyles: AscentStyle[] = ['a_vue', 'flash', 'apres_travail', 'moulinette']

function compareEntryOrder(left: TrainingRouteEntry, right: TrainingRouteEntry) {
  return left.sessionDate.localeCompare(right.sessionDate)
    || left.createdAt.localeCompare(right.createdAt)
    || left.id.localeCompare(right.id)
}

function normalizeExternalName(value: string | null) {
  return value
    ?.trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('fr-FR') ?? ''
}

export function sameTrainingRoute(left: TrainingRouteEntry, right: TrainingRouteEntry) {
  if (left.routeId || right.routeId) return Boolean(left.routeId && left.routeId === right.routeId)
  return Boolean(
    normalizeExternalName(left.routeName)
    && normalizeExternalName(left.routeName) === normalizeExternalName(right.routeName)
    && normalizeExternalName(left.sessionCrag) === normalizeExternalName(right.sessionCrag),
  )
}

export function attemptsThroughEntry(entries: TrainingRouteEntry[], target: TrainingRouteEntry) {
  return entries
    .filter((entry) => sameTrainingRoute(entry, target) && compareEntryOrder(entry, target) <= 0)
    .reduce((total, entry) => total + entry.attempts, 0)
}

export function attemptsBeforeEntry(entries: TrainingRouteEntry[], target: TrainingRouteEntry) {
  return entries
    .filter((entry) => entry.id !== target.id && sameTrainingRoute(entry, target) && compareEntryOrder(entry, target) <= 0)
    .reduce((total, entry) => total + entry.attempts, 0)
}

export function attemptsToFirstSend(entries: TrainingRouteEntry[], target: TrainingRouteEntry) {
  const firstSend = entries
    .filter((entry) => entry.sent && sameTrainingRoute(entry, target))
    .sort(compareEntryOrder)[0]
  return firstSend ? attemptsThroughEntry(entries, firstSend) : null
}

export function externalRouteNames(entries: TrainingRouteEntry[], crag: string | null) {
  const normalizedCrag = normalizeExternalName(crag)
  const names = new Map<string, string>()
  entries.forEach((entry) => {
    const normalizedName = normalizeExternalName(entry.routeName)
    if (entry.sessionLocation === 'exterieur' && normalizedName && normalizeExternalName(entry.sessionCrag) === normalizedCrag) {
      if (!names.has(normalizedName)) names.set(normalizedName, entry.routeName!.trim())
    }
  })
  return [...names.values()].sort((left, right) => left.localeCompare(right, 'fr', { sensitivity: 'base' }))
}

export function allowedAscentStyles(attempts: number) {
  return attempts === 1 ? allAscentStyles : allAscentStyles.filter((style) => style === 'apres_travail' || style === 'moulinette')
}

export function sessionTrainingLoad(durationMinutes: number | null, perceivedEffort: number | null) {
  if (durationMinutes === null || perceivedEffort === null) return null
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) return null
  if (!Number.isInteger(perceivedEffort) || perceivedEffort < 1 || perceivedEffort > 10) return null
  return durationMinutes * perceivedEffort
}

export function roundTrainingDuration(durationMinutes: number) {
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) return null
  if (durationMinutes < 15) return durationMinutes
  return Math.round(durationMinutes / 15) * 15
}

export function medianTrainingLoad(values: number[]) {
  if (values.length === 0 || values.some((value) => !Number.isFinite(value) || value < 0)) return null
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2)
}

export type TrainingLoadRecord = {
  id: string
  date: string
  durationMinutes: number | null
  perceivedEffort: number | null
}

export type WeeklyTrainingLoad = {
  weekStart: string
  totalLoad: number
  completeCount: number
  incompleteCount: number
}

function isoWeekStart(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00Z`)
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() - day + 1)
  return date.toISOString().slice(0, 10)
}

export function weeklyTrainingLoads(records: TrainingLoadRecord[]): WeeklyTrainingLoad[] {
  const weeks = new Map<string, WeeklyTrainingLoad>()
  records.forEach((record) => {
    const weekStart = isoWeekStart(record.date)
    const week = weeks.get(weekStart) ?? { weekStart, totalLoad: 0, completeCount: 0, incompleteCount: 0 }
    const load = sessionTrainingLoad(record.durationMinutes, record.perceivedEffort)
    if (load === null) week.incompleteCount += 1
    else {
      week.totalLoad += load
      week.completeCount += 1
    }
    weeks.set(weekStart, week)
  })
  return [...weeks.values()].sort((left, right) => right.weekStart.localeCompare(left.weekStart))
}

export function sessionTrainingVolume(entries: TrainingRouteEntry[]) {
  return {
    routes: entries.length,
    attempts: entries.reduce((total, entry) => total + entry.attempts, 0),
    sends: entries.filter((entry) => entry.sent).length,
  }
}
