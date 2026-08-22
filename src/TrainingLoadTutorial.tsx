import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const rpeExamples = [
  ['1 — Quasiment aucun effort', 'Mobilité douce ou suspensions pieds au sol, très loin de l’échec.'],
  ['2 — Très facile', 'Grimpe très facile avec beaucoup de repos ; tu pourrais recommencer immédiatement.'],
  ['3 — Facile', 'Échauffement prolongé, voies ou blocs faciles, avec une grande réserve.'],
  ['4 — Facile à modérée', 'Volume court et maîtrisé, technique propre, jamais proche de la pompe.'],
  ['5 — Modérée', 'Bloc sous-maximal ou voies sous ton maximum, avec beaucoup de marge restante.'],
  ['6 — Difficile mais maîtrisée', 'Efforts sérieux et propres ; tu aurais encore pu faire du travail utile.'],
  ['7 — Difficile et productive', 'Séance complète ou runs exigeants, avec une petite marge.'],
  ['8 — Très difficile', 'Les efforts durs s’accumulent et il reste très peu de travail utile possible.'],
  ['9 — Extrêmement difficile', 'Séance proche de ta limite du jour, demandant une récupération inhabituelle.'],
  ['10 — Maximum exceptionnel', 'Maximum physique et mental de la séance entière ; cette note doit rester rare.'],
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
      <header><p className="section-kicker">Guide simple</p><h2 id="training-load-tutorial-title">La charge, simplement</h2></header>
      <p id="training-load-tutorial-intro">Ce score sert à comparer tes propres semaines avec la même méthode. Il ne mesure pas précisément les contraintes sur les doigts et ne prédit pas une blessure.</p>

      <section><h3>1. Le calcul</h3><p className="training-tutorial__formula"><strong>Charge = temps (min) × RPE (1–10)</strong><br />Exemple : 90 min × RPE 8 = 720 UA. Arrondis le temps au quart d’heure le plus proche ; sous 15 minutes, garde le temps réel.</p></section>

      <section><h3>2. Quel temps noter ?</h3><p><strong>Garde toujours la même règle.</strong> Compte l’échauffement, la grimpe ou les exercices et les repos prévus. Retire le trajet, les discussions et l’attente sans rapport. Pour l’approche en falaise, choisis une fois pour toutes de l’inclure ou de la noter séparément.</p></section>

      <section><h3>3. Choisir la RPE</h3><p className="training-tutorial__question">À quel point toute la séance a-t-elle été difficile ?</p><p>Note la séance entière, pas le crux ou le dernier essai. Les valeurs 2, 4, 6, 8 et 10 sont les repères rapides ; utilise les valeurs impaires si tu es entre deux.</p><dl className="training-tutorial__rpe">{rpeExamples.map(([title, example]) => <div key={title}><dt>{title}</dt><dd>{example}</dd></div>)}</dl></section>

      <section><h3>4. Doigts et douleur</h3><p>La charge des doigts est notée séparément : faible, moyenne ou forte. Si tu as mal, indique une intensité de 1 à 10.</p><p>Observe au moins 4 semaines complètes avant de comparer tes semaines à ta propre habitude. Il n’existe pas de valeur idéale universelle.</p><p className="training-tutorial__warning">Une douleur persistante, croissante ou qui modifie le geste passe avant le score. Demande un avis professionnel si nécessaire.</p></section>
      <button className="button button--accent training-tutorial__done" type="button" onClick={onClose}>J’ai compris</button>
    </section>
  </div>, document.body)
}
