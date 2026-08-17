import { navigationItems, type AppPage } from './lib/navigation'
import { useState } from 'react'

export default function PrimaryNav({ page, authenticated, isAdmin, isOpener = false, loading = false, onSignOut }: {
  page: AppPage
  authenticated: boolean
  isAdmin: boolean
  isOpener?: boolean
  loading?: boolean
  onSignOut?: () => Promise<void>
}) {
  const items = loading ? [] : navigationItems(authenticated, isAdmin, isOpener)
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    if (!onSignOut) return
    setSigningOut(true)
    try {
      await onSignOut()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <nav className="primary-nav" aria-label="Navigation principale" aria-busy={loading}>
      <a className="primary-nav__brand" href="#" aria-current={page === '' ? 'page' : undefined}>Topopote</a>
      {loading ? <span className="primary-nav__status">Vérification de la session…</span> : (
        <div className={`primary-nav__links primary-nav__links--${items.length + Number(authenticated)} `}>
          {items.map((item) => (
            <a
              className={`primary-nav__link ${item.page === 'carnet' && !authenticated ? 'primary-nav__link--account' : ''}`}
              href={item.page ? `#${item.page}` : '#'}
              aria-current={page === item.page ? 'page' : undefined}
              key={item.page || 'topo'}
            >
              {item.label}
            </a>
          ))}
          {authenticated && onSignOut && (
            <button className="primary-nav__link primary-nav__sign-out" type="button" onClick={() => void signOut()} disabled={signingOut}>
              {signingOut ? 'Déconnexion…' : 'Déconnexion'}
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
