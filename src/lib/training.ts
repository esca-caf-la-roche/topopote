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
