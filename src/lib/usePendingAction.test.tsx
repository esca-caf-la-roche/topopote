// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePendingAction } from './usePendingAction'

function deferred() {
  let resolve!: () => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('usePendingAction', () => {
  it('ignore une seconde exécution tant que la première est en cours', async () => {
    const request = deferred()
    const action = vi.fn(() => request.promise)
    const { result } = renderHook(() => usePendingAction())
    let firstRun!: Promise<boolean>
    let duplicateRun!: Promise<boolean>

    act(() => {
      firstRun = result.current.run(action)
      duplicateRun = result.current.run(action)
    })

    expect(result.current.pending).toBe(true)
    expect(action).toHaveBeenCalledTimes(1)
    await expect(duplicateRun).resolves.toBe(false)

    await act(async () => {
      request.resolve()
      await expect(firstRun).resolves.toBe(true)
    })

    expect(result.current.pending).toBe(false)
  })

  it('se réarme après un succès comme après une erreur', async () => {
    const { result } = renderHook(() => usePendingAction())
    const success = vi.fn().mockResolvedValue(undefined)

    await act(async () => {
      await expect(result.current.run(success)).resolves.toBe(true)
    })
    expect(result.current.pending).toBe(false)

    await act(async () => {
      await expect(result.current.run(() => Promise.reject(new Error('échec réseau')))).rejects.toThrow('échec réseau')
    })
    expect(result.current.pending).toBe(false)

    await act(async () => {
      await expect(result.current.run(success)).resolves.toBe(true)
    })
    expect(success).toHaveBeenCalledTimes(2)
  })
})
