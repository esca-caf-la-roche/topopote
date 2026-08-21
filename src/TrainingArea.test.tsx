// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TrainingArea from './TrainingArea'

function queryResult(data: unknown[] = []) {
  const result = { data, error: null }
  const query = {
    select: () => query,
    update: (values: unknown) => { update(values); return query },
    order: () => query,
    eq: () => query,
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  }
  return query
}

const { from, update } = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn() }))

vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { from },
}))

describe('TrainingArea', () => {
  beforeEach(() => {
    cleanup()
    window.sessionStorage.clear()
    from.mockReset()
    update.mockReset()
    from.mockImplementation(() => queryResult())
  })

  it('refuse la page lorsque le booléen privé est désactivé', () => {
    render(<TrainingArea user={{ id: 'user-1' } as never} isAdmin={false} isOpener={false} sharesActivity={false} hasTrainingAccess={false} authLoading={false} routes={[]} grades={[]} onSignOut={async () => undefined} />)
    expect(screen.getByRole('heading', { name: 'Section non activée' })).toBeTruthy()
    expect(from).not.toHaveBeenCalled()
  })

  it('affiche les formulaires de séances uniquement au profil autorisé', async () => {
    render(<TrainingArea user={{ id: 'user-1' } as never} isAdmin={false} isOpener={false} sharesActivity={false} hasTrainingAccess authLoading={false} routes={[]} grades={[]} onSignOut={async () => undefined} />)
    expect(await screen.findByRole('heading', { name: 'Où as-tu grimpé ?' })).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Aucune séance enregistrée.')).toBeTruthy())
    expect(screen.getByRole('link', { name: 'Entraînement' }).getAttribute('aria-current')).toBe('page')
  })

  it('restaure une voie extérieure en cours après avoir quitté la page', async () => {
    const session = { id: 'session-1', user_id: 'user-1', date_seance: '2026-08-18', type_lieu: 'exterieur', falaise: 'Ablon', created_at: '2026-08-18T12:00:00Z' }
    from.mockImplementation((table: string) => queryResult(table === 'seances_entrainement' ? [session] : []))
    const props = { user: { id: 'user-1' } as never, isAdmin: false, isOpener: false, sharesActivity: false, hasTrainingAccess: true, authLoading: false, routes: [], grades: [{ id: 'grade-1', label: '6b', rank: 1, points: 100, difficulty: 'Modéré' as const }], onSignOut: async () => undefined }
    const view = render(<TrainingArea {...props} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter une voie' }))
    fireEvent.change(screen.getByLabelText('Nom de la voie'), { target: { value: 'La directe' } })
    fireEvent.change(screen.getByLabelText('Cotation'), { target: { value: '6b' } })
    expect(screen.getByRole('button', { name: 'Supprimer la séance' }).classList.contains('training-icon-action--danger')).toBe(true)

    view.unmount()
    render(<TrainingArea {...props} />)

    expect(await screen.findByDisplayValue('La directe')).toBeTruthy()
    expect((screen.getByLabelText('Cotation') as HTMLSelectElement).value).toBe('6b')
  })

  it('sépare les essais, permet la modification et filtre les suggestions par falaise', async () => {
    const sessions = [
      { id: 'session-2', user_id: 'user-1', date_seance: '2026-08-18', type_lieu: 'exterieur', falaise: 'Ablon', duree_minutes: 60, effort_percu: 7, sensations: 4, plaisir: 5, fatigue_apres: 3, created_at: '2026-08-18T12:00:00Z' },
      { id: 'session-1', user_id: 'user-1', date_seance: '2026-08-10', type_lieu: 'exterieur', falaise: 'Ablon', created_at: '2026-08-10T12:00:00Z' },
      { id: 'session-3', user_id: 'user-1', date_seance: '2026-08-09', type_lieu: 'exterieur', falaise: 'Le Salève', created_at: '2026-08-09T12:00:00Z' },
    ]
    const entries = [
      { id: 'entry-1', seance_id: 'session-1', voie_id: null, nom_voie: 'La Directe', cotation: '6b', commentaire: null, nombre_essais: 4, enchainee: false, style: null, enchainement_id: null, created_at: '2026-08-10T12:10:00Z' },
      { id: 'entry-2', seance_id: 'session-2', voie_id: null, nom_voie: 'La Directe', cotation: '6b', commentaire: 'Très belle voie.', nombre_essais: 2, enchainee: true, style: 'apres_travail', enchainement_id: null, created_at: '2026-08-18T12:10:00Z' },
      { id: 'entry-3', seance_id: 'session-3', voie_id: null, nom_voie: 'L’Arête', cotation: '6a', commentaire: null, nombre_essais: 1, enchainee: false, style: null, enchainement_id: null, created_at: '2026-08-09T12:10:00Z' },
    ]
    from.mockImplementation((table: string) => queryResult(table === 'seances_entrainement' ? sessions : table === 'voies_seance' ? entries : []))
    render(<TrainingArea user={{ id: 'user-1' } as never} isAdmin={false} isOpener={false} sharesActivity={false} hasTrainingAccess authLoading={false} routes={[]} grades={[{ id: 'grade-1', label: '6b', rank: 1, points: 100, difficulty: 'Modéré' }]} onSignOut={async () => undefined} />)

    const comment = await screen.findByText('Très belle voie.')
    const currentSession = screen.getByText('18/08/2026').closest('article')!
    expect(within(currentSession).getByText('420 UA')).toBeTruthy()
    expect(within(currentSession).getByText('60 min × RPE 7/10')).toBeTruthy()
    expect((within(currentSession).getByLabelText('RPE globale de la séance') as HTMLSelectElement).value).toBe('7')
    expect(within(currentSession).getByLabelText('Volume enregistré').textContent).toContain('2 essais')
    expect(within(currentSession).getByLabelText('Volume enregistré').textContent).toContain('1 enchaînement')
    expect(within(currentSession).getByText('Sensations 4/5')).toBeTruthy()
    const duration = within(currentSession).getByLabelText('Durée de pratique en minutes')
    fireEvent.change(duration, { target: { value: '90' } })
    fireEvent.blur(duration)
    fireEvent.change(within(currentSession).getByLabelText('RPE globale de la séance'), { target: { value: '5' } })
    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({ duree_minutes: 90 })
      expect(update).toHaveBeenCalledWith({ effort_percu: 5 })
    })
    const row = comment.closest('article')!
    expect(within(row).getByText('2')).toBeTruthy()
    expect(within(row).getByText('6')).toBeTruthy()
    fireEvent.click(within(row).getByRole('button', { name: 'Modifier la voie' }))
    expect(screen.getByDisplayValue('Très belle voie.')).toBeTruthy()

    fireEvent.click(within(currentSession).getByRole('button', { name: 'Ajouter une voie' }))
    const routeInput = within(currentSession).getByPlaceholderText('Choisir ou saisir une voie')
    const listId = routeInput.getAttribute('list')!
    const suggestions = [...document.getElementById(listId)!.querySelectorAll('option')].map((option) => option.getAttribute('value'))
    expect(suggestions).toContain('La Directe')
    expect(suggestions).not.toContain('L’Arête')
    fireEvent.change(screen.getByLabelText('Lieu'), { target: { value: 'exterieur' } })
    expect([...document.querySelectorAll('#training-crags option')].map((option) => option.getAttribute('value'))).toEqual(['Ablon', 'Le Salève'])
  })

  it('explique la convention de durée, la formule, les limites et chaque RPE de 0 à 10', async () => {
    render(<TrainingArea user={{ id: 'user-1' } as never} isAdmin={false} isOpener={false} sharesActivity={false} hasTrainingAccess authLoading={false} routes={[]} grades={[]} onSignOut={async () => undefined} />)
    const tutorialButton = await screen.findByRole('button', { name: 'Comprendre la charge' })
    tutorialButton.focus()
    fireEvent.click(tutorialButton)
    const dialog = screen.getByRole('dialog', { name: 'Comprendre ta charge d’entraînement' })
    expect(within(dialog).getByText(/90 min × RPE 8 = 720 UA/)).toBeTruthy()
    expect(within(dialog).getByText(/marche d’approche/)).toBeTruthy()
    expect(within(dialog).getByText(/15 à 30 minutes/)).toBeTruthy()
    expect(within(dialog).getByText(/Il n’existe pas de seuil universel/)).toBeTruthy()
    for (let value = 0; value <= 10; value += 1) expect(within(dialog).getByText(new RegExp(`^${value} —`))).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Comprendre la charge' }))
  })

  it('additionne escalade et autres activités tout en signalant un total partiel', async () => {
    const sessions = [
      { id: 'session-complete', user_id: 'user-1', date_seance: '2026-08-18', type_lieu: 'mur', falaise: null, duree_minutes: 60, effort_percu: 7, created_at: '2026-08-18T12:00:00Z' },
      { id: 'session-incomplete', user_id: 'user-1', date_seance: '2026-08-19', type_lieu: 'mur', falaise: null, duree_minutes: 45, effort_percu: null, created_at: '2026-08-19T12:00:00Z' },
    ]
    const activities = [{ id: 'activity-1', user_id: 'user-1', date_activite: '2026-08-20', type_activite: 'poutre', duree_minutes: 30, effort_percu: 6, type_contrainte: 'Arquée', signaux_contexte: ['douleur'], note_contexte: 'Doigt sensible', created_at: '2026-08-20T12:00:00Z' }]
    from.mockImplementation((table: string) => queryResult(table === 'seances_entrainement' ? sessions : table === 'activites_charge' ? activities : []))
    render(<TrainingArea user={{ id: 'user-1' } as never} isAdmin={false} isOpener={false} sharesActivity={false} hasTrainingAccess authLoading={false} routes={[]} grades={[]} onSignOut={async () => undefined} />)
    expect(await screen.findByText('600 UA')).toBeTruthy()
    expect(screen.getByText('1 activité à compléter · total partiel')).toBeTruthy()
    const activityCard = screen.getByText('Doigt sensible').closest('article')!
    expect(within(activityCard).getByText('Douleur inhabituelle')).toBeTruthy()
  })
})
