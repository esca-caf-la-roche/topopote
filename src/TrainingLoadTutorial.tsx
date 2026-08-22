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

const disciplineExamples = [
  ['Bloc', '4–5 : blocs faciles et propres. 6–7 : vrai bloc max, peu de problèmes et longs repos. 8–9 : nombreux essais durs ou baisse de performance.'],
  ['Voie en salle', '4–5 : volume facile, peu de pompe. 6–7 : voies proches du niveau avec fatigue maîtrisée. 8–9 : résistance, nombreux runs durs ou congestion prolongée.'],
  ['Falaise', 'Deux runs très durs et bien espacés peuvent rester à 6–7. Une longue journée, six runs de projet, l’approche et la météo peuvent amener à 8–9.'],
  ['Poutre', '3–4 : reprise très sous-maximale. 5–6 : protocole complet et confortable. 7–8 : charges élevées avec petite marge. 9 : tests maximaux ou fatigue neuromusculaire importante.'],
  ['Renforcement', '4–5 : correctifs ou antagonistes avec grande réserve. 6–7 : charges sérieuses, 1 à 3 répétitions en réserve. 8–9 : travail lourd proche de l’échec.'],
  ['Technique et volume', 'Une séance technique peut être utile à 3–5. Un gros volume propre arrêté avant la dégradation se situe souvent à 6–7.'],
]

const rpeChoices = [
  ['6 ou 7 ?', 'À 6, tu pouvais encore ajouter une quantité significative de travail propre. À 7, seulement un peu.'],
  ['7 ou 8 ?', 'À 7, la séance reste nettement maîtrisée. À 8, il ne reste presque plus de travail utile possible.'],
  ['8 ou 9 ?', 'À 8, la séance est très dure mais ponctuellement reproductible. À 9, elle frôle ta capacité maximale du jour.'],
  ['9 ou 10 ?', '10 correspond au maximum exceptionnel de toute la séance, pas à un seul mouvement tenté très fort.'],
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
      <p id="training-load-tutorial-intro">Ce score sert à comparer tes propres semaines avec la même méthode. Il ne prédit pas une blessure.</p>

      <section><h3>1. Le calcul</h3><p className="training-tutorial__formula"><strong>Charge = temps (min) × RPE (1–10)</strong><br />Exemple : 90 min × RPE 8 = 720 UA. Arrondis le temps au quart d’heure le plus proche ; sous 15 minutes, garde le temps réel.</p></section>

      <section><h3>2. Quel temps noter ?</h3><p><strong>Garde toujours la même règle.</strong> Compte l’échauffement, la grimpe ou les exercices et les repos prévus. Retire le trajet, les discussions et l’attente sans rapport. Pour l’approche en falaise, choisis une fois pour toutes de l’inclure ou de la noter séparément.</p></section>

      <section><h3>3. Choisir la RPE</h3><p className="training-tutorial__question">À quel point toute la séance a-t-elle été difficile ?</p><p>Réponds idéalement 15 à 30 minutes après la séance, toujours avec un délai similaire. Note toute la séance, pas le crux, la pompe maximale ou le dernier essai. Les valeurs impaires servent à te placer entre deux repères.</p><dl className="training-tutorial__rpe">{rpeExamples.map(([title, example]) => <div key={title}><dt>{title}</dt><dd>{example}</dd></div>)}</dl></section>

      <section><h3>4. Repères selon ta séance</h3><div className="training-tutorial__disciplines">{disciplineExamples.map(([title, example]) => <article key={title}><h4>{title}</h4><p>{example}</p></article>)}</div></section>

      <section><h3>5. Si tu hésites entre deux notes</h3><dl className="training-tutorial__choices">{rpeChoices.map(([title, explanation]) => <div key={title}><dt>{title}</dt><dd>{explanation}</dd></div>)}</dl></section>

      <section><h3>6. Douleur et historique</h3><p>Si tu as mal, indique une intensité de 1 à 10. Observe au moins 4 semaines complètes avant de comparer tes semaines à ta propre habitude : il n’existe pas de valeur idéale universelle.</p><p className="training-tutorial__warning">Une douleur persistante, croissante ou qui modifie le geste passe avant le score. Réduis la sollicitation concernée et demande un avis professionnel si nécessaire.</p></section>
      <button className="button button--accent training-tutorial__done" type="button" onClick={onClose}>J’ai compris</button>
    </section>
  </div>, document.body)
}
