import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const rpeExamples = [
  ['0 — Aucun effort', 'Repos ou mobilité passive, sans difficulté perceptible.'],
  ['1 — Très facile', 'Mobilité douce ou récupération active ; aucune fatigue notable.'],
  ['2 — Facile', 'Grimpe très en dessous de ton niveau, avec une très grande marge.'],
  ['3 — Modérée', 'Endurance confortable ; légère fatigue, séance facile à répéter.'],
  ['4 — Assez difficile', 'Volume soutenu mais très contrôlé ; tu gardes une bonne marge.'],
  ['5 — Difficile', 'Travail régulier et exigeant ; fatigue nette, sans approcher ta limite.'],
  ['6 — Exigeante', 'Séance difficile mais gérable, avec une technique qui reste propre.'],
  ['7 — Très difficile', 'Plusieurs essais ou voies durs ; forte sollicitation, récupération importante.'],
  ['8 — Très difficile +', 'Projet, bloc max ou rési très exigeants ; les efforts durs s’accumulent.'],
  ['9 — Quasi maximale', 'Compétition ou séance exceptionnelle, proche de ta limite sur l’ensemble.'],
  ['10 — Maximale', 'La séance entière a été aussi dure que possible ; tu n’aurais rien pu ajouter. Cette note doit rester rare.'],
]

export default function TrainingLoadTutorial({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') return onClose()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)]
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus()
      }
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.querySelector<HTMLElement>('[data-initial-focus]')?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      returnFocus?.focus()
    }
  }, [onClose])

  return createPortal(<div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} className="modal training-tutorial" role="dialog" aria-modal="true" aria-labelledby="training-load-tutorial-title" aria-describedby="training-load-tutorial-intro" tabIndex={-1}>
      <button data-initial-focus className="modal__close" type="button" aria-label="Fermer le tutoriel" onClick={onClose}>×</button>
      <header><p className="section-kicker">Mode d’emploi</p><h2 id="training-load-tutorial-title">Comprendre ta charge d’entraînement</h2></header>
      <p id="training-load-tutorial-intro">Topopote calcule une charge interne : un thermomètre personnel de la difficulté vécue. Il sert à comparer tes propres semaines avec la même méthode. Il ne mesure pas précisément la contrainte sur les doigts et ne prédit pas une blessure.</p>

      <section><h3>1. Le calcul</h3><p className="training-tutorial__formula"><strong>Charge de séance = durée de pratique (min) × RPE globale (0–10)</strong><br />Exemple : 90 min × RPE 8 = 720 UA. Les unités arbitraires ne sont ni « bonnes » ni « mauvaises » toutes seules.</p></section>

      <section><h3>2. Quelle durée noter ?</h3><p><strong>Utilise toujours la même convention, en intérieur comme en extérieur.</strong></p><p>Compte du début de l’échauffement spécifique au dernier essai. Inclus les repos normaux, l’assurage et les rotations habituelles. Retire le trajet, la marche d’approche, le repas et les longues coupures sans pratique.</p><ul><li><strong>Intérieur :</strong> échauffement à 18 h, dernier essai à 20 h → 120 min.</li><li><strong>Extérieur :</strong> pratique de 10 h à 16 h avec 1 h de repas → 300 min. L’approche n’est pas comptée.</li></ul><p>Ne chronomètre pas seulement le temps sur le mur : ce serait difficile à reproduire.</p></section>

      <section><h3>3. Comment choisir la RPE ?</h3><p className="training-tutorial__question">À quel point la séance entière a-t-elle été difficile ?</p><p>Réponds idéalement 15 à 30 minutes après, toujours avec le même délai. Note toute la séance, pas seulement les avant-bras, le crux ou les dernières minutes.</p><dl className="training-tutorial__rpe">{rpeExamples.map(([title, example]) => <div key={title}><dt>{title}</dt><dd>{example}</dd></div>)}</dl><p>Ces exemples sont des repères, pas des règles : la RPE décrit ton vécu global.</p></section>

      <section><h3>4. Donner du sens au score</h3><ul><li>Enregistre la contrainte dominante : bloc max, voie rési, volume facile, poutre, arquée, bi-doigts…</li><li>Croise la charge avec les signaux déclarés : récupération, douleur, stress et performance.</li><li>Ajoute toutes tes activités physiques pour que le total hebdomadaire soit complet.</li><li>Observe au moins 4 semaines ; 8 à 12 donnent une base plus solide.</li></ul><p><strong>Il n’existe pas de seuil universel :</strong> les repères 3 000–6 000 UA ou +10 % ne sont pas des normes scientifiques.</p><p className="training-tutorial__warning">Une douleur persistante, croissante ou qui modifie le geste ne se résume pas à ce score. Demande un avis professionnel si nécessaire.</p></section>
      <button className="button button--accent training-tutorial__done" type="button" onClick={onClose}>J’ai compris</button>
    </section>
  </div>, document.body)
}
