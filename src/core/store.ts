/**
 * @module core/store
 * @description Zustand store implementation for form state management
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { FormState, FormValues, FieldErrors } from './types'
import { runValidation } from './validation'

/**
 * Zustand store middleware type
 */
type FormStore = FormState & {
  // Values operations
  setValue: <T extends FormValues>(path: string, value: T) => void
  setValues: <T extends FormValues>(values: T) => void
  setFieldValue: <T extends FormValues>(path: string, updater: (current: T) => T) => void

  // Errors operations
  setFieldError: (path: string, error: FieldErrors | undefined) => void
  clearFieldError: (path: string) => void
  clearAllErrors: () => void

  // Form operations
  validate: () => Promise<boolean>
  submit: <T>(onSubmit: (values: FormValues) => Promise<T> | T) => Promise<void>
  reset: () => void

  // Dirty operations
  setFieldTouched: (path: string, touched: boolean) => void
  setFieldDirty: (path: string, dirty: boolean) => void
}

/**
 * Helper to get nested value from object
 */
function get<T>(obj: any, path: string): T {
  return path.split('.').reduce((acc, part) => acc?.[part], obj)
}

/**
 * Helper to set nested value in object
 */
function set<T>(obj: any, path: string, value: T): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  const target = keys.reduce((acc, key) => acc[key] = acc[key] || {}, obj)
  target[lastKey] = value
}

/**
 * Helper to check if nested path exists
 */
function has(obj: any, path: string): boolean {
  return path.split('.').every((part) => {
    if (!obj || typeof obj !== 'object') return false
    if (!Object.prototype.hasOwnProperty.call(obj, part)) {
      if (typeof obj[part] === 'undefined') return false
    }
    obj = obj[part]
    return true
  })
}

/**
 * Helper to delete nested path
 */
function del(obj: any, path: string): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  const target = keys.reduce((acc, key) => acc?.[key], obj)
  if (target && typeof target === 'object' && lastKey in target) {
    delete target[lastKey]
  }
}

/**
 * Create a Zustand store for form state
 */
export function createFormStore<T extends FormValues>(initialValues: T) {
  return create<FormStore>()(
    immer((set, get) => ({
      // Initial state
      values: initialValues,
      errors: {},
      touched: {},
      dirty: {},
      isValidating: false,
      isSubmitting: false,
      isDirty: false,
      isValid: true,
      submitCount: 0,
      transientFields: new Set(),

      // Values operations
      setValue: <V>(path: string, value: V) =>
        set((state) => {
          set(state.values, path, value as T[keyof T])
          // Mark field as dirty
          set(state.dirty, path, true)
          // Check if form is dirty
          state.isDirty = true
          // Clear field error on change
          if (has(state.errors, path)) {
            del(state.errors, path)
            state.isValid = Object.keys(state.errors).length === 0
          }
        }),

      setValues: (values: T) =>
        set((state) => {
          state.values = { ...state.values, ...values }
        }),

      setFieldValue: <V>(path: string, updater: (current: V) => V) =>
        set((state) => {
          const current = get<V>(state.values, path)
          const next = updater(current)
          set(state.values, path, next as T[keyof T])
        }),

      // Errors operations
      setFieldError: (path: string, error) =>
        set((state) => {
          if (error === undefined || error === null) {
            del(state.errors, path)
          } else {
            set(state.errors, path, error)
          }
          state.isValid = Object.keys(state.errors).length === 0
        }),

      clearFieldError: (path: string) =>
        set((state) => {
          if (has(state.errors, path)) {
            del(state.errors, path)
            state.isValid = Object.keys(state.errors).length === 0
          }
        }),

      clearAllErrors: () =>
        set((state) => {
          state.errors = {}
          state.isValid = true
        }),

      // Form operations
      validate: async () => {
        const state = get()
        set({ isValidating: true })

        // Run validation (placeholder - will use schema)
        const errors = await runValidation(state.values, {})

        set((state) => {
          state.errors = errors
          state.isValidating = false
          state.isValid = Object.keys(errors).length === 0
        })

        return Object.keys(errors).length === 0
      },

      submit: async <T>(onSubmit: (values: T) => Promise<T> | T) => {
        const state = get()
        set({ isSubmitting: true })

        try {
          // Validate before submit
          const isValid = await get().validate()

          if (!isValid) {
            set({ isSubmitting: false })
            return
          }

          // Filter transient fields
          const submitValues = Object.fromEntries(
            Object.entries(state.values).filter(([key]) => !state.transientFields.has(key))
          ) as T

          await onSubmit(submitValues)

          set((state) => {
            state.isSubmitting = false
            state.submitCount += 1
            state.isDirty = false
            state.dirty = {}
          })
        } catch (error) {
          set({ isSubmitting: false })
          throw error
        }
      },

      reset: () =>
        set((state) => {
          state.values = { ...initialValues }
          state.errors = {}
          state.touched = {}
          state.dirty = {}
          state.isDirty = false
          state.isValid = true
        }),

      // Dirty operations
      setFieldTouched: (path: string, touched: boolean) =>
        set((state) => {
          set(state.touched, path, touched)
        }),

      setFieldDirty: (path: string, dirty: boolean) =>
        set((state) => {
          set(state.dirty, path, dirty)
          state.isDirty = Object.values(state.dirty).some(Boolean)
        }),
    }))
  )
}

/**
 * Type for the store created by createFormStore
 */
export type FormStoreType<T extends FormValues> = ReturnType<typeof createFormStore<T>>
