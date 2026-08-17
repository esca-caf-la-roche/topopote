import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { ascentPoints, MAX_SCORING_ASCENTS, SCORING_VERSION, seasonScore, styleLabels } from './lib/scoring'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import PrimaryNav from './PrimaryNav'
import { profileErrorMessage } from './lib/databaseErrors'
import { usePendingAction } from './lib/usePendingAction'
import type { Ascent, AscentStyle, ClimberProfile, GradeFeeling, LeaderboardEntry, Route, Season } from './types'

type Feedback = { kind: 'error' | 'success'; text: string } | null
const pendingOtpEmailKey = 'topopote.pendingOtpEmail'

function readPendingOtpEmail() {
  try {
    return window.sessionStorage.getItem(pendingOtpEmailKey) ?? ''
  } catch {
    return ''
  }
}

function savePendingOtpEmail(email: string) {
  try {
    window.sessionStorage.setItem(pendingOtpEmailKey, email)
  } catch {
    // The OTP form still works when session storage is unavailable.
  }
}

function clearPendingOtpEmail() {
  try {
    window.sessionStorage.removeItem(pendingOtpEmailKey)
  } catch {
    // Nothing else is required when session storage is unavailable.
  }
}

type LeaderboardRow = {
  rang: number | string
  pseudo: string
  est_moi: boolean
  score: number | string
  nombre_enchainements: number | string
  meilleur_niveau: string
  a_vue: number | string
  flash: number | string
  apres_travail: number | string
  moulinette: number | string
}
function localDate() {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
export default function ClimberArea({ page, user, isAdmin, isOpener, authLoading, routes, seasons, onSignOut }: {
  page: 'carnet' | 'classement'
  user: User | null
  isAdmin: boolean
  isOpener: boolean
  authLoading: boolean
  routes: Route[]
  seasons: Season[]
  onSignOut: () => Promise<void>
}) {
  const activeSeason = seasons.find((season) => season.active) ?? null
  const [selectedSeasonId, setSelectedSeasonId] = useState(activeSeason?.id ?? '')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [profile, setProfile] = useState<ClimberProfile | null>(null)
  const [ascents, setAscents] = useState<Ascent[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const leaderboardRequest = useRef(0)
  const personalDataRequest = useRef(0)

  useEffect(() => {
    if (!selectedSeasonId && activeSeason) setSelectedSeasonId(activeSeason.id)
  }, [activeSeason, selectedSeasonId])

  const loadLeaderboard = useCallback(async () => {
    if (!supabase || !selectedSeasonId) { setLeaderboardLoading(false); return }
    const requestId = ++leaderboardRequest.current
    setLeaderboard([])
    setLeaderboardLoading(true)
    const { data, error } = await supabase.rpc('classement_saison', { p_saison_id: selectedSeasonId })
    if (requestId !== leaderboardRequest.current) return
    setLeaderboardLoading(false)
    if (error) return setFeedback({ kind: 'error', text: `Classement indisponible : ${error.message}` })
    setLeaderboard(((data ?? []) as LeaderboardRow[]).map((row) => ({
      rank: Number(row.rang), nickname: row.pseudo, isCurrent: row.est_moi, score: Number(row.score),
      ascentCount: Number(row.nombre_enchainements), bestGrade: row.meilleur_niveau,
      onsight: Number(row.a_vue), flash: Number(row.flash), redpoint: Number(row.apres_travail), topRope: Number(row.moulinette),
    })))
  }, [selectedSeasonId])

  const loadPersonalData = useCallback(async () => {
    const requestId = ++personalDataRequest.current
    setProfile(null)
    setAscents([])
    if (!supabase || !user) { setLoading(false); return }
    setLoading(true)
    const [profileResult, ascentsResult] = await Promise.all([
      supabase.from('profils').select('user_id, pseudo, classement_public, partage_activite').eq('user_id', user.id).maybeSingle(),
      supabase.from('enchainements').select('id, user_id, voie_id, saison_id, date_enchainement, style, essais, ressenti_cotation, note, recommande, commentaire').eq('user_id', user.id).order('date_enchainement', { ascending: false }),
    ])
    if (requestId !== personalDataRequest.current) return
    const error = profileResult.error || ascentsResult.error
    if (error) { setFeedback({ kind: 'error', text: error.message }); setLoading(false); return }
    setProfile(profileResult.data ? { userId: profileResult.data.user_id, nickname: profileResult.data.pseudo, publicRanking: profileResult.data.classement_public, shareActivity: profileResult.data.partage_activite } : null)
    setAscents((ascentsResult.data ?? []).flatMap((row) => {
      const route = routes.find((candidate) => candidate.id === row.voie_id)
      return route ? [{
        id: row.id, userId: row.user_id, routeId: row.voie_id, seasonId: row.saison_id,
        climbedAt: row.date_enchainement, style: row.style as AscentStyle, attempts: row.essais,
        gradeFeeling: row.ressenti_cotation as GradeFeeling, rating: row.note, recommended: row.recommande,
        comment: row.commentaire, route,
      }] : []
    }))
    setLoading(false)
  }, [routes, user])

  useEffect(() => { void loadLeaderboard() }, [loadLeaderboard])
  useEffect(() => { void loadPersonalData() }, [loadPersonalData])

  const reload = async () => { await Promise.all([loadPersonalData(), loadLeaderboard()]) }

  return (
    <div className="site-shell">
      <PrimaryNav page={page} authenticated={Boolean(user)} isAdmin={isAdmin} isOpener={isOpener} canAccessFriends={profile?.shareActivity ?? false} loading={authLoading} onSignOut={onSignOut} />
      <header className={`hero hero--${page}`}>
        <div className="hero__content">
          <p className="eyebrow">Topopote · saison par saison</p>
          <h1 className="climber-title">{page === 'classement' ? 'Classement' : 'Mon carnet'}</h1>
          <p className="intro">{page === 'classement' ? `Les ${MAX_SCORING_ASCENTS} meilleures voies font le score.` : 'Enregistre tes voies et suis ta progression.'}</p>
        </div>
      </header>
      {feedback && <div className={`message message--${feedback.kind}`} role="status">{feedback.text}</div>}
      {authLoading ? <p className="empty-state">Vérification de la session…</p> : page === 'classement' ? (
        <Leaderboard entries={leaderboard} loading={leaderboardLoading} seasons={seasons} selectedSeasonId={selectedSeasonId} onSeasonChange={setSelectedSeasonId} />
      ) : !isSupabaseConfigured ? <p className="empty-state">Configure Supabase pour utiliser le carnet.</p>
        : !user ? <AuthPanel onFeedback={setFeedback} />
          : loading && !profile ? <p className="empty-state">Chargement du carnet…</p>
            : !profile ? isAdmin
              ? <p className="empty-state message--error">Le profil privé de l’administrateur est introuvable. Recharge la page ou contacte le support.</p>
              : <ProfileSetup user={user} onCreated={loadPersonalData} onFeedback={setFeedback} />
            : <Logbook profile={profile} activeSeason={activeSeason} selectedSeasonId={selectedSeasonId} seasons={seasons} routes={routes} ascents={ascents} loading={loading} leaderboard={leaderboard} onSeasonChange={setSelectedSeasonId} onChanged={reload} onFeedback={setFeedback} onSignOut={onSignOut} />}
    </div>
  )
}

function AuthPanel({ onFeedback }: { onFeedback: (feedback: Feedback) => void }) {
  const pendingEmail = readPendingOtpEmail()
  const [email, setEmail] = useState(pendingEmail); const [otp, setOtp] = useState(''); const [sent, setSent] = useState(Boolean(pendingEmail)); const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true)
    const { error } = sent ? await supabase!.auth.verifyOtp({ email, token: otp, type: 'email' }) : await supabase!.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    setBusy(false)
    if (error) return onFeedback({ kind: 'error', text: error.message })
    if (!sent) { savePendingOtpEmail(email); setSent(true); onFeedback({ kind: 'success', text: 'Code envoyé. Consulte ta boîte mail.' }) }
    else { clearPendingOtpEmail(); onFeedback({ kind: 'success', text: 'Bienvenue dans Topopote !' }) }
  }
  function changeEmail() {
    clearPendingOtpEmail(); setSent(false); setOtp(''); onFeedback(null)
  }
  return <main className="climber-page"><section className="auth-card"><p className="section-kicker">Pratiquant</p><h2>Connexion ou inscription</h2><p>Un code à 6 chiffres suffit. Aucun mot de passe à retenir.</p><form className="stack" onSubmit={submit}><label><span>Adresse email</span><input type="email" required autoComplete="email" value={email} disabled={sent} onChange={(event) => setEmail(event.target.value)} /></label>{sent && <><label><span>Code à 6 chiffres</span><input required inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value)} /></label><button className="button button--light" type="button" onClick={changeEmail}>Changer d’adresse email</button></>}<button className="button button--accent" disabled={busy}>{busy ? 'Patiente…' : sent ? 'Valider le code' : 'Recevoir mon code'}</button></form></section></main>
}

function ProfileSetup({ user, onCreated, onFeedback }: { user: User; onCreated: () => Promise<void>; onFeedback: (feedback: Feedback) => void }) {
  const [nickname, setNickname] = useState(''); const [publicRanking, setPublicRanking] = useState(false); const [shareActivity, setShareActivity] = useState(false)
  const { pending, run } = usePendingAction()
  async function submit(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      const { error } = await supabase!.from('profils').insert({ user_id: user.id, pseudo: nickname.trim(), classement_public: publicRanking, partage_activite: shareActivity })
      if (error) return onFeedback({ kind: 'error', text: profileErrorMessage(error) })
      onFeedback({ kind: 'success', text: 'Ton profil est prêt. À toi de grimper !' }); await onCreated()
    })
  }
  return <main className="climber-page"><section className="auth-card auth-card--profile"><p className="section-kicker">Dernière prise</p><h2>Crée ton profil</h2><form className="stack" onSubmit={submit}><label><span>Pseudo</span><input required minLength={2} maxLength={32} value={nickname} onChange={(event) => setNickname(event.target.value)} /></label><label className="checkbox-label"><input type="checkbox" checked={publicRanking} onChange={(event) => setPublicRanking(event.target.checked)} /><span>Apparaître dans le classement public</span></label><label className="checkbox-label"><input type="checkbox" checked={shareActivity} onChange={(event) => setShareActivity(event.target.checked)} /><span>Partager mes enchaînements et commentaires avec les pratiquants connectés</span></label><p className="privacy-note">Activer le partage donne accès à Potes et rend ton pseudo visible dans la recherche des pratiquants. Ton adresse email et ton identifiant ne sont jamais affichés.</p><button className="button button--accent" disabled={pending}>{pending ? 'Création…' : 'Créer mon profil'}</button></form></section></main>
}

function Leaderboard({ entries, loading, seasons, selectedSeasonId, onSeasonChange }: { entries: LeaderboardEntry[]; loading: boolean; seasons: Season[]; selectedSeasonId: string; onSeasonChange: (id: string) => void }) {
  return <main className="climber-page"><section className="score-explainer"><div><p className="section-kicker">Barème {SCORING_VERSION}</p><h2>Top 10 de la saison</h2><p>8a = 1 000 points · à vue +147 · flash +53 · moulinette −50.</p></div><SeasonSelect seasons={seasons} value={selectedSeasonId} onChange={onSeasonChange} /></section>{loading ? <p className="empty-state">Chargement du classement…</p> : entries.length === 0 ? <p className="empty-state">Pas encore de score pour cette saison. Le podium t’attend !</p> : <><section className="podium" aria-label="Podium">{entries.slice(0, 3).map((entry) => <article className={`podium-card podium-card--${entry.rank}`} key={entry.nickname}><span>#{entry.rank}</span><strong>{entry.nickname}</strong><output>{entry.score.toLocaleString('fr-FR')} pts</output></article>)}</section><section className="leaderboard"><h2>Tous les grimpeurs</h2><div className="leaderboard__header" aria-hidden="true"><span>Rang</span><span>Pratiquant</span><span>Score</span><span>Voies</span><span>Meilleure</span></div>{entries.map((entry) => <article className={`leaderboard-row ${entry.isCurrent ? 'is-current' : ''}`} key={entry.nickname}><strong className="leaderboard-row__rank">#{entry.rank}</strong><div><strong>{entry.nickname}</strong><small>{entry.onsight} à vue · {entry.flash} flash · {entry.redpoint} après travail</small></div><output>{entry.score.toLocaleString('fr-FR')}</output><span>{entry.ascentCount}</span><span className="grade-chip">{entry.bestGrade}</span></article>)}</section></>}</main>
}

function SeasonSelect({ seasons, value, onChange }: { seasons: Season[]; value: string; onChange: (id: string) => void }) {
  return <label><span>Saison</span><select value={value} onChange={(event) => onChange(event.target.value)}>{seasons.map((season) => <option value={season.id} key={season.id}>{season.name}{season.active ? ' · active' : ''}</option>)}</select></label>
}

function Logbook({ profile, activeSeason, selectedSeasonId, seasons, routes, ascents, loading, leaderboard, onSeasonChange, onChanged, onFeedback, onSignOut }: { profile: ClimberProfile; activeSeason: Season | null; selectedSeasonId: string; seasons: Season[]; routes: Route[]; ascents: Ascent[]; loading: boolean; leaderboard: LeaderboardEntry[]; onSeasonChange: (id: string) => void; onChanged: () => Promise<void>; onFeedback: (feedback: Feedback) => void; onSignOut: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false)
  const seasonAscents = useMemo(() => ascents.filter((ascent) => ascent.seasonId === selectedSeasonId), [ascents, selectedSeasonId])
  const rank = leaderboard.find((entry) => entry.isCurrent)?.rank
  const best = [...seasonAscents].sort((left, right) => right.route.grade.rank - left.route.grade.rank)[0]
  return <main className="climber-page"><section className="profile-strip"><div><p className="section-kicker">Pratiquant</p><h2>{profile.nickname}</h2><p>{profile.publicRanking ? 'Profil visible au classement' : 'Profil masqué du classement'}</p></div><div className="profile-strip__actions"><button className="button button--accent" type="button" onClick={() => setShowForm((current) => !current)}>+ Enchaînement</button><button className="button" type="button" onClick={() => void onSignOut()}>Déconnexion</button></div></section><ProfileSettings profile={profile} onChanged={onChanged} onFeedback={onFeedback} />{showForm && <AscentForm userId={profile.userId} activeSeason={activeSeason} routes={routes} ascents={ascents} onChanged={async () => { setShowForm(false); await onChanged() }} onFeedback={onFeedback} />}<div className="logbook-toolbar"><SeasonSelect seasons={seasons} value={selectedSeasonId} onChange={onSeasonChange} /></div><section className="kpi-grid"><article className="kpi-card kpi-card--score"><span>Score</span><output>{seasonScore(seasonAscents).toLocaleString('fr-FR')}</output><small>10 meilleures voies</small></article><article className="kpi-card kpi-card--rank"><span>Classement</span><output>{rank ? `#${rank}` : '—'}</output><small>{profile.publicRanking ? 'Saison sélectionnée' : 'Profil privé'}</small></article><article className="kpi-card kpi-card--volume"><span>Enchaînements</span><output>{seasonAscents.length}</output><small>Meilleure : {best?.route.grade.label ?? '—'}</small></article></section><section className="style-stats"><div><p className="section-kicker">Ta saison</p><h2>Styles d’enchaînement</h2></div><div className="style-stats__grid">{(Object.keys(styleLabels) as AscentStyle[]).map((style) => <article key={style}><span className={`style-dot style-dot--${style}`} /><strong>{seasonAscents.filter((ascent) => ascent.style === style).length}</strong><small>{styleLabels[style]}</small></article>)}</div></section><section className="logbook"><div className="section-heading"><div><p className="section-kicker">Historique</p><h2>Carnet de croix</h2></div><span className="count">{seasonAscents.length}</span></div>{loading ? <p className="empty-state">Chargement…</p> : seasonAscents.length === 0 ? <p className="empty-state">Aucune voie enregistrée pour cette saison.</p> : <div className="ascent-list">{seasonAscents.map((ascent) => <AscentRow key={ascent.id} ascent={ascent} onChanged={onChanged} onFeedback={onFeedback} />)}</div>}</section></main>
}

function ProfileSettings({ profile, onChanged, onFeedback }: { profile: ClimberProfile; onChanged: () => Promise<void>; onFeedback: (feedback: Feedback) => void }) {
  const [nickname, setNickname] = useState(profile.nickname)
  const [publicRanking, setPublicRanking] = useState(profile.publicRanking)
  const [shareActivity, setShareActivity] = useState(profile.shareActivity)
  const { pending, run } = usePendingAction()
  async function submit(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      const { error } = await supabase!.from('profils').update({ pseudo: nickname.trim(), classement_public: publicRanking, partage_activite: shareActivity }).eq('user_id', profile.userId)
      if (error) return onFeedback({ kind: 'error', text: profileErrorMessage(error) })
      onFeedback({ kind: 'success', text: 'Préférences du profil enregistrées.' })
      await onChanged()
    })
  }
  return <details className="profile-settings"><summary>Modifier mon profil et ma confidentialité</summary><form className="form-grid" onSubmit={submit}><label><span>Pseudo</span><input required minLength={2} maxLength={32} value={nickname} onChange={(event) => setNickname(event.target.value)} /></label><label className="checkbox-label"><input type="checkbox" checked={publicRanking} onChange={(event) => setPublicRanking(event.target.checked)} /><span>Apparaître dans le classement public</span></label><label className="checkbox-label"><input type="checkbox" checked={shareActivity} onChange={(event) => setShareActivity(event.target.checked)} /><span>Partager mes enchaînements et commentaires avec les pratiquants connectés</span></label><p className="privacy-note">Activer le partage donne accès à Potes et rend ton pseudo visible dans la recherche des pratiquants.</p><button className="button button--accent" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer'}</button></form></details>
}

function AscentForm({ userId, activeSeason, routes, ascents, onChanged, onFeedback }: { userId: string; activeSeason: Season | null; routes: Route[]; ascents: Ascent[]; onChanged: () => Promise<void>; onFeedback: (feedback: Feedback) => void }) {
  const availableRoutes = routes.filter((route) => route.seasonId === activeSeason?.id && !ascents.some((ascent) => ascent.routeId === route.id))
  const [routeId, setRouteId] = useState(''); const [climbedAt, setClimbedAt] = useState(localDate); const [style, setStyle] = useState<AscentStyle>('apres_travail'); const [attempts, setAttempts] = useState(2); const [rating, setRating] = useState(0); const [recommended, setRecommended] = useState(false); const [feeling, setFeeling] = useState<GradeFeeling>('conforme'); const [comment, setComment] = useState('')
  const { pending, run } = usePendingAction()
  const route = routes.find((candidate) => candidate.id === routeId); const finalAttempts = style === 'a_vue' || style === 'flash' ? 1 : attempts
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!route) return
    await run(async () => {
      const { error } = await supabase!.from('enchainements').insert({ user_id: userId, voie_id: routeId, saison_id: route.seasonId, date_enchainement: climbedAt, style, essais: finalAttempts, ressenti_cotation: feeling, note: rating || null, recommande: recommended, commentaire: comment || null })
      if (error) return onFeedback({ kind: 'error', text: error.code === '23505' ? 'Cette voie est déjà dans ton carnet.' : error.message })
      onFeedback({ kind: 'success', text: `Enchaînement enregistré : ${ascentPoints(route.grade.points, style, finalAttempts)} points.` }); await onChanged()
    })
  }
  return <section className="ascent-form"><p className="section-kicker">Nouvelle croix</p><h2>Enregistrer une voie</h2><p>Saison : <strong>{activeSeason?.name ?? 'aucune'}</strong></p><form className="stack" onSubmit={submit}><div className="form-grid"><label><span>Voie</span><select required value={routeId} onChange={(event) => setRouteId(event.target.value)}><option value="">Choisir relais, couleur et cotation</option>{availableRoutes.map((item) => <option value={item.id} key={item.id}>Relais {item.relay.number} · {item.color.name} · {item.grade.label}{item.isHalfRoute ? ' · 1/2' : ''}</option>)}</select></label><label><span>Date</span><input type="date" required max={localDate()} value={climbedAt} onChange={(event) => setClimbedAt(event.target.value)} /></label></div><fieldset className="choice-fieldset"><legend>Comment l’as-tu grimpée ?</legend><div className="style-choices">{(Object.keys(styleLabels) as AscentStyle[]).map((value) => <label className={style === value ? 'is-selected' : ''} key={value}><input type="radio" name="style" checked={style === value} onChange={() => setStyle(value)} /><span className={`style-dot style-dot--${value}`} /><strong>{styleLabels[value]}</strong></label>)}</div></fieldset>{style !== 'a_vue' && style !== 'flash' && <label><span>Nombre d’essais</span><input type="number" min={1} max={999} required value={attempts} onChange={(event) => setAttempts(Number(event.target.value))} /></label>}<fieldset className="choice-fieldset"><legend>Ton avis</legend><div className="rating-row">{[1, 2, 3, 4, 5].map((value) => <button type="button" className={rating >= value ? 'is-selected' : ''} aria-label={`${value} étoile${value > 1 ? 's' : ''}${rating === value ? ', retirer la note' : ''}`} aria-pressed={rating === value} onClick={() => setRating((current) => current === value ? 0 : value)} key={value}>★</button>)}</div><label className="checkbox-label"><input type="checkbox" checked={recommended} onChange={(event) => setRecommended(event.target.checked)} /><span>Je recommande cette voie</span></label></fieldset><fieldset className="choice-fieldset"><legend>Cotation ressentie</legend><div className="feeling-choices">{([['souple', 'Plus facile'], ['conforme', 'Conforme'], ['dure', 'Plus dure']] as const).map(([value, label]) => <label className={feeling === value ? 'is-selected' : ''} key={value}><input type="radio" name="feeling" checked={feeling === value} onChange={() => setFeeling(value)} /><span>{label}</span></label>)}</div></fieldset><label><span>Commentaire facultatif</span><textarea maxLength={500} rows={4} value={comment} onChange={(event) => setComment(event.target.value)} /></label><p className="privacy-note">Les ouvreurs et administrateurs peuvent consulter anonymement ce retour, même lorsque le partage communautaire est désactivé.</p><div className="score-preview"><span>Score potentiel</span><strong>{route ? ascentPoints(route.grade.points, style, finalAttempts) : 0} pts</strong></div><button className="button button--accent" disabled={pending || !activeSeason || !routeId}>{pending ? 'Enregistrement…' : 'Enregistrer'}</button></form></section>
}

function AscentRow({ ascent, onChanged, onFeedback }: { ascent: Ascent; onChanged: () => Promise<void>; onFeedback: (feedback: Feedback) => void }) {
  const [editing, setEditing] = useState(false)
  const [climbedAt, setClimbedAt] = useState(ascent.climbedAt)
  const [style, setStyle] = useState(ascent.style)
  const [attempts, setAttempts] = useState(ascent.attempts)
  const [feeling, setFeeling] = useState(ascent.gradeFeeling)
  const [rating, setRating] = useState(ascent.rating ?? 0)
  const [recommended, setRecommended] = useState(ascent.recommended)
  const [comment, setComment] = useState(ascent.comment ?? '')
  const { pending, run } = usePendingAction()

  async function save(event: FormEvent) {
    event.preventDefault()
    await run(async () => {
      const finalAttempts = style === 'a_vue' || style === 'flash' ? 1 : attempts
      const { error } = await supabase!.from('enchainements').update({ date_enchainement: climbedAt, style, essais: finalAttempts, ressenti_cotation: feeling, note: rating || null, recommande: recommended, commentaire: comment || null }).eq('id', ascent.id)
      if (error) return onFeedback({ kind: 'error', text: error.message })
      onFeedback({ kind: 'success', text: 'Enchaînement mis à jour.' })
      setEditing(false)
      await onChanged()
    })
  }

  async function remove() {
    if (!window.confirm('Retirer cette voie de ton carnet ?')) return
    await run(async () => {
      const { error } = await supabase!.from('enchainements').delete().eq('id', ascent.id)
      if (error) return onFeedback({ kind: 'error', text: error.message })
      onFeedback({ kind: 'success', text: 'Voie retirée du carnet.' })
      await onChanged()
    })
  }

  if (editing) {
    return <form className="ascent-edit" onSubmit={save}><strong>Relais {ascent.route.relay.number} · {ascent.route.color.name} · {ascent.route.grade.label}</strong><div className="form-grid"><label><span>Date</span><input type="date" required max={localDate()} value={climbedAt} onChange={(event) => setClimbedAt(event.target.value)} /></label><label><span>Style</span><select value={style} onChange={(event) => setStyle(event.target.value as AscentStyle)}>{(Object.keys(styleLabels) as AscentStyle[]).map((value) => <option value={value} key={value}>{styleLabels[value]}</option>)}</select></label>{style !== 'a_vue' && style !== 'flash' && <label><span>Essais</span><input type="number" min={1} max={999} required value={attempts} onChange={(event) => setAttempts(Number(event.target.value))} /></label>}<label><span>Ressenti</span><select value={feeling} onChange={(event) => setFeeling(event.target.value as GradeFeeling)}><option value="souple">Plus facile</option><option value="conforme">Conforme</option><option value="dure">Plus dure</option></select></label><label><span>Note / 5</span><input type="number" min={0} max={5} value={rating} onChange={(event) => setRating(Number(event.target.value))} /></label><label className="checkbox-label"><input type="checkbox" checked={recommended} onChange={(event) => setRecommended(event.target.checked)} /><span>Je recommande</span></label></div><label><span>Commentaire</span><textarea rows={3} maxLength={500} value={comment} onChange={(event) => setComment(event.target.value)} /></label><div className="admin-actions"><button className="button button--accent" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer'}</button><button className="button" type="button" disabled={pending} onClick={() => setEditing(false)}>Annuler</button></div></form>
  }

  const feelingLabel = ascent.gradeFeeling === 'souple' ? 'Plus facile' : ascent.gradeFeeling === 'dure' ? 'Plus dure' : 'Conforme'
  return <article className="ascent-row"><span className={`style-dot style-dot--${ascent.style}`} /><div className="ascent-row__identity"><strong>Relais {ascent.route.relay.number} · {ascent.route.color.name}</strong><small>{ascent.route.relay.zone.name} · {styleLabels[ascent.style]} · {ascent.attempts} essai{ascent.attempts > 1 ? 's' : ''} · {feelingLabel}{ascent.recommended ? ' · Recommandée' : ''}</small>{ascent.comment && <p>{ascent.comment}</p>}</div><span className="grade-chip">{ascent.route.grade.label}</span><div className="ascent-row__meta"><time>{new Intl.DateTimeFormat('fr-FR').format(new Date(`${ascent.climbedAt}T12:00:00`))}</time><span>{ascent.rating ? '★'.repeat(ascent.rating) : 'Sans note'}</span><strong>{ascentPoints(ascent.route.grade.points, ascent.style, ascent.attempts)} pts</strong></div><div className="ascent-row__actions"><button type="button" aria-label="Modifier" disabled={pending} onClick={() => setEditing(true)}>✎</button><button className="delete-button" type="button" aria-label="Supprimer" disabled={pending} onClick={() => void remove()}>{pending ? '…' : '×'}</button></div></article>
}
