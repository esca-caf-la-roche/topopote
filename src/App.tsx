import { type FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createPortal } from 'react-dom'
import { completedRouteCount, emptyFilters, filterRoutes, gradeDistribution, relaysForZone } from './lib/routes'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import ClimberArea from './ClimberArea'
import FriendsArea from './FriendsArea'
import OpenerFeedbackPage from './OpenerFeedbackPage'
import PrimaryNav from './PrimaryNav'
import RouteAscentsModal from './RouteAscentsModal'
import TrainingArea from './TrainingArea'
import { resolveAuthenticatedRoles } from './lib/authRoles'
import { routeAscentBackgrounds } from './lib/routeAscents'
import { styleLabels } from './lib/scoring'
import { usePendingAction } from './lib/usePendingAction'
import type { AscentStyle, Color, Grade, Relay, Route, RouteFilters, RouteSort, Season, Zone } from './types'

type Message = { kind: 'error' | 'success'; text: string } | null
type DistributionView = 'grade' | 'zone'
type RouteSelection = { route: Route; mode: 'details' | 'add' }

const difficulties: Grade['difficulty'][] = ['Facile', 'Modéré', 'Difficile', 'Extrême']
const databasePageSize = 1000
const routeSelection = 'id, demi_voie, saison_id, relais_id, couleur_id, cotation_id, saison:saisons(id, nom, active), relais:relais(id, numero, zone_id, zone:zones(id, nom, ordre)), couleur:couleurs(id, nom, hex), cotation:cotations(id, libelle, rang, points, difficulte)'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error
    ? String(error.message)
    : 'Erreur inconnue.'
}

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
  const [isOpener, setIsOpener] = useState(false)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [page, setPage] = useState(() => window.location.hash.replace('#', ''))
  const [routeSort, setRouteSort] = useState<RouteSort>('relay')
  const [editRoutes, setEditRoutes] = useState(false)
  const [routeDraft, setRouteDraft] = useState<{ relayId?: string; gradeId?: string; colorId?: string } | null>(null)
  const [showDistributionDetails, setShowDistributionDetails] = useState(false)
  const [distributionView, setDistributionView] = useState<DistributionView>('grade')
  const [selectedRoute, setSelectedRoute] = useState<RouteSelection | null>(null)
  const [ownAscents, setOwnAscents] = useState<Record<string, AscentStyle>>({})
  const [hasClimberProfile, setHasClimberProfile] = useState(false)
  const [profileStatus, setProfileStatus] = useState<'unknown' | 'loading' | 'exists' | 'missing' | 'error'>('unknown')
  const [sharesActivity, setSharesActivity] = useState(false)
  const [hasTrainingAccess, setHasTrainingAccess] = useState(false)
  const [topoActivityLoading, setTopoActivityLoading] = useState(false)
  const authRequest = useRef(0)
  const topoActivityRequest = useRef(0)

  const loadTopo = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    try {
      const [routesResult, seasonsResult, zonesResult, relaysResult, colorsResult, gradesResult] = await Promise.all([
        supabase.from('voies').select(routeSelection).order('id').range(0, databasePageSize - 1),
        supabase.from('saisons').select('id, nom, active').order('active', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('zones').select('id, nom, ordre').order('ordre'),
        supabase.from('relais').select('id, numero, zone_id, zone:zones(id, nom, ordre)').order('numero'),
        supabase.from('couleurs').select('id, nom, hex').order('nom'),
        supabase.from('cotations').select('id, libelle, rang, points, difficulte').order('rang'),
      ])

      const error = routesResult.error || seasonsResult.error || zonesResult.error || relaysResult.error || colorsResult.error || gradesResult.error
      if (error) throw error

      const routeRows = [...(routesResult.data ?? [])]
      let fetchedCount = routesResult.data?.length ?? 0
      while (fetchedCount === databasePageSize) {
        const nextResult = await supabase.from('voies').select(routeSelection).order('id').range(routeRows.length, routeRows.length + databasePageSize - 1)
        if (nextResult.error) throw nextResult.error
        const nextRows = nextResult.data ?? []
        routeRows.push(...nextRows)
        fetchedCount = nextRows.length
      }

      const mappedRoutes = routeRows.map((row) => {
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
          relay: { id: relay.id, number: relay.numero, zoneId: relay.zone_id, zone: { id: zone.id, name: zone.nom, order: zone.ordre } },
          color: { id: color.id, name: color.nom, hex: color.hex },
          grade: { id: grade.id, label: grade.libelle, rank: grade.rang, points: grade.points, difficulty: grade.difficulte },
        }
      })

      setRoutes(mappedRoutes)
      setSeasons((seasonsResult.data ?? []).map((row) => ({ id: row.id, name: row.nom, active: row.active })))
      setZones((zonesResult.data ?? []).map((row) => ({ id: row.id, name: row.nom, order: row.ordre })))
      setRelays((relaysResult.data ?? []).map((row) => {
        const zone = relation(row.zone)
        return { id: row.id, number: row.numero, zoneId: row.zone_id, zone: { id: zone.id, name: zone.nom, order: zone.ordre } }
      }))
      setColors((colorsResult.data ?? []).map((row) => ({ id: row.id, name: row.nom, hex: row.hex })))
      setGrades((gradesResult.data ?? []).map((row) => ({ id: row.id, label: row.libelle, rank: row.rang, points: row.points, difficulty: row.difficulte })))
      setMessage((current) => current?.kind === 'error' && current.text.startsWith('Impossible de charger le topo :') ? null : current)
    } catch (error) {
      setMessage({ kind: 'error', text: `Impossible de charger le topo : ${errorMessage(error)}` })
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshRoles = useCallback(async (nextUser: User | null) => {
    const requestId = ++authRequest.current
    setAuthLoading(true)
    if (!supabase || !nextUser) {
      setUser(null)
      setIsAdmin(false)
      setIsOpener(false)
      setProfileStatus('unknown')
      setAuthLoading(false)
      return
    }

    const [adminResult, openerResult] = await Promise.all([
      supabase.from('administrateurs').select('user_id').eq('user_id', nextUser.id).maybeSingle(),
      supabase.from('ouvreurs').select('user_id').eq('user_id', nextUser.id).maybeSingle(),
    ])
    if (requestId !== authRequest.current) return

    // Authentication is established by Supabase Auth. A failed auxiliary role
    // lookup must restrict that role, never discard a valid user session.
    const roles = resolveAuthenticatedRoles(nextUser, adminResult, openerResult)
    setUser(roles.user)
    setIsAdmin(roles.isAdmin)
    setIsOpener(roles.isOpener)
    setProfileStatus('loading')
    setAuthLoading(false)

    const error = roles.error
    if (error) setMessage({ kind: 'error', text: `Session ouverte, mais un rôle n’a pas pu être vérifié : ${error.message}` })
  }, [])

  useEffect(() => {
    void loadTopo()
    if (!supabase) return

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase warns that API calls made synchronously from this callback can
      // deadlock the client. Defer role lookups and authenticated topo retries.
      window.setTimeout(() => {
        void refreshRoles(session?.user ?? null)
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') void loadTopo()
      }, 0)
    })
    return () => data.subscription.unsubscribe()
  }, [loadTopo, refreshRoles])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      setMessage({ kind: 'error', text: `Impossible de se déconnecter : ${error.message}` })
      return
    }
    window.location.hash = ''
  }, [])

  const loadTopoActivity = useCallback(async () => {
    const requestId = ++topoActivityRequest.current
    if (!supabase || !user) {
      setOwnAscents({})
      setHasClimberProfile(false)
      setSharesActivity(false)
      setHasTrainingAccess(false)
      setProfileStatus('unknown')
      setTopoActivityLoading(false)
      return
    }
    setTopoActivityLoading(true)
    setProfileStatus('loading')
    setHasTrainingAccess(false)
    const [profileResult, ascentsResult] = await Promise.all([
      supabase.from('profils').select('user_id, partage_activite, acces_entrainement').eq('user_id', user.id).maybeSingle(),
      supabase.from('enchainements').select('voie_id, style').eq('user_id', user.id),
    ])
    if (requestId !== topoActivityRequest.current) return
    const error = profileResult.error || ascentsResult.error
    if (error) {
      setTopoActivityLoading(false)
      setProfileStatus('error')
      setMessage({ kind: 'error', text: `Impossible de charger tes enchaînements : ${error.message}` })
      return
    }
    setHasClimberProfile(Boolean(profileResult.data))
    setProfileStatus(profileResult.data ? 'exists' : 'missing')
    setSharesActivity(profileResult.data?.partage_activite ?? false)
    setHasTrainingAccess(profileResult.data?.acces_entrainement ?? false)
    setOwnAscents(Object.fromEntries((ascentsResult.data ?? []).map((row) => [row.voie_id, row.style as AscentStyle])))
    setTopoActivityLoading(false)
  }, [user])

  useEffect(() => { void loadTopoActivity() }, [loadTopoActivity, page])

  useEffect(() => {
    if (user && !authLoading && profileStatus === 'missing' && page !== 'carnet') {
      window.location.hash = 'carnet'
    }
  }, [authLoading, page, profileStatus, user])

  useEffect(() => {
    const updatePage = () => setPage(window.location.hash.replace('#', ''))
    window.addEventListener('hashchange', updatePage)
    return () => window.removeEventListener('hashchange', updatePage)
  }, [])

  const activeSeasonId = seasons.find((season) => season.active)?.id ?? null
  const routeFormRelays = useMemo(() => relaysForZone(relays, filters.zoneId), [filters.zoneId, relays])
  const visibleRoutes = useMemo(
    () => filterRoutes(routes, filters, activeSeasonId, routeSort),
    [routes, filters, activeSeasonId, routeSort],
  )
  const completedRouteIds = useMemo(() => new Set(Object.keys(ownAscents)), [ownAscents])
  const visibleGradeDistribution = useMemo(
    () => gradeDistribution(visibleRoutes, grades, completedRouteIds),
    [completedRouteIds, grades, visibleRoutes],
  )
  const visibleCompletedRouteCount = useMemo(
    () => completedRouteCount(visibleRoutes, completedRouteIds),
    [completedRouteIds, visibleRoutes],
  )
  const visibleGradeDistributionByDifficulty = useMemo(
    () => difficulties.map((difficulty) => {
      const groups = visibleGradeDistribution.filter(
        (group) => group.difficulty === difficulty && group.percentage > 0,
      )
      const count = groups.reduce((total, group) => total + group.count, 0)
      return {
        difficulty,
        groups,
        count,
        completedCount: completedRouteCount(
          visibleRoutes.filter((route) => route.grade.difficulty === difficulty),
          completedRouteIds,
        ),
        percentage: visibleRoutes.length === 0 ? 0 : Math.round((count / visibleRoutes.length) * 100),
      }
    }).filter((difficulty) => difficulty.percentage > 0),
    [completedRouteIds, visibleGradeDistribution, visibleRoutes],
  )
  const visibleZoneDistribution = useMemo(
    () => zones.map((zone) => {
      const zoneRoutes = visibleRoutes.filter((route) => route.relay.zoneId === zone.id)
      return {
        zone,
        count: zoneRoutes.length,
        completedCount: completedRouteCount(zoneRoutes, completedRouteIds),
        percentage: visibleRoutes.length === 0 ? 0 : Math.round((zoneRoutes.length / visibleRoutes.length) * 100),
        difficulties: difficulties.map((difficulty) => {
          const difficultyRoutes = zoneRoutes.filter((route) => route.grade.difficulty === difficulty)
          const count = difficultyRoutes.length
          return {
            difficulty,
            count,
            completedCount: completedRouteCount(difficultyRoutes, completedRouteIds),
            percentage: zoneRoutes.length === 0 ? 0 : Math.round((count / zoneRoutes.length) * 100),
          }
        }).filter((difficulty) => difficulty.percentage > 0),
      }
    }).filter((zone) => zone.percentage > 0),
    [completedRouteIds, visibleRoutes, zones],
  )
  const routesByZone = useMemo(
    () => zones
      .filter((zone) => !filters.zoneId || zone.id === filters.zoneId)
      .map((zone) => {
        const zoneRoutes = visibleRoutes.filter((route) => route.relay.zoneId === zone.id)
        const references = routeSort === 'relay'
          ? relays.filter((relay) => relay.zoneId === zone.id && (!filters.relayId || relay.id === filters.relayId))
          : grades.filter((grade) => !filters.gradeId || grade.id === filters.gradeId)
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
    [editRoutes, filters.gradeId, filters.relayId, filters.zoneId, grades, relays, routeSort, visibleRoutes, zones],
  )
  const closeSelectedRoute = useCallback(() => setSelectedRoute(null), [])

  useEffect(() => {
    if (authLoading || !isAdmin) {
      setEditRoutes(false)
      setRouteDraft(null)
    }
  }, [authLoading, isAdmin])

  if (user && !authLoading && profileStatus === 'missing' && page !== 'carnet') {
    return (
      <ClimberArea
        page="carnet"
        user={user}
        isAdmin={isAdmin}
        isOpener={isOpener}
        authLoading={false}
        routes={routes}
        seasons={seasons}
        onProfileChanged={loadTopoActivity}
        onSignOut={signOut}
      />
    )
  }

  if (page === 'admin') {
    return (
      <AdminPage
        user={user}
        isAdmin={isAdmin}
        isOpener={isOpener}
        canAccessFriends={sharesActivity}
        canAccessTraining={hasTrainingAccess}
        authLoading={authLoading}
        seasons={seasons}
        zones={zones}
        relays={relays}
        colors={colors}
        grades={grades}
        topoLoading={loading}
        message={message}
        onChanged={loadTopo}
        onMessage={setMessage}
        onSignOut={signOut}
      />
    )
  }

  if (page === 'ouvreurs') {
    return (
      <OpenerFeedbackPage
        user={user}
        isAdmin={isAdmin}
        isOpener={isOpener}
        canAccessFriends={sharesActivity}
        canAccessTraining={hasTrainingAccess}
        authLoading={authLoading}
        routes={routes}
        seasons={seasons}
        zones={zones}
        relays={relays}
        colors={colors}
        grades={grades}
        onSignOut={signOut}
      />
    )
  }

  if (page === 'carnet' || page === 'classement') {
    return (
      <ClimberArea
        page={page}
        user={user}
        isAdmin={isAdmin}
        isOpener={isOpener}
        authLoading={authLoading}
        routes={routes}
        seasons={seasons}
        onProfileChanged={loadTopoActivity}
        onSignOut={signOut}
      />
    )
  }

  if (page === 'entrainement') {
    return <TrainingArea user={user} isAdmin={isAdmin} isOpener={isOpener} sharesActivity={sharesActivity} hasTrainingAccess={hasTrainingAccess} authLoading={authLoading} routes={routes} grades={grades} onSignOut={signOut} />
  }

  if (page === 'potes') {
    return (
      <FriendsArea
        user={user}
        isAdmin={isAdmin}
        isOpener={isOpener}
        authLoading={authLoading}
        canAccessTraining={hasTrainingAccess}
        onSignOut={signOut}
      />
    )
  }

  return (
    <div className="site-shell">
      <PrimaryNav page="" authenticated={Boolean(user)} isAdmin={isAdmin} isOpener={isOpener} canAccessFriends={sharesActivity} canAccessTraining={hasTrainingAccess} loading={authLoading} onSignOut={signOut} />
      <header className="hero">
        <div className="hero__content">
          <h1>TOPOPOTE</h1>
          <p className="eyebrow">Mur d’escalade · Saint-Pierre-en-Faucigny</p>
          <p className="intro">Trouve une voie par zone, relais, couleur ou cotation.</p>
        </div>
        <div className="hero__aside">
          <a
            className="club-link"
            href="https://www.caflarochebonneville.fr/"
            target="_blank"
            rel="noreferrer"
          >
            <img src={`${import.meta.env.BASE_URL}club-alpin-roche-bonneville.png`} alt="Logo du Club alpin français La Roche Bonneville" />
            <span>Un outil du<br />CAF La Roche Bonneville</span>
          </a>
        </div>
      </header>

      {!isSupabaseConfigured && (
        <div className="notice" role="status">
          <strong>Projet prêt à connecter.</strong> Ajoute les variables Supabase décrites dans le README.
        </div>
      )}

      {message && <div className={`message message--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'} aria-live={message.kind === 'error' ? 'assertive' : 'polite'}>{message.text}</div>}

      {selectedRoute && user && (
        <RouteAscentsModal
          route={selectedRoute.route}
          mode={selectedRoute.mode}
          ownStyle={ownAscents[selectedRoute.route.id]}
          hasProfile={hasClimberProfile}
          sharesActivity={sharesActivity}
          onClose={closeSelectedRoute}
          onAscentCreated={loadTopoActivity}
          onFeedback={setMessage}
        />
      )}

      <main>
        <section className="filters" aria-labelledby="filters-title">
          <div className="filters__heading">
            <div>
              <p className="filters__eyebrow">Affiner la liste</p>
              <h2 id="filters-title">Filtres</h2>
            </div>
            <button className="filters__reset" type="button" onClick={() => setFilters(emptyFilters)}>
              Réinitialiser
            </button>
          </div>

          <div className="filters__groups">
            <fieldset className="filter-group">
              <legend>Zone & relais</legend>
              <div className="filter-group__fields">
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
              </div>
            </fieldset>

            <fieldset className="filter-group">
              <legend>Cotation & difficulté</legend>
              <div className="filter-group__fields">
                <FilterSelect
                  label="Cotation"
                  value={filters.gradeId}
                  onChange={(gradeId) => setFilters((current) => ({ ...current, gradeId }))}
                >
                  {grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}
                </FilterSelect>
                <FilterSelect
                  label="Difficulté"
                  value={filters.difficulty}
                  onChange={(difficulty) => setFilters((current) => ({ ...current, difficulty }))}
                >
                  {difficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
                </FilterSelect>
              </div>
            </fieldset>

            <fieldset className="filter-group filter-group--color">
              <legend>Couleur</legend>
              <ColorFilter
                colors={colors}
                value={filters.colorId}
                onChange={(colorId) => setFilters((current) => ({ ...current, colorId }))}
                hideLabel
              />
            </fieldset>
          </div>

          <div className="display-options" aria-label="Préférences d’affichage">
            <p className="display-options__title">Affichage</p>
            <NeoSwitch
              checked={filters.showHalfRoutes}
              label="Afficher les ½ voies"
              onChange={(showHalfRoutes) => setFilters((current) => ({ ...current, showHalfRoutes }))}
            />
            <div className="sort-switch">
              <span className="sort-switch__label">Classer par</span>
              <div className="sort-switch__control">
                <span className={routeSort === 'relay' ? 'is-active' : ''}>Relais</span>
                <NeoSwitch
                  checked={routeSort === 'grade'}
                  label="Classer par cotation"
                  onChange={(byGrade) => setRouteSort(byGrade ? 'grade' : 'relay')}
                  compact
                  hideLabel
                />
                <span className={routeSort === 'grade' ? 'is-active' : ''}>Cotation</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grade-stats" aria-labelledby="grade-stats-title">
          <div className="grade-stats__heading">
            <div>
              <p className="grade-stats__eyebrow">Selon les filtres actifs</p>
              <h2 id="grade-stats-title">Répartition</h2>
            </div>
            <div className="grade-stats__actions">
              <p>{user && !authLoading && !topoActivityLoading ? `Mes voies : ${visibleCompletedRouteCount} / ${visibleRoutes.length}` : `${visibleRoutes.length} voie${visibleRoutes.length > 1 ? 's' : ''}`}</p>
              <button
                className={`grade-stats__view-button ${distributionView === 'grade' ? 'is-active' : ''}`}
                type="button"
                aria-pressed={distributionView === 'grade'}
                onClick={() => setDistributionView('grade')}
              >
                Répartition par difficulté
              </button>
              <button
                className={`grade-stats__view-button ${distributionView === 'zone' ? 'is-active' : ''}`}
                type="button"
                aria-pressed={distributionView === 'zone'}
                onClick={() => setDistributionView('zone')}
              >
                Répartition par zone
              </button>
              <button
                className="grade-stats__toggle"
                type="button"
                aria-expanded={showDistributionDetails}
                aria-controls="distribution-details"
                onClick={() => setShowDistributionDetails((current) => !current)}
              >
                {showDistributionDetails ? 'Masquer le détail' : 'Afficher le détail'}
              </button>
            </div>
          </div>
          {distributionView === 'grade' ? (
            <div className="grade-stats__difficulty-grid" id="distribution-details">
              {visibleGradeDistributionByDifficulty.map(({ difficulty, groups, count, completedCount, percentage }) => (
                <section className="grade-stats__difficulty" key={difficulty} aria-labelledby={`difficulty-${difficulty}`}>
                  <div className="grade-stats__difficulty-heading">
                    <h3 id={`difficulty-${difficulty}`}>{difficulty}</h3>
                    <output>{percentage}&nbsp;%</output>
                  </div>
                  <p>{user && !authLoading && !topoActivityLoading ? `${completedCount} / ${count} de mes voies` : `${count} voie${count > 1 ? 's' : ''}`}</p>
                  {showDistributionDetails && (
                    <ul className="grade-stats__list">
                      {groups.map((group) => (
                        <li key={group.label}>
                          <div className="grade-stats__label">
                            <strong>{group.label}</strong>
                            <span>{user && !authLoading && !topoActivityLoading ? `${group.completedCount} / ${group.count}` : `${group.count} voie${group.count > 1 ? 's' : ''}`}</span>
                          </div>
                          <div className="grade-stats__bar" aria-label={`${group.label} : ${group.percentage} % des voies filtrées`}>
                            <span style={{ width: `${group.percentage}%` }} />
                          </div>
                          <output>{group.percentage}&nbsp;%</output>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <div className="grade-stats__zone-grid" id="distribution-details">
              {visibleZoneDistribution.map(({ zone, count, completedCount, percentage, difficulties: zoneDifficulties }) => (
                <section className="grade-stats__zone" key={zone.id} aria-labelledby={`stats-zone-${zone.id}`}>
                  <div className="grade-stats__difficulty-heading">
                    <h3 id={`stats-zone-${zone.id}`}>{zone.name}</h3>
                    <output>{percentage}&nbsp;%</output>
                  </div>
                  <p>{user && !authLoading && !topoActivityLoading ? `${completedCount} / ${count} de mes voies` : `${count} voie${count > 1 ? 's' : ''}`}</p>
                  {showDistributionDetails && (
                    <ul className="grade-stats__list">
                      {zoneDifficulties.map((difficulty) => (
                        <li key={difficulty.difficulty}>
                          <div className="grade-stats__label">
                            <strong>{difficulty.difficulty}</strong>
                            <span>{user && !authLoading && !topoActivityLoading ? `${difficulty.completedCount} / ${difficulty.count}` : `${difficulty.count} voie${difficulty.count > 1 ? 's' : ''}`}</span>
                          </div>
                          <div className="grade-stats__bar" aria-label={`${difficulty.difficulty} : ${difficulty.percentage} % des voies de ${zone.name}`}>
                            <span style={{ width: `${difficulty.percentage}%` }} />
                          </div>
                          <output>{difficulty.percentage}&nbsp;%</output>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="routes-title">
          <div className="section-heading">
            <h2 id="routes-title">Les voies</h2>
            <div className="section-heading__actions">
              {!authLoading && isAdmin && (
                <button
                  className={`button ${editRoutes ? 'button--dark' : 'button--light'}`}
                  type="button"
                  aria-pressed={editRoutes}
                  onClick={() => {
                    setEditRoutes((current) => !current)
                    setRouteDraft(null)
                  }}
                >
                  {editRoutes ? 'Quitter l’édition' : 'Modifier les voies'}
                </button>
              )}
              {editRoutes && (
                <button className="button button--accent" type="button" onClick={() => setRouteDraft({
                  relayId: filters.relayId || undefined,
                  gradeId: filters.gradeId || undefined,
                  colorId: filters.colorId || undefined,
                })}>
                  + Ajouter une voie
                </button>
              )}
              <span className="count">{visibleRoutes.length}</span>
            </div>
          </div>
          {routeDraft && (
            <RouteModal
              key={`${routeDraft.relayId ?? ''}-${routeDraft.gradeId ?? ''}-${routeDraft.colorId ?? ''}`}
              activeSeason={seasons.find((season) => season.active) ?? null}
              relays={routeFormRelays}
              colors={colors}
              grades={grades}
              initialRelayId={routeDraft.relayId}
              initialGradeId={routeDraft.gradeId}
              initialColorId={routeDraft.colorId}
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
                              onClick={() => setRouteDraft({
                                relayId: routeSort === 'relay' ? group.id : filters.relayId || undefined,
                                gradeId: routeSort === 'grade' ? group.id : filters.gradeId || undefined,
                                colorId: filters.colorId || undefined,
                              })}
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
                              <RouteCard
                                key={route.id}
                                route={route}
                                authenticated={Boolean(user) && !authLoading && !topoActivityLoading}
                                ownStyle={ownAscents[route.id]}
                                onOpen={() => setSelectedRoute({ route, mode: 'details' })}
                                onAdd={() => setSelectedRoute({ route, mode: 'add' })}
                              />
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

function useDialogFocus(onClose: () => void) {
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hasAttribute('hidden'))
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) {
        event.preventDefault()
        dialogRef.current.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      if (returnFocus?.isConnected) returnFocus.focus()
    }
  }, [onClose])

  return dialogRef
}

function RouteModal({ onClose, ...routeFormProps }: {
  activeSeason: Season | null
  relays: Relay[]
  colors: Color[]
  grades: Grade[]
  initialRelayId?: string
  initialGradeId?: string
  initialColorId?: string
  onClose: () => void
  onChanged: () => Promise<void>
  onMessage: (message: Message) => void
}) {
  const dialogRef = useDialogFocus(onClose)

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby="route-modal-title" tabIndex={-1}>
        <button className="modal__close" type="button" aria-label="Fermer" onClick={onClose}>×</button>
        <RouteForm {...routeFormProps} onCancel={onClose} titleId="route-modal-title" />
      </section>
    </div>,
    document.body,
  )
}

function RouteCard({ route, authenticated, ownStyle, onOpen, onAdd }: {
  route: Route
  authenticated?: boolean
  ownStyle?: AscentStyle
  onOpen?: () => void
  onAdd?: () => void
}) {
  const content = <>
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
    {authenticated && ownStyle && <span className="route-card__ascent-action route-card__ascent-action--done">
      {ownStyle && <span className={`style-dot style-dot--${ownStyle}`} />}
      {styleLabels[ownStyle]}
    </span>}
  </>

  return (
    <article className="route-card" style={{ backgroundColor: ownStyle ? routeAscentBackgrounds[ownStyle] : undefined }}>
      {authenticated && onOpen ? <button className={`route-card__open ${!ownStyle && onAdd ? 'route-card__open--with-add' : ''}`} type="button" onClick={onOpen} aria-label={`Voir les enchaînements · relais ${route.relay.number}, ${route.color.name}, ${route.grade.label}`}>{content}</button>
        : <div className="route-card__content">{content}</div>}
      {authenticated && !ownStyle && onAdd && (
        <button
          className="route-card__ascent-action route-card__ascent-action--add"
          type="button"
          onClick={onAdd}
          aria-label={`Ajouter mon enchaînement · relais ${route.relay.number}, ${route.color.name}, ${route.grade.label}`}
        >
          <span aria-hidden="true">+ 📓</span>
        </button>
      )}
    </article>
  )
}

function NeoSwitch({
  checked,
  label,
  onChange,
  compact = false,
  hideLabel = false,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
  compact?: boolean
  hideLabel?: boolean
}) {
  return (
    <label className={`neo-switch ${compact ? 'neo-switch--compact' : ''}`}>
      {!hideLabel && <span className="neo-switch__label">{label}</span>}
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="neo-switch__track" aria-hidden="true">
        <span className="neo-switch__thumb" />
      </span>
    </label>
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

function ColorFilter({ colors, value, onChange, hideLabel = false }: {
  colors: Color[]
  value: string
  onChange: (value: string) => void
  hideLabel?: boolean
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
      {!hideLabel && <span>Couleur</span>}
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
  isOpener,
  canAccessFriends,
  canAccessTraining,
  authLoading,
  seasons,
  zones,
  relays,
  colors,
  grades,
  topoLoading,
  message,
  onChanged,
  onMessage,
  onSignOut,
}: {
  user: User | null
  isAdmin: boolean
  isOpener: boolean
  canAccessFriends: boolean
  canAccessTraining: boolean
  authLoading: boolean
  seasons: Season[]
  zones: Zone[]
  relays: Relay[]
  colors: Color[]
  grades: Grade[]
  topoLoading: boolean
  message: Message
  onChanged: () => Promise<void>
  onMessage: (message: Message) => void
  onSignOut: () => Promise<void>
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
    window.location.hash = ''
    onMessage({ kind: 'success', text: 'Connexion réussie.' })
  }

  function changeEmail() {
    setOtpSent(false)
    setOtp('')
    onMessage(null)
  }

  return (
    <div className="site-shell">
      <PrimaryNav page="admin" authenticated={Boolean(user)} isAdmin={isAdmin} isOpener={isOpener} canAccessFriends={canAccessFriends} canAccessTraining={canAccessTraining} loading={authLoading} onSignOut={onSignOut} />
      <header className="hero hero--admin">
        <div>
          <p className="eyebrow">Topopote · gestion du mur</p>
          <h1 id="admin-title" className="admin-title">Administration</h1>
          <p className="intro">Gère les saisons et les référentiels du topo.</p>
        </div>
      </header>

      {message && <div className={`message message--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'} aria-live={message.kind === 'error' ? 'assertive' : 'polite'}>{message.text}</div>}

      <main className="admin-page">
        <section className="admin-panel" aria-labelledby="admin-title">

        {!isSupabaseConfigured ? (
          <p className="empty-state">Configure Supabase avant d’utiliser l’administration.</p>
        ) : authLoading ? (
          <p className="empty-state">Vérification de la session…</p>
        ) : !user ? (
          <form className="stack" onSubmit={otpSent ? verifyOtp : sendOtp}>
            <p>L’accès est réservé aux administrateurs déjà enregistrés.</p>
            <label>
              <span>Adresse email</span>
              <input type="email" value={email} disabled={otpSent} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
            </label>
            {otpSent && (
              <>
                <label>
                  <span>Code à 6 chiffres</span>
                  <input value={otp} onChange={(event) => setOtp(event.target.value)} required inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" />
                </label>
                <button className="button button--light" type="button" disabled={busy} onClick={changeEmail}>Changer d’adresse email</button>
              </>
            )}
            <button className="button button--accent" disabled={busy}>
              {busy ? 'Patiente…' : otpSent ? 'Valider le code' : 'Recevoir mon code'}
            </button>
          </form>
        ) : !isAdmin ? (
          <div className="stack">
            <p>Ce compte est connecté, mais ne possède pas le rôle administrateur.</p>
            <button className="button button--light" type="button" onClick={() => void onSignOut()}>Se déconnecter</button>
          </div>
        ) : topoLoading ? (
          <p className="empty-state">Chargement des données d’administration…</p>
        ) : (
          <div className="stack stack--large">
            <div className="admin-session">
              <span>{user.email}</span>
              <button type="button" onClick={() => void onSignOut()}>Se déconnecter</button>
            </div>
            <SeasonManager seasons={seasons} onChanged={onChanged} onMessage={onMessage} />
            <PractitionerManager onMessage={onMessage} />
            <ReferenceForms zones={zones} relays={relays} colors={colors} grades={grades} onChanged={onChanged} onMessage={onMessage} />
          </div>
        )}
        </section>
      </main>
    </div>
  )
}

function PractitionerManager({ onMessage }: { onMessage: (message: Message) => void }) {
  const [profiles, setProfiles] = useState<Array<{ userId: string; nickname: string; publicRanking: boolean; ascentCount: number; isOpener: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [updatingUserId, setUpdatingUserId] = useState('')

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const [profilesResult, ascentsResult, openersResult] = await Promise.all([
      supabase.from('profils').select('user_id, pseudo, classement_public').order('pseudo'),
      supabase.from('enchainements').select('user_id').order('id').range(0, databasePageSize - 1),
      supabase.from('ouvreurs').select('user_id'),
    ])
    const error = profilesResult.error || ascentsResult.error || openersResult.error
    if (error) {
      onMessage({ kind: 'error', text: `Pratiquants indisponibles : ${error.message}` })
      setLoading(false)
      return
    }
    const ascentRows = [...(ascentsResult.data ?? [])]
    let fetchedCount = ascentsResult.data?.length ?? 0
    while (fetchedCount === databasePageSize) {
      const nextResult = await supabase.from('enchainements').select('user_id').order('id').range(ascentRows.length, ascentRows.length + databasePageSize - 1)
      if (nextResult.error) {
        onMessage({ kind: 'error', text: `Pratiquants indisponibles : ${nextResult.error.message}` })
        setLoading(false)
        return
      }
      const nextRows = nextResult.data ?? []
      ascentRows.push(...nextRows)
      fetchedCount = nextRows.length
    }
    const counts = new Map<string, number>()
    for (const ascent of ascentRows) counts.set(ascent.user_id, (counts.get(ascent.user_id) ?? 0) + 1)
    const openerIds = new Set((openersResult.data ?? []).map((opener) => opener.user_id))
    setProfiles((profilesResult.data ?? []).map((profile) => ({
      userId: profile.user_id,
      nickname: profile.pseudo,
      publicRanking: profile.classement_public,
      ascentCount: counts.get(profile.user_id) ?? 0,
      isOpener: openerIds.has(profile.user_id),
    })))
    setLoading(false)
  }, [onMessage])

  useEffect(() => { void load() }, [load])

  async function updateOpener(userId: string, enabled: boolean) {
    if (!supabase) return
    setUpdatingUserId(userId)
    const { error } = enabled
      ? await supabase.from('ouvreurs').insert({ user_id: userId })
      : await supabase.from('ouvreurs').delete().eq('user_id', userId)
    setUpdatingUserId('')
    if (error) {
      onMessage({ kind: 'error', text: `Rôle ouvreur non modifié : ${error.message}` })
      return
    }
    onMessage({ kind: 'success', text: enabled ? 'Rôle ouvreur attribué.' : 'Rôle ouvreur retiré.' })
    await load()
  }

  return (
    <section className="practitioner-manager" aria-labelledby="practitioner-manager-title">
      <div className="manager-heading">
        <div>
          <p className="section-kicker">Gestion des accès</p>
          <h3 id="practitioner-manager-title">Rôle ouvreur</h3>
        </div>
        <span className="count">{profiles.length}</span>
      </div>
      <p>Attribue ou retire le rôle d’ouvreur aux pratiquants inscrits.</p>
      {loading ? <p>Chargement des pratiquants…</p> : profiles.length === 0 ? <p className="empty-state">Aucun profil pratiquant.</p> : (
        <div className="practitioner-list">
          {profiles.map((profile) => (
            <article key={profile.userId}>
              <strong>{profile.nickname}</strong>
              <span>{profile.ascentCount} enchaînement{profile.ascentCount > 1 ? 's' : ''}</span>
              <span>{profile.publicRanking ? 'Classement public' : 'Profil privé'}</span>
              <button className={profile.isOpener ? 'danger-action' : ''} type="button" disabled={updatingUserId === profile.userId} onClick={() => void updateOpener(profile.userId, !profile.isOpener)}>
                {updatingUserId === profile.userId ? 'Mise à jour…' : profile.isOpener ? 'Retirer ouvreur' : 'Nommer ouvreur'}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function RouteForm({ activeSeason, relays, colors, grades, initialRelayId, initialGradeId, initialColorId, onCancel, onChanged, onMessage, titleId }: {
  activeSeason: Season | null
  relays: Relay[]
  colors: Color[]
  grades: Grade[]
  initialRelayId?: string
  initialGradeId?: string
  initialColorId?: string
  onCancel: () => void
  onChanged: () => Promise<void>
  onMessage: (message: Message) => void
  titleId?: string
}) {
  const [relayId, setRelayId] = useState(initialRelayId ?? '')
  const [colorId, setColorId] = useState(initialColorId ?? '')
  const [gradeId, setGradeId] = useState(initialGradeId ?? '')
  const [isHalfRoute, setIsHalfRoute] = useState(false)
  const { pending, run } = usePendingAction()

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!activeSeason) return onMessage({ kind: 'error', text: 'Active une saison avant d’ajouter une voie.' })
    await run(async () => {
      const { error } = await supabase!.from('voies').insert({ saison_id: activeSeason.id, relais_id: relayId, couleur_id: colorId, cotation_id: gradeId, demi_voie: isHalfRoute })
      if (error) return onMessage({ kind: 'error', text: error.message })
      onMessage({ kind: 'success', text: 'La voie a été ajoutée.' })
      await onChanged()
    })
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
        <ActionButton className="button button--accent" icon="save" label={pending ? 'Enregistrement de la voie' : 'Enregistrer la voie'} disabled={pending || !activeSeason} />
        <button className="button" type="button" disabled={pending} onClick={onCancel}>Annuler</button>
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
  const { pending, run } = usePendingAction()

  async function save(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      const { error } = await supabase!.from('voies').update({ relais_id: relayId, couleur_id: colorId, cotation_id: gradeId, demi_voie: isHalfRoute }).eq('id', route.id)
      if (error) return onMessage({ kind: 'error', text: error.message })
      onMessage({ kind: 'success', text: 'La voie a été modifiée.' })
      setEditing(false)
      await onChanged()
    })
  }

  async function remove() {
    if (!window.confirm(`Supprimer la voie du relais ${route.relay.number} ?`)) return
    await run(async () => {
      const { error } = await supabase!.from('voies').delete().eq('id', route.id)
      if (error) return onMessage({ kind: 'error', text: error.message })
      onMessage({ kind: 'success', text: 'La voie a été supprimée.' })
      await onChanged()
    })
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
          <ActionButton className="button button--small button--accent" icon="save" label="Enregistrer les modifications" type="submit" disabled={pending} />
          <button className="button button--small" type="button" disabled={pending} onClick={() => setEditing(false)}>Annuler</button>
        </div>
      </form>
    )
  }

  return (
    <article className={`editable-route ${compact ? 'editable-route--compact' : ''}`}>
      <RouteCard route={route} />
      <div className="admin-actions">
        <ActionButton icon="edit" label="Modifier la voie" type="button" disabled={pending} onClick={() => setEditing(true)} />
        <ActionButton className="danger-action" icon="delete" label="Supprimer la voie" type="button" disabled={pending} onClick={() => void remove()} />
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
  const { pending, run } = usePendingAction()

  async function submit(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      const { error } = await supabase!.from('saisons').insert({ nom: name, active })
      if (error) return onMessage({ kind: 'error', text: error.message })
      setName('')
      setActive(false)
      setAdding(false)
      onMessage({ kind: 'success', text: 'La saison a été ajoutée.' })
      await onChanged()
    })
  }

  async function activate(seasonId: string) {
    await run(async () => {
      const { error } = await supabase!.from('saisons').update({ active: true }).eq('id', seasonId)
      if (error) return onMessage({ kind: 'error', text: error.message })
      onMessage({ kind: 'success', text: 'La saison active a été mise à jour.' })
      await onChanged()
    })
  }

  async function remove(season: Season) {
    if (!window.confirm(`Supprimer la saison « ${season.name} » ?`)) return
    await run(async () => {
      const { error } = await supabase!.from('saisons').delete().eq('id', season.id)
      if (error) return onMessage({ kind: 'error', text: error.message })
      onMessage({ kind: 'success', text: 'La saison a été supprimée.' })
      await onChanged()
    })
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
          <button className="button button--accent" disabled={pending}>{pending ? 'Ajout…' : 'Ajouter la saison'}</button>
        </form>
      )}
      <div className="admin-list">
        {seasons.map((season) => (
          <div key={season.id}>
            <span>{season.name}{season.active ? ' · active' : ''}</span>
            <div className="row-actions">
              {!season.active && <button type="button" disabled={pending} onClick={() => void activate(season.id)}>Activer</button>}
              <ActionButton className="danger-action" icon="delete" label={`Supprimer la saison ${season.name}`} type="button" disabled={pending} onClick={() => void remove(season)} />
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
  const [gradeDifficulty, setGradeDifficulty] = useState<Grade['difficulty']>('Facile')
  const { pending, run } = usePendingAction()

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
    await run(async () => {
      const { error } = await supabase!.rpc('ajouter_zone', { p_nom: zoneName })
      if (error) return onMessage({ kind: 'error', text: error.message })
      setZoneName('')
      setAdding(null)
      onMessage({ kind: 'success', text: 'La zone a été ajoutée.' })
      await onChanged()
    })
  }

  async function addGrade(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      const { error } = await supabase!.rpc('ajouter_cotation', { p_libelle: gradeLabel, p_difficulte: gradeDifficulty })
      if (error) return onMessage({ kind: 'error', text: error.message })
      setGradeLabel('')
      setGradeDifficulty('Facile')
      setAdding(null)
      onMessage({ kind: 'success', text: 'La cotation a été ajoutée.' })
      await onChanged()
    })
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
              <button className="button button--small" disabled={pending}>{pending ? 'Ajout…' : 'Ajouter'}</button>
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
               await run(async () => {
                 if (await insert('relais', { numero: Number(relayNumber), zone_id: relayZoneId })) setRelayNumber('')
               })
            }}>
              <label><span>N° de relais</span><input type="number" min="1" required value={relayNumber} onChange={(event) => setRelayNumber(event.target.value)} /></label>
              <label><span>Zone</span><select required value={relayZoneId} onChange={(event) => setRelayZoneId(event.target.value)}><option value="">Choisir</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
              <button className="button button--small" disabled={pending}>{pending ? 'Ajout…' : 'Ajouter'}</button>
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
               await run(async () => {
                 if (await insert('couleurs', { nom: colorName, hex: colorHex })) setColorName('')
               })
            }}>
              <label><span>Couleur</span><input required value={colorName} onChange={(event) => setColorName(event.target.value)} /></label>
              <label><span>Teinte</span><input type="color" value={colorHex} onChange={(event) => setColorHex(event.target.value)} /></label>
              <button className="button button--small" disabled={pending}>{pending ? 'Ajout…' : 'Ajouter'}</button>
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
              <label><span>Difficulté</span><select value={gradeDifficulty} onChange={(event) => setGradeDifficulty(event.target.value as Grade['difficulty'])}>{difficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}</select></label>
              <button className="button button--small" disabled={pending}>{pending ? 'Ajout…' : 'Ajouter'}</button>
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
  const { pending, run } = usePendingAction()

  useEffect(() => {
    setName(zone.name)
    setOrder(String(zone.order))
  }, [zone.name, zone.order])

  async function save(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      const { error } = await supabase!.rpc('modifier_zone', { p_zone_id: zone.id, p_nom: name, p_nouvel_ordre: Number(order) })
      if (error) return onMessage({ kind: 'error', text: error.message })
      onMessage({ kind: 'success', text: 'La zone et son ordre ont été modifiés.' })
      await onChanged()
    })
  }

  async function remove() {
    if (!window.confirm(`Supprimer la zone « ${zone.name} » ?`)) return
    await run(async () => {
      const { error } = await supabase!.rpc('supprimer_zone', { p_zone_id: zone.id })
      if (error) return onMessage({ kind: 'error', text: error.message })
      onMessage({ kind: 'success', text: 'La zone a été supprimée.' })
      await onChanged()
    })
  }

  return (
    <form className="reference-editor" onSubmit={save}>
      <label><span>Nom</span><input required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label><span>Ordre</span><input type="number" min="1" required value={order} onChange={(event) => setOrder(event.target.value)} /></label>
      <div className="row-actions">
        <ActionButton icon="save" label="Enregistrer la zone" type="submit" disabled={pending} />
        <ActionButton className="danger-action" icon="delete" label={`Supprimer la zone ${zone.name}`} type="button" disabled={pending} onClick={() => void remove()} />
      </div>
    </form>
  )
}

function RelayReferenceEditor({ relay, zones, onChanged, onMessage }: ReferenceEditorProps & { relay: Relay; zones: Zone[] }) {
  const [number, setNumber] = useState(String(relay.number))
  const [zoneId, setZoneId] = useState(relay.zoneId)
  const { pending, run } = usePendingAction()

  async function save(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      const { error } = await supabase!.from('relais').update({ numero: Number(number), zone_id: zoneId }).eq('id', relay.id)
      if (error) return onMessage({ kind: 'error', text: error.message })
      onMessage({ kind: 'success', text: 'Le relais a été modifié.' })
      await onChanged()
    })
  }

  async function remove() {
    if (!window.confirm(`Supprimer le relais ${relay.number} ?`)) return
    await run(async () => {
      const { error } = await supabase!.from('relais').delete().eq('id', relay.id)
      if (error) return onMessage({ kind: 'error', text: error.message })
      onMessage({ kind: 'success', text: 'Le relais a été supprimé.' })
      await onChanged()
    })
  }

  return (
    <form className="reference-editor" onSubmit={save}>
      <label><span>N°</span><input type="number" min="1" required value={number} onChange={(event) => setNumber(event.target.value)} /></label>
      <label><span>Zone</span><select required value={zoneId} onChange={(event) => setZoneId(event.target.value)}>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
      <div className="row-actions">
        <ActionButton icon="save" label="Enregistrer le relais" type="submit" disabled={pending} />
        <ActionButton className="danger-action" icon="delete" label={`Supprimer le relais ${relay.number}`} type="button" disabled={pending} onClick={() => void remove()} />
      </div>
    </form>
  )
}

function ColorReferenceEditor({ color, onChanged, onMessage }: ReferenceEditorProps & { color: Color }) {
  const [name, setName] = useState(color.name)
  const [hex, setHex] = useState(color.hex)
  const { pending, run } = usePendingAction()

  async function save(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      const { error } = await supabase!.from('couleurs').update({ nom: name, hex }).eq('id', color.id)
      if (error) return onMessage({ kind: 'error', text: error.message })
      onMessage({ kind: 'success', text: 'La couleur a été modifiée.' })
      await onChanged()
    })
  }

  async function remove() {
    if (!window.confirm(`Supprimer la couleur « ${color.name} » ?`)) return
    await run(async () => {
      const { error } = await supabase!.from('couleurs').delete().eq('id', color.id)
      if (error) return onMessage({ kind: 'error', text: error.message })
      onMessage({ kind: 'success', text: 'La couleur a été supprimée.' })
      await onChanged()
    })
  }

  return (
    <form className="reference-editor reference-editor--color" onSubmit={save}>
      <label><span>Nom</span><input required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label><span>Teinte</span><input type="color" value={hex} onChange={(event) => setHex(event.target.value)} /></label>
      <div className="row-actions">
        <ActionButton icon="save" label="Enregistrer la couleur" type="submit" disabled={pending} />
        <ActionButton className="danger-action" icon="delete" label={`Supprimer la couleur ${color.name}`} type="button" disabled={pending} onClick={() => void remove()} />
      </div>
    </form>
  )
}

function GradeReferenceEditor({ grade, onChanged, onMessage }: ReferenceEditorProps & { grade: Grade }) {
  const [label, setLabel] = useState(grade.label)
  const [rank, setRank] = useState(String(grade.rank))
  const [difficulty, setDifficulty] = useState<Grade['difficulty']>(grade.difficulty)
  const { pending, run } = usePendingAction()

  useEffect(() => {
    setLabel(grade.label)
    setRank(String(grade.rank))
    setDifficulty(grade.difficulty)
  }, [grade.difficulty, grade.label, grade.rank])

  async function save(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      const { error } = await supabase!.rpc('modifier_cotation', { p_cotation_id: grade.id, p_libelle: label, p_nouveau_rang: Number(rank), p_difficulte: difficulty })
      if (error) return onMessage({ kind: 'error', text: error.message })
      onMessage({ kind: 'success', text: 'La cotation, sa difficulté et son ordre ont été modifiés.' })
      await onChanged()
    })
  }

  async function remove() {
    if (!window.confirm(`Supprimer la cotation « ${grade.label} » ?`)) return
    await run(async () => {
      const { error } = await supabase!.rpc('supprimer_cotation', { p_cotation_id: grade.id })
      if (error) return onMessage({ kind: 'error', text: error.message })
      onMessage({ kind: 'success', text: 'La cotation a été supprimée.' })
      await onChanged()
    })
  }

  return (
    <form className="reference-editor" onSubmit={save}>
      <label><span>Cotation</span><input required value={label} onChange={(event) => setLabel(event.target.value)} /></label>
      <label><span>Ordre</span><input type="number" min="1" required value={rank} onChange={(event) => setRank(event.target.value)} /></label>
      <label><span>Difficulté</span><select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Grade['difficulty'])}>{difficulties.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <div className="row-actions">
        <ActionButton icon="save" label="Enregistrer la cotation" type="submit" disabled={pending} />
        <ActionButton className="danger-action" icon="delete" label={`Supprimer la cotation ${grade.label}`} type="button" disabled={pending} onClick={() => void remove()} />
      </div>
    </form>
  )
}
