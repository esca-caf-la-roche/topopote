export type AppPage = '' | 'carnet' | 'classement' | 'ouvreurs' | 'admin'

export type NavigationItem = {
  page: AppPage
  label: string
}

export function navigationItems(authenticated: boolean, isAdmin: boolean, isOpener = false): NavigationItem[] {
  if (!authenticated) return [{ page: 'carnet', label: 'Connexion' }]
  if (!isAdmin) {
    const items: NavigationItem[] = [
      { page: '', label: 'Topo' },
      { page: 'classement', label: 'Classement' },
      { page: 'carnet', label: 'Carnet' },
    ]
    if (isOpener) items.push({ page: 'ouvreurs', label: 'Retours voies' })
    return items
  }
  return [
    { page: '', label: 'Topo' },
    { page: 'classement', label: 'Classement' },
    { page: 'carnet', label: 'Carnet' },
    { page: 'ouvreurs', label: 'Retours voies' },
    { page: 'admin', label: 'Admin' },
  ]
}
