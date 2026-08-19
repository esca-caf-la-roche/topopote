// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import RouteAscentsModal from './RouteAscentsModal'
import type { Route } from './types'

vi.mock('./lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}))

const route: Route = {
  id: 'route-1',
  isHalfRoute: false,
  seasonId: 'season-1',
  relayId: 'relay-1',
  colorId: 'color-1',
  gradeId: 'grade-1',
  season: { id: 'season-1', name: 'Saison', active: true },
  relay: { id: 'relay-1', number: 4, zoneId: 'zone-1', zone: { id: 'zone-1', name: 'Dévers', order: 1 } },
  color: { id: 'color-1', name: 'Bleue', hex: '#3b82f6' },
  grade: { id: 'grade-1', label: '6b', rank: 10, points: 500, difficulty: 'Difficile' },
}

describe('RouteAscentsModal', () => {
  it('préremplit le premier enchaînement depuis une séance', async () => {
    render(<RouteAscentsModal
      route={route}
      mode="add"
      prefill={{ climbedAt: '2026-08-18', style: 'apres_travail', attempts: 5 }}
      hasProfile
      sharesActivity={false}
      onClose={() => undefined}
      onAscentCreated={async () => undefined}
      onFeedback={() => undefined}
    />)

    expect((screen.getByLabelText('Date') as HTMLInputElement).value).toBe('2026-08-18')
    expect((screen.getByLabelText('Nombre d’essais') as HTMLInputElement).value).toBe('5')
    expect((screen.getByRole('radio', { name: /Après travail/ }) as HTMLInputElement).checked).toBe(true)
    expect(screen.queryByRole('radio', { name: /À vue/ })).toBeNull()
    await waitFor(() => expect(screen.getByText('Aucun enchaînement partagé pour cette voie.')).toBeTruthy())
  })
})
