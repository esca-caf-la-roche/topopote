import { type FormEvent, useCallback, useMemo, useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import PrimaryNav from './PrimaryNav'
import RouteAscentsModal from './RouteAscentsModal'
import { styleLabels } from './lib/scoring'
import { allowedAscentStyles, attemptsBeforeEntry, attemptsThroughEntry, attemptsToFirstSend, externalRouteNames, sameTrainingRoute } from './lib/training'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { usePendingAction } from './lib/usePendingAction'
import type { AscentStyle, Grade, Route, RouteAscentPrefill, TrainingLocation, TrainingRouteEntry, TrainingSession } from './types'

type Feedback = { kind: 'error' | 'success'; text: string } | null

type SessionRow = {
  id: string
  user_id: string
  date_seance: string
  type_lieu: TrainingLocation
  falaise: string | null
  sensations: number | null
  plaisir: number | null
  fatigue_apres: number | null
  created_at: string
}

type SessionRatingKey = 'sensations' | 'pleasure' | 'fatigueAfter'

const sessionRatingColumns: Record<SessionRatingKey, 'sensations' | 'plaisir' | 'fatigue_apres'> = {
  sensations: 'sensations',
  pleasure: 'plaisir',
  fatigueAfter: 'fatigue_apres',
}

type EntryRow = {
  id: string
  seance_id: string
  voie_id: string | null
  nom_voie: string | null
  cotation: string | null
  commentaire: string | null
  nombre_essais: number
  enchainee: boolean
  style: AscentStyle | null
  enchainement_id: string | null
  created_at: string
}

type PendingAscent = {
  entry: TrainingRouteEntry
  route: Route
  prefill: RouteAscentPrefill
}

type TrainingRouteDraft = {
  routeId: string
  routeName: string
  grade: string
  comment: string
  attempts: number
  sent: boolean
  style: AscentStyle
}

const trainingDraftKey = (sessionId: string) => `topopote:training-route-draft:${sessionId}`

function readTrainingRouteDraft(sessionId: string): TrainingRouteDraft | null {
  try {
    const value = window.sessionStorage.getItem(trainingDraftKey(sessionId))
    if (!value) return null
    const draft = JSON.parse(value) as Partial<TrainingRouteDraft>
    if (typeof draft.routeId !== 'string' || typeof draft.routeName !== 'string' || typeof draft.grade !== 'string' || (draft.comment !== undefined && typeof draft.comment !== 'string') || typeof draft.attempts !== 'number' || typeof draft.sent !== 'boolean' || !['a_vue', 'flash', 'apres_travail', 'moulinette'].includes(draft.style ?? '')) return null
    return { ...draft, comment: draft.comment ?? '' } as TrainingRouteDraft
  } catch {
    return null
  }
}

function draftHasContent(draft: TrainingRouteDraft) {
  return Boolean(draft.routeId || draft.routeName || draft.grade || draft.comment || draft.attempts !== 1 || draft.sent || draft.style !== 'a_vue')
}

function saveTrainingRouteDraft(sessionId: string, draft: TrainingRouteDraft) {
  if (draftHasContent(draft)) window.sessionStorage.setItem(trainingDraftKey(sessionId), JSON.stringify(draft))
  else window.sessionStorage.removeItem(trainingDraftKey(sessionId))
}

function clearTrainingRouteDraft(sessionId: string) {
  window.sessionStorage.removeItem(trainingDraftKey(sessionId))
}

async function syncLinkedAscents(entries: TrainingRouteEntry[]) {
  const linkedEntries = entries.filter((entry) => entry.routeId && entry.sent && entry.style && entry.ascentId)
  const results = await Promise.all(linkedEntries.map((entry) => supabase!.from('enchainements').update({
    date_enchainement: entry.sessionDate,
    style: entry.style,
    essais: attemptsThroughEntry(entries, entry),
  }).eq('id', entry.ascentId!)))
  return results.find((result) => result.error)?.error?.message ?? null
}

function localDate() {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR').format(new Date(`${value}T12:00:00`))
}

export default function TrainingArea({ user, isAdmin, isOpener, sharesActivity, hasTrainingAccess, authLoading, routes, grades, onSignOut }: {
  user: User | null
  isAdmin: boolean
  isOpener: boolean
  sharesActivity: boolean
  hasTrainingAccess: boolean
  authLoading: boolean
  routes: Route[]
  grades: Grade[]
  onSignOut: () => Promise<void>
}) {
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [entries, setEntries] = useState<TrainingRouteEntry[]>([])
  const [ascentIdsByRoute, setAscentIdsByRoute] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pendingAscent, setPendingAscent] = useState<PendingAscent | null>(null)

  const loadTraining = useCallback(async () => {
    if (!supabase || !user || !hasTrainingAccess) {
      setSessions([])
      setEntries([])
      setAscentIdsByRoute({})
      setLoading(false)
      return
    }
    setLoading(true)
    const [sessionsResult, entriesResult, ascentsResult] = await Promise.all([
      supabase.from('seances_entrainement').select('id, user_id, date_seance, type_lieu, falaise, sensations, plaisir, fatigue_apres, created_at').order('date_seance', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('voies_seance').select('id, seance_id, voie_id, nom_voie, cotation, commentaire, nombre_essais, enchainee, style, enchainement_id, created_at').order('created_at'),
      supabase.from('enchainements').select('id, voie_id').eq('user_id', user.id),
    ])
    const error = sessionsResult.error || entriesResult.error || ascentsResult.error
    if (error) {
      setFeedback({ kind: 'error', text: `Impossible de charger les séances : ${error.message}` })
      setLoading(false)
      return
    }
    const nextSessions = ((sessionsResult.data ?? []) as SessionRow[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      date: row.date_seance,
      location: row.type_lieu,
      crag: row.falaise,
      sensations: row.sensations ?? null,
      pleasure: row.plaisir ?? null,
      fatigueAfter: row.fatigue_apres ?? null,
      createdAt: row.created_at,
    }))
    const sessionsById = Object.fromEntries(nextSessions.map((session) => [session.id, session]))
    setSessions(nextSessions)
    setEntries(((entriesResult.data ?? []) as EntryRow[]).map((row) => ({
      id: row.id,
      sessionId: row.seance_id,
      routeId: row.voie_id,
      routeName: row.nom_voie,
      grade: row.cotation,
      comment: row.commentaire,
      attempts: row.nombre_essais,
      sent: row.enchainee,
      style: row.style,
      ascentId: row.enchainement_id,
      createdAt: row.created_at,
      sessionDate: sessionsById[row.seance_id].date,
      sessionLocation: sessionsById[row.seance_id].location,
      sessionCrag: sessionsById[row.seance_id].crag,
    })))
    setAscentIdsByRoute(Object.fromEntries((ascentsResult.data ?? []).map((row) => [row.voie_id, row.id])))
    setLoading(false)
  }, [hasTrainingAccess, user])

  useEffect(() => { void loadTraining() }, [loadTraining])

  async function updateSessionRating(sessionId: string, key: SessionRatingKey, value: number | null) {
    const { error } = await supabase!.from('seances_entrainement').update({ [sessionRatingColumns[key]]: value }).eq('id', sessionId)
    if (error) {
      setFeedback({ kind: 'error', text: `Impossible d’enregistrer la note : ${error.message}` })
      return
    }
    setSessions((current) => current.map((session) => session.id === sessionId ? { ...session, [key]: value } : session))
  }

  function openAscent(entry: TrainingRouteEntry, requestedStyle = entry.style) {
    if (!entry.routeId || !requestedStyle || ascentIdsByRoute[entry.routeId]) return
    const route = routes.find((candidate) => candidate.id === entry.routeId)
    if (!route) {
      setFeedback({ kind: 'error', text: 'Cette voie du mur est introuvable dans le topo.' })
      return
    }
    const attempts = attemptsThroughEntry(entries.some((candidate) => candidate.id === entry.id) ? entries : [...entries, entry], entry)
    const allowedStyles = allowedAscentStyles(attempts)
    const style = allowedStyles.includes(requestedStyle) ? requestedStyle : allowedStyles[0]
    setPendingAscent({ entry, route, prefill: { climbedAt: entry.sessionDate, style, attempts } })
  }

  return <div className="site-shell">
    <PrimaryNav page="entrainement" authenticated={Boolean(user)} isAdmin={isAdmin} isOpener={isOpener} canAccessFriends={sharesActivity} canAccessTraining={hasTrainingAccess} loading={authLoading} onSignOut={onSignOut} />
    <header className="hero hero--entrainement"><div className="hero__content"><p className="eyebrow">Section privée</p><h1 className="climber-title">Entraînement</h1><p className="intro">Tes séances, tes voies et le nombre d’essais jusqu’au premier enchaînement.</p></div></header>
    {feedback && <div className={`message message--${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.text}</div>}
    {pendingAscent && user && <RouteAscentsModal
      route={pendingAscent.route}
      mode="add"
      prefill={pendingAscent.prefill}
      hasProfile
      sharesActivity={sharesActivity}
      onClose={() => setPendingAscent(null)}
      onAscentCreated={async (ascentId) => {
        const { error } = await supabase!.from('voies_seance').update({ enchainement_id: ascentId }).eq('id', pendingAscent.entry.id)
        setPendingAscent(null)
        if (error) setFeedback({ kind: 'error', text: `Enchaînement enregistré, mais sa liaison à la séance a échoué : ${error.message}` })
        await loadTraining()
      }}
      onFeedback={setFeedback}
    />}
    {authLoading ? <p className="empty-state">Vérification de la session…</p>
      : !isSupabaseConfigured ? <p className="empty-state">Configure Supabase pour utiliser les séances.</p>
        : !user ? <main className="training-page"><p className="empty-state">Connecte-toi depuis le carnet pour accéder à cette page.</p></main>
          : !hasTrainingAccess ? <main className="training-page"><section className="training-access-denied"><p className="section-kicker">Accès privé</p><h2>Section non activée</h2><p>Le booléen d’accès doit être activé manuellement dans Supabase pour ton profil.</p></section></main>
            : <main className="training-page">
              <SessionForm sessions={sessions} onCreated={loadTraining} onFeedback={setFeedback} />
              <section className="training-log"><div className="section-heading"><div><p className="section-kicker">Historique</p><h2>Mes séances</h2></div><span className="count">{sessions.length}</span></div>
                {loading ? <p className="empty-state">Chargement des séances…</p>
                  : sessions.length === 0 ? <p className="empty-state">Aucune séance enregistrée.</p>
                    : <div className="training-session-list">{sessions.map((session) => <SessionCard
                      key={session.id}
                      session={session}
                      entries={entries.filter((entry) => entry.sessionId === session.id)}
                      allEntries={entries}
                      routes={routes}
                      grades={grades}
                      ascentIdsByRoute={ascentIdsByRoute}
                      onRatingChanged={updateSessionRating}
                      onOpenAscent={openAscent}
                      onChanged={loadTraining}
                      onFeedback={setFeedback}
                    />)}</div>}
              </section>
            </main>}
  </div>
}

function SessionForm({ sessions, onCreated, onFeedback }: { sessions: TrainingSession[]; onCreated: () => Promise<void>; onFeedback: (feedback: Feedback) => void }) {
  const [date, setDate] = useState(localDate)
  const [location, setLocation] = useState<TrainingLocation>('mur')
  const [crag, setCrag] = useState('')
  const crags = useMemo(() => [...new Set(sessions.filter((session) => session.location === 'exterieur').map((session) => session.crag?.trim()).filter((value): value is string => Boolean(value)))].sort((left, right) => left.localeCompare(right, 'fr', { sensitivity: 'base' })), [sessions])
  const { pending, run } = usePendingAction()
  async function submit(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      const { error } = await supabase!.from('seances_entrainement').insert({ date_seance: date, type_lieu: location, falaise: location === 'exterieur' ? crag.trim() : null })
      if (error) return onFeedback({ kind: 'error', text: error.message })
      setCrag('')
      onFeedback({ kind: 'success', text: 'Séance créée. Ajoute maintenant les voies travaillées.' })
      await onCreated()
    })
  }
  return <section className="training-session-form"><p className="section-kicker">Nouvelle séance</p><h2>Où as-tu grimpé ?</h2><form className="form-grid" onSubmit={submit}><label><span>Date</span><input type="date" required max={localDate()} value={date} onChange={(event) => setDate(event.target.value)} /></label><label><span>Lieu</span><select value={location} onChange={(event) => setLocation(event.target.value as TrainingLocation)}><option value="mur">🧗 Mur de Saint-Pierre</option><option value="exterieur">🏔️ Extérieur</option></select></label>{location === 'exterieur' && <label><span>Falaise</span><input required maxLength={120} list="training-crags" placeholder="Choisir ou saisir une falaise" value={crag} onChange={(event) => setCrag(event.target.value)} /><datalist id="training-crags">{crags.map((name) => <option value={name} key={name} />)}</datalist></label>}<button className="button button--accent" disabled={pending}>{pending ? 'Création…' : '➕ Créer la séance'}</button></form></section>
}

function SessionCard({ session, entries, allEntries, routes, grades, ascentIdsByRoute, onRatingChanged, onOpenAscent, onChanged, onFeedback }: {
  session: TrainingSession
  entries: TrainingRouteEntry[]
  allEntries: TrainingRouteEntry[]
  routes: Route[]
  grades: Grade[]
  ascentIdsByRoute: Record<string, string>
  onRatingChanged: (sessionId: string, key: SessionRatingKey, value: number | null) => Promise<void>
  onOpenAscent: (entry: TrainingRouteEntry, style?: AscentStyle | null) => void
  onChanged: () => Promise<void>
  onFeedback: (feedback: Feedback) => void
}) {
  const [adding, setAdding] = useState(() => Boolean(readTrainingRouteDraft(session.id)))
  const { pending, run } = usePendingAction()
  async function remove() {
    if (!window.confirm(`Supprimer la séance du ${formatDate(session.date)} et toutes ses voies ?`)) return
    await run(async () => {
      const { error } = await supabase!.from('seances_entrainement').delete().eq('id', session.id)
      if (error) return onFeedback({ kind: 'error', text: error.message })
      onFeedback({ kind: 'success', text: 'Séance supprimée.' })
      await onChanged()
    })
  }
  return <article className="training-session-card"><header><div><p className="section-kicker">{session.location === 'mur' ? '🧗 Mur' : '🏔️ Extérieur'}</p><h3>{formatDate(session.date)}</h3><p>{session.location === 'mur' ? 'Mur de Saint-Pierre-en-Faucigny' : session.crag}</p></div><div className="admin-actions"><button className="training-icon-action training-icon-action--accent" type="button" aria-label={adding ? 'Fermer le formulaire de voie' : 'Ajouter une voie'} title={adding ? 'Fermer' : 'Ajouter une voie'} onClick={() => setAdding((current) => !current)}>{adding ? '❌' : '➕'}</button><button className="training-icon-action training-icon-action--danger" type="button" aria-label="Supprimer la séance" title="Supprimer la séance" disabled={pending} onClick={() => void remove()}>{pending ? '…' : '🗑️'}</button></div></header>
    <SessionRatings session={session} onChange={onRatingChanged} />
    {adding && <TrainingRouteForm session={session} entries={allEntries} routes={routes} grades={grades} existingSessionEntries={entries} ascentIdsByRoute={ascentIdsByRoute} onCreated={async (entry) => { setAdding(false); await onChanged(); if (entry.sent && entry.routeId && !ascentIdsByRoute[entry.routeId]) onOpenAscent(entry, entry.style) }} onFeedback={onFeedback} />}
    {entries.length === 0 ? <p className="empty-state">Aucune voie dans cette séance.</p> : <div className="training-route-list">{entries.map((entry) => <TrainingRouteRow key={entry.id} entry={entry} sessionEntries={entries} allEntries={allEntries} routes={routes} grades={grades} ascentExists={Boolean(entry.routeId && ascentIdsByRoute[entry.routeId])} onOpenAscent={onOpenAscent} onChanged={onChanged} onFeedback={onFeedback} />)}</div>}
  </article>
}

function SessionRatings({ session, onChange }: { session: TrainingSession; onChange: (sessionId: string, key: SessionRatingKey, value: number | null) => Promise<void> }) {
  const [saving, setSaving] = useState<SessionRatingKey | null>(null)
  async function change(key: SessionRatingKey, value: number | null) {
    setSaving(key)
    await onChange(session.id, key, value)
    setSaving(null)
  }
  return <section className="session-ratings" aria-label="Indicateurs de la séance">
    <StarRating label="Sensations" hint="Mauvaises → Excellentes" value={session.sensations} disabled={saving !== null} onChange={(value) => void change('sensations', value)} />
    <StarRating label="Plaisir" hint="Faible → Excellent" value={session.pleasure} disabled={saving !== null} onChange={(value) => void change('pleasure', value)} />
    <StarRating label="Fatigue" hint="Encore frais → Épuisé" value={session.fatigueAfter} disabled={saving !== null} onChange={(value) => void change('fatigueAfter', value)} />
  </section>
}

function StarRating({ label, hint, value, disabled, onChange }: { label: string; hint: string; value: number | null; disabled: boolean; onChange: (value: number | null) => void }) {
  return <div className="star-rating"><div><strong>{label}</strong><small>{hint}</small></div><div className="star-rating__controls" role="group" aria-label={label}>{[1, 2, 3, 4, 5].map((star) => <button className={value !== null && star <= value ? 'is-active' : ''} type="button" aria-label={`${label} : ${star} étoile${star > 1 ? 's' : ''} sur 5`} aria-pressed={value === star} disabled={disabled} onClick={() => onChange(star)} key={star}>★</button>)}{value !== null && <button className="star-rating__clear" type="button" aria-label={`Effacer la note ${label.toLocaleLowerCase('fr-FR')}`} disabled={disabled} onClick={() => onChange(null)}>×</button>}</div></div>
}

function TrainingRouteForm({ session, entries, routes, grades, existingSessionEntries, ascentIdsByRoute, onCreated, onFeedback }: {
  session: TrainingSession
  entries: TrainingRouteEntry[]
  routes: Route[]
  grades: Grade[]
  existingSessionEntries: TrainingRouteEntry[]
  ascentIdsByRoute: Record<string, string>
  onCreated: (entry: TrainingRouteEntry) => Promise<void>
  onFeedback: (feedback: Feedback) => void
}) {
  const availableRoutes = useMemo(() => routes.filter((route) => !existingSessionEntries.some((entry) => entry.routeId === route.id)).sort((left, right) => left.relay.number - right.relay.number || left.grade.rank - right.grade.rank), [existingSessionEntries, routes])
  const [initialDraft] = useState(() => readTrainingRouteDraft(session.id))
  const [routeId, setRouteId] = useState(() => initialDraft?.routeId ?? '')
  const [routeName, setRouteName] = useState(() => initialDraft?.routeName ?? '')
  const [grade, setGrade] = useState(() => initialDraft?.grade ?? '')
  const [comment, setComment] = useState(() => initialDraft?.comment ?? '')
  const [attempts, setAttempts] = useState(() => initialDraft?.attempts ?? 1)
  const [sent, setSent] = useState(() => initialDraft?.sent ?? false)
  const [style, setStyle] = useState<AscentStyle>(() => initialDraft?.style ?? 'a_vue')
  const { pending, run } = usePendingAction()
  useEffect(() => {
    saveTrainingRouteDraft(session.id, { routeId, routeName, grade, comment, attempts, sent, style })
  }, [attempts, comment, grade, routeId, routeName, sent, session.id, style])
  const syntheticEntry: TrainingRouteEntry = { id: '', sessionId: session.id, routeId: routeId || null, routeName: routeName || null, grade: grade || null, comment: comment || null, attempts, sent, style: sent ? style : null, ascentId: null, createdAt: `${session.createdAt}~`, sessionDate: session.date, sessionLocation: session.location, sessionCrag: session.crag }
  const cumulativeAttempts = attemptsBeforeEntry(entries, syntheticEntry) + attempts
  const allowedStyles = allowedAscentStyles(cumulativeAttempts)
  const selectedStyle = allowedStyles.includes(style) ? style : allowedStyles[0]
  const alreadySent = Boolean(routeId && ascentIdsByRoute[routeId])
  const pendingFirstSend = routeId ? entries.find((entry) => entry.routeId === routeId && entry.sent && !entry.ascentId && !alreadySent) : undefined
  const routeSuggestions = useMemo(() => externalRouteNames(entries, session.crag), [entries, session.crag])

  async function submit(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      if (sent && pendingFirstSend) {
        onFeedback({ kind: 'error', text: `Le premier enchaînement de cette voie attend déjà d’être finalisé dans la séance du ${formatDate(pendingFirstSend.sessionDate)}.` })
        return
      }
      const { data, error } = await supabase!.from('voies_seance').insert({
        seance_id: session.id,
        voie_id: session.location === 'mur' ? routeId : null,
        nom_voie: session.location === 'exterieur' ? routeName.trim() : null,
        cotation: session.location === 'exterieur' ? grade.trim() : null,
        commentaire: session.location === 'exterieur' ? comment.trim() || null : null,
        nombre_essais: attempts,
        enchainee: sent,
        style: sent ? selectedStyle : null,
      }).select('id, seance_id, voie_id, nom_voie, cotation, commentaire, nombre_essais, enchainee, style, enchainement_id, created_at').single()
      if (error) return onFeedback({ kind: 'error', text: error.code === '23505' ? 'Cette voie est déjà enregistrée dans la séance.' : error.message })
      const row = data as EntryRow
      const created: TrainingRouteEntry = { id: row.id, sessionId: row.seance_id, routeId: row.voie_id, routeName: row.nom_voie, grade: row.cotation, comment: row.commentaire, attempts: row.nombre_essais, sent: row.enchainee, style: row.style, ascentId: row.enchainement_id, createdAt: row.created_at, sessionDate: session.date, sessionLocation: session.location, sessionCrag: session.crag }
      clearTrainingRouteDraft(session.id)
      const syncError = await syncLinkedAscents([...entries, created])
      onFeedback(syncError
        ? { kind: 'error', text: `Voie ajoutée, mais le total du carnet n’a pas pu être synchronisé : ${syncError}` }
        : { kind: 'success', text: sent && session.location === 'mur' && !alreadySent ? 'Voie ajoutée. Complète maintenant les informations de l’enchaînement.' : 'Voie ajoutée à la séance.' })
      await onCreated(created)
    })
  }
  return <form className="training-route-form stack" onSubmit={submit}><div className="form-grid">{session.location === 'mur' ? <label><span>Voie du mur</span><select required value={routeId} onChange={(event) => setRouteId(event.target.value)}><option value="">Choisir une voie</option>{availableRoutes.map((route) => <option value={route.id} key={route.id}>Relais {route.relay.number} · {route.color.name} · {route.grade.label}{route.isHalfRoute ? ' · 1/2' : ''}</option>)}</select></label> : <><label><span>Nom de la voie</span><input required maxLength={120} list={`training-routes-${session.id}`} placeholder="Choisir ou saisir une voie" value={routeName} onChange={(event) => setRouteName(event.target.value)} /><datalist id={`training-routes-${session.id}`}>{routeSuggestions.map((name) => <option value={name} key={name} />)}</datalist></label><label><span>Cotation</span><select required value={grade} onChange={(event) => setGrade(event.target.value)}><option value="">Choisir une cotation</option>{grades.map((item) => <option value={item.label} key={item.id}>{item.label}</option>)}</select></label><label className="form-grid__wide"><span>Commentaire</span><textarea maxLength={2000} rows={3} value={comment} onChange={(event) => setComment(event.target.value)} /></label></>}<label><span>Essais dans cette séance</span><input type="number" min={1} max={999} required value={attempts} onChange={(event) => setAttempts(Number(event.target.value))} /></label></div><label className="checkbox-label"><input type="checkbox" checked={sent} disabled={Boolean(pendingFirstSend)} onChange={(event) => setSent(event.target.checked)} /><span>Voie enchaînée pendant cette séance</span></label>{pendingFirstSend && <p className="privacy-note">Le premier enchaînement attend d’être finalisé dans la séance du {formatDate(pendingFirstSend.sessionDate)}.</p>}{sent && <fieldset className="choice-fieldset"><legend>Type d’enchaînement</legend><div className="style-choices">{allowedStyles.map((value) => <label className={selectedStyle === value ? 'is-selected' : ''} key={value}><input type="radio" name={`training-style-${session.id}`} checked={selectedStyle === value} onChange={() => setStyle(value)} /><span className={`style-dot style-dot--${value}`} /><strong>{styleLabels[value]}</strong></label>)}</div>{cumulativeAttempts > 1 && <p className="privacy-note">{cumulativeAttempts} essais cumulés jusqu’à l’enchaînement : à vue et flash ne sont plus possibles.</p>}</fieldset>}<button className="button button--accent" disabled={pending || (session.location === 'mur' && !routeId)}>{pending ? 'Ajout…' : '➕ Ajouter la voie'}</button></form>
}

function TrainingRouteRow({ entry, sessionEntries, allEntries, routes, grades, ascentExists, onOpenAscent, onChanged, onFeedback }: {
  entry: TrainingRouteEntry
  sessionEntries: TrainingRouteEntry[]
  allEntries: TrainingRouteEntry[]
  routes: Route[]
  grades: Grade[]
  ascentExists: boolean
  onOpenAscent: (entry: TrainingRouteEntry) => void
  onChanged: () => Promise<void>
  onFeedback: (feedback: Feedback) => void
}) {
  const route = entry.routeId ? routes.find((candidate) => candidate.id === entry.routeId) : null
  const [editing, setEditing] = useState(false)
  const totalAttempts = entry.sent ? attemptsToFirstSend(allEntries, entry) : null
  const { pending, run } = usePendingAction()
  async function remove() {
    if (!window.confirm('Retirer cette voie de la séance ?')) return
    await run(async () => {
      const { error } = await supabase!.from('voies_seance').delete().eq('id', entry.id)
      if (error) return onFeedback({ kind: 'error', text: error.message })
      const syncError = await syncLinkedAscents(allEntries.filter((candidate) => candidate.id !== entry.id))
      onFeedback(syncError
        ? { kind: 'error', text: `Voie retirée, mais le total du carnet n’a pas pu être synchronisé : ${syncError}` }
        : { kind: 'success', text: 'Voie retirée de la séance.' })
      await onChanged()
    })
  }
  if (editing) return <TrainingRouteEditForm entry={entry} sessionEntries={sessionEntries} allEntries={allEntries} routes={routes} grades={grades} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onChanged() }} onFeedback={onFeedback} />
  return <article className="training-route-row"><div><strong>{route ? `Relais ${route.relay.number} · ${route.color.name}` : entry.routeName}</strong><small>{route ? `${route.relay.zone.name} · ${route.grade.label}` : entry.grade}</small>{entry.comment && <p>{entry.comment}</p>}</div><div className="training-route-attempts"><span><strong>{entry.attempts}</strong><small>dans la séance</small></span>{totalAttempts !== null && <span><strong>{totalAttempts}</strong><small>au 1er enchaînement</small></span>}</div><div className="training-route-status">{entry.sent ? <><span className={`style-dot style-dot--${entry.style}`} /><strong>{entry.style ? styleLabels[entry.style] : 'Enchaînée'}</strong>{entry.ascentId ? <small>Premier enchaînement enregistré</small> : ascentExists ? <small>Déjà dans le carnet</small> : entry.routeId ? <button className="training-icon-action training-icon-action--accent" type="button" aria-label="Finaliser l’enchaînement" title="Finaliser l’enchaînement" onClick={() => onOpenAscent(entry)}>🏁</button> : <small>Enchaînement extérieur</small>}</> : <span>Travaillée</span>}</div><div className="training-route-actions"><button className="training-icon-action" type="button" aria-label="Modifier la voie" title="Modifier la voie" onClick={() => setEditing(true)}>✏️</button><button className="training-icon-action training-icon-action--danger" type="button" aria-label="Retirer la voie" title="Retirer la voie" disabled={pending} onClick={() => void remove()}>{pending ? '…' : '🗑️'}</button></div></article>
}

function TrainingRouteEditForm({ entry, sessionEntries, allEntries, routes, grades, onCancel, onSaved, onFeedback }: {
  entry: TrainingRouteEntry
  sessionEntries: TrainingRouteEntry[]
  allEntries: TrainingRouteEntry[]
  routes: Route[]
  grades: Grade[]
  onCancel: () => void
  onSaved: () => Promise<void>
  onFeedback: (feedback: Feedback) => void
}) {
  const [routeId, setRouteId] = useState(entry.routeId ?? '')
  const [routeName, setRouteName] = useState(entry.routeName ?? '')
  const [grade, setGrade] = useState(entry.grade ?? '')
  const [comment, setComment] = useState(entry.comment ?? '')
  const [attempts, setAttempts] = useState(entry.attempts)
  const [sent, setSent] = useState(entry.sent)
  const [style, setStyle] = useState<AscentStyle>(entry.style ?? 'a_vue')
  const { pending, run } = usePendingAction()
  const availableRoutes = useMemo(() => routes.filter((route) => route.id === entry.routeId || !sessionEntries.some((candidate) => candidate.id !== entry.id && candidate.routeId === route.id)).sort((left, right) => left.relay.number - right.relay.number || left.grade.rank - right.grade.rank), [entry.id, entry.routeId, routes, sessionEntries])
  const routeSuggestions = useMemo(() => externalRouteNames(allEntries, entry.sessionCrag), [allEntries, entry.sessionCrag])
  const updatedEntry: TrainingRouteEntry = { ...entry, routeId: routeId || null, routeName: routeName || null, grade: grade || null, comment: comment || null, attempts, sent, style: sent ? style : null }
  const cumulativeAttempts = attemptsBeforeEntry(allEntries, updatedEntry) + attempts
  const allowedStyles = allowedAscentStyles(cumulativeAttempts)
  const selectedStyle = allowedStyles.includes(style) ? style : allowedStyles[0]
  const pendingFirstSend = entry.sessionLocation === 'mur' ? allEntries.find((candidate) => candidate.id !== entry.id && candidate.sent && !candidate.ascentId && sameTrainingRoute(candidate, updatedEntry)) : undefined

  async function submit(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      if (sent && pendingFirstSend) {
        onFeedback({ kind: 'error', text: `Le premier enchaînement de cette voie attend déjà d’être finalisé dans la séance du ${formatDate(pendingFirstSend.sessionDate)}.` })
        return
      }
      const { data, error } = await supabase!.from('voies_seance').update({
        voie_id: entry.sessionLocation === 'mur' ? routeId : null,
        nom_voie: entry.sessionLocation === 'exterieur' ? routeName.trim() : null,
        cotation: entry.sessionLocation === 'exterieur' ? grade.trim() : null,
        commentaire: entry.sessionLocation === 'exterieur' ? comment.trim() || null : null,
        nombre_essais: attempts,
        enchainee: sent,
        style: sent ? selectedStyle : null,
      }).eq('id', entry.id).select('id, seance_id, voie_id, nom_voie, cotation, commentaire, nombre_essais, enchainee, style, enchainement_id, created_at').single()
      if (error) return onFeedback({ kind: 'error', text: error.code === '23505' ? 'Cette voie est déjà enregistrée dans la séance.' : error.message })
      const row = data as EntryRow
      const saved: TrainingRouteEntry = { ...entry, routeId: row.voie_id, routeName: row.nom_voie, grade: row.cotation, comment: row.commentaire, attempts: row.nombre_essais, sent: row.enchainee, style: row.style, ascentId: row.enchainement_id, createdAt: row.created_at }
      const nextEntries = allEntries.map((candidate) => candidate.id === entry.id ? saved : candidate)
      const syncError = await syncLinkedAscents(nextEntries)
      onFeedback(syncError
        ? { kind: 'error', text: `Voie modifiée, mais le total du carnet n’a pas pu être synchronisé : ${syncError}` }
        : { kind: 'success', text: 'Voie modifiée.' })
      await onSaved()
    })
  }

  return <form className="training-route-form training-route-form--edit stack" onSubmit={submit}><div className="form-grid">{entry.sessionLocation === 'mur' ? <label><span>Voie du mur</span><select required disabled={Boolean(entry.ascentId)} value={routeId} onChange={(event) => setRouteId(event.target.value)}>{availableRoutes.map((route) => <option value={route.id} key={route.id}>Relais {route.relay.number} · {route.color.name} · {route.grade.label}{route.isHalfRoute ? ' · 1/2' : ''}</option>)}</select></label> : <><label><span>Nom de la voie</span><input required maxLength={120} list={`training-edit-routes-${entry.id}`} value={routeName} onChange={(event) => setRouteName(event.target.value)} /><datalist id={`training-edit-routes-${entry.id}`}>{routeSuggestions.map((name) => <option value={name} key={name} />)}</datalist></label><label><span>Cotation</span><select required value={grade} onChange={(event) => setGrade(event.target.value)}>{grades.map((item) => <option value={item.label} key={item.id}>{item.label}</option>)}</select></label><label className="form-grid__wide"><span>Commentaire</span><textarea maxLength={2000} rows={3} value={comment} onChange={(event) => setComment(event.target.value)} /></label></>}<label><span>Essais dans cette séance</span><input type="number" min={1} max={999} required value={attempts} onChange={(event) => setAttempts(Number(event.target.value))} /></label></div><label className="checkbox-label"><input type="checkbox" checked={sent} disabled={Boolean(entry.ascentId || pendingFirstSend)} onChange={(event) => setSent(event.target.checked)} /><span>Voie enchaînée pendant cette séance</span></label>{entry.ascentId && <p className="privacy-note">L’enchaînement est déjà dans le carnet : la voie et son statut restent verrouillés, mais les essais sont recalculés.</p>}{sent && <fieldset className="choice-fieldset"><legend>Type d’enchaînement</legend><div className="style-choices">{allowedStyles.map((value) => <label className={selectedStyle === value ? 'is-selected' : ''} key={value}><input type="radio" name={`training-edit-style-${entry.id}`} checked={selectedStyle === value} onChange={() => setStyle(value)} /><span className={`style-dot style-dot--${value}`} /><strong>{styleLabels[value]}</strong></label>)}</div><p className="privacy-note">{attempts} essai{attempts > 1 ? 's' : ''} dans cette séance · {cumulativeAttempts} au premier enchaînement.</p></fieldset>}<div className="admin-actions"><button className="button button--light" type="button" onClick={onCancel}>↩️ Annuler</button><button className="button button--accent" disabled={pending || (entry.sessionLocation === 'mur' && !routeId)}>{pending ? 'Enregistrement…' : '💾 Enregistrer'}</button></div></form>
}
