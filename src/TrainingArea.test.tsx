// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TrainingArea from './TrainingArea'

function queryResult(data: unknown[] = []) {
  const result = { data, error: null }
  const query = {
    select: () => query,
    order: () => query,
    eq: () => query,
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  }
  return query
}

const { from } = vi.hoisted(() => ({ from: vi.fn() }))

vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { from },
}))

describe('TrainingArea', () => {
  beforeEach(() => {
    cleanup()
    window.sessionStorage.clear()
    from.mockReset()
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
      { id: 'session-2', user_id: 'user-1', date_seance: '2026-08-18', type_lieu: 'exterieur', falaise: 'Ablon', sensations: 4, plaisir: 5, fatigue_apres: 3, created_at: '2026-08-18T12:00:00Z' },
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
    expect(within(currentSession).getByRole('button', { name: 'Sensations : 4 étoiles sur 5' }).getAttribute('aria-pressed')).toBe('true')
    expect(within(currentSession).getByRole('button', { name: 'Plaisir : 5 étoiles sur 5' }).getAttribute('aria-pressed')).toBe('true')
    expect(within(currentSession).getByRole('button', { name: 'Fatigue : 3 étoiles sur 5' }).getAttribute('aria-pressed')).toBe('true')
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
})
