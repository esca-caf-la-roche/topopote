export type AppPage = '' | 'carnet' | 'classement' | 'entrainement' | 'potes' | 'ouvreurs' | 'admin'

export type NavigationItem = {
  page: AppPage
  label: string
}

export function navigationItems(authenticated: boolean, isAdmin: boolean, isOpener = false, canAccessFriends = false, canAccessTraining = false): NavigationItem[] {
  if (!authenticated) return [{ page: 'carnet', label: 'Connexion' }]
  if (!isAdmin) {
    const items: NavigationItem[] = [
      { page: '', label: 'Topo' },
      { page: 'classement', label: 'Classement' },
      { page: 'carnet', label: 'Carnet' },
    ]
    if (canAccessTraining) items.push({ page: 'entrainement', label: 'Entraînement' })
    if (canAccessFriends) items.push({ page: 'potes', label: 'Potes' })
    if (isOpener) items.push({ page: 'ouvreurs', label: 'Retours voies' })
    return items
  }
  const items: NavigationItem[] = [
    { page: '', label: 'Topo' },
    { page: 'classement', label: 'Classement' },
    { page: 'carnet', label: 'Carnet' },
  ]
  if (canAccessTraining) items.push({ page: 'entrainement', label: 'Entraînement' })
  if (canAccessFriends) items.push({ page: 'potes', label: 'Potes' })
  items.push({ page: 'ouvreurs', label: 'Retours voies' }, { page: 'admin', label: 'Admin' })
  return items
}
