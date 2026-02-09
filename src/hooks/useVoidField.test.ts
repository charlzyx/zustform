/**
 * @module hooks/useVoidField.test.tsx
 * @description Tests for useVoidField hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { createElement } from 'react'
import { useVoidField } from './useVoidField'
import { FormProvider } from './useFormContext'
import { createForm } from '../core/createForm'

describe('useVoidField', () => {
  type FormValues = {
    username: string
    email: string
  }

  let form: ReturnType<typeof createForm<FormValues>>

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => {
      return createElement(FormProvider, { value: form }, children)
    }
  }

  beforeEach(() => {
    form = createForm<FormValues>({
      initialValues: { username: '', email: '' },
    })
  })

  it('should register void field on mount', () => {
    const wrapper = createWrapper()
    renderHook(() => useVoidField('layoutSection'), { wrapper })

    const state = form.getStore()
    expect(state.fields.layoutSection).toBeDefined()
    expect(state.fields.layoutSection?.isVoid).toBe(true)
    expect(state.fields.layoutSection?.mounted).toBe(true)
  })

  it('should unregister void field on unmount', () => {
    const wrapper = createWrapper()
    const { unmount } = renderHook(() => useVoidField('layoutSection'), { wrapper })

    expect(form.getStore().fields.layoutSection).toBeDefined()

    unmount()

    expect(form.getStore().fields.layoutSection).toBeUndefined()
  })

  it('should have null path for void fields', () => {
    const wrapper = createWrapper()
    renderHook(() => useVoidField('layoutSection'), { wrapper })

    const fieldEntry = form.getStore().fields.layoutSection
    expect(fieldEntry?.path).toBeNull()
  })

  it('should not store data', () => {
    const wrapper = createWrapper()
    renderHook(() => useVoidField('layoutSection'), { wrapper })

    // Void fields should not affect form values
    expect(form.getValues()).toEqual({
      username: '',
      email: '',
    })
  })

  it('should manage disabled state', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useVoidField('layoutSection'), { wrapper })

    act(() => {
      result.current.setDisabled(true)
    })

    expect(result.current.state.disabled).toBe(true)

    act(() => {
      result.current.setDisabled(false)
    })

    expect(result.current.state.disabled).toBe(false)
  })

  it('should manage visible state', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useVoidField('layoutSection'), { wrapper })

    act(() => {
      result.current.setVisible(false)
    })

    expect(result.current.state.visible).toBe(false)

    act(() => {
      result.current.setVisible(true)
    })

    expect(result.current.state.visible).toBe(true)
  })

  it('should set initial disabled state from options', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useVoidField('layoutSection', { disabled: true }),
      { wrapper }
    )

    expect(result.current.state.disabled).toBe(true)
  })

  it('should set initial visible state from options', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useVoidField('layoutSection', { visible: false }),
      { wrapper }
    )

    expect(result.current.state.visible).toBe(false)
  })

  it('should pass label and description', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(
      () =>
        useVoidField('layoutSection', {
          label: 'Section Label',
          description: 'Section Description',
        }),
      { wrapper }
    )

    expect(result.current.label).toBe('Section Label')
    expect(result.current.description).toBe('Section Description')
  })

  it('should have correct initial state', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useVoidField('layoutSection'), { wrapper })

    expect(result.current.state).toEqual({
      touched: false,
      active: false,
      dirty: false,
      visible: true,
      disabled: false,
      readOnly: false,
    })
  })

  it('should not affect form validity when void field has errors', () => {
    const wrapper = createWrapper()
    renderHook(() => useVoidField('layoutSection'), { wrapper })

    // Manually set errors on void field
    form.setFieldState('layoutSection', { errors: ['Void field error'] })

    // Form should still be valid (void fields don't affect validity)
    expect(form.getStore().meta.valid).toBe(true)
  })
})
