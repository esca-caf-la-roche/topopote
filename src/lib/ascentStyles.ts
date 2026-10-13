import type { AscentStyle } from '../types'

const allAscentStyles: AscentStyle[] = ['a_vue', 'flash', 'apres_travail', 'moulinette']

export function allowedAscentStyles(attempts: number) {
  return attempts === 1 ? allAscentStyles : allAscentStyles.filter((style) => style === 'apres_travail' || style === 'moulinette')
}
