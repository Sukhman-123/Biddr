import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedValue } from '../useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the value immediately on first render', () => {
    const { result } = renderHook(() => useDebouncedValue('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('does not update until the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'hello' } },
    )
    rerender({ value: 'world' })
    expect(result.current).toBe('hello')
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current).toBe('hello')
  })

  it('updates after the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'hello' } },
    )
    rerender({ value: 'world' })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('world')
  })

  it('coalesces rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 200),
      { initialProps: { value: 'a' } },
    )
    rerender({ value: 'b' })
    act(() => vi.advanceTimersByTime(50))
    rerender({ value: 'c' })
    act(() => vi.advanceTimersByTime(50))
    rerender({ value: 'd' })
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('d')
  })
})
