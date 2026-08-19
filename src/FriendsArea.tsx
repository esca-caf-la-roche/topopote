import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { filterPractitioners, practitionerCounts, type PractitionerFilter } from './lib/friends'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { styleLabels } from './lib/scoring'
import PrimaryNav from './PrimaryNav'
import type { AscentStyle, FriendActivity, GradeFeeling, PractitionerRelation } from './types'

type Feedback = { kind: 'error' | 'success'; text: string } | null

type PractitionerRow = {
  profil_id: string
  pseudo: string
  est_suivi: boolean
  me_suit: boolean
  peut_suivre: boolean
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
  const [activity, setActivity] = useState<FriendActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [pendingNickname, setPendingNickname] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PractitionerFilter>('tous')
  const [selectedPractitionerId, setSelectedPractitionerId] = useState('')
  const request = useRef(0)

  const loadSocialData = useCallback(async () => {
    const requestId = ++request.current
    setPractitioners([])
    setActivity([])
    setLoadFailed(false)
    if (!supabase || !user) {
      setHasProfile(false)
      setSharesProfile(false)
      setLoading(false)
      return
    }

    setLoading(true)
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

    const [practitionersResult, activityResult] = await Promise.all([
      supabase.rpc('annuaire_pratiquants'),
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
    setActivity(((activityResult.data ?? []) as ActivityRow[]).map((row) => ({
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
    })))

    const error = practitionersResult.error || activityResult.error
    if (error) {
      setLoadFailed(true)
      setFeedback({ kind: 'error', text: `Impossible de charger l’espace Potes : ${error.message}` })
    }
    setLoading(false)
  }, [user])

  useEffect(() => { void loadSocialData() }, [loadSocialData])

  const counts = useMemo(() => practitionerCounts(practitioners), [practitioners])
  const visiblePractitioners = useMemo(
    () => filterPractitioners(practitioners, search, filter),
    [filter, practitioners, search],
  )
  const selectedPractitioner = useMemo(
    () => visiblePractitioners.find((practitioner) => practitioner.id === selectedPractitionerId) ?? visiblePractitioners[0] ?? null,
    [selectedPractitionerId, visiblePractitioners],
  )

  async function toggleFollowing(practitioner: PractitionerRelation) {
    if (!supabase) return
    setPendingNickname(practitioner.nickname)
    setFeedback(null)
    const following = !practitioner.following
    const { error } = await supabase.rpc('suivre_pratiquant', {
      p_profil_id: practitioner.id,
      p_suivre: following,
    })
    setPendingNickname(null)
    if (error) {
      setFeedback({ kind: 'error', text: `Suivi non modifié : ${error.message}` })
      return
    }
    setFeedback({
      kind: 'success',
      text: following ? `Tu suis maintenant ${practitioner.nickname}.` : `Tu ne suis plus ${practitioner.nickname}.`,
    })
    await loadSocialData()
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

                    <section className="friends-directory" aria-labelledby="directory-title">
                      <div className="section-heading">
                        <div><p className="section-kicker">La salle</p><h2 id="directory-title">Trouver un pratiquant</h2></div>
                        <span className="count">{visiblePractitioners.length}</span>
                      </div>
                      <div className="friends-toolbar">
                        <label><span>Rechercher par pseudo</span><input type="search" value={search} placeholder="Ex. Alex" onChange={(event) => setSearch(event.target.value)} /></label>
                        <label><span>Afficher</span><select value={filter} onChange={(event) => setFilter(event.target.value as PractitionerFilter)}><option value="tous">Tous</option><option value="suivis">Je suis</option><option value="abonnes">Me suivent</option></select></label>
                      </div>
                      {visiblePractitioners.length === 0 ? <p className="empty-state">Aucun pratiquant ne correspond à cette recherche.</p> : (
                        <div className="practitioner-picker">
                          <label><span>Pratiquant</span><select value={selectedPractitioner?.id ?? ''} onChange={(event) => setSelectedPractitionerId(event.target.value)}>{visiblePractitioners.map((practitioner) => <option key={practitioner.id} value={practitioner.id}>{practitioner.nickname}</option>)}</select></label>
                          {selectedPractitioner && <article className="practitioner-picker__selection">
                            <div><strong>{selectedPractitioner.nickname}</strong><RelationStatus practitioner={selectedPractitioner} /></div>
                            <button className={`button button--small ${selectedPractitioner.following ? 'friend-action--following' : 'button--accent'}`} type="button" disabled={pendingNickname === selectedPractitioner.nickname || (!selectedPractitioner.following && !selectedPractitioner.canFollow)} onClick={() => void toggleFollowing(selectedPractitioner)}>
                              {pendingNickname === selectedPractitioner.nickname ? 'Patiente…' : selectedPractitioner.following ? 'Ne plus suivre' : selectedPractitioner.canFollow ? 'Suivre' : 'Partage désactivé'}
                            </button>
                          </article>}
                        </div>
                      )}
                    </section>

                    <section className="friends-feed" aria-labelledby="feed-title">
                      <div className="section-heading">
                        <div><p className="section-kicker">En direct de la cordée</p><h2 id="feed-title">50 derniers enchaînements</h2></div>
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
    </div>
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
