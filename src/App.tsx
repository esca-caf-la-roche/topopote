import { type FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createPortal } from 'react-dom'
import { emptyFilters, filterRoutes } from './lib/routes'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { Color, Grade, Relay, Route, RouteFilters, RouteSort, Season, Zone } from './types'

type Message = { kind: 'error' | 'success'; text: string } | null

function relation<T>(value: T | T[] | null): T {
  if (Array.isArray(value)) return value[0]
  if (!value) throw new Error('Référence manquante pour une voie.')
  return value
}

export default function App() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [relays, setRelays] = useState<Relay[]>([])
  const [colors, setColors] = useState<Color[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [filters, setFilters] = useState<RouteFilters>(emptyFilters)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [message, setMessage] = useState<Message>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdmin, setShowAdmin] = useState(() => window.location.hash === '#admin')
  const [routeSort, setRouteSort] = useState<RouteSort>('relay')
  const [editRoutes, setEditRoutes] = useState(false)
  const [routeDraft, setRouteDraft] = useState<{ relayId?: string; gradeId?: string } | null>(null)

  const loadTopo = useCallback(async () => {
    if (!supabase) return
    setLoading(true)

    const [routesResult, seasonsResult, zonesResult, relaysResult, colorsResult, gradesResult] = await Promise.all([
      supabase
        .from('voies')
        .select(
          'id, demi_voie, saison_id, relais_id, couleur_id, cotation_id, saison:saisons(id, nom, active), relais:relais(id, numero, zone_id, zone:zones(id, nom, ordre)), couleur:couleurs(id, nom, hex), cotation:cotations(id, libelle, rang, difficulte)',
        ),
      supabase.from('saisons').select('id, nom, active').order('active', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('zones').select('id, nom, ordre').order('ordre'),
      supabase.from('relais').select('id, numero, zone_id, zone:zones(id, nom, ordre)').order('numero'),
      supabase.from('couleurs').select('id, nom, hex').order('nom'),
      supabase.from('cotations').select('id, libelle, rang, difficulte').order('rang'),
    ])

    const error =
      routesResult.error || seasonsResult.error || zonesResult.error || relaysResult.error || colorsResult.error || gradesResult.error
    if (error) {
      setMessage({ kind: 'error', text: `Impossible de charger le topo : ${error.message}` })
      setLoading(false)
      return
    }

    const mappedRoutes = (routesResult.data ?? []).map((row) => {
      const relay = relation(row.relais)
      const season = relation(row.saison)
      const zone = relation(relay.zone)
      const color = relation(row.couleur)
      const grade = relation(row.cotation)
      return {
        id: row.id,
        isHalfRoute: row.demi_voie,
        seasonId: row.saison_id,
        relayId: row.relais_id,
        colorId: row.couleur_id,
        gradeId: row.cotation_id,
        season: { id: season.id, name: season.nom, active: season.active },
        relay: {
          id: relay.id,
          number: relay.numero,
          zoneId: relay.zone_id,
          zone: { id: zone.id, name: zone.nom, order: zone.ordre },
        },
        color: { id: color.id, name: color.nom, hex: color.hex },
        grade: { id: grade.id, label: grade.libelle, rank: grade.rang, difficulty: grade.difficulte },
      }
    })

    setRoutes(mappedRoutes)
    const mappedSeasons = (seasonsResult.data ?? []).map((row) => ({ id: row.id, name: row.nom, active: row.active }))
    setSeasons(mappedSeasons)
    setZones((zonesResult.data ?? []).map((row) => ({ id: row.id, name: row.nom, order: row.ordre })))
    setRelays((relaysResult.data ?? []).map((row) => {
      const zone = relation(row.zone)
      return {
        id: row.id,
        number: row.numero,
        zoneId: row.zone_id,
        zone: { id: zone.id, name: zone.nom, order: zone.ordre },
      }
    }))
    setColors(
      (colorsResult.data ?? []).map((row) => ({ id: row.id, name: row.nom, hex: row.hex })),
    )
    setGrades(
      (gradesResult.data ?? []).map((row) => ({ id: row.id, label: row.libelle, rank: row.rang, difficulty: row.difficulte })),
    )
    setLoading(false)
  }, [])

  const refreshAdmin = useCallback(async (nextUser: User | null) => {
    setUser(nextUser)
    if (!supabase || !nextUser) {
      setIsAdmin(false)
      return
    }

    const { data } = await supabase
      .from('administrateurs')
      .select('user_id')
      .eq('user_id', nextUser.id)
      .maybeSingle()
    setIsAdmin(Boolean(data))
  }, [])

  useEffect(() => {
    void loadTopo()
    if (!supabase) return

    void supabase.auth.getUser().then(({ data }) => refreshAdmin(data.user))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void refreshAdmin(session?.user ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [loadTopo, refreshAdmin])

  useEffect(() => {
    const updatePage = () => setShowAdmin(window.location.hash === '#admin')
    window.addEventListener('hashchange', updatePage)
    return () => window.removeEventListener('hashchange', updatePage)
  }, [])

  const activeSeasonId = seasons.find((season) => season.active)?.id ?? null
  const visibleRoutes = useMemo(
    () => filterRoutes(routes, filters, activeSeasonId, routeSort),
    [routes, filters, activeSeasonId, routeSort],
  )
  const routesByZone = useMemo(
    () => zones
      .map((zone) => {
        const zoneRoutes = visibleRoutes.filter((route) => route.relay.zoneId === zone.id)
        const references = routeSort === 'relay'
          ? relays.filter((relay) => relay.zoneId === zone.id)
          : grades
        const groups = references
          .map((reference) => ({
            id: reference.id,
            label: routeSort === 'relay' ? `Relais ${(reference as Relay).number}` : (reference as Grade).label,
            routes: zoneRoutes.filter((route) => routeSort === 'relay'
              ? route.relayId === reference.id
              : route.gradeId === reference.id),
          }))
          .filter((group) => group.routes.length > 0 || editRoutes)
        return { zone, groups, routeCount: zoneRoutes.length }
      })
      .filter((group) => group.routeCount > 0 || editRoutes),
    [editRoutes, grades, relays, routeSort, visibleRoutes, zones],
  )

  useEffect(() => {
    if (!isAdmin) {
      setEditRoutes(false)
      setRouteDraft(null)
    }
  }, [isAdmin])

  if (showAdmin) {
    return (
      <AdminPage
        user={user}
        isAdmin={isAdmin}
        seasons={seasons}
        zones={zones}
        relays={relays}
        colors={colors}
        grades={grades}
        message={message}
        onClose={() => { window.location.hash = '' }}
        onChanged={loadTopo}
        onMessage={setMessage}
      />
    )
  }

  return (
    <div className="site-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Mur d’escalade · Saint-Pierre-en-Faucigny</p>
          <h1>topopote</h1>
          <p className="hero-tagline">Le topo sans prise de tête.</p>
          <p className="intro">Trouve une voie par zone, relais, couleur ou cotation.</p>
        </div>
        <div className="hero-actions">
          {isAdmin && (
            <button
              className={`button ${editRoutes ? 'button--accent' : 'button--dark'}`}
              type="button"
              aria-pressed={editRoutes}
              onClick={() => {
                setEditRoutes((current) => {
                  if (!current) setFilters(emptyFilters)
                  return !current
                })
                setRouteDraft(null)
              }}
            >
              {editRoutes ? 'Quitter le mode édition' : 'Modifier les voies'}
            </button>
          )}
          <button className="button button--dark" type="button" onClick={() => { window.location.hash = 'admin' }}>
            {isAdmin ? 'Administration' : 'Espace admin'}
          </button>
        </div>
      </header>

      {!isSupabaseConfigured && (
        <div className="notice" role="status">
          <strong>Projet prêt à connecter.</strong> Ajoute les variables Supabase décrites dans le README.
        </div>
      )}

      {message && <div className={`message message--${message.kind}`}>{message.text}</div>}

      <main>
        <section className="filters" aria-label="Filtres du topo">
          <FilterSelect
            label="Zone"
            value={filters.zoneId}
            onChange={(zoneId) => setFilters((current) => ({ ...current, zoneId, relayId: '' }))}
          >
            {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
          </FilterSelect>
          <FilterSelect
            label="Relais"
            value={filters.relayId}
            onChange={(relayId) => setFilters((current) => ({ ...current, relayId }))}
          >
            {relays
              .filter((relay) => !filters.zoneId || relay.zoneId === filters.zoneId)
              .map((relay) => <option key={relay.id} value={relay.id}>Relais {relay.number}</option>)}
          </FilterSelect>
          <ColorFilter
            colors={colors}
            value={filters.colorId}
            onChange={(colorId) => setFilters((current) => ({ ...current, colorId }))}
          />
          <FilterSelect
            label="Cotation"
            value={filters.gradeId}
            onChange={(gradeId) => setFilters((current) => ({ ...current, gradeId }))}
          >
            {grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}
          </FilterSelect>
          <label className="checkbox-label filters__checkbox">
            <input
              type="checkbox"
              checked={filters.showHalfRoutes}
              onChange={(event) => setFilters((current) => ({ ...current, showHalfRoutes: event.target.checked }))}
            />
            <span>Afficher les ½ voies</span>
          </label>
          <label>
            <span>Afficher par</span>
            <select value={routeSort} onChange={(event) => setRouteSort(event.target.value as RouteSort)}>
              <option value="relay">Relais</option>
              <option value="grade">Cotation</option>
            </select>
          </label>
          <button className="button button--light" type="button" onClick={() => setFilters(emptyFilters)}>
            Tout afficher
          </button>
        </section>

        <section aria-labelledby="routes-title">
          <div className="section-heading">
            <h2 id="routes-title">Les voies</h2>
            <div className="section-heading__actions">
              {editRoutes && (
                <button className="button button--accent" type="button" onClick={() => setRouteDraft({})}>
                  + Ajouter une voie
                </button>
              )}
              <span className="count">{visibleRoutes.length}</span>
            </div>
          </div>
          {routeDraft && (
            <RouteModal
              key={`${routeDraft.relayId ?? ''}-${routeDraft.gradeId ?? ''}`}
              activeSeason={seasons.find((season) => season.active) ?? null}
              relays={relays}
              colors={colors}
              grades={grades}
              initialRelayId={routeDraft.relayId}
              initialGradeId={routeDraft.gradeId}
              onClose={() => setRouteDraft(null)}
              onChanged={async () => {
                await loadTopo()
                setRouteDraft(null)
              }}
              onMessage={setMessage}
            />
          )}
          {loading ? (
            <p className="empty-state">Chargement du topo…</p>
          ) : visibleRoutes.length === 0 && !editRoutes ? (
            <p className="empty-state">Aucune voie ne correspond à ces filtres.</p>
          ) : (
            <div className="zone-groups">
              {routesByZone.map(({ zone, groups, routeCount }) => (
                <section className="zone-group" key={zone.id} aria-labelledby={`zone-${zone.id}`}>
                  <div className="zone-heading">
                    <h3 id={`zone-${zone.id}`}>{zone.name}</h3>
                    <span>{routeCount} voie{routeCount > 1 ? 's' : ''}</span>
                  </div>
                  <div className="route-groups">
                    {groups.map((group) => (
                      <section className="route-group" key={group.id}>
                        <div className="route-group__heading">
                          <h4>{group.label}</h4>
                          {editRoutes && (
                            <button
                              type="button"
                              aria-label={`Ajouter une voie pour ${group.label}`}
                              onClick={() => setRouteDraft(routeSort === 'relay'
                                ? { relayId: group.id }
                                : { gradeId: group.id })}
                            >+</button>
                          )}
                        </div>
                        {group.routes.length > 0 ? (
                          <div className="route-grid">
                            {group.routes.map((route) => editRoutes ? (
                              <RouteEditor
                                key={route.id}
                                route={route}
                                relays={relays}
                                colors={colors}
                                grades={grades}
                                compact
                                onChanged={loadTopo}
                                onMessage={setMessage}
                              />
                            ) : (
                              <RouteCard key={route.id} route={route} />
                            ))}
                          </div>
                        ) : (
                          <p className="route-group__empty">Aucune voie</p>
                        )}
                      </section>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </main>

    </div>
  )
}

function RouteModal({ onClose, ...routeFormProps }: {
  activeSeason: Season | null
  relays: Relay[]
  colors: Color[]
  grades: Grade[]
  initialRelayId?: string
  initialGradeId?: string
  onClose: () => void
  onChanged: () => Promise<void>
  onMessage: (message: Message) => void
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="route-modal-title">
        <button className="modal__close" type="button" aria-label="Fermer" onClick={onClose}>×</button>
        <RouteForm {...routeFormProps} onCancel={onClose} titleId="route-modal-title" />
      </section>
    </div>,
    document.body,
  )
}

function RouteCard({ route }: { route: Route }) {
  return (
    <article className="route-card">
      <div
        className="route-card__color"
        style={{ backgroundColor: route.color.hex }}
        role="img"
        aria-label={`Couleur ${route.color.name}`}
      />
      <div className="route-card__relay">
        <p>Relais</p>
        <strong>{route.relay.number}</strong>
        {route.isHalfRoute && <span className="half-route-badge">1/2 voie</span>}
      </div>
      <div className="grade" aria-label={`Cotation ${route.grade.label}`}>{route.grade.label}</div>
    </article>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
  allLabel = 'Tous',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  allLabel?: string
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {children}
      </select>
    </label>
  )
}

function ColorFilter({ colors, value, onChange }: {
  colors: Color[]
  value: string
  onChange: (value: string) => void
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const selectedColor = colors.find((color) => color.id === value) ?? null

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        detailsRef.current.open = false
      }
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  function select(colorId: string) {
    onChange(colorId)
    if (detailsRef.current) detailsRef.current.open = false
  }

  return (
    <div className="color-filter">
      <span>Couleur</span>
      <details ref={detailsRef} className="color-filter__dropdown">
        <summary aria-label={selectedColor ? `Couleur sélectionnée : ${selectedColor.name}` : 'Toutes les couleurs'}>
          <span
            className={selectedColor ? 'color-filter__selected' : 'color-filter__selected color-filter__all'}
            style={selectedColor ? { backgroundColor: selectedColor.hex } : undefined}
          >{selectedColor ? '' : '×'}</span>
          <span className="color-filter__chevron" aria-hidden="true">⌄</span>
        </summary>
        <div className="color-filter__menu">
          <button
            className="color-filter__all"
            type="button"
            title="Toutes les couleurs"
            aria-label="Toutes les couleurs"
            aria-pressed={value === ''}
            onClick={() => select('')}
          >×</button>
          {colors.map((color) => (
            <button
              key={color.id}
              type="button"
              title={color.name}
              aria-label={`Filtrer par la couleur ${color.name}`}
              aria-pressed={value === color.id}
              style={{ backgroundColor: color.hex }}
              onClick={() => select(color.id)}
            />
          ))}
        </div>
      </details>
    </div>
  )
}

type ActionIconName = 'save' | 'edit' | 'delete'

function ActionIcon({ name }: { name: ActionIconName }) {
  if (name === 'save') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h13l3 3v15H4V3Zm3 2v5h9V5H7Zm0 9v5h10v-5H7Z" /></svg>
  }
  if (name === 'edit') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16 11-11 4 4L8 20H4v-4Zm12.5-8.5-9.8 9.8v1h1l9.8-9.8-1-1Z" /></svg>
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l1 2h4v2H3V5h4l1-2Zm-2 6h12l-1 12H7L6 9Zm3 2v7h2v-7H9Zm4 0v7h2v-7h-2Z" /></svg>
}

function ActionButton({ icon, label, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ActionIconName
  label: string
}) {
  return (
    <button className={`icon-action ${className}`.trim()} title={label} aria-label={label} {...props}>
      <ActionIcon name={icon} />
    </button>
  )
}

function AdminPage({
  user,
  isAdmin,
  seasons,
  zones,
  relays,
  colors,
  grades,
  message,
  onClose,
  onChanged,
  onMessage,
}: {
  user: User | null
  isAdmin: boolean
  seasons: Season[]
  zones: Zone[]
  relays: Relay[]
  colors: Color[]
  grades: Grade[]
  message: Message
  onClose: () => void
  onChanged: () => Promise<void>
  onMessage: (message: Message) => void
}) {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function sendOtp(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    setBusy(false)
    if (error) return onMessage({ kind: 'error', text: error.message })
    setOtpSent(true)
    onMessage({ kind: 'success', text: 'Code envoyé. Consulte ta boîte mail.' })
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    setBusy(false)
    if (error) return onMessage({ kind: 'error', text: error.message })
    onMessage({ kind: 'success', text: 'Connexion réussie.' })
  }

  async function signOut() {
    await supabase?.auth.signOut()
  }

  return (
    <div className="site-shell">
      <header className="hero hero--admin">
        <div>
          <p className="eyebrow">Topopote · gestion du mur</p>
          <h1 id="admin-title" className="admin-title">Administration</h1>
          <p className="intro">Gère les saisons et les référentiels du topo.</p>
        </div>
        <button className="button button--dark" type="button" onClick={onClose}>Retour au topo</button>
      </header>

      {message && <div className={`message message--${message.kind}`}>{message.text}</div>}

      <main className="admin-page">
        <section className="admin-panel" aria-labelledby="admin-title">

        {!isSupabaseConfigured ? (
          <p className="empty-state">Configure Supabase avant d’utiliser l’administration.</p>
        ) : !user ? (
          <form className="stack" onSubmit={otpSent ? verifyOtp : sendOtp}>
            <p>L’accès est réservé aux administrateurs déjà enregistrés.</p>
            <label>
              <span>Adresse email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
            </label>
            {otpSent && (
              <label>
                <span>Code à 6 chiffres</span>
                <input value={otp} onChange={(event) => setOtp(event.target.value)} required inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" />
              </label>
            )}
            <button className="button button--accent" disabled={busy}>
              {busy ? 'Patiente…' : otpSent ? 'Valider le code' : 'Recevoir mon code'}
            </button>
          </form>
        ) : !isAdmin ? (
          <div className="stack">
            <p>Ce compte est connecté, mais ne possède pas le rôle administrateur.</p>
            <button className="button button--light" type="button" onClick={signOut}>Se déconnecter</button>
          </div>
        ) : (
          <div className="stack stack--large">
            <div className="admin-session">
              <span>{user.email}</span>
              <button type="button" onClick={signOut}>Se déconnecter</button>
            </div>
            <SeasonManager seasons={seasons} onChanged={onChanged} onMessage={onMessage} />
            <ReferenceForms zones={zones} relays={relays} colors={colors} grades={grades} onChanged={onChanged} onMessage={onMessage} />
          </div>
        )}
        </section>
      </main>
    </div>
  )
}

function RouteForm({ activeSeason, relays, colors, grades, initialRelayId, initialGradeId, onCancel, onChanged, onMessage, titleId }: {
  activeSeason: Season | null
  relays: Relay[]
  colors: Color[]
  grades: Grade[]
  initialRelayId?: string
  initialGradeId?: string
  onCancel: () => void
  onChanged: () => Promise<void>
  onMessage: (message: Message) => void
  titleId?: string
}) {
  const [relayId, setRelayId] = useState(initialRelayId ?? '')
  const [colorId, setColorId] = useState('')
  const [gradeId, setGradeId] = useState(initialGradeId ?? '')
  const [isHalfRoute, setIsHalfRoute] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!activeSeason) return onMessage({ kind: 'error', text: 'Active une saison avant d’ajouter une voie.' })
    const { error } = await supabase!.from('voies').insert({
      saison_id: activeSeason.id,
      relais_id: relayId,
      couleur_id: colorId,
      cotation_id: gradeId,
      demi_voie: isHalfRoute,
    })
    if (error) return onMessage({ kind: 'error', text: error.message })
    onMessage({ kind: 'success', text: 'La voie a été ajoutée.' })
    await onChanged()
  }

  return (
    <form className="route-create-form stack" onSubmit={submit}>
      <h3 id={titleId}>Ajouter une voie</h3>
      <p className="form-context">Saison active : <strong>{activeSeason?.name ?? 'aucune'}</strong></p>
      <div className="form-grid">
        <label><span>Relais</span><select autoFocus required value={relayId} onChange={(event) => setRelayId(event.target.value)}><option value="">Choisir</option>{relays.map((relay) => <option key={relay.id} value={relay.id}>{relay.number} · {relay.zone.name}</option>)}</select></label>
        <ColorPicker colors={colors} value={colorId} onChange={setColorId} />
        <label><span>Cotation</span><select required value={gradeId} onChange={(event) => setGradeId(event.target.value)}><option value="">Choisir</option>{grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.label} · {grade.difficulty}</option>)}</select></label>
        <label className="checkbox-label"><input type="checkbox" checked={isHalfRoute} onChange={(event) => setIsHalfRoute(event.target.checked)} /><span>1/2 voie</span></label>
      </div>
      <div className="admin-actions">
        <ActionButton className="button button--accent" icon="save" label="Enregistrer la voie" disabled={!activeSeason} />
        <button className="button" type="button" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  )
}

function ColorPicker({ colors, value, onChange }: { colors: Color[]; value: string; onChange: (value: string) => void }) {
  const inputName = useId()
  return (
    <fieldset className="color-picker">
      <legend>Couleur</legend>
      <div className="color-picker__choices">
        {colors.map((color) => (
          <label className="color-choice" key={color.id} title={color.name}>
            <input
              type="radio"
              name={inputName}
              value={color.id}
              checked={value === color.id}
              onChange={() => onChange(color.id)}
              required
              aria-label={color.name}
            />
            <span style={{ backgroundColor: color.hex }} aria-hidden="true" />
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function RouteEditor({ route, relays, colors, grades, compact = false, onChanged, onMessage }: {
  route: Route
  relays: Relay[]
  colors: Color[]
  grades: Grade[]
  compact?: boolean
  onChanged: () => Promise<void>
  onMessage: (message: Message) => void
}) {
  const [editing, setEditing] = useState(false)
  const [relayId, setRelayId] = useState(route.relayId)
  const [colorId, setColorId] = useState(route.colorId)
  const [gradeId, setGradeId] = useState(route.gradeId)
  const [isHalfRoute, setIsHalfRoute] = useState(route.isHalfRoute)

  async function save(event: FormEvent) {
    event.preventDefault()
    const { error } = await supabase!.from('voies').update({
      relais_id: relayId,
      couleur_id: colorId,
      cotation_id: gradeId,
      demi_voie: isHalfRoute,
    }).eq('id', route.id)
    if (error) return onMessage({ kind: 'error', text: error.message })
    onMessage({ kind: 'success', text: 'La voie a été modifiée.' })
    setEditing(false)
    await onChanged()
  }

  async function remove() {
    if (!window.confirm(`Supprimer la voie du relais ${route.relay.number} ?`)) return
    const { error } = await supabase!.from('voies').delete().eq('id', route.id)
    if (error) return onMessage({ kind: 'error', text: error.message })
    onMessage({ kind: 'success', text: 'La voie a été supprimée.' })
    await onChanged()
  }

  if (editing) {
    return (
      <form className="admin-route-card admin-route-card--editing" onSubmit={save}>
        <div className="form-grid">
          <label><span>Relais</span><select required value={relayId} onChange={(event) => setRelayId(event.target.value)}>{relays.map((relay) => <option key={relay.id} value={relay.id}>{relay.number} · {relay.zone.name}</option>)}</select></label>
          <ColorPicker colors={colors} value={colorId} onChange={setColorId} />
          <label><span>Cotation</span><select required value={gradeId} onChange={(event) => setGradeId(event.target.value)}>{grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.label} · {grade.difficulty}</option>)}</select></label>
          <label className="checkbox-label"><input type="checkbox" checked={isHalfRoute} onChange={(event) => setIsHalfRoute(event.target.checked)} /><span>1/2 voie</span></label>
        </div>
        <div className="admin-actions">
          <ActionButton className="button button--small button--accent" icon="save" label="Enregistrer les modifications" type="submit" />
          <button className="button button--small" type="button" onClick={() => setEditing(false)}>Annuler</button>
        </div>
      </form>
    )
  }

  return (
    <article className={`editable-route ${compact ? 'editable-route--compact' : ''}`}>
      <RouteCard route={route} />
      <div className="admin-actions">
        <ActionButton icon="edit" label="Modifier la voie" type="button" onClick={() => setEditing(true)} />
        <ActionButton className="danger-action" icon="delete" label="Supprimer la voie" type="button" onClick={() => void remove()} />
      </div>
    </article>
  )
}

function SeasonManager({ seasons, onChanged, onMessage }: {
  seasons: Season[]
  onChanged: () => Promise<void>
  onMessage: (message: Message) => void
}) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [active, setActive] = useState(seasons.length === 0)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const { error } = await supabase!.from('saisons').insert({
      nom: name,
      active,
    })
    if (error) return onMessage({ kind: 'error', text: error.message })
    setName('')
    setActive(false)
    setAdding(false)
    onMessage({ kind: 'success', text: 'La saison a été ajoutée.' })
    await onChanged()
  }

  async function activate(seasonId: string) {
    const { error } = await supabase!.from('saisons').update({ active: true }).eq('id', seasonId)
    if (error) return onMessage({ kind: 'error', text: error.message })
    onMessage({ kind: 'success', text: 'La saison active a été mise à jour.' })
    await onChanged()
  }

  async function remove(season: Season) {
    if (!window.confirm(`Supprimer la saison « ${season.name} » ?`)) return
    const { error } = await supabase!.from('saisons').delete().eq('id', season.id)
    if (error) return onMessage({ kind: 'error', text: error.message })
    onMessage({ kind: 'success', text: 'La saison a été supprimée.' })
    await onChanged()
  }

  return (
    <div className="stack">
      <div className="manager-heading">
        <h3>Saisons</h3>
        <button className="add-button" type="button" aria-label="Ajouter une saison" onClick={() => setAdding((current) => !current)}>+</button>
      </div>
      {adding && (
        <form className="form-grid form-grid--season inline-create" onSubmit={submit}>
          <label><span>Nom</span><input placeholder="Automne 2026" required value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="checkbox-label"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /><span>Saison active</span></label>
          <button className="button button--accent">Ajouter la saison</button>
        </form>
      )}
      <div className="admin-list">
        {seasons.map((season) => (
          <div key={season.id}>
            <span>{season.name}{season.active ? ' · active' : ''}</span>
            <div className="row-actions">
              {!season.active && <button type="button" onClick={() => void activate(season.id)}>Activer</button>}
              <ActionButton className="danger-action" icon="delete" label={`Supprimer la saison ${season.name}`} type="button" onClick={() => void remove(season)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReferenceForms({ zones, relays, colors, grades, onChanged, onMessage }: {
  zones: Zone[]
  relays: Relay[]
  colors: Color[]
  grades: Grade[]
  onChanged: () => Promise<void>
  onMessage: (message: Message) => void
}) {
  const [adding, setAdding] = useState<'zone' | 'relay' | 'color' | 'grade' | null>(null)
  const [zoneName, setZoneName] = useState('')
  const [relayNumber, setRelayNumber] = useState('')
  const [relayZoneId, setRelayZoneId] = useState('')
  const [colorName, setColorName] = useState('')
  const [colorHex, setColorHex] = useState('#ffde59')
  const [gradeLabel, setGradeLabel] = useState('')

  async function insert(table: 'relais' | 'couleurs', values: Record<string, string | number>) {
    const { error } = await supabase!.from(table).insert(values)
    if (error) {
      onMessage({ kind: 'error', text: error.message })
      return false
    }
    onMessage({ kind: 'success', text: 'Référentiel mis à jour.' })
    setAdding(null)
    await onChanged()
    return true
  }

  async function addZone(event: FormEvent) {
    event.preventDefault()
    const { error } = await supabase!.rpc('ajouter_zone', { p_nom: zoneName })
    if (error) return onMessage({ kind: 'error', text: error.message })
    setZoneName('')
    setAdding(null)
    onMessage({ kind: 'success', text: 'La zone a été ajoutée.' })
    await onChanged()
  }

  async function addGrade(event: FormEvent) {
    event.preventDefault()
    const { error } = await supabase!.rpc('ajouter_cotation', { p_libelle: gradeLabel })
    if (error) return onMessage({ kind: 'error', text: error.message })
    setGradeLabel('')
    setAdding(null)
    onMessage({ kind: 'success', text: 'La cotation a été ajoutée.' })
    await onChanged()
  }

  return (
    <div className="stack">
      <h3>Modifier les référentiels</h3>
      <div className="reference-editors">
        <section>
          <div className="manager-heading">
            <h4>Zones et ordre d’affichage</h4>
            <button className="add-button" type="button" aria-label="Ajouter une zone" onClick={() => setAdding(adding === 'zone' ? null : 'zone')}>+</button>
          </div>
          {adding === 'zone' && (
            <form className="inline-create" onSubmit={addZone}>
              <label><span>Nom de zone</span><input placeholder="Zone verticale" required value={zoneName} onChange={(event) => setZoneName(event.target.value)} /></label>
              <button className="button button--small">Ajouter</button>
            </form>
          )}
          {zones.map((zone) => <ZoneReferenceEditor key={zone.id} zone={zone} onChanged={onChanged} onMessage={onMessage} />)}
        </section>
        <section>
          <div className="manager-heading">
            <h4>Relais</h4>
            <button className="add-button" type="button" aria-label="Ajouter un relais" onClick={() => setAdding(adding === 'relay' ? null : 'relay')}>+</button>
          </div>
          {adding === 'relay' && (
            <form className="inline-create" onSubmit={async (event) => {
              event.preventDefault()
              if (await insert('relais', { numero: Number(relayNumber), zone_id: relayZoneId })) setRelayNumber('')
            }}>
              <label><span>N° de relais</span><input type="number" min="1" required value={relayNumber} onChange={(event) => setRelayNumber(event.target.value)} /></label>
              <label><span>Zone</span><select required value={relayZoneId} onChange={(event) => setRelayZoneId(event.target.value)}><option value="">Choisir</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
              <button className="button button--small">Ajouter</button>
            </form>
          )}
          {relays.map((relay) => <RelayReferenceEditor key={relay.id} relay={relay} zones={zones} onChanged={onChanged} onMessage={onMessage} />)}
        </section>
        <section>
          <div className="manager-heading">
            <h4>Couleurs</h4>
            <button className="add-button" type="button" aria-label="Ajouter une couleur" onClick={() => setAdding(adding === 'color' ? null : 'color')}>+</button>
          </div>
          {adding === 'color' && (
            <form className="inline-create" onSubmit={async (event) => {
              event.preventDefault()
              if (await insert('couleurs', { nom: colorName, hex: colorHex })) setColorName('')
            }}>
              <label><span>Couleur</span><input required value={colorName} onChange={(event) => setColorName(event.target.value)} /></label>
              <label><span>Teinte</span><input type="color" value={colorHex} onChange={(event) => setColorHex(event.target.value)} /></label>
              <button className="button button--small">Ajouter</button>
            </form>
          )}
          {colors.map((color) => <ColorReferenceEditor key={color.id} color={color} onChanged={onChanged} onMessage={onMessage} />)}
        </section>
        <section>
          <div className="manager-heading">
            <h4>Cotations</h4>
            <button className="add-button" type="button" aria-label="Ajouter une cotation" onClick={() => setAdding(adding === 'grade' ? null : 'grade')}>+</button>
          </div>
          {adding === 'grade' && (
            <form className="inline-create" onSubmit={addGrade}>
              <label><span>Cotation</span><input placeholder="7a+" required value={gradeLabel} onChange={(event) => setGradeLabel(event.target.value)} /></label>
              <button className="button button--small">Ajouter</button>
            </form>
          )}
          {grades.map((grade) => <GradeReferenceEditor key={grade.id} grade={grade} onChanged={onChanged} onMessage={onMessage} />)}
        </section>
      </div>
    </div>
  )
}

type ReferenceEditorProps = {
  onChanged: () => Promise<void>
  onMessage: (message: Message) => void
}

function ZoneReferenceEditor({ zone, onChanged, onMessage }: ReferenceEditorProps & { zone: Zone }) {
  const [name, setName] = useState(zone.name)
  const [order, setOrder] = useState(String(zone.order))

  async function save(event: FormEvent) {
    event.preventDefault()
    const { error } = await supabase!.rpc('modifier_zone', { p_zone_id: zone.id, p_nom: name, p_nouvel_ordre: Number(order) })
    if (error) return onMessage({ kind: 'error', text: error.message })
    onMessage({ kind: 'success', text: 'La zone et son ordre ont été modifiés.' })
    await onChanged()
  }

  async function remove() {
    if (!window.confirm(`Supprimer la zone « ${zone.name} » ?`)) return
    const { error } = await supabase!.rpc('supprimer_zone', { p_zone_id: zone.id })
    if (error) return onMessage({ kind: 'error', text: error.message })
    onMessage({ kind: 'success', text: 'La zone a été supprimée.' })
    await onChanged()
  }

  return (
    <form className="reference-editor" onSubmit={save}>
      <label><span>Nom</span><input required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label><span>Ordre</span><input type="number" min="1" required value={order} onChange={(event) => setOrder(event.target.value)} /></label>
      <div className="row-actions">
        <ActionButton icon="save" label="Enregistrer la zone" type="submit" />
        <ActionButton className="danger-action" icon="delete" label={`Supprimer la zone ${zone.name}`} type="button" onClick={() => void remove()} />
      </div>
    </form>
  )
}

function RelayReferenceEditor({ relay, zones, onChanged, onMessage }: ReferenceEditorProps & { relay: Relay; zones: Zone[] }) {
  const [number, setNumber] = useState(String(relay.number))
  const [zoneId, setZoneId] = useState(relay.zoneId)

  async function save(event: FormEvent) {
    event.preventDefault()
    const { error } = await supabase!.from('relais').update({ numero: Number(number), zone_id: zoneId }).eq('id', relay.id)
    if (error) return onMessage({ kind: 'error', text: error.message })
    onMessage({ kind: 'success', text: 'Le relais a été modifié.' })
    await onChanged()
  }

  async function remove() {
    if (!window.confirm(`Supprimer le relais ${relay.number} ?`)) return
    const { error } = await supabase!.from('relais').delete().eq('id', relay.id)
    if (error) return onMessage({ kind: 'error', text: error.message })
    onMessage({ kind: 'success', text: 'Le relais a été supprimé.' })
    await onChanged()
  }

  return (
    <form className="reference-editor" onSubmit={save}>
      <label><span>N°</span><input type="number" min="1" required value={number} onChange={(event) => setNumber(event.target.value)} /></label>
      <label><span>Zone</span><select required value={zoneId} onChange={(event) => setZoneId(event.target.value)}>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
      <div className="row-actions">
        <ActionButton icon="save" label="Enregistrer le relais" type="submit" />
        <ActionButton className="danger-action" icon="delete" label={`Supprimer le relais ${relay.number}`} type="button" onClick={() => void remove()} />
      </div>
    </form>
  )
}

function ColorReferenceEditor({ color, onChanged, onMessage }: ReferenceEditorProps & { color: Color }) {
  const [name, setName] = useState(color.name)
  const [hex, setHex] = useState(color.hex)

  async function save(event: FormEvent) {
    event.preventDefault()
    const { error } = await supabase!.from('couleurs').update({ nom: name, hex }).eq('id', color.id)
    if (error) return onMessage({ kind: 'error', text: error.message })
    onMessage({ kind: 'success', text: 'La couleur a été modifiée.' })
    await onChanged()
  }

  async function remove() {
    if (!window.confirm(`Supprimer la couleur « ${color.name} » ?`)) return
    const { error } = await supabase!.from('couleurs').delete().eq('id', color.id)
    if (error) return onMessage({ kind: 'error', text: error.message })
    onMessage({ kind: 'success', text: 'La couleur a été supprimée.' })
    await onChanged()
  }

  return (
    <form className="reference-editor reference-editor--color" onSubmit={save}>
      <label><span>Nom</span><input required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label><span>Teinte</span><input type="color" value={hex} onChange={(event) => setHex(event.target.value)} /></label>
      <div className="row-actions">
        <ActionButton icon="save" label="Enregistrer la couleur" type="submit" />
        <ActionButton className="danger-action" icon="delete" label={`Supprimer la couleur ${color.name}`} type="button" onClick={() => void remove()} />
      </div>
    </form>
  )
}

function GradeReferenceEditor({ grade, onChanged, onMessage }: ReferenceEditorProps & { grade: Grade }) {
  const [label, setLabel] = useState(grade.label)
  const [rank, setRank] = useState(String(grade.rank))

  async function save(event: FormEvent) {
    event.preventDefault()
    const { error } = await supabase!.rpc('modifier_cotation', { p_cotation_id: grade.id, p_libelle: label, p_nouveau_rang: Number(rank) })
    if (error) return onMessage({ kind: 'error', text: error.message })
    onMessage({ kind: 'success', text: 'La cotation et son ordre ont été modifiés.' })
    await onChanged()
  }

  async function remove() {
    if (!window.confirm(`Supprimer la cotation « ${grade.label} » ?`)) return
    const { error } = await supabase!.rpc('supprimer_cotation', { p_cotation_id: grade.id })
    if (error) return onMessage({ kind: 'error', text: error.message })
    onMessage({ kind: 'success', text: 'La cotation a été supprimée.' })
    await onChanged()
  }

  return (
    <form className="reference-editor" onSubmit={save}>
      <label><span>Cotation</span><input required value={label} onChange={(event) => setLabel(event.target.value)} /></label>
      <label><span>Ordre</span><input type="number" min="1" required value={rank} onChange={(event) => setRank(event.target.value)} /></label>
      <div className="reference-editor__difficulty"><small>Difficulté</small><strong>{grade.difficulty}</strong></div>
      <div className="row-actions">
        <ActionButton icon="save" label="Enregistrer la cotation" type="submit" />
        <ActionButton className="danger-action" icon="delete" label={`Supprimer la cotation ${grade.label}`} type="button" onClick={() => void remove()} />
      </div>
    </form>
  )
}
