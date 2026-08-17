import type { PractitionerRelation } from '../types'

export type PractitionerFilter = 'tous' | 'suivis' | 'abonnes'

function normalizeForSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR')
}

export function filterPractitioners(
  practitioners: PractitionerRelation[],
  search: string,
  filter: PractitionerFilter,
) {
  const normalizedSearch = normalizeForSearch(search.trim())

  return practitioners.filter((practitioner) => {
    const matchesSearch = normalizeForSearch(practitioner.nickname).includes(normalizedSearch)
    const matchesFilter = filter === 'tous'
      || (filter === 'suivis' && practitioner.following)
      || (filter === 'abonnes' && practitioner.followsMe)
    return matchesSearch && matchesFilter
  })
}

export function practitionerCounts(practitioners: PractitionerRelation[]) {
  return {
    following: practitioners.filter((practitioner) => practitioner.following).length,
    followers: practitioners.filter((practitioner) => practitioner.followsMe).length,
  }
}
