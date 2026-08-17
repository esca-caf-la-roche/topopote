export type AppPage = '' | 'carnet' | 'classement' | 'admin'

export type NavigationItem = {
  page: AppPage
  label: string
}

export function navigationItems(authenticated: boolean, isAdmin: boolean): NavigationItem[] {
  if (!authenticated) return [{ page: 'carnet', label: 'Connexion' }]
  if (!isAdmin) {
    return [
      { page: 'classement', label: 'Classement' },
      { page: 'carnet', label: 'Carnet' },
    ]
  }
  return [
    { page: '', label: 'Topo' },
    { page: 'classement', label: 'Classement' },
    { page: 'carnet', label: 'Carnet' },
    { page: 'admin', label: 'Admin' },
  ]
}
