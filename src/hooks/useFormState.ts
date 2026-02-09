/**
 * @module hooks/useFormState
 * @description Hook to access form state with precise subscription
 */

import { useStore } from 'zustand'
import type { FormState, FormInstance } from '../core/types'
import { useFormContext } from './useFormContext'

/**
 * Selector type for form state
 */
type FormStateSelector<T, R> = (state: FormState<T>) => R

/**
 * Hook to access form state
 * @param selector - Optional selector function for precise subscription
 * @returns Form state or selected value
 *
 * @example
 * ```tsx
 * // Get entire state (reacts to any change)
 * const state = useFormState()
 *
 * // Get specific value (only reacts to changes in that path)
 * const submitting = useFormState(s => s.meta.submitting)
 * const values = useFormState(s => s.values)
 *
 * // Get multiple values (only reacts to changes in selected paths)
 * const { submitting, validating } = useFormState(s => ({
 *   submitting: s.meta.submitting,
 *   validating: s.meta.validating,
 * }))
 * ```
 */
export function useFormState<T = any, R = FormState<T>>(
  selector?: FormStateSelector<T, R>
): R {
  const form = useFormContext<FormInstance<T>>()

  // If selector provided, use it; otherwise return entire state
  if (selector) {
    return useStore(form, selector)
  }

  return useStore(form, (state) => state as R)
}

/**
 * Type-safe selectors for common form state properties
 */
export const useFormStateSelectors = {
  getSubmitting: <T = any>() => (state: FormState<T>) => state.meta.submitting,
  getSubmitCount: <T = any>() => (state: FormState<T>) => state.meta.submitCount,
  getValidating: <T = any>() => (state: FormState<T>) => state.meta.validating,
  getValid: <T = any>() => (state: FormState<T>) => state.meta.valid,
  getDirty: <T = any>() => (state: FormState<T>) => state.meta.dirty,
}
