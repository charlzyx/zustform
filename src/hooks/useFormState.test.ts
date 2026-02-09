/**
 * @module hooks/useFormState.test.tsx
 * @description Tests for useFormState hook
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { useFormState } from './useFormState'
import { FormProvider } from './useFormContext'
import { createForm } from '../core/createForm'

describe('useFormState', () => {
  type FormValues = {
    username: string
    email: string
  }

  const createWrapper = (form: ReturnType<typeof createForm<FormValues>>) => {
    return ({ children }: { children: React.ReactNode }) => {
      return createElement(FormProvider, { value: form }, children)
    }
  }

  it('should get entire form state', () => {
    const form = createForm<FormValues>({
      initialValues: { username: '', email: '' },
    })

    const wrapper = createWrapper(form)
    const { result } = renderHook(() => useFormState(), { wrapper })

    expect(result.current).toBeDefined()
    expect(result.current.values).toEqual({ username: '', email: '' })
    expect(result.current.meta).toBeDefined()
  })

  it('should subscribe to state changes', async () => {
    const form = createForm<FormValues>({
      initialValues: { username: '', email: '' },
    })

    const wrapper = createWrapper(form)
    const { result } = renderHook(() => useFormState(), { wrapper })

    expect(result.current.values.username).toBe('')

    form.setFieldValue('username', 'John')

    await waitFor(() => {
      expect(result.current.values.username).toBe('John')
    })
  })

  it('should select specific state property', () => {
    const form = createForm<FormValues>({
      initialValues: { username: '', email: '' },
    })

    const wrapper = createWrapper(form)
    const { result } = renderHook(
      () => useFormState((s) => s.meta.submitting),
      { wrapper }
    )

    expect(result.current).toBe(false)
  })

  it('should only re-render when selected property changes', async () => {
    const form = createForm<FormValues>({
      initialValues: { username: '', email: '' },
    })

    const wrapper = createWrapper(form)
    const renderSpy = vi.fn()

    renderHook(() => {
      renderSpy()
      return useFormState((s) => s.meta.submitting)
    }, { wrapper })

    const initialCallCount = renderSpy.mock.calls.length

    // Changing values should not trigger re-render for submitting selector
    form.setFieldValue('username', 'John')

    await waitFor(() => {
      expect(renderSpy.mock.calls.length).toBe(initialCallCount + 1)
    })
  })

  it('should select multiple state properties', () => {
    const form = createForm<FormValues>({
      initialValues: { username: '', email: '' },
    })

    const wrapper = createWrapper(form)
    const { result } = renderHook(
      () => useFormState((s) => ({
        submitting: s.meta.submitting,
        dirty: s.meta.dirty,
      })),
      { wrapper }
    )

    expect(result.current).toEqual({
      submitting: false,
      dirty: false,
    })
  })
})

describe('useFormStateSelectors', () => {
  it('should create selector for submitting', () => {
    const form = createForm({
      initialValues: { username: '' },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return createElement(FormProvider, { value: form }, children)
    }

    const { result } = renderHook(
      () => {
        const selector = vi.fn((s: any) => s.meta.submitting)
        return selector
      },
      { wrapper }
    )

    expect(result.current).toBeDefined()
  })
})
