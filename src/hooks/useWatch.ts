/**
 * @module hooks/useWatch
 * @description Hook for watching form value changes with precise subscription
 */

import { useEffect, useRef, useCallback } from 'react'
import { useStore } from 'zustand'
import type { FormInstance, FormState, Path } from '../core/types'
import { useFormContext } from './useFormContext'
import { getPath, deepEqual } from '../core/path'

/**
 * Watch options
 */
export interface UseWatchOptions {
  /** Whether to watch only (no initial call) */
  immediate?: boolean
}

/**
 * Hook to watch form value changes
 * @param paths - Single path or array of paths to watch
 * @param callback - Callback function called when watched values change
 * @param options - Watch options
 * @returns Unwatch function
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   // Watch a single field
 *   useWatch('username', (value, prevValue) => {
 *     console.log('Username changed:', value, 'from:', prevValue)
 *   })
 *
 *   // Watch multiple fields
 *   useWatch(['username', 'email'], (values, prevValues) => {
 *     console.log('Fields changed:', values)
 *   })
 *
 *   return <form>...</form>
 * }
 * ```
 */
export function useWatch(
  paths: Path | Path[],
  callback: (value: any, prevValue: any) => void,
  options: UseWatchOptions = {}
): void {
  const form = useFormContext<FormInstance>()
  const { immediate = true } = options

  // Track previous values
  const prevValueRef = useRef<any>(undefined)
  const prevValuesRef = useRef<any[]>(undefined)
  const isFirstRunRef = useRef(true)

  // Normalize paths to array
  const pathsArray = Array.isArray(paths) ? paths : [paths]

  // Create selector for watched values
  const watchedValuesSelector = useCallback(
    (state: FormState) => {
      if (pathsArray.length === 1) {
        return getPath(state.values, pathsArray[0])
      }
      return pathsArray.map((p) => getPath(state.values, p))
    },
    [pathsArray]
  )

  // Subscribe to changes
  const watchedValue = useStore(form, watchedValuesSelector)

  // Handle value changes
  useEffect(() => {
    // Handle first run
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false

      if (immediate) {
        // Call callback immediately with current value
        if (pathsArray.length === 1) {
          callback(watchedValue, undefined)
          prevValueRef.current = watchedValue
        } else {
          callback(watchedValue, undefined)
          prevValuesRef.current = watchedValue
        }
      } else {
        // Just initialize previous value, don't call callback
        if (pathsArray.length === 1) {
          prevValueRef.current = watchedValue
        } else {
          prevValuesRef.current = watchedValue
        }
      }
      return
    }

    let hasChanged = false

    if (pathsArray.length === 1) {
      // Single path watch
      const prevValue = prevValueRef.current
      const currentValue = watchedValue

      // Check if value changed (deep compare for objects)
      if (typeof currentValue === 'object' && currentValue !== null) {
        if (!deepEqual(currentValue, prevValue)) {
          hasChanged = true
        }
      } else {
        if (currentValue !== prevValue) {
          hasChanged = true
        }
      }

      if (hasChanged) {
        callback(currentValue, prevValue)
        prevValueRef.current = currentValue
      }
    } else {
      // Multiple paths watch
      const prevValues = prevValuesRef.current
      const currentValues = watchedValue as any[]

      // Check if any value changed
      for (let i = 0; i < currentValues.length; i++) {
        const currentValue = currentValues[i]
        const prevValue = prevValues?.[i]

        if (typeof currentValue === 'object' && currentValue !== null) {
          if (!deepEqual(currentValue, prevValue)) {
            hasChanged = true
            break
          }
        } else {
          if (currentValue !== prevValue) {
            hasChanged = true
            break
          }
        }
      }

      if (hasChanged) {
        callback(currentValues, prevValues)
        prevValuesRef.current = currentValues
      }
    }
  }, [watchedValue, pathsArray.length, callback, immediate])
}

/**
 * Hook to get current watched value (returns the value directly)
 * @param paths - Single path or array of paths to watch
 * @returns Current watched value(s)
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const username = useWatchValue('username')
 *   const [username, email] = useWatchValue(['username', 'email'])
 *
 *   return <div>Username: {username}</div>
 * }
 * ```
 */
export function useWatchValue<T = any>(
  path: Path
): T | undefined
export function useWatchValue<T = any>(
  paths: Path[]
): T[]
export function useWatchValue<T = any>(
  paths: Path | Path[]
): T | T[] | undefined {
  const form = useFormContext<FormInstance>()

  const watchedValueSelector = useCallback(
    (state: FormState) => {
      if (Array.isArray(paths)) {
        return paths.map((p) => getPath(state.values, p))
      }
      return getPath(state.values, paths)
    },
    [paths]
  )

  return useStore(form, watchedValueSelector) as T | T[] | undefined
}
