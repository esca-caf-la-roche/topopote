import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { User } from '@supabase/supabase-js'
import { filterPractitioners, practitionerCounts } from './lib/friends'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { styleLabels } from './lib/scoring'
import PrimaryNav from './PrimaryNav'
import type { AscentStyle, FollowedPractitioner, FriendActivity, GradeFeeling, PractitionerRelation } from './types'

type Feedback = { kind: 'error' | 'success'; text: string } | null

type PractitionerRow = {
  profil_id: string
  pseudo: string
  est_suivi: boolean
  me_suit: boolean
  peut_suivre: boolean
}

type FollowedPractitionerRow = {
  profil_id: string
  pseudo: string
  me_suit: boolean
  score: number
  saison: string | null
}

type ActivityRow = {
  pseudo: string
  date_enchainement: string
  style: string
  ressenti_cotation: string
  note: number | null
  recommande: boolean
  commentaire: string | null
  saison: string
  zone: string
  relais: number
  couleur: string
  couleur_hex: string
  cotation: string
}

const feelingLabels: Record<GradeFeeling, string> = {
  souple: 'Plus facile',
  conforme: 'Conforme',
  dure: 'Plus dure',
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${value}T12:00:00`))
}

function formatScore(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value)
}

function mapActivity(row: ActivityRow): FriendActivity {
  return {
    nickname: row.pseudo,
    climbedAt: row.date_enchainement,
    style: row.style as AscentStyle,
    gradeFeeling: row.ressenti_cotation as GradeFeeling,
    rating: row.note,
    recommended: row.recommande,
    comment: row.commentaire,
    season: row.saison,
    zone: row.zone,
    relay: row.relais,
    color: row.couleur,
    colorHex: row.couleur_hex,
    grade: row.cotation,
  }
}

function useModalFocus(onClose: () => void) {
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)]
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) return
      if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
        return
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    const initialFocus = dialogRef.current?.querySelector<HTMLElement>('[data-initial-focus]')
      ?? dialogRef.current?.querySelector<HTMLElement>(focusableSelector)
    initialFocus?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      if (returnFocus?.isConnected) returnFocus.focus()
    }
  }, [onClose])

  return dialogRef
}

export default function FriendsArea({ user, isAdmin, isOpener, canAccessTraining, authLoading, onSignOut }: {
  user: User | null
  isAdmin: boolean
  isOpener: boolean
  canAccessTraining: boolean
  authLoading: boolean
  onSignOut: () => Promise<void>
}) {
  const [hasProfile, setHasProfile] = useState(false)
  const [sharesProfile, setSharesProfile] = useState(false)
  const [practitioners, setPractitioners] = useState<PractitionerRelation[]>([])
  const [followedPractitioners, setFollowedPractitioners] = useState<FollowedPractitioner[]>([])
  const [activity, setActivity] = useState<FriendActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [pendingPractitionerId, setPendingPractitionerId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [directoryOpen, setDirectoryOpen] = useState(false)
  const [selectedPractitioner, setSelectedPractitioner] = useState<FollowedPractitioner | null>(null)
  const request = useRef(0)
  const findPractitionerButtonRef = useRef<HTMLButtonElement>(null)

  const closeDirectory = useCallback(() => setDirectoryOpen(false), [])
  const closeDetails = useCallback(() => setSelectedPractitioner(null), [])

  const loadSocialData = useCallback(async ({ keepCurrent = false }: { keepCurrent?: boolean } = {}) => {
    const requestId = ++request.current
    if (!keepCurrent) {
      setPractitioners([])
      setFollowedPractitioners([])
      setActivity([])
    }
    setLoadFailed(false)
    if (!supabase || !user) {
      setHasProfile(false)
      setSharesProfile(false)
      setLoading(false)
      return
    }

    if (!keepCurrent) setLoading(true)
    const profileResult = await supabase.from('profils').select('user_id, partage_activite').eq('user_id', user.id).maybeSingle()
    if (requestId !== request.current) return

    const profileExists = Boolean(profileResult.data)
    const profileIsShared = profileResult.data?.partage_activite ?? false
    setHasProfile(profileExists)
    setSharesProfile(profileIsShared)
    if (profileResult.error) {
      setLoadFailed(true)
      setFeedback({ kind: 'error', text: `Impossible de charger l’espace Potes : ${profileResult.error.message}` })
      setLoading(false)
      return
    }
    if (!profileExists || !profileIsShared) {
      setLoading(false)
      return
    }

    const [practitionersResult, followedResult, activityResult] = await Promise.all([
      supabase.rpc('annuaire_pratiquants'),
      supabase.rpc('mes_pratiquants_suivis'),
      supabase.rpc('fil_activite_pratiquants', { p_limite: 50 }),
    ])
    if (requestId !== request.current) return

    setPractitioners(((practitionersResult.data ?? []) as PractitionerRow[]).map((row) => ({
      id: row.profil_id,
      nickname: row.pseudo,
      following: row.est_suivi,
      followsMe: row.me_suit,
      canFollow: row.peut_suivre,
    })))
    setFollowedPractitioners(((followedResult.data ?? []) as FollowedPractitionerRow[]).map((row) => ({
      id: row.profil_id,
      nickname: row.pseudo,
      followsMe: row.me_suit,
      score: Number(row.score),
      season: row.saison,
    })))
    setActivity(((activityResult.data ?? []) as ActivityRow[]).map(mapActivity))

    const error = practitionersResult.error || followedResult.error || activityResult.error
    if (error) {
      setLoadFailed(true)
      setFeedback({ kind: 'error', text: `Impossible de charger l’espace Potes : ${error.message}` })
    }
    setLoading(false)
  }, [user])

  useEffect(() => { void loadSocialData() }, [loadSocialData])

  const counts = useMemo(() => practitionerCounts(practitioners), [practitioners])

  async function toggleFollowing(practitioner: Pick<PractitionerRelation, 'id' | 'nickname' | 'following' | 'canFollow'>) {
    if (!supabase) return false
    setPendingPractitionerId(practitioner.id)
    setFeedback(null)
    const following = !practitioner.following
    const { error } = await supabase.rpc('suivre_pratiquant', {
      p_profil_id: practitioner.id,
      p_suivre: following,
    })
    setPendingPractitionerId(null)
    if (error) {
      setFeedback({ kind: 'error', text: `Suivi non modifié : ${error.message}` })
      return false
    }
    setFeedback({
      kind: 'success',
      text: following ? `Tu suis maintenant ${practitioner.nickname}.` : `Tu ne suis plus ${practitioner.nickname}.`,
    })
    await loadSocialData({ keepCurrent: true })
    return true
  }

  async function unfollowFromCard(practitioner: FollowedPractitioner) {
    const succeeded = await toggleFollowing({ ...practitioner, following: true, canFollow: true })
    if (succeeded) findPractitionerButtonRef.current?.focus()
  }

  return (
    <div className="site-shell">
      <PrimaryNav page="potes" authenticated={Boolean(user)} isAdmin={isAdmin} isOpener={isOpener} canAccessFriends={sharesProfile} canAccessTraining={canAccessTraining} loading={authLoading} onSignOut={onSignOut} />
      <header className="hero hero--potes">
        <div className="hero__content">
          <p className="eyebrow">Topopote · la cordée</p>
          <h1 className="climber-title">Mes potes</h1>
          <p className="intro">Suis les pratiquants du mur et retrouve leurs dernières croix.</p>
        </div>
      </header>

      {feedback && <div className={`message message--${feedback.kind}`} role="status">{feedback.text}</div>}

      {authLoading ? <p className="empty-state">Vérification de la session…</p>
        : !isSupabaseConfigured ? <p className="empty-state">Configure Supabase pour utiliser l’espace Potes.</p>
          : !user ? <main className="friends-page"><p className="empty-state">Connecte-toi depuis le carnet pour retrouver tes potes.</p></main>
            : loading ? <main className="friends-page"><p className="empty-state">Chargement de la cordée…</p></main>
              : loadFailed ? <main className="friends-page"><section className="sharing-card"><p className="section-kicker">Connexion interrompue</p><h2>L’espace Potes n’a pas pu être chargé</h2><p>Ton profil n’a pas été modifié. Réessaie dans un instant.</p><button className="button button--accent" type="button" onClick={() => void loadSocialData()}>Réessayer</button></section></main>
                : !hasProfile ? <main className="friends-page"><section className="sharing-card"><p className="section-kicker">Avant de commencer</p><h2>Crée ton profil pratiquant</h2><p>Un profil est nécessaire pour suivre d’autres pratiquants et choisir ce que tu partages.</p><a className="button button--accent" href="#carnet">Créer mon profil</a></section></main>
                  : !sharesProfile ? <main className="friends-page"><section className="sharing-card"><p className="section-kicker">Profil privé</p><h2>Active le partage depuis ton profil</h2><p>Le partage de ton pseudo, de tes enchaînements et de tes commentaires est nécessaire pour accéder à Potes et apparaître dans la recherche.</p><a className="button button--accent" href="#carnet">Ouvrir mon profil</a></section></main>
                    : (
                      <main className="friends-page">
                        <section className="social-counts" aria-label="Résumé de tes relations">
                          <article><output>{counts.following}</output><span>Je suis</span></article>
                          <article><output>{counts.followers}</output><span>Me suivent</span></article>
                        </section>

                        <section className="friends-following" aria-labelledby="following-title">
                          <div className="section-heading">
                            <div><p className="section-kicker">Ma cordée</p><h2 id="following-title">Les pratiquants que je suis</h2></div>
                            <span className="count">{followedPractitioners.length}</span>
                          </div>
                          {followedPractitioners.length === 0 ? <p className="empty-state">Tu ne suis encore personne. Trouve un pratiquant pour commencer ta cordée.</p> : (
                            <div className="followed-grid">
                              {followedPractitioners.map((practitioner) => (
                                <article className="followed-card" key={practitioner.id}>
                                  <button className="followed-card__details" type="button" aria-label={`Voir toutes les réalisations de ${practitioner.nickname}`} onClick={() => setSelectedPractitioner(practitioner)}>
                                    <strong>{practitioner.nickname}</strong>
                                    <span className="followed-card__score"><b>{formatScore(practitioner.score)}</b> points</span>
                                    <small>{practitioner.season ? `Saison ${practitioner.season}` : 'Aucune saison active'}</small>
                                    {practitioner.followsMe && <span className="relation-status relation-status--mutual">Vous vous suivez</span>}
                                  </button>
                                  <button className="followed-card__unfollow" type="button" disabled={pendingPractitionerId === practitioner.id} onClick={() => void unfollowFromCard(practitioner)}>
                                    {pendingPractitionerId === practitioner.id ? 'Patiente…' : 'Ne plus suivre'}
                                  </button>
                                </article>
                              ))}
                            </div>
                          )}
                          <button ref={findPractitionerButtonRef} className="button button--accent friends-find-button" type="button" onClick={() => { setFeedback(null); setDirectoryOpen(true) }}>Trouver un pratiquant</button>
                          <p className="privacy-note">Seuls les pratiquants ayant accepté de partager leur activité apparaissent dans la recherche.</p>
                        </section>

                        <section className="friends-feed" aria-labelledby="feed-title">
                          <div className="section-heading">
                            <div><p className="section-kicker">En direct de la cordée</p><h2 id="feed-title">Derniers enchaînements de mes suivis</h2><p>Les 50 plus récents, tous pratiquants suivis confondus.</p></div>
                            <span className="count">{activity.length}</span>
                          </div>
                          {activity.length === 0 ? <p className="empty-state">Suis des pratiquants qui partagent leur activité pour voir leurs enchaînements ici.</p> : (
                            <div className="activity-list">
                              {activity.map((item, index) => <ActivityCard activity={item} key={`${item.nickname}-${item.climbedAt}-${item.relay}-${item.color}-${index}`} />)}
                            </div>
                          )}
                        </section>
                      </main>
                    )}

      {directoryOpen && <PractitionerDirectoryModal practitioners={practitioners} pendingPractitionerId={pendingPractitionerId} feedback={feedback} onToggleFollowing={toggleFollowing} onClose={closeDirectory} />}
      {selectedPractitioner && <PractitionerDetailsModal practitioner={selectedPractitioner} onClose={closeDetails} />}
    </div>
  )
}

function PractitionerDirectoryModal({ practitioners, pendingPractitionerId, feedback, onToggleFollowing, onClose }: {
  practitioners: PractitionerRelation[]
  pendingPractitionerId: string | null
  feedback: Feedback
  onToggleFollowing: (practitioner: PractitionerRelation) => Promise<boolean>
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const visiblePractitioners = useMemo(() => filterPractitioners(practitioners, search), [practitioners, search])
  const dialogRef = useModalFocus(onClose)

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="modal practitioner-directory-modal" role="dialog" aria-modal="true" aria-labelledby="practitioner-directory-title" tabIndex={-1}>
        <button className="modal__close" type="button" aria-label="Fermer la recherche" onClick={onClose}>×</button>
        <header><p className="section-kicker">La salle</p><h2 id="practitioner-directory-title">Trouver un pratiquant</h2><p>Tous les profils ci-dessous ont accepté de partager leur activité.</p></header>
        {feedback && <div className={`message message--${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.text}</div>}
        <label className="directory-search"><span>Rechercher par pseudo</span><input data-initial-focus type="search" value={search} placeholder="Ex. Alex" onChange={(event) => setSearch(event.target.value)} /></label>
        <p className="directory-results-count" aria-live="polite">{visiblePractitioners.length} pratiquant{visiblePractitioners.length > 1 ? 's' : ''}</p>
        {visiblePractitioners.length === 0 ? <p className="empty-state">Aucun pratiquant ne correspond à cette recherche.</p> : (
          <ul className="directory-results">
            {visiblePractitioners.map((practitioner) => (
              <li key={practitioner.id}>
                <div><strong>{practitioner.nickname}</strong><RelationStatus practitioner={practitioner} /></div>
                <button className={`button button--small ${practitioner.following ? 'friend-action--following' : 'button--accent'}`} type="button" disabled={pendingPractitionerId === practitioner.id || (!practitioner.following && !practitioner.canFollow)} onClick={() => void onToggleFollowing(practitioner)}>
                  {pendingPractitionerId === practitioner.id ? 'Patiente…' : practitioner.following ? 'Ne plus suivre' : 'Suivre'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>,
    document.body,
  )
}

function PractitionerDetailsModal({ practitioner, onClose }: { practitioner: FollowedPractitioner; onClose: () => void }) {
  const [activity, setActivity] = useState<FriendActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useModalFocus(onClose)

  const loadActivity = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    const result = await supabase.rpc('realisations_pratiquant_suivi', { p_profil_id: practitioner.id })
    if (result.error) setError(`Impossible de charger les réalisations : ${result.error.message}`)
    else setActivity(((result.data ?? []) as ActivityRow[]).map(mapActivity))
    setLoading(false)
  }, [practitioner.id])

  useEffect(() => { void loadActivity() }, [loadActivity])

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="modal practitioner-details-modal" role="dialog" aria-modal="true" aria-labelledby="practitioner-details-title" tabIndex={-1}>
        <button data-initial-focus className="modal__close" type="button" aria-label="Fermer les réalisations" onClick={onClose}>×</button>
        <header><p className="section-kicker">Ma cordée</p><h2 id="practitioner-details-title">Réalisations de {practitioner.nickname}</h2><p className="practitioner-details-score"><strong>{formatScore(practitioner.score)} points</strong>{practitioner.season ? ` · Saison ${practitioner.season}` : ' · Aucune saison active'}</p></header>
        {loading ? <p className="empty-state">Chargement des réalisations…</p>
          : error ? <div className="modal-error"><p className="message message--error">{error}</p><button className="button button--accent" type="button" onClick={() => void loadActivity()}>Réessayer</button></div>
            : activity.length === 0 ? <p className="empty-state">Aucune réalisation partagée pour le moment.</p>
              : <div className="activity-list practitioner-details-list">{activity.map((item, index) => <ActivityCard activity={item} key={`${item.climbedAt}-${item.relay}-${item.color}-${index}`} />)}</div>}
      </section>
    </div>,
    document.body,
  )
}

function RelationStatus({ practitioner }: { practitioner: PractitionerRelation }) {
  if (practitioner.following && practitioner.followsMe) return <span className="relation-status relation-status--mutual">Vous vous suivez</span>
  if (practitioner.following) return <span className="relation-status">Tu suis</span>
  if (practitioner.followsMe) return <span className="relation-status relation-status--follower">Te suit</span>
  return <span className="relation-status relation-status--none">Pas encore suivi</span>
}

function ActivityCard({ activity }: { activity: FriendActivity }) {
  return (
    <article className="activity-card">
      <div className="activity-card__color" style={{ backgroundColor: activity.colorHex }} aria-hidden="true" />
      <div className="activity-card__body">
        <div className="activity-card__heading">
          <div><strong>{activity.nickname}</strong><time dateTime={activity.climbedAt}>{formatActivityDate(activity.climbedAt)}</time></div>
          <span className="grade-chip">{activity.grade}</span>
        </div>
        <p className="activity-card__route">{activity.zone} · Relais {activity.relay} · {activity.color}</p>
        <div className="activity-card__tags">
          <span><i className={`style-dot style-dot--${activity.style}`} />{styleLabels[activity.style]}</span>
          <span>{feelingLabels[activity.gradeFeeling]}</span>
          {activity.rating !== null && <span aria-label={`${activity.rating} étoile${activity.rating > 1 ? 's' : ''}`}>{'★'.repeat(activity.rating)}</span>}
          {activity.recommended && <span>Recommandée</span>}
        </div>
        {activity.comment && <blockquote>{activity.comment}</blockquote>}
        <small>Saison {activity.season}</small>
      </div>
    </article>
  )
}
