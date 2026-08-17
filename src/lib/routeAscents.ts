import type { AscentStyle, GradeFeeling } from '../types'

export const routeAscentBackgrounds: Record<AscentStyle, string> = {
  a_vue: '#b8ebeb',
  flash: '#ffe1ad',
  apres_travail: '#f8b4cb',
  moulinette: '#e8e8e8',
}

export const gradeFeelingLabels: Record<GradeFeeling, string> = {
  souple: 'Plus facile',
  conforme: 'Conforme',
  dure: 'Plus dure',
}

export function routeAscentAction(style?: AscentStyle) {
  return style ? 'Voir mon enchaînement' : 'Ajouter mon enchaînement'
}
