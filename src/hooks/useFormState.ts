/**
 * @module hooks/useFormState
 * @description Hook to access form state with precise subscription
 */

import { useStore } from 'zustand'
import type { FormState } from '../core/types'
import { useFormContext } from './useFormContext'

/**
 * Selector type for form state
 */
type FormStateSelector = (state: FormState) => any

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
export function useFormState<R = FormState>(selector: FormStateSelector): R {
  const context = useFormContext()
  
  if (!context) {
    throw new Error('useFormState must be used within a FormProvider')
  }
  
  // If selector provided, use it; otherwise return entire state
  return useStore(context, selector)
}

/**
 * Type-safe selectors for common form state properties
 */
export const useFormStateSelectors = {
  getSubmitting: () => (state: FormState) => state.meta.submitting,
  getSubmitCount: () => (state: FormState) => state.meta.submitCount,
  getValidating: () => (state: FormState) => state.meta.validating,
  getValid: () => (state: FormState) => state.meta.valid,
  getDirty: () => (state: FormState) => state.meta.dirty,
}
