import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import PrimaryNav from './PrimaryNav'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import {
  emptyOpenerFeedbackFilters,
  filterAndSortRouteFeedback,
  type OpenerFeedbackFilters,
  type OpenerFeedbackSort,
} from './lib/openerFeedback'
import type { Color, Grade, Relay, Route, RouteFeedback, Season, Zone } from './types'

type FeedbackRow = {
  voie_id: string
  moyenne_note: number | string | null
  nombre_notes: number | string
  nombre_recommandations: number | string
  nombre_enchainements: number | string
  nombre_commentaires: number | string
  commentaires: string[] | null
}

export default function OpenerFeedbackPage({
  user,
  isAdmin,
  isOpener,
  canAccessFriends,
  authLoading,
  routes,
  seasons,
  zones,
  relays,
  colors,
  grades,
  onSignOut,
}: {
  user: User | null
  isAdmin: boolean
  isOpener: boolean
  canAccessFriends: boolean
  authLoading: boolean
  routes: Route[]
  seasons: Season[]
  zones: Zone[]
  relays: Relay[]
  colors: Color[]
  grades: Grade[]
  onSignOut: () => Promise<void>
}) {
  const [feedback, setFeedback] = useState<RouteFeedback[]>([])
  const [filters, setFilters] = useState<OpenerFeedbackFilters>(emptyOpenerFeedbackFilters)
  const [sort, setSort] = useState<OpenerFeedbackSort>('relay')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(0)
  const authorized = isAdmin || isOpener

  const load = useCallback(async () => {
    const requestId = ++request.current
    if (!supabase || !user || !authorized) {
      setFeedback([])
      return
    }
    setLoading(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('retours_ouvreurs')
    if (requestId !== request.current) return
    if (rpcError) {
      setError(`Impossible de charger les retours : ${rpcError.message}`)
      setLoading(false)
      return
    }
    const byRoute = new Map(routes.map((route) => [route.id, route]))
    setFeedback(((data ?? []) as FeedbackRow[]).flatMap((row) => {
      const route = byRoute.get(row.voie_id)
      return route ? [{
        route,
        averageRating: row.moyenne_note === null ? null : Number(row.moyenne_note),
        ratingCount: Number(row.nombre_notes),
        recommendationCount: Number(row.nombre_recommandations),
        ascentCount: Number(row.nombre_enchainements),
        commentCount: Number(row.nombre_commentaires),
        comments: row.commentaires ?? [],
      }] : []
    }))
    setLoading(false)
  }, [authorized, routes, user])

  useEffect(() => { void load() }, [load])

  const availableRelays = filters.zoneId ? relays.filter((relay) => relay.zoneId === filters.zoneId) : relays
  const visibleFeedback = useMemo(
    () => filterAndSortRouteFeedback(feedback, filters, sort),
    [feedback, filters, sort],
  )
  const updateFilter = <Key extends keyof OpenerFeedbackFilters>(key: Key, value: OpenerFeedbackFilters[Key]) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'zoneId' && current.relayId && !relays.some((relay) => relay.id === current.relayId && relay.zoneId === value)
        ? { relayId: '' }
        : {}),
    }))
  }

  return (
    <div className="site-shell">
      <PrimaryNav page="ouvreurs" authenticated={Boolean(user)} isAdmin={isAdmin} isOpener={isOpener} canAccessFriends={canAccessFriends} loading={authLoading} onSignOut={onSignOut} />
      <header className="hero hero--ouvreurs">
        <div className="hero__content">
          <p className="eyebrow">Topopote · retour d’expérience</p>
          <h1 className="climber-title">Retours des voies</h1>
          <p className="intro">Repère ce qui plaît, ce qui fait grimper et ce qui peut améliorer la prochaine ouverture.</p>
        </div>
      </header>

      {!isSupabaseConfigured ? <p className="empty-state">Configure Supabase pour consulter les retours.</p>
        : authLoading ? <p className="empty-state">Vérification de la session…</p>
          : !user ? <p className="empty-state">Connecte-toi depuis ton carnet pour accéder à cette page.</p>
            : !authorized ? <p className="empty-state message--error">Cette page est réservée aux ouvreurs et aux administrateurs.</p>
              : <main className="opener-page">
                {error && <div className="message message--error" role="alert">{error}</div>}
                <section className="opener-filters" aria-labelledby="opener-filters-title">
                  <div className="section-heading">
                    <div><p className="section-kicker">Exploration</p><h2 id="opener-filters-title">Filtrer et classer</h2></div>
                    <button className="button button--light" type="button" onClick={() => setFilters(emptyOpenerFeedbackFilters)}>Tout réinitialiser</button>
                  </div>
                  <div className="opener-filters__grid">
                    <label><span>Saison</span><select value={filters.seasonId} onChange={(event) => updateFilter('seasonId', event.target.value)}><option value="">Toutes les saisons</option>{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}{season.active ? ' · active' : ''}</option>)}</select></label>
                    <label><span>Zone</span><select value={filters.zoneId} onChange={(event) => updateFilter('zoneId', event.target.value)}><option value="">Toutes les zones</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
                    <label><span>Relais</span><select value={filters.relayId} onChange={(event) => updateFilter('relayId', event.target.value)}><option value="">Tous les relais</option>{availableRelays.map((relay) => <option key={relay.id} value={relay.id}>Relais {relay.number}</option>)}</select></label>
                    <label><span>Couleur</span><select value={filters.colorId} onChange={(event) => updateFilter('colorId', event.target.value)}><option value="">Toutes les couleurs</option>{colors.map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}</select></label>
                    <label><span>Cotation</span><select value={filters.gradeId} onChange={(event) => updateFilter('gradeId', event.target.value)}><option value="">Toutes les cotations</option>{grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}</select></label>
                    <label><span>Classer par</span><select value={sort} onChange={(event) => setSort(event.target.value as OpenerFeedbackSort)}><option value="relay">Zone et relais</option><option value="grade">Cotation décroissante</option><option value="rating">Meilleure moyenne</option><option value="recommendations">Plus recommandées</option><option value="ascents">Plus enchaînées</option><option value="comments">Plus commentées</option></select></label>
                    <label className="opener-search"><span>Rechercher</span><input type="search" value={filters.query} placeholder="Zone, couleur, commentaire…" onChange={(event) => updateFilter('query', event.target.value)} /></label>
                    <label className="checkbox-label"><input type="checkbox" checked={filters.commentsOnly} onChange={(event) => updateFilter('commentsOnly', event.target.checked)} /><span>Avec commentaires seulement</span></label>
                  </div>
                  <p className="privacy-note">Cette page réservée aux ouvreurs et administrateurs prend en compte tous les enchaînements et commentaires enregistrés.</p>
                </section>

                <section aria-labelledby="opener-results-title">
                  <div className="section-heading"><div><p className="section-kicker">Toutes saisons confondues</p><h2 id="opener-results-title">Voies enregistrées</h2></div><span className="count">{visibleFeedback.length}</span></div>
                  {loading ? <p className="empty-state">Chargement des retours…</p>
                    : visibleFeedback.length === 0 ? <p className="empty-state">Aucune voie ne correspond à ces filtres.</p>
                      : <div className="opener-route-list">{visibleFeedback.map((entry) => <RouteFeedbackCard key={entry.route.id} entry={entry} />)}</div>}
                </section>
              </main>}
    </div>
  )
}

function RouteFeedbackCard({ entry }: { entry: RouteFeedback }) {
  const { route } = entry
  return (
    <article className="opener-route-card">
      <header className="opener-route-card__heading">
        <span className="opener-route-card__swatch" style={{ background: route.color.hex }} aria-hidden="true" />
        <div><p>{route.season.name} · {route.relay.zone.name}</p><h3>Relais {route.relay.number} · {route.color.name} · {route.grade.label}{route.isHalfRoute ? ' · demi-voie' : ''}</h3></div>
      </header>
      <div className="opener-metrics">
        <div><strong>{entry.averageRating === null ? '—' : `${entry.averageRating.toLocaleString('fr-FR')} / 5`}</strong><span>Moyenne · {entry.ratingCount} note{entry.ratingCount > 1 ? 's' : ''}</span></div>
        <div><strong>{entry.recommendationCount}</strong><span>Je recommande</span></div>
        <div><strong>{entry.ascentCount}</strong><span>Enchaînement{entry.ascentCount > 1 ? 's' : ''}</span></div>
        <div><strong>{entry.commentCount}</strong><span>Commentaire{entry.commentCount > 1 ? 's' : ''}</span></div>
      </div>
      {entry.comments.length > 0 && <details className="opener-comments"><summary>Lire les commentaires ({entry.commentCount})</summary><ul>{entry.comments.map((comment, index) => <li key={`${entry.route.id}-${index}`}>{comment}</li>)}</ul></details>}
    </article>
  )
}
