/**
 * @module hooks/useFormValues
 * @description Hook for accessing form values with precise subscription
 */

import { useMemo } from 'react'
import type { FormStore } from '../core/store'
import type { UseFormValuesSelectors } from '../core/types'

/**
 * Get a selector function for accessing specific field values
 * @param paths - Array of field paths to subscribe to
 *
 * @example
 * const selector = useFormValuesSelector(['user.name', 'user.email'])
 * // Returns: { 'user.name': string, 'user.email': string }
 */
export function useFormValuesSelector<T extends Record<string, any>>(
  paths: readonly string[]
): (state: FormValues) => T {
  return (state) => {
    const result = {} as T
    for (const path of paths) {
      // Get value using path utility
      const value = path.split('.').reduce((acc, part) => acc?.[part], state as any)
      ;(result as any)[path] = value
    }
    return result
  }
}

/**
 * Hook for accessing form values with optional field subscription
 *
 * @param options - Options for subscribing to specific fields
 *
 * @example
 * // Subscribe to all values
 * const values = useFormValues()
 *
 * @example
 * // Subscribe to specific fields only (performance optimized)
 * const values = useFormValues({ subscribe: ['user.name', 'user.email'] })
 * // Only rerenders when these fields change
 *
 * @example
 * // Use selector for computed values
 * const values = useFormValues({
 *   selector: (state) => ({ fullName: state.firstName + ' ' + state.lastName })
 * })
 */
export function useFormValues<T = any>(
  options?: {
    /** Array of field paths to subscribe to (performance optimization) */
    subscribe?: readonly string[]
    /** Custom selector function */
    selector?: (state: T) => any
    /** Whether to subscribe to all values (default: true) */
    all?: boolean
  }
): T {
  // Get form store from context
  // TODO: Implement context provider
  const store = null as any // Placeholder - will get from context

  const { subscribe, selector, all = true } = options || {}

  // Create selector based on options
  const memoizedSelector = useMemo(() => {
    if (!store) {
      return () => ({} as T)
    }

    if (selector) {
      return selector
    }

    if (subscribe && subscribe.length > 0) {
      return useFormValuesSelector<T>(subscribe)
    }

    // Default: subscribe to all values
    return (state) => state
  }, [store, subscribe, selector, all])

  // Get values from store
  const values = useMemo(() => {
    if (!store) {
      return {} as T
    }

    // Use memoized selector to get specific values
    const state = store.getState()
    return memoizedSelector(state.values)
  }, [store, memoizedSelector])

  return values
}

/**
 * Namespace for useFormValues helper functions
 */
export const useFormValuesSelectors = {
  /**
   * Create a selector for a single field value
   * @example
   * const selector = useFormValuesSelectors.field('user.name')
   * const values = useFormValues({ selector })
   */
  field: <T>(path: string) => (state: any) => path.split('.').reduce((acc, part) => acc?.[part], state) as T,

  /**
   * Create a selector for multiple field values
   * @example
   * const selector = useFormValuesSelectors.fields(['user.name', 'user.email'])
   * const values = useFormValues({ selector })
   */
  fields: <T extends Record<string, any>>(paths: readonly string[]) =>
    (state: any) => {
      const result = {} as T
      for (const path of paths) {
        ;(result as any)[path] = path.split('.').reduce((acc, part) => acc?.[part], state)
      }
      return result
    },

  /**
   * Create a selector for nested object values
   * @example
   * const selector = useFormValuesSelectors.object('user')
   * const values = useFormValues({ selector })
   */
  object: <T>(prefix: string) =>
    (state: any) => {
      const result = {} as T
      for (const key in state) {
        if (key.startsWith(prefix + '.')) {
          const suffix = key.slice(prefix.length + 1)
          ;(result as any)[suffix] = state[key]
        }
      }
      return result
    },
}
