import type { PractitionerRelation } from '../types'

function normalizeForSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR')
}

export function filterPractitioners(
  practitioners: PractitionerRelation[],
  search: string,
) {
  const normalizedSearch = normalizeForSearch(search.trim())

  return practitioners.filter((practitioner) => normalizeForSearch(practitioner.nickname).includes(normalizedSearch))
}

export function practitionerCounts(practitioners: PractitionerRelation[]) {
  return {
    following: practitioners.filter((practitioner) => practitioner.following).length,
    followers: practitioners.filter((practitioner) => practitioner.followsMe).length,
  }
}
