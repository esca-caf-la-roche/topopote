import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { emptyFilters, filterRoutes } from './lib/routes'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { Color, Grade, Relay, Route, RouteFilters } from './types'

type Message = { kind: 'error' | 'success'; text: string } | null

function relation<T>(value: T | T[] | null): T {
  if (Array.isArray(value)) return value[0]
  if (!value) throw new Error('Référence manquante pour une voie.')
  return value
}

export default function App() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [relays, setRelays] = useState<Relay[]>([])
  const [colors, setColors] = useState<Color[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [filters, setFilters] = useState<RouteFilters>(emptyFilters)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [message, setMessage] = useState<Message>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)

  const loadTopo = useCallback(async () => {
    if (!supabase) return
    setLoading(true)

    const [routesResult, relaysResult, colorsResult, gradesResult] = await Promise.all([
      supabase
        .from('voies')
        .select(
          'id, relais_id, couleur_id, cotation_id, relais:relais(id, numero), couleur:couleurs(id, nom, hex), cotation:cotations(id, libelle, rang)',
        ),
      supabase.from('relais').select('id, numero').order('numero'),
      supabase.from('couleurs').select('id, nom, hex').order('nom'),
      supabase.from('cotations').select('id, libelle, rang').order('rang'),
    ])

    const error =
      routesResult.error || relaysResult.error || colorsResult.error || gradesResult.error
    if (error) {
      setMessage({ kind: 'error', text: `Impossible de charger le topo : ${error.message}` })
      setLoading(false)
      return
    }

    const mappedRoutes = (routesResult.data ?? []).map((row) => {
      const relay = relation(row.relais)
      const color = relation(row.couleur)
      const grade = relation(row.cotation)
      return {
        id: row.id,
        relayId: row.relais_id,
        colorId: row.couleur_id,
        gradeId: row.cotation_id,
        relay: { id: relay.id, number: relay.numero },
        color: { id: color.id, name: color.nom, hex: color.hex },
        grade: { id: grade.id, label: grade.libelle, rank: grade.rang },
      }
    })

    setRoutes(mappedRoutes)
    setRelays((relaysResult.data ?? []).map((row) => ({ id: row.id, number: row.numero })))
    setColors(
      (colorsResult.data ?? []).map((row) => ({ id: row.id, name: row.nom, hex: row.hex })),
    )
    setGrades(
      (gradesResult.data ?? []).map((row) => ({ id: row.id, label: row.libelle, rank: row.rang })),
    )
    setLoading(false)
  }, [])

  const refreshAdmin = useCallback(async (nextUser: User | null) => {
    setUser(nextUser)
    if (!supabase || !nextUser) {
      setIsAdmin(false)
      return
    }

    const { data } = await supabase.rpc('est_admin')
    setIsAdmin(data === true)
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

  const visibleRoutes = useMemo(() => filterRoutes(routes, filters), [routes, filters])

  return (
    <div className="site-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Mur d’escalade · Saint-Pierre-en-Faucigny</p>
          <h1>Le topo,<br />sans prise de tête.</h1>
          <p className="intro">Trouve une voie par relais, couleur ou cotation.</p>
        </div>
        <button className="button button--dark" type="button" onClick={() => setShowAdmin(true)}>
          {isAdmin ? 'Gérer le topo' : 'Espace admin'}
        </button>
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
            label="Relais"
            value={filters.relayId}
            onChange={(relayId) => setFilters((current) => ({ ...current, relayId }))}
          >
            {relays.map((relay) => <option key={relay.id} value={relay.id}>Relais {relay.number}</option>)}
          </FilterSelect>
          <FilterSelect
            label="Couleur"
            value={filters.colorId}
            onChange={(colorId) => setFilters((current) => ({ ...current, colorId }))}
          >
            {colors.map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}
          </FilterSelect>
          <FilterSelect
            label="Cotation"
            value={filters.gradeId}
            onChange={(gradeId) => setFilters((current) => ({ ...current, gradeId }))}
          >
            {grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}
          </FilterSelect>
          <button className="button button--light" type="button" onClick={() => setFilters(emptyFilters)}>
            Tout afficher
          </button>
        </section>

        <section aria-labelledby="routes-title">
          <div className="section-heading">
            <h2 id="routes-title">Les voies</h2>
            <span className="count">{visibleRoutes.length}</span>
          </div>
          {loading ? (
            <p className="empty-state">Chargement du topo…</p>
          ) : visibleRoutes.length === 0 ? (
            <p className="empty-state">Aucune voie ne correspond à ces filtres.</p>
          ) : (
            <div className="route-grid">
              {visibleRoutes.map((route) => (
                <article className="route-card" key={route.id}>
                  <div className="route-card__color" style={{ backgroundColor: route.color.hex }} aria-hidden="true" />
                  <div>
                    <p>Relais</p>
                    <strong>{route.relay.number}</strong>
                  </div>
                  <div>
                    <p>Couleur</p>
                    <strong>{route.color.name}</strong>
                  </div>
                  <div className="grade">{route.grade.label}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {showAdmin && (
        <AdminPanel
          user={user}
          isAdmin={isAdmin}
          relays={relays}
          colors={colors}
          grades={grades}
          routes={routes}
          onClose={() => setShowAdmin(false)}
          onChanged={loadTopo}
          onMessage={setMessage}
        />
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Tous</option>
        {children}
      </select>
    </label>
  )
}

function AdminPanel({
  user,
  isAdmin,
  relays,
  colors,
  grades,
  routes,
  onClose,
  onChanged,
  onMessage,
}: {
  user: User | null
  isAdmin: boolean
  relays: Relay[]
  colors: Color[]
  grades: Grade[]
  routes: Route[]
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
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="admin-panel" role="dialog" aria-modal="true" aria-labelledby="admin-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="section-heading">
          <h2 id="admin-title">Administration</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer">×</button>
        </div>

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
            <RouteForm relays={relays} colors={colors} grades={grades} onChanged={onChanged} onMessage={onMessage} />
            <ReferenceForms onChanged={onChanged} onMessage={onMessage} />
            <div>
              <h3>Voies enregistrées</h3>
              <div className="admin-list">
                {routes.map((route) => (
                  <div key={route.id}>
                    <span>Relais {route.relay.number} · {route.color.name} · {route.grade.label}</span>
                    <button type="button" onClick={async () => {
                      const { error } = await supabase!.from('voies').delete().eq('id', route.id)
                      if (error) onMessage({ kind: 'error', text: error.message })
                      else await onChanged()
                    }}>Supprimer</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function RouteForm({ relays, colors, grades, onChanged, onMessage }: {
  relays: Relay[]
  colors: Color[]
  grades: Grade[]
  onChanged: () => Promise<void>
  onMessage: (message: Message) => void
}) {
  const [relayId, setRelayId] = useState('')
  const [colorId, setColorId] = useState('')
  const [gradeId, setGradeId] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const { error } = await supabase!.from('voies').insert({ relais_id: relayId, couleur_id: colorId, cotation_id: gradeId })
    if (error) return onMessage({ kind: 'error', text: error.message })
    onMessage({ kind: 'success', text: 'La voie a été ajoutée.' })
    await onChanged()
  }

  return (
    <form className="stack" onSubmit={submit}>
      <h3>Ajouter une voie</h3>
      <div className="form-grid">
        <label><span>Relais</span><select required value={relayId} onChange={(event) => setRelayId(event.target.value)}><option value="">Choisir</option>{relays.map((relay) => <option key={relay.id} value={relay.id}>{relay.number}</option>)}</select></label>
        <label><span>Couleur</span><select required value={colorId} onChange={(event) => setColorId(event.target.value)}><option value="">Choisir</option>{colors.map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}</select></label>
        <label><span>Cotation</span><select required value={gradeId} onChange={(event) => setGradeId(event.target.value)}><option value="">Choisir</option>{grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}</select></label>
      </div>
      <button className="button button--accent">Enregistrer la voie</button>
    </form>
  )
}

function ReferenceForms({ onChanged, onMessage }: { onChanged: () => Promise<void>; onMessage: (message: Message) => void }) {
  const [relayNumber, setRelayNumber] = useState('')
  const [colorName, setColorName] = useState('')
  const [colorHex, setColorHex] = useState('#ffde59')
  const [gradeLabel, setGradeLabel] = useState('')
  const [gradeRank, setGradeRank] = useState('')

  async function insert(table: 'relais' | 'couleurs' | 'cotations', values: Record<string, string | number>) {
    const { error } = await supabase!.from(table).insert(values)
    if (error) return onMessage({ kind: 'error', text: error.message })
    onMessage({ kind: 'success', text: 'Référentiel mis à jour.' })
    await onChanged()
  }

  return (
    <div>
      <h3>Compléter les référentiels</h3>
      <div className="reference-grid">
        <form onSubmit={(event) => { event.preventDefault(); void insert('relais', { numero: Number(relayNumber) }); setRelayNumber('') }}>
          <label><span>N° de relais</span><input type="number" min="1" required value={relayNumber} onChange={(event) => setRelayNumber(event.target.value)} /></label>
          <button className="button button--small">Ajouter</button>
        </form>
        <form onSubmit={(event) => { event.preventDefault(); void insert('couleurs', { nom: colorName, hex: colorHex }); setColorName('') }}>
          <label><span>Couleur</span><input required value={colorName} onChange={(event) => setColorName(event.target.value)} /></label>
          <label><span>Teinte</span><input type="color" value={colorHex} onChange={(event) => setColorHex(event.target.value)} /></label>
          <button className="button button--small">Ajouter</button>
        </form>
        <form onSubmit={(event) => { event.preventDefault(); void insert('cotations', { libelle: gradeLabel, rang: Number(gradeRank) }); setGradeLabel(''); setGradeRank('') }}>
          <label><span>Cotation</span><input placeholder="7a+" required value={gradeLabel} onChange={(event) => setGradeLabel(event.target.value)} /></label>
          <label><span>Ordre</span><input type="number" min="1" required value={gradeRank} onChange={(event) => setGradeRank(event.target.value)} /></label>
          <button className="button button--small">Ajouter</button>
        </form>
      </div>
    </div>
  )
}
