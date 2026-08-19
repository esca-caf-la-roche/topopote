import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gradeFeelingLabels } from './lib/routeAscents'
import { styleLabels } from './lib/scoring'
import { allowedAscentStyles } from './lib/training'
import { supabase } from './lib/supabase'
import type { AscentStyle, GradeFeeling, Route, RouteAscentPrefill, RouteAscentSummary } from './types'

type Feedback = { kind: 'error' | 'success'; text: string } | null

type RouteAscentRow = {
  pseudo: string
  est_moi: boolean
  style: AscentStyle
  ressenti_cotation: GradeFeeling
  note: number | null
  commentaire: string | null
}

function localDate() {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export default function RouteAscentsModal({
  route,
  mode,
  ownStyle,
  prefill,
  hasProfile,
  sharesActivity,
  onClose,
  onAscentCreated,
  onFeedback,
}: {
  route: Route
  mode: 'details' | 'add'
  ownStyle?: AscentStyle
  prefill?: RouteAscentPrefill
  hasProfile: boolean
  sharesActivity: boolean
  onClose: () => void
  onAscentCreated: (ascentId: string) => Promise<void>
  onFeedback: (feedback: Feedback) => void
}) {
  const [reviews, setReviews] = useState<RouteAscentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const dialogRef = useRef<HTMLElement>(null)

  const loadReviews = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase.rpc('avis_voie', { p_voie_id: route.id })
    if (error) {
      setLoadError(error.message)
      setLoading(false)
      return
    }
    setReviews(((data ?? []) as RouteAscentRow[]).map((row) => ({
      nickname: row.pseudo,
      isCurrent: row.est_moi,
      style: row.style,
      gradeFeeling: row.ressenti_cotation,
      rating: row.note,
      comment: row.commentaire,
    })))
    setLoading(false)
  }, [route.id])

  useEffect(() => { void loadReviews() }, [loadReviews])

  useEffect(() => {
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const returnFocusFallback = returnFocus?.closest('.route-card')?.querySelector<HTMLElement>('.route-card__open') ?? null
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
    const initialFocus = dialogRef.current?.querySelector<HTMLElement>(focusableSelector)
    initialFocus?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      const focusTarget = returnFocus?.isConnected ? returnFocus : returnFocusFallback
      focusTarget?.focus()
    }
  }, [onClose])

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section ref={dialogRef} className="modal route-ascent-modal" role="dialog" aria-modal="true" aria-labelledby="route-ascent-title" tabIndex={-1}>
        <button className="modal__close" type="button" aria-label="Fermer" onClick={onClose}>×</button>
        <header className="route-ascent-modal__header">
          <div className="route-ascent-modal__swatch" style={{ backgroundColor: route.color.hex }} aria-hidden="true" />
          <div>
            <p className="section-kicker">{route.relay.zone.name}</p>
            <h2 id="route-ascent-title">Relais {route.relay.number} · {route.color.name} · {route.grade.label}</h2>
            {route.isHalfRoute && <span className="half-route-badge">1/2 voie</span>}
          </div>
        </header>

        {mode === 'add' && (!hasProfile ? (
          <section className="route-ascent-modal__profile">
            <h3>Crée d’abord ton profil pratiquant</h3>
            <p>Ton pseudo permet d’identifier tes enchaînements sans afficher ton adresse email.</p>
            <a className="button button--accent" href="#carnet" onClick={onClose}>Créer mon profil</a>
          </section>
        ) : ownStyle ? (
          <section className="route-ascent-modal__own">
            <span className={`style-dot style-dot--${ownStyle}`} />
            <div><strong>Tu as enchaîné cette voie {styleLabels[ownStyle].toLowerCase()}.</strong><p>Tu peux modifier les détails depuis ton carnet.</p></div>
            <a className="button button--light" href="#carnet" onClick={onClose}>Ouvrir mon carnet</a>
          </section>
        ) : (
          <RouteAscentForm
            route={route}
            sharesActivity={sharesActivity}
            prefill={prefill}
            onSaved={async (ascentId) => {
              await onAscentCreated(ascentId)
              await loadReviews()
            }}
            onFeedback={onFeedback}
          />
        ))}

        <section className="route-reviews" aria-labelledby="route-reviews-title">
          <div className="section-heading"><h3 id="route-reviews-title">Qui l’a enchaînée ?</h3><span className="count">{reviews.length}</span></div>
          {loading ? <p className="empty-state">Chargement des enchaînements…</p>
            : loadError ? <div className="empty-state" role="alert"><p>Impossible de charger les avis.</p><button className="button" type="button" onClick={() => void loadReviews()}>Réessayer</button></div>
              : reviews.length === 0 ? <p className="empty-state">Aucun enchaînement partagé pour cette voie.</p>
                : <div className="route-review-list">{reviews.map((review, index) => (
                  <article className={`route-review ${review.isCurrent ? 'is-current' : ''}`} key={`${review.nickname}-${index}`}>
                    <div className="route-review__heading"><strong>{review.nickname}{review.isCurrent ? ' · toi' : ''}</strong><span>{review.rating ? '★'.repeat(review.rating) : 'Sans note'}</span></div>
                    <p className="route-review__meta"><span className={`style-dot style-dot--${review.style}`} />{styleLabels[review.style]} · Cotation {gradeFeelingLabels[review.gradeFeeling].toLowerCase()}</p>
                    {review.comment && <p className="route-review__comment">« {review.comment} »</p>}
                  </article>
                ))}</div>}
        </section>
      </section>
    </div>,
    document.body,
  )
}

function RouteAscentForm({ route, sharesActivity, prefill, onSaved, onFeedback }: {
  route: Route
  sharesActivity: boolean
  prefill?: RouteAscentPrefill
  onSaved: (ascentId: string) => Promise<void>
  onFeedback: (feedback: Feedback) => void
}) {
  const [climbedAt, setClimbedAt] = useState(prefill?.climbedAt ?? localDate)
  const [style, setStyle] = useState<AscentStyle>(prefill?.style ?? 'apres_travail')
  const [attempts, setAttempts] = useState(prefill?.attempts ?? 2)
  const [rating, setRating] = useState(0)
  const [feeling, setFeeling] = useState<GradeFeeling>('conforme')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const allowedStyles = allowedAscentStyles(attempts)
  const selectedStyle = allowedStyles.includes(style) ? style : allowedStyles[0]

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase || saving) return
    setFormError('')
    setSaving(true)
    const finalAttempts = selectedStyle === 'a_vue' || selectedStyle === 'flash' ? 1 : attempts
    const { data, error } = await supabase.from('enchainements').insert({
      voie_id: route.id,
      saison_id: route.seasonId,
      date_enchainement: climbedAt,
      style: selectedStyle,
      essais: finalAttempts,
      ressenti_cotation: feeling,
      note: rating || null,
      recommande: false,
      commentaire: comment || null,
    }).select('id').single()
    setSaving(false)
    if (error) {
      const text = error.code === '23505' ? 'Cette voie est déjà dans ton carnet.' : error.message
      setFormError(text)
      onFeedback({ kind: 'error', text })
      return
    }
    onFeedback({ kind: 'success', text: 'Ton enchaînement a été ajouté.' })
    await onSaved(data.id)
  }

  return <section className="route-ascent-form">
    <p className="section-kicker">Ta croix</p><h3>Ajouter mon enchaînement</h3>
    <form className="stack" onSubmit={submit}>
      <label><span>Date</span><input type="date" required max={localDate()} value={climbedAt} onChange={(event) => setClimbedAt(event.target.value)} /></label>
      <fieldset className="choice-fieldset"><legend>Type d’enchaînement</legend><div className="style-choices">{allowedStyles.map((value) => <label className={selectedStyle === value ? 'is-selected' : ''} key={value}><input type="radio" name="route-style" checked={selectedStyle === value} onChange={() => setStyle(value)} /><span className={`style-dot style-dot--${value}`} /><strong>{styleLabels[value]}</strong></label>)}</div></fieldset>
      {selectedStyle !== 'a_vue' && selectedStyle !== 'flash' && <label><span>Nombre d’essais</span><input type="number" min={1} max={999} required value={attempts} onChange={(event) => setAttempts(Number(event.target.value))} /></label>}
      <fieldset className="choice-fieldset"><legend>Nombre d’étoiles</legend><div className="rating-row">{[1, 2, 3, 4, 5].map((value) => <button type="button" className={rating >= value ? 'is-selected' : ''} aria-label={`${value} étoile${value > 1 ? 's' : ''}${rating === value ? ', retirer la note' : ''}`} aria-pressed={rating === value} onClick={() => setRating((current) => current === value ? 0 : value)} key={value}>★</button>)}</div></fieldset>
      <fieldset className="choice-fieldset"><legend>Cotation ressentie</legend><div className="feeling-choices">{(Object.entries(gradeFeelingLabels) as [GradeFeeling, string][]).map(([value, label]) => <label className={feeling === value ? 'is-selected' : ''} key={value}><input type="radio" name="route-feeling" checked={feeling === value} onChange={() => setFeeling(value)} /><span>{label}</span></label>)}</div></fieldset>
      <label><span>Commentaire facultatif</span><textarea maxLength={500} rows={3} value={comment} onChange={(event) => setComment(event.target.value)} /></label>
      <p className="privacy-note">{sharesActivity ? 'Ton pseudo, ton avis et ce commentaire seront visibles par les pratiquants connectés.' : 'Ton pseudo et ton activité resteront masqués à la communauté tant que le partage est désactivé.'} Les ouvreurs et administrateurs peuvent toujours consulter anonymement le retour enregistré afin d’améliorer les voies.</p>
      {formError && <p className="message message--error" role="alert">{formError}</p>}
      <button className="button button--accent" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
    </form>
  </section>
}
