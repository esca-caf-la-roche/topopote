export type AppPage = '' | 'carnet' | 'classement' | 'potes' | 'ouvreurs' | 'admin'

export function pageFromHash(hash: string): AppPage {
  const page = hash.replace(/^#/, '')
  switch (page) {
    case 'carnet':
    case 'classement':
    case 'potes':
    case 'ouvreurs':
    case 'admin':
      return page
    default:
      return ''
  }
}

export type NavigationItem = {
  page: AppPage
  label: string
}

export function navigationItems(authenticated: boolean, isAdmin: boolean, isOpener = false, canAccessFriends = false): NavigationItem[] {
  if (!authenticated) return [{ page: 'carnet', label: 'Connexion' }]
  if (!isAdmin) {
    const items: NavigationItem[] = [
      { page: '', label: 'Topo' },
      { page: 'classement', label: 'Classement' },
      { page: 'carnet', label: 'Carnet' },
    ]
    if (canAccessFriends) items.push({ page: 'potes', label: 'Potes' })
    if (isOpener) items.push({ page: 'ouvreurs', label: 'Retours voies' })
    return items
  }
  const items: NavigationItem[] = [
    { page: '', label: 'Topo' },
    { page: 'classement', label: 'Classement' },
    { page: 'carnet', label: 'Carnet' },
  ]
  if (canAccessFriends) items.push({ page: 'potes', label: 'Potes' })
  items.push({ page: 'ouvreurs', label: 'Retours voies' }, { page: 'admin', label: 'Admin' })
  return items
}
