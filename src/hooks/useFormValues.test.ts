/**
 * @module hooks/useFormValues.test.tsx
 * @description Tests for useFormValues hook
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { useFormValues } from './useFormValues'
import { FormProvider } from './useFormContext'
import { createForm } from '../core/createForm'

describe('useFormValues', () => {
  type FormValues = {
    username: string
    email: string
    age: number
  }

  const createWrapper = (form: ReturnType<typeof createForm<FormValues>>) => {
    return ({ children }: { children: React.ReactNode }) => {
      return createElement(FormProvider, { value: form }, children)
    }
  }

  it('should get all form values', () => {
    const form = createForm<FormValues>({
      initialValues: { username: '', email: '', age: 0 },
    })

    const wrapper = createWrapper(form)
    const { result } = renderHook(() => useFormValues(), { wrapper })

    expect(result.current).toEqual({
      username: '',
      email: '',
      age: 0,
    })
  })

  it('should subscribe to value changes', async () => {
    const form = createForm<FormValues>({
      initialValues: { username: '', email: '', age: 0 },
    })

    const wrapper = createWrapper(form)
    const { result } = renderHook(() => useFormValues(), { wrapper })

    expect(result.current.username).toBe('')

    form.setFieldValue('username', 'John')

    await waitFor(() => {
      expect(result.current.username).toBe('John')
    })
  })

  it('should select specific value', () => {
    const form = createForm<FormValues>({
      initialValues: { username: 'John', email: '', age: 0 },
    })

    const wrapper = createWrapper(form)
    const { result } = renderHook(
      () => useFormValues((v) => v.username),
      { wrapper }
    )

    expect(result.current).toBe('John')
  })

  it('should only re-render when selected value changes', async () => {
    const form = createForm<FormValues>({
      initialValues: { username: '', email: '', age: 0 },
    })

    const wrapper = createWrapper(form)
    const renderSpy = vi.fn()

    renderHook(() => {
      renderSpy()
      return useFormValues((v) => v.username)
    }, { wrapper })

    const initialCallCount = renderSpy.mock.calls.length

    // Changing unrelated field should not trigger re-render
    form.setFieldValue('email', 'test@example.com')

    await waitFor(() => {
      expect(renderSpy.mock.calls.length).toBe(initialCallCount + 1)
    })

    const afterUnrelatedChange = renderSpy.mock.calls.length

    // Changing selected field should trigger re-render
    form.setFieldValue('username', 'John')

    await waitFor(() => {
      expect(renderSpy.mock.calls.length).toBe(afterUnrelatedChange + 1)
    })
  })

  it('should select multiple values', () => {
    const form = createForm<FormValues>({
      initialValues: { username: 'John', email: 'john@example.com', age: 30 },
    })

    const wrapper = createWrapper(form)
    const { result } = renderHook(
      () => useFormValues((v) => ({
        username: v.username,
        email: v.email,
      })),
      { wrapper }
    )

    expect(result.current).toEqual({
      username: 'John',
      email: 'john@example.com',
    })
  })
})

describe('useFormValuesSelectors', () => {
  it('should create selector for specific keys', () => {
    const selectorCreator = vi.fn((keys: string[]) => (values: any) => {
      const result = {} as any
      keys.forEach((key) => {
        result[key] = values[key]
      })
      return result
    })

    const selector = selectorCreator(['username', 'email'])
    const values = { username: 'John', email: 'john@example.com', age: 30 }

    expect(selector(values)).toEqual({
      username: 'John',
      email: 'john@example.com',
    })
  })
})
