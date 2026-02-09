/**
 * @module hooks/useFieldArray
 * @description Hook for managing array fields with add/remove/move/swap operations
 */

import { useCallback, useMemo, useEffect } from 'react'
import { useStore } from 'zustand'
import type {
  FormInstance,
  FormState,
  Path,
  FieldEntry,
  UseFieldOptions,
} from '../core/types'
import { useFormContext } from './useFormContext'
import { appendPath, getPath, setPath } from '../core/path'

/**
 * Options for useFieldArray hook
 */
export interface UseFieldArrayOptions<T = any> {
  /** Default value for new items */
  defaultValue?: T
  /** Key to use for item identification (for efficient updates) */
  keyName?: string
  /** Minimum number of items */
  min?: number
  /** Maximum number of items */
  max?: number
}

/**
 * Field array item with key
 */
export interface FieldArrayItem<T = any> {
  /** Item value */
  value: T
  /** Unique key for React */
  key: string
}

/**
 * Field array operations
 */
export interface FieldArrayHelpers<T = any> {
  /** Get current items */
  items: FieldArrayItem<T>[]
  /** Number of items */
  length: number

  // === Array operations ===

  /** Append an item to the end */
  append: (item: T) => void
  /** Prepend an item to the beginning */
  prepend: (item: T) => void
  /** Insert an item at a specific index */
  insert: (index: number, item: T) => void
  /** Remove an item at a specific index */
  remove: (index: number) => void
  /** Remove all items */
  removeAll: () => void
  /** Move an item from one index to another */
  move: (from: number, to: number) => void
  /** Swap two items */
  swap: (indexA: number, indexB: number) => void
  /** Replace an item at a specific index */
  replace: (index: number, item: T) => void
}

/**
 * Hook for managing array fields
 * @param name - Field name (path to the array)
 * @param options - Field array configuration options
 * @returns Field array control object
 *
 * @example
 * ```tsx
 * function UsersForm() {
 *   const usersField = useFieldArray('users', {
 *     defaultValue: { name: '', email: '' },
 *   })
 *
 *   return (
 *     <div>
 *       {usersField.items.map((item, index) => (
 *         <div key={item.key}>
 *           <Field name={`users.${index}.name`} />
 *           <Field name={`users.${index}.email`} />
 *           <button onClick={() => usersField.remove(index)}>Remove</button>
 *         </div>
 *       ))}
 *       <button onClick={() => usersField.append({ name: '', email: '' })}>
 *         Add User
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useFieldArray<T = any>(
  name: string,
  options: UseFieldArrayOptions<T> = {}
): FieldArrayHelpers<T> {
  const form = useFormContext<FormInstance>()

  // Get the store's getState method
  const getStore = useCallback(() => form.getStore(), [form])

  // Counter for generating unique keys
  const keyCounter = useMemo(() => ({ current: 0 }), [])

  // Create selector for the array value
  const arrayValueSelector = useCallback(
    (state: FormState): T[] => {
      return (getPath(state.values, name) as T[]) || []
    },
    [name]
  )

  // Subscribe to the array value
  const arrayValue = useStore(form, arrayValueSelector)

  // Create items with keys
  const items = useMemo((): FieldArrayItem<T>[] => {
    if (!Array.isArray(arrayValue)) return []

    return arrayValue.map((value, index) => ({
      value,
      key: `${name}_${index}_${keyCounter.current}`,
    }))
  }, [arrayValue, name, keyCounter])

  // Increment key counter when items change
  useEffect(() => {
    keyCounter.current++
  }, [arrayValue?.length, keyCounter])

  // Get array value helper
  const getArrayValue = useCallback((): T[] => {
    const value = getStore().values
    const arr = getPath(value, name) as T[]
    return Array.isArray(arr) ? arr : []
  }, [getStore, name])

  // Set array value helper
  const setArrayValue = useCallback(
    (newArray: T[]): void => {
      form.setFieldValue(name, newArray)
    },
    [form, name]
  )

  // Append an item to the end
  const append = useCallback(
    (item: T) => {
      const current = getArrayValue()
      if (options.max != null && current.length >= options.max) {
        return
      }
      setArrayValue([...current, item])
    },
    [getArrayValue, setArrayValue, options.max]
  )

  // Prepend an item to the beginning
  const prepend = useCallback(
    (item: T) => {
      const current = getArrayValue()
      if (options.max != null && current.length >= options.max) {
        return
      }
      setArrayValue([item, ...current])
    },
    [getArrayValue, setArrayValue, options.max]
  )

  // Insert an item at a specific index
  const insert = useCallback(
    (index: number, item: T) => {
      const current = getArrayValue()
      if (options.max != null && current.length >= options.max) {
        return
      }
      const newArray = [...current]
      newArray.splice(index, 0, item)
      setArrayValue(newArray)
    },
    [getArrayValue, setArrayValue, options.max]
  )

  // Remove an item at a specific index
  const remove = useCallback(
    (index: number) => {
      const current = getArrayValue()
      if (options.min != null && current.length <= options.min) {
        return
      }
      const newArray = current.filter((_, i) => i !== index)
      setArrayValue(newArray)
    },
    [getArrayValue, setArrayValue, options.min]
  )

  // Remove all items
  const removeAll = useCallback(() => {
    if (options.min != null && options.min > 0) {
      // Keep minimum number of items
      const defaultValue = options.defaultValue || ({} as T)
      setArrayValue(Array(options.min).fill(defaultValue))
    } else {
      setArrayValue([])
    }
  }, [setArrayValue, options.min, options.defaultValue])

  // Move an item from one index to another
  const move = useCallback(
    (from: number, to: number) => {
      const current = getArrayValue()
      if (from < 0 || from >= current.length || to < 0 || to >= current.length) {
        return
      }
      const newArray = [...current]
      const [movedItem] = newArray.splice(from, 1)
      newArray.splice(to, 0, movedItem)
      setArrayValue(newArray)
    },
    [getArrayValue, setArrayValue]
  )

  // Swap two items
  const swap = useCallback(
    (indexA: number, indexB: number) => {
      const current = getArrayValue()
      if (
        indexA < 0 ||
        indexA >= current.length ||
        indexB < 0 ||
        indexB >= current.length
      ) {
        return
      }
      const newArray = [...current]
      const temp = newArray[indexA]
      newArray[indexA] = newArray[indexB]
      newArray[indexB] = temp
      setArrayValue(newArray)
    },
    [getArrayValue, setArrayValue]
  )

  // Replace an item at a specific index
  const replace = useCallback(
    (index: number, item: T) => {
      const current = getArrayValue()
      if (index < 0 || index >= current.length) {
        return
      }
      const newArray = [...current]
      newArray[index] = item
      setArrayValue(newArray)
    },
    [getArrayValue, setArrayValue]
  )

  return {
    items,
    length: items.length,

    // Array operations
    append,
    prepend,
    insert,
    remove,
    removeAll,
    move,
    swap,
    replace,
  }
}
