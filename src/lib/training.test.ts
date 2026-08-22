import { describe, expect, it } from 'vitest'
import { allowedAscentStyles, attemptsBeforeEntry, attemptsThroughEntry, attemptsToFirstSend, externalRouteNames, medianTrainingLoad, roundTrainingDuration, sessionTrainingLoad, sessionTrainingVolume, weeklyTrainingLoads } from './training'
import type { TrainingRouteEntry } from '../types'

function entry(overrides: Partial<TrainingRouteEntry>): TrainingRouteEntry {
  return {
    id: 'entry-default',
    sessionId: 'session-default',
    routeId: 'route-a',
    routeName: null,
    grade: null,
    comment: null,
    attempts: 1,
    sent: false,
    style: null,
    ascentId: null,
    createdAt: '2026-08-19T10:00:00Z',
    sessionDate: '2026-08-19',
    sessionLocation: 'mur',
    sessionCrag: null,
    ...overrides,
  }
}

describe('cumul des essais jusqu’au premier enchaînement', () => {
  it('cumule uniquement les essais antérieurs de la même voie', () => {
    const first = entry({ id: 'first', attempts: 3, sessionDate: '2026-08-17', createdAt: '2026-08-17T10:00:00Z' })
    const otherRoute = entry({ id: 'other', routeId: 'route-b', attempts: 12, sessionDate: '2026-08-18', createdAt: '2026-08-18T10:00:00Z' })
    const sent = entry({ id: 'sent', attempts: 2, sent: true, style: 'apres_travail' })
    const later = entry({ id: 'later', attempts: 8, sessionDate: '2026-08-20', createdAt: '2026-08-20T10:00:00Z' })

    expect(attemptsThroughEntry([first, otherRoute, sent, later], sent)).toBe(5)
    expect(attemptsBeforeEntry([first, otherRoute, sent, later], sent)).toBe(3)
  })

  it('cumule une voie extérieure par falaise et nom normalisés', () => {
    const first = entry({ id: 'external-1', routeId: null, routeName: 'La Directe', grade: '6b', attempts: 4, sessionDate: '2026-08-18', sessionLocation: 'exterieur', sessionCrag: 'Ablon' })
    const sameRoute = entry({ id: 'external-2', routeId: null, routeName: ' la directe ', grade: '6b', attempts: 2, sent: true, sessionLocation: 'exterieur', sessionCrag: 'ABLON' })
    const otherCrag = entry({ id: 'external-3', routeId: null, routeName: 'La Directe', grade: '6b', attempts: 9, sessionLocation: 'exterieur', sessionCrag: 'Le Salève' })
    expect(attemptsThroughEntry([first, sameRoute, otherCrag], sameRoute)).toBe(6)
    const repeat = entry({ id: 'external-4', routeId: null, routeName: 'La Directe', attempts: 3, sent: true, sessionDate: '2026-08-20', sessionLocation: 'exterieur', sessionCrag: 'Ablon' })
    expect(attemptsToFirstSend([first, sameRoute, repeat], repeat)).toBe(6)
  })

  it('propose seulement les voies déjà saisies sur la falaise choisie', () => {
    const ablon = entry({ id: 'external-1', routeId: null, routeName: 'La Directe', sessionLocation: 'exterieur', sessionCrag: 'Ablon' })
    const duplicate = entry({ id: 'external-2', routeId: null, routeName: 'la directe', sessionLocation: 'exterieur', sessionCrag: 'Ablon' })
    const saleve = entry({ id: 'external-3', routeId: null, routeName: 'L’Arête', sessionLocation: 'exterieur', sessionCrag: 'Le Salève' })
    expect(externalRouteNames([ablon, duplicate, saleve], 'ABLON')).toEqual(['La Directe'])
  })

  it('réserve à vue et flash à un premier essai', () => {
    expect(allowedAscentStyles(1)).toEqual(['a_vue', 'flash', 'apres_travail', 'moulinette'])
    expect(allowedAscentStyles(2)).toEqual(['apres_travail', 'moulinette'])
  })
})

describe('charge et volume de séance', () => {
  it('calcule la charge à partir de la durée et de l’effort global', () => {
    expect(sessionTrainingLoad(60, 7)).toBe(420)
    expect(sessionTrainingLoad(60, 1)).toBe(60)
    expect(sessionTrainingLoad(60, 0)).toBeNull()
    expect(sessionTrainingLoad(null, 7)).toBeNull()
    expect(sessionTrainingLoad(60, null)).toBeNull()
  })

  it('additionne du lundi au dimanche et exclut visiblement les saisies incomplètes', () => {
    expect(weeklyTrainingLoads([
      { id: 'sunday', date: '2027-01-03', durationMinutes: 60, perceivedEffort: 5 },
      { id: 'monday', date: '2027-01-04', durationMinutes: 30, perceivedEffort: 4 },
      { id: 'incomplete', date: '2027-01-05', durationMinutes: 45, perceivedEffort: null },
    ])).toEqual([
      { weekStart: '2027-01-04', totalLoad: 120, completeCount: 1, incompleteCount: 1 },
      { weekStart: '2026-12-28', totalLoad: 300, completeCount: 1, incompleteCount: 0 },
    ])
  })

  it('refuse les valeurs hors des limites enregistrables', () => {
    expect(sessionTrainingLoad(0, 5)).toBeNull()
    expect(sessionTrainingLoad(60.5, 5)).toBeNull()
    expect(sessionTrainingLoad(60, 11)).toBeNull()
  })

  it('arrondit le temps au quart d’heure sauf sous quinze minutes', () => {
    expect(roundTrainingDuration(8)).toBe(8)
    expect(roundTrainingDuration(82)).toBe(75)
    expect(roundTrainingDuration(83)).toBe(90)
    expect(roundTrainingDuration(0)).toBeNull()
  })

  it('calcule un repère médian sans être tiré par une semaine extrême', () => {
    expect(medianTrainingLoad([600, 650, 700, 3000])).toBe(675)
    expect(medianTrainingLoad([600, 700, 800])).toBe(700)
    expect(medianTrainingLoad([])).toBeNull()
  })

  it('décrit séparément le volume réellement enregistré', () => {
    const entries = [
      entry({ id: 'worked', attempts: 4 }),
      entry({ id: 'sent', routeId: 'route-b', attempts: 2, sent: true, style: 'apres_travail' }),
    ]
    expect(sessionTrainingVolume(entries)).toEqual({ routes: 2, attempts: 6, sends: 1 })
    expect(sessionTrainingVolume([])).toEqual({ routes: 0, attempts: 0, sends: 0 })
  })
})
