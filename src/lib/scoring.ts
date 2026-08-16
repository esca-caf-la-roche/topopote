import type { Ascent, AscentStyle } from '../types'

export const SCORING_VERSION = 'vertical-life-2026-v1'
export const MAX_SCORING_ASCENTS = 10

export const styleLabels: Record<AscentStyle, string> = {
  a_vue: 'À vue',
  flash: 'Flash',
  apres_travail: 'Après travail',
  moulinette: 'Moulinette',
}

export function ascentPoints(basePoints: number, style: AscentStyle, attempts: number) {
  const modifier = style === 'a_vue'
    ? 147
    : style === 'flash'
      ? 53
      : style === 'moulinette'
        ? -50
        : attempts === 2
          ? 2
          : 0

  return Math.max(0, basePoints + modifier)
}

export function seasonScore(ascents: Ascent[]) {
  return ascents
    .map((ascent) => ascentPoints(ascent.route.grade.points, ascent.style, ascent.attempts))
    .sort((left, right) => right - left)
    .slice(0, MAX_SCORING_ASCENTS)
    .reduce((total, points) => total + points, 0)
}
