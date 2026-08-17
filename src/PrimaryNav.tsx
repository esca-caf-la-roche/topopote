import { navigationItems, type AppPage } from './lib/navigation'

export default function PrimaryNav({ page, authenticated, isAdmin, loading = false }: {
  page: AppPage
  authenticated: boolean
  isAdmin: boolean
  loading?: boolean
}) {
  const items = loading ? [] : navigationItems(authenticated, isAdmin)

  return (
    <nav className="primary-nav" aria-label="Navigation principale" aria-busy={loading}>
      <a className="primary-nav__brand" href="#" aria-current={page === '' ? 'page' : undefined}>Topopote</a>
      {loading ? <span className="primary-nav__status">Vérification de la session…</span> : (
        <div className={`primary-nav__links primary-nav__links--${items.length}`}>
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
        </div>
      )}
    </nav>
  )
}
