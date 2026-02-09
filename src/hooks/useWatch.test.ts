/**
 * @module hooks/useWatch.test.tsx
 * @description Tests for useWatch hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { createElement } from 'react'
import { useWatch, useWatchValue } from './useWatch'
import { FormProvider } from './useFormContext'
import { createForm } from '../core/createForm'

describe('useWatch', () => {
  type FormValues = {
    username: string
    email: string
    age: number
  }

  let form: ReturnType<typeof createForm<FormValues>>

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => {
      return createElement(FormProvider, { value: form }, children)
    }
  }

  beforeEach(() => {
    form = createForm<FormValues>({
      initialValues: { username: '', email: '', age: 0 },
    })
  })

  it('should watch single path', async () => {
    const callback = vi.fn()
    const wrapper = createWrapper()

    renderHook(() => useWatch('username', callback), { wrapper })

    // Initial call (immediate: true by default)
    expect(callback).toHaveBeenCalledTimes(1)

    act(() => {
      form.setFieldValue('username', 'John')
    })

    await waitFor(() => {
      expect(callback).toHaveBeenCalledTimes(2)
      expect(callback).toHaveBeenLastCalledWith('John', '')
    })
  })

  it('should watch multiple paths', async () => {
    const callback = vi.fn()
    const wrapper = createWrapper()

    renderHook(() => useWatch(['username', 'email'], callback), { wrapper })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenLastCalledWith(['', ''], undefined)

    act(() => {
      form.setFieldValue('username', 'John')
    })

    await waitFor(() => {
      expect(callback).toHaveBeenCalledTimes(2)
    })
  })

  it('should not call callback immediately when immediate is false', () => {
    const callback = vi.fn()
    const wrapper = createWrapper()

    renderHook(() => useWatch('username', callback, { immediate: false }), {
      wrapper,
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      form.setFieldValue('username', 'John')
    })

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should detect value changes', async () => {
    const callback = vi.fn()
    const wrapper = createWrapper()

    renderHook(() => useWatch('username', callback), { wrapper })

    act(() => {
      form.setFieldValue('username', 'John')
    })

    await waitFor(() => {
      expect(callback).toHaveBeenLastCalledWith('John', '')
    })

    act(() => {
      form.setFieldValue('username', 'Jane')
    })

    await waitFor(() => {
      expect(callback).toHaveBeenLastCalledWith('Jane', 'John')
    })
  })

  it('should detect nested object changes with deep comparison', async () => {
    const callback = vi.fn()
    const wrapper = createWrapper()

    form.setFieldValue('username', { first: 'John', last: 'Doe' })

    // Render hook with immediate: false to avoid initial call
    renderHook(() => useWatch('username', callback, { immediate: false }), { wrapper })

    // Clear initial call from registration
    callback.mockClear()

    // Setting to same object should not trigger callback
    act(() => {
      form.setFieldValue('username', { first: 'John', last: 'Doe' })
    })

    // Deep equal should not trigger change
    await waitFor(() => {
      expect(callback).not.toHaveBeenCalled()
    })

    // Setting to different object should trigger callback
    act(() => {
      form.setFieldValue('username', { first: 'Jane', last: 'Doe' })
    })

    await waitFor(() => {
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })
})

describe('useWatchValue', () => {
  type FormValues = {
    username: string
    email: string
    age: number
  }

  let form: ReturnType<typeof createForm<FormValues>>

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => {
      return createElement(FormProvider, { value: form }, children)
    }
  }

  beforeEach(() => {
    form = createForm<FormValues>({
      initialValues: { username: '', email: '', age: 0 },
    })
  })

  it('should get single watched value', () => {
    const wrapper = createWrapper()
    form.setFieldValue('username', 'John')

    const { result } = renderHook(() => useWatchValue('username'), { wrapper })

    expect(result.current).toBe('John')
  })

  it('should update watched value', async () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useWatchValue('username'), { wrapper })

    expect(result.current).toBe('')

    act(() => {
      form.setFieldValue('username', 'John')
    })

    await waitFor(() => {
      expect(result.current).toBe('John')
    })
  })

  it('should get multiple watched values', () => {
    const wrapper = createWrapper()
    form.setFieldValue('username', 'John')
    form.setFieldValue('email', 'john@example.com')

    const { result } = renderHook(() => useWatchValue(['username', 'email']), {
      wrapper,
    })

    expect(result.current).toEqual(['John', 'john@example.com'])
  })

  it('should update multiple watched values', async () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useWatchValue(['username', 'email']), {
      wrapper,
    })

    expect(result.current).toEqual(['', ''])

    act(() => {
      form.setFieldValue('username', 'John')
    })

    await waitFor(() => {
      expect(result.current).toEqual(['John', ''])
    })

    act(() => {
      form.setFieldValue('email', 'john@example.com')
    })

    await waitFor(() => {
      expect(result.current).toEqual(['John', 'john@example.com'])
    })
  })

  it('should return undefined for missing path', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useWatchValue('missing'), { wrapper })

    expect(result.current).toBeUndefined()
  })
})
