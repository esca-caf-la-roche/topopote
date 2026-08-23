// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), maybeSingle: vi.fn() }))

vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }),
    rpc: mocks.rpc,
  },
}))

import FriendsArea from './FriendsArea'

const user = { id: 'user-1' } as User
const activityRows = [
  {
    pseudo: 'Léa', date_enchainement: '2026-08-22', style: 'flash', ressenti_cotation: 'conforme', note: 4,
    recommande: true, commentaire: 'Très belle voie', saison: 'Été 2026', zone: 'Dalle', relais: 4,
    couleur: 'Rouge', couleur_hex: '#cc0000', cotation: '6b',
  },
  {
    pseudo: 'Noé', date_enchainement: '2026-08-21', style: 'apres_travail', ressenti_cotation: 'dure', note: null,
    recommande: false, commentaire: null, saison: 'Été 2026', zone: 'Dévers', relais: 8,
    couleur: 'Bleu', couleur_hex: '#0033cc', cotation: '6c',
  },
]

function rpcResult(name: string) {
  if (name === 'annuaire_pratiquants') return Promise.resolve({ data: [
    { profil_id: 'lea-id', pseudo: 'Léa', est_suivi: true, me_suit: true, peut_suivre: true },
    { profil_id: 'noe-id', pseudo: 'Noé', est_suivi: false, me_suit: false, peut_suivre: true },
  ], error: null })
  if (name === 'mes_pratiquants_suivis') return Promise.resolve({ data: [
    { profil_id: 'lea-id', pseudo: 'Léa', me_suit: true, score: 1240, saison: 'Été 2026' },
  ], error: null })
  if (name === 'fil_activite_pratiquants') return Promise.resolve({ data: activityRows, error: null })
  if (name === 'realisations_pratiquant_suivi') return Promise.resolve({ data: activityRows.slice(0, 1), error: null })
  if (name === 'suivre_pratiquant') return Promise.resolve({ data: null, error: null })
  return Promise.resolve({ data: [], error: null })
}

function renderArea() {
  return render(<FriendsArea user={user} isAdmin={false} isOpener={false} canAccessTraining={false} authLoading={false} onSignOut={async () => undefined} />)
}

beforeEach(() => {
  mocks.maybeSingle.mockResolvedValue({ data: { user_id: user.id, partage_activite: true }, error: null })
  mocks.rpc.mockImplementation(rpcResult)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  document.body.style.overflow = ''
})

describe('FriendsArea', () => {
  it('affiche les suivis en cartes compactes avec leur score et clarifie le fil global', async () => {
    renderArea()

    expect(await screen.findByRole('heading', { name: 'Les pratiquants que je suis' })).toBeTruthy()
    const practitionerCard = screen.getByRole('button', { name: 'Voir toutes les réalisations de Léa' })
    expect(practitionerCard.textContent).toContain('1 240 points')
    expect(screen.queryByLabelText('Pratiquant')).toBeNull()
    expect(screen.queryByLabelText('Afficher')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Derniers enchaînements de mes suivis' })).toBeTruthy()
    expect(screen.getByText('Les 50 plus récents, tous pratiquants suivis confondus.')).toBeTruthy()
    expect(mocks.rpc).toHaveBeenCalledWith('fil_activite_pratiquants', { p_limite: 50 })
    expect(screen.getAllByText('Léa').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Noé').length).toBeGreaterThan(0)
  })

  it('ouvre un annuaire modal et réduit immédiatement la liste avec la recherche', async () => {
    renderArea()
    const trigger = await screen.findByRole('button', { name: 'Trouver un pratiquant' })
    trigger.focus()
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Trouver un pratiquant' })
    const search = within(dialog).getByRole('searchbox', { name: 'Rechercher par pseudo' })
    expect(document.activeElement).toBe(search)
    expect(within(dialog).getByText('2 pratiquants')).toBeTruthy()

    fireEvent.change(search, { target: { value: 'noÉ' } })
    expect(within(dialog).getByText('Noé')).toBeTruthy()
    expect(within(dialog).queryByText('Léa')).toBeNull()
    expect(within(dialog).getByText('1 pratiquant')).toBeTruthy()

    const followButton = within(dialog).getByRole('button', { name: 'Suivre' })
    followButton.focus()
    fireEvent.click(followButton)
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('suivre_pratiquant', { p_profil_id: 'noe-id', p_suivre: true }))
    expect(document.activeElement).toBe(followButton)

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('charge toutes les réalisations du pratiquant choisi dans un second modal', async () => {
    renderArea()
    const trigger = await screen.findByRole('button', { name: 'Voir toutes les réalisations de Léa' })
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Réalisations de Léa' })
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('realisations_pratiquant_suivi', { p_profil_id: 'lea-id' }))
    expect(await within(dialog).findByText('Très belle voie')).toBeTruthy()
    expect(within(dialog).getByText((_, element) => element?.tagName === 'STRONG' && element.textContent === '1 240 points')).toBeTruthy()
    expect(within(dialog).getByText('Saison Été 2026')).toBeTruthy()
  })

  it('affiche les erreurs de suivi dans le modal et restitue le focus après un désabonnement depuis une carte', async () => {
    mocks.rpc.mockImplementation((name: string) => name === 'suivre_pratiquant'
      ? Promise.resolve({ data: null, error: { message: 'Réseau indisponible' } })
      : rpcResult(name))
    renderArea()

    const findButton = await screen.findByRole('button', { name: 'Trouver un pratiquant' })
    fireEvent.click(findButton)
    const dialog = screen.getByRole('dialog', { name: 'Trouver un pratiquant' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ne plus suivre' }))
    expect((await within(dialog).findByRole('alert')).textContent).toContain('Suivi non modifié : Réseau indisponible')
    fireEvent.keyDown(window, { key: 'Escape' })

    mocks.rpc.mockImplementation(rpcResult)
    const unfollowButton = screen.getByRole('button', { name: 'Ne plus suivre' })
    unfollowButton.focus()
    fireEvent.click(unfollowButton)
    await waitFor(() => expect(document.activeElement).toBe(findButton))
  })
})
