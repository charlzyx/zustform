/**
 * @module hooks/useFormContext.test
 * @description Tests for useFormContext hook
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { useFormContext, FormProvider } from './useFormContext'
import { createForm } from '../core/createForm'

describe('useFormContext', () => {
  it('should provide form instance through context', () => {
    const form = createForm({ initialValues: { username: '' } })

    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return createElement(FormProvider, { value: form }, children)
    }

    const { result } = renderHook(() => useFormContext(), { wrapper })

    expect(result.current).toBe(form)
  })

  it('should throw when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useFormContext())
    }).toThrow('useFormContext must be used within a FormProvider')

    consoleSpy.mockRestore()
  })
})
