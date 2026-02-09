/**
 * @module core/store
 * @description Zustand store for form state management with Immer
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  FormState,
  FormOptions,
  Path,
  FieldEntry,
  FieldState,
  ValidateTrigger,
} from './types'
import { deepClone } from './path'

/**
 * Create a form store with Zustand + Immer
 */
export function createFormStore<T>(options: FormOptions<T>) {
  type Store = FormState<T> & {
    // === Value mutations ===

    /** Set multiple values */
    setValues: (values: Partial<T>) => void
    /** Set a single field value */
    setFieldValue: (path: Path, value: unknown) => void
    /** Reset all values to initial */
    resetValues: () => void

    // === Field registration ===

    /** Register a field */
    registerField: (address: Path, entry: FieldEntry) => void
    /** Unregister a field */
    unregisterField: (address: Path) => void
    /** Mark field as mounted/unmounted */
    setFieldMounted: (address: Path, mounted: boolean) => void

    // === Field state mutations ===

    /** Set field state */
    setFieldState: (address: Path, state: Partial<FieldState>) => void
    /** Set field errors */
    setFieldErrors: (address: Path, errors: string[]) => void
    /** Clear field errors */
    clearFieldErrors: (address?: Path) => void

    // === Form meta mutations ===

    /** Set submitting state */
    setSubmitting: (submitting: boolean) => void
    /** Increment submit count */
    incrementSubmitCount: () => void
    /** Update form meta state */
    updateMeta: (meta: Partial<FormState['meta']>) => void

    // === Batch updates ===

    /** Batch multiple state updates */
    batch: (fn: () => void) => void
  }

  const defaultValidateTrigger: ValidateTrigger | ValidateTrigger[] =
    options.validateTrigger || 'change'

  return create<Store>()(
    immer((set, get) => ({
      // === Initial state ===

      values: options.initialValues,
      initialValues: options.initialValues,
      fields: {},
      meta: {
        submitting: false,
        submitCount: 0,
        validating: false,
        dirty: false,
        valid: true,
        validateTrigger: defaultValidateTrigger,
      },

      // === Value mutations ===

      setValues: (values) =>
        set((state) => {
          Object.assign(state.values, values)
          state.meta.dirty = !deepEqual(state.values, state.initialValues)
        }),

      setFieldValue: (path, value) =>
        set((state) => {
          setNestedValue(state.values as Record<string, unknown>, path, value)
          state.meta.dirty = !deepEqual(state.values, state.initialValues)
        }),

      resetValues: () =>
        set((state) => {
          state.values = deepClone(state.initialValues)
          state.meta.dirty = false
          // Clear all field errors
          Object.values(state.fields).forEach((entry) => {
            entry.state.errors = []
            entry.state.warnings = []
            entry.state.touched = false
            entry.state.dirty = false
          })
        }),

      // === Field registration ===

      registerField: (address, entry) =>
        set((state) => {
          // Get existing entry or create new one
          const existing = state.fields[address]
          const existingValue = existing?.path
            ? getNestedValue(state.values as Record<string, unknown>, existing.path)
            : undefined

          state.fields[address] = {
            ...entry,
            // Use existing state if available, otherwise use entry's state or create default
            state: existing?.state || entry.state || createInitialFieldState(),
            mounted: true,
          }

          // Set default value if provided and value doesn't exist
          if (entry.defaultValue !== undefined && entry.path && existingValue === undefined) {
            setNestedValue(state.values as Record<string, unknown>, entry.path, entry.defaultValue)
          }
        }),

      unregisterField: (address) =>
        set((state) => {
          const entry = state.fields[address]
          if (entry && !entry.preserveValue) {
            // Remove field entry
            delete state.fields[address]
            // Clear value if it's a data field
            if (entry.path && !entry.isVoid) {
              deleteNestedValue(state.values as Record<string, unknown>, entry.path)
            }
          } else if (entry) {
            // Just mark as unmounted
            entry.mounted = false
          }
        }),

      setFieldMounted: (address, mounted) =>
        set((state) => {
          const entry = state.fields[address]
          if (entry) {
            entry.mounted = mounted
          }
        }),

      // === Field state mutations ===

      setFieldState: (address, partialState) =>
        set((state) => {
          const entry = state.fields[address]
          if (entry) {
            Object.assign(entry.state, partialState)
          }
        }),

      setFieldErrors: (address, errors) =>
        set((state) => {
          const entry = state.fields[address]
          if (entry) {
            entry.state.errors = errors
            entry.state.validating = false
          }
          updateFormValid(state)
        }),

      clearFieldErrors: (address) =>
        set((state) => {
          if (address) {
            const entry = state.fields[address]
            if (entry) {
              entry.state.errors = []
            }
          } else {
            // Clear all field errors
            Object.values(state.fields).forEach((entry) => {
              entry.state.errors = []
            })
          }
          updateFormValid(state)
        }),

      // === Form meta mutations ===

      setSubmitting: (submitting) =>
        set((state) => {
          state.meta.submitting = submitting
        }),

      incrementSubmitCount: () =>
        set((state) => {
          state.meta.submitCount++
        }),

      updateMeta: (meta) =>
        set((state) => {
          Object.assign(state.meta, meta)
        }),

      // === Batch updates ===

      batch: (fn) => {
        set((state) => {
          // Enable Immer's batch mode
          fn()
        })
      },
    }))
  )
}

/**
 * Create initial field state
 */
function createInitialFieldState(): FieldState {
  return {
    touched: false,
    active: false,
    dirty: false,
    visible: true,
    disabled: false,
    readOnly: false,
    validating: false,
    errors: [],
    warnings: [],
  }
}

/**
 * Set nested value by dot-notation path
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  if (!path) return

  const parts = path.split('.')
  let current: any = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]

    if (!(part in current) || current[part] == null) {
      // Check if next segment is a number (array index)
      const nextSegment = parts[i + 1]
      const isNextNumeric = /^\d+$/.test(nextSegment)

      current[part] = isNextNumeric ? [] : {}
    }

    current = current[part]

    if (typeof current !== 'object' || current === null) {
      // Path conflict - cannot traverse into primitive
      current[part] = {}
      current = current[part]
    }
  }

  const lastPart = parts[parts.length - 1]
  current[lastPart] = value
}

/**
 * Delete nested value by dot-notation path
 */
function deleteNestedValue(obj: Record<string, unknown>, path: string): void {
  if (!path) return

  const parts = path.split('.')
  let current: any = obj

  // Navigate to parent
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (current == null || typeof current !== 'object') return
    current = current[part]
  }

  if (current == null || typeof current !== 'object') return

  const lastPart = parts[parts.length - 1]
  if (Array.isArray(current)) {
    const index = parseInt(lastPart, 10)
    if (!isNaN(index) && index >= 0 && index < current.length) {
      current.splice(index, 1)
    }
  } else {
    delete current[lastPart]
  }
}

/**
 * Get nested value by dot-notation path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  if (!path) return obj
  if (obj == null) return undefined

  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current == null) return undefined
    if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * Deep equality check
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return a === b
  if (typeof a !== typeof b) return false

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as Record<string, unknown>)
    const keysB = Object.keys(b as Record<string, unknown>)
    if (keysA.length !== keysB.length) return false

    for (const key of keysA) {
      if (!keysB.includes(key)) return false
      if (!deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )) {
        return false
      }
    }
    return true
  }

  return false
}

/**
 * Update form valid state based on all field errors
 */
function updateFormValid(state: FormState): void {
  state.meta.valid = Object.values(state.fields).every(
    (entry) => entry.isVoid || entry.state.errors.length === 0
  )
}
