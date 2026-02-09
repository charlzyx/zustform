/**
 * @module hooks/useFormState
 * @description Hook for accessing form state with precise subscription
 */

import { useMemo } from 'react'
import type { FormStore, FormState } from '../core/store'
import type { UseFormStateOptions, UseFormStateSelectors } from '../core/types'

/**
 * Hook for accessing form state with optional field subscription
 *
 * @param options - Options for subscribing to specific state parts
 *
 * @example
 * // Subscribe to all form state
 * const state = useFormState()
 * // { values, errors, touched, dirty, isValidating, isSubmitting, isDirty, isValid, submitCount }
 *
 * @example
 * // Subscribe to specific state properties only (performance optimized)
 * const state = useFormState({ subscribe: { errors: true, touched: true } })
 * // Only rerenders when errors or touched change
 *
 * @example
 * // Use custom selector
 * const state = useFormState({
 *   selector: (state) => ({ isDirty: state.isDirty, submitCount: state.submitCount })
 * })
 * // Only returns what you specify
 */
export function useFormState<T = FormState<any>>(
  options?: UseFormStateOptions
): T {
  // Get form store from context
  // TODO: Implement context provider
  const store = null as any // Placeholder - will get from context

  const { subscribe, selector } = options || {}

  // Create selector based on options
  const memoizedSelector = useMemo(() => {
    if (!store) {
      return () => ({} as T)
    }

    if (selector) {
      return selector
    }

    if (subscribe && typeof subscribe === 'object') {
      // Subscribe to specific properties
      return (state: FormState<any>) => {
        const result = {} as any
        const keys = Object.keys(subscribe) as Array<keyof typeof subscribe>

        for (const key of keys) {
          if (subscribe[key]) {
            ;(result[key] = state[key])
          }
        }

        return result
      }
    }

    // Default: subscribe to all state
    return (state: FormState<any>) => state
  }, [store, subscribe, selector])

  // Get state from store
  const state = useMemo(() => {
    if (!store) {
      return {} as T
    }

    const fullState = store.getState()
    return memoizedSelector(fullState)
  }, [store, memoizedSelector])

  return state
}

/**
 * Namespace for useFormState helper functions
 */
export const useFormStateSelectors = {
  /**
   * Create a selector for values
   * @example
   * const selector = useFormStateSelectors.values()
   * const state = useFormState({ selector })
   */
  values: <T = any>() => (state: FormState<T>) => state.values,

  /**
   * Create a selector for errors
   * @example
   * const selector = useFormStateSelectors.errors()
   * const state = useFormState({ selector })
   */
  errors: <T = any>() => (state: FormState<T>) => state.errors,

  /**
   * Create a selector for touched state
   * @example
   * const selector = useFormStateSelectors.touched()
   * const state = useFormState({ selector })
   */
  touched: <T = any>() => (state: FormState<T>) => state.touched,

  /**
   * Create a selector for dirty state
   * @example
   * const selector = useFormStateSelectors.dirty()
   * const state = useFormState({ selector })
   */
  dirty: <T = any>() => (state: FormState<T>) => state.dirty,

  /**
   * Create a selector for validation state
   * @example
   * const selector = useFormStateSelectors.validation()
   * const state = useFormState({ selector })
   */
  validation: <T = any>() => (state: FormState<T>) => ({
    isValid: state.isValid,
    isValidating: state.isValidating,
  }),

  /**
   * Create a selector for submission state
   * @example
   * const selector = useFormStateSelectors.submission()
   * const state = useFormState({ selector })
   */
  submission: <T = any>() => (state: FormState<T>) => ({
    isSubmitting: state.isSubmitting,
    submitCount: state.submitCount,
  }),

  /**
   * Create a selector for specific field state
   * @param path - Field path to subscribe to
   * @example
   * const selector = useFormStateSelectors.field('user.name')
   * const state = useFormState({ selector })
   * // Returns: { value: string, error: any, touched: boolean, dirty: boolean }
   */
  field: <T = any, V = any>(path: string) => (state: FormState<T>) => ({
    value: path.split('.').reduce((acc, part) => acc?.[part], state.values) as V,
    error: path.split('.').reduce((acc, part) => acc?.[part], state.errors) as V,
    touched: path.split('.').reduce((acc, part) => acc?.[part], state.touched) as boolean,
    dirty: path.split('.').reduce((acc, part) => acc?.[part], state.dirty) as boolean,
  }),

  /**
   * Create a selector for multiple field states
   * @param paths - Array of field paths
   * @example
   * const selector = useFormStateSelectors.fields(['user.name', 'user.email'])
   * const state = useFormState({ selector })
   * // Returns: { 'user.name': { value, error, ... }, 'user.email': { value, error, ... } }
   */
  fields: <T = any, V = any>(paths: readonly string[]) => (state: FormState<T>) => {
    const result = {} as any

    for (const path of paths) {
      ;(result[path] = {
        value: path.split('.').reduce((acc, part) => acc?.[part], state.values) as V,
        error: path.split('.').reduce((acc, part) => acc?.[part], state.errors) as V,
        touched: path.split('.').reduce((acc, part) => acc?.[part], state.touched) as boolean,
        dirty: path.split('.').reduce((acc, part) => acc?.[part], state.dirty) as boolean,
      })
    }

    return result
  },
}
