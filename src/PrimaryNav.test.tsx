// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PrimaryNav from './PrimaryNav'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe('PrimaryNav', () => {
  it('désactive la déconnexion et affiche son état tant que la requête est en cours', async () => {
    const request = deferred()
    const onSignOut = vi.fn(() => request.promise)

    render(<PrimaryNav page="" authenticated isAdmin={false} onSignOut={onSignOut} />)
    fireEvent.click(screen.getByRole('button', { name: 'Déconnexion' }))

    const pendingButton = screen.getByRole('button', { name: 'Déconnexion…' }) as HTMLButtonElement
    expect(pendingButton.disabled).toBe(true)
    fireEvent.click(pendingButton)
    expect(onSignOut).toHaveBeenCalledTimes(1)

    await act(async () => {
      request.resolve()
      await request.promise
    })

    const readyButton = screen.getByRole('button', { name: 'Déconnexion' }) as HTMLButtonElement
    expect(readyButton.disabled).toBe(false)
  })
})
