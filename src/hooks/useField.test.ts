/**
 * @module hooks/useField.test.tsx
 * @description Tests for useField hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { createElement } from 'react'
import { useField } from './useField'
import { FormProvider } from './useFormContext'
import { createForm } from '../core/createForm'

describe('useField', () => {
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

  it('should register field on mount', () => {
    const wrapper = createWrapper()
    renderHook(() => useField('username'), { wrapper })

    const state = form.getStore()
    expect(state.fields.username).toBeDefined()
    expect(state.fields.username?.mounted).toBe(true)
  })

  it('should unregister field on unmount', () => {
    const wrapper = createWrapper()
    const { unmount } = renderHook(() => useField('username'), { wrapper })

    expect(form.getStore().fields.username).toBeDefined()

    unmount()

    expect(form.getStore().fields.username).toBeUndefined()
  })

  it('should get field value', () => {
    const wrapper = createWrapper()
    form.setFieldValue('username', 'John')

    const { result } = renderHook(() => useField('username'), { wrapper })

    expect(result.current.value).toBe('John')
  })

  it('should update value when form value changes', async () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useField('username'), { wrapper })

    act(() => {
      form.setFieldValue('username', 'John')
    })

    await waitFor(() => {
      expect(result.current.value).toBe('John')
    })
  })

  it('should set field value on change', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useField('username'), { wrapper })

    act(() => {
      result.current.onChange('Jane')
    })

    expect(form.getFieldValue('username')).toBe('Jane')
  })

  it('should update field state on blur', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useField('username'), { wrapper })

    act(() => {
      result.current.onBlur()
    })

    expect(result.current.state.touched).toBe(true)
    expect(result.current.state.active).toBe(false)
  })

  it('should update field state on focus', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useField('username'), { wrapper })

    act(() => {
      result.current.onFocus()
    })

    expect(result.current.state.active).toBe(true)
  })

  it('should validate on change when trigger is change', async () => {
    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useField('username', {
        rules: [{ min: 3, message: 'Too short' }],
        validateTrigger: 'change',
      }),
      { wrapper }
    )

    act(() => {
      result.current.onChange('ab')
    })

    await waitFor(() => {
      expect(result.current.state.errors).toContain('Too short')
    })
  })

  it('should validate on blur when trigger is blur', async () => {
    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useField('username', {
        rules: [{ min: 3, message: 'Too short' }],
        validateTrigger: 'blur',
      }),
      { wrapper }
    )

    act(() => {
      result.current.onChange('ab')
      // No validation on change
    })

    expect(result.current.state.errors).toEqual([])

    act(() => {
      result.current.onBlur()
    })

    await waitFor(() => {
      expect(result.current.state.errors).toContain('Too short')
    })
  })

  it('should set errors manually', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useField('username'), { wrapper })

    act(() => {
      result.current.setError('Custom error')
    })

    expect(result.current.state.errors).toEqual(['Custom error'])
  })

  it('should clear errors', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useField('username'), { wrapper })

    act(() => {
      result.current.setError(['Error 1', 'Error 2'])
      result.current.clearError()
    })

    expect(result.current.state.errors).toEqual([])
  })

  it('should reset field', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useField('username', {
        defaultValue: 'DefaultName',
      }),
      { wrapper }
    )

    act(() => {
      form.setFieldValue('username', 'ChangedName')
      form.setFieldState('username', { touched: true, errors: ['Error'] })
      result.current.reset()
    })

    expect(result.current.value).toBe('DefaultName')
    expect(result.current.state.touched).toBe(false)
    expect(result.current.state.errors).toEqual([])
  })

  it('should set disabled state', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useField('username'), { wrapper })

    act(() => {
      result.current.setDisabled(true)
    })

    expect(result.current.disabled).toBe(true)
    expect(result.current.state.disabled).toBe(true)
  })

  it('should set visible state', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useField('username'), { wrapper })

    act(() => {
      result.current.setVisible(false)
    })

    expect(result.current.visible).toBe(false)
    expect(result.current.state.visible).toBe(false)
  })

  describe('getInputProps', () => {
    it('should return input props', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useField('username'), { wrapper })

      const props = result.current.getInputProps()

      expect(props).toHaveProperty('value')
      expect(props).toHaveProperty('onChange')
      expect(props).toHaveProperty('onBlur')
      expect(props).toHaveProperty('onFocus')
      expect(props).toHaveProperty('disabled')
      expect(props).toHaveProperty('readOnly')
    })

    it('should handle change events', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useField('username'), { wrapper })

      const props = result.current.getInputProps()

      act(() => {
        props.onChange({ target: { value: 'John' } })
      })

      expect(result.current.value).toBe('John')
    })

    it('should handle direct value changes', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useField('username'), { wrapper })

      const props = result.current.getInputProps()

      act(() => {
        props.onChange('John')
      })

      expect(result.current.value).toBe('John')
    })
  })

  describe('getCheckboxProps', () => {
    it('should return checkbox props', () => {
      const wrapper = createWrapper()
      form.setFieldValue('username', true)

      const { result } = renderHook(() => useField('username'), { wrapper })
      const props = result.current.getCheckboxProps()

      expect(props.checked).toBe(true)
      expect(props).toHaveProperty('onChange')
      expect(props).toHaveProperty('disabled')
      expect(props).toHaveProperty('readOnly')
    })

    it('should handle checkbox change', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useField('username'), { wrapper })

      const props = result.current.getCheckboxProps()

      act(() => {
        props.onChange({ target: { checked: true } })
      })

      expect(result.current.value).toBe(true)
    })
  })

  describe('getSelectProps', () => {
    it('should return select props', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useField('username'), { wrapper })

      const props = result.current.getSelectProps()

      expect(props).toHaveProperty('value')
      expect(props).toHaveProperty('onChange')
      expect(props).toHaveProperty('disabled')
      expect(props).toHaveProperty('readOnly')
    })
  })

  describe('getDecoratorProps', () => {
    it('should return decorator props', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(
        () =>
          useField('username', {
            label: 'Username',
            description: 'Enter your username',
            rules: [{ required: true }],
          }),
        { wrapper }
      )

      const props = result.current.getDecoratorProps()

      expect(props.label).toBe('Username')
      expect(props.description).toBe('Enter your username')
      expect(props.required).toBe(true)
      expect(props).toHaveProperty('errors')
      expect(props).toHaveProperty('warnings')
      expect(props).toHaveProperty('validating')
      expect(props).toHaveProperty('disabled')
    })
  })

  it('should preserve value on unmount when preserveValue is true', () => {
    const wrapper = createWrapper()
    const { unmount } = renderHook(
      () =>
        useField('username', {
          preserveValue: true,
        }),
      { wrapper }
    )

    act(() => {
      form.setFieldValue('username', 'John')
    })

    unmount()

    // Field should still have value after unmount
    expect(form.getFieldValue('username')).toBe('John')
  })
})
