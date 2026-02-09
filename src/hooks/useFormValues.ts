/**
 * @module hooks/useFormValues
 * @description Hook to access form values with precise subscription
 */

import { useStore } from 'zustand'
import type { FormState } from '../core/types'
import { useFormContext } from './useFormContext'

/**
 * Selector type for form values
 */
type FormValuesSelector<T, R = T> = (values: T) => R

/**
 * Hook to access form values
 * @param selector - Optional selector function for precise subscription
 * @returns Form values or selected value
 * 
 * @example
 * ```tsx
 * // Get all values (reacts to any value change)
 * const values = useFormValues()
 * 
 * // Get specific value (only reacts to changes in that path)
 * const email = useFormValues(v => v.email)
 * 
 * // Get multiple values (only reacts to changes in selected paths)
 * const { email, password } = useFormValues(v => ({
 *   email: v.email,
 *   password: v.password,
 * }))
 * ```
 */
export function useFormValues<T = any, R = T>(
  selector?: FormValuesSelector<T, R>
): R {
  const context = useFormContext()
  
  if (!context) {
    throw new Error('useFormValues must be used within a FormProvider')
  }
  
  // If selector provided, use it; otherwise return entire values
  if (selector) {
    return useStore(context, selector)
  }
  
  return useStore(context, (state) => state.values)
}

/**
 * Type-safe selectors for common form value paths
 */
export const useFormValuesSelectors = {
  // Helper to create a typed selector
  createSelector: <T, K extends string>(
    keys: K[]
  ): ((values: T) => Pick<T, K> => {
    return (values) => {
      const result = {} as any
      keys.forEach(key => {
        result[key] = values[key]
      })
      return result
    }
  },
}
