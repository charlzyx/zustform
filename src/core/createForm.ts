/**
 * @module core/createForm
 * @description Form instance factory
 */

import type { FormState, FormOptions, FormInstance, Path } from './types'
import { validateField } from './validation'
import { createFormStore } from './store'
import { deepEqual, deletePath, deepClone } from './path'

/**
 * Create a form instance
 */
export function createForm<T>(options: FormOptions<T>): FormInstance<T> {
  const useStore = createFormStore<T>(options)

  // Store methods
  const getStore = (): FormState<T> => useStore.getState()

  const subscribe = (listener: () => void): (() => void) => useStore.subscribe(listener)

  const batch = (fn: () => void): void => {
    const api = useStore.getState()
    api.batch(fn)
  }

  // Form instance methods
  const getValues = (): T => {
    const state = getStore()
    return state.values
  }

  const getSubmitValues = (): T => {
    const state = getStore()
    const values = { ...state.values } as T

    Object.entries(state.fields).forEach(([_, entry]) => {
      if (entry.transient && entry.path) {
        deletePath(values as Record<string, unknown>, entry.path)
      }
    })

    return values
  }

  const setValues = (values: Partial<T>): void => {
    useStore.getState().setValues(values)
  }

  const getFieldValue = (path: Path): unknown => {
    const state = getStore()
    if (path == null || path === '') return state.values

    const parts = path.split('.')
    let current: unknown = state.values

    for (const part of parts) {
      if (current == null || current === undefined) return undefined
      if (typeof current === 'object' && current !== null) {
        current = (current as Record<string, unknown>)[part]
      } else {
        return undefined
      }
    }

    return current
  }

  const setFieldValue = (path: Path, value: unknown): void => {
    useStore.getState().setFieldValue(path, value)
  }

  const resetValues = (): void => {
    useStore.getState().resetValues()
  }

  const getFieldState = (address: Path) => {
    const state = getStore()
    return state.fields[address]?.state
  }

  const setFieldState = (address: Path, stateUpdate: Partial<FormState['fields'][string]['state']>): void => {
    useStore.getState().setFieldState(address, stateUpdate)
  }

  const validate = async (address?: Path): Promise<boolean> => {
    const state = getStore()
    const api = useStore.getState()

    if (address) {
      // Validate specific field
      const entry = state.fields[address]
      if (!entry) return true

      const fieldPath = entry.path || address
      const value = getFieldValue(fieldPath)

      const errors = await validateField(value, entry.rules, {
        getFieldValue,
        getFieldState: (p: Path) => {
          const fieldEntry = state.fields[p]
          return fieldEntry?.state
        },
      })

      api.setFieldErrors(address, errors)
      return errors.length === 0
    } else {
      // Validate all fields
      let allValid = true
      const fieldsToValidate = Object.entries(state.fields).filter(
        ([_, entry]) => !entry.isVoid
      )

      for (const [addr, entry] of fieldsToValidate) {
        const fieldPath = entry.path || addr
        const value = getFieldValue(fieldPath)

        const errors = await validateField(value, entry.rules, {
          getFieldValue,
          getFieldState: (p: Path) => {
            const fieldEntry = state.fields[p]
            return fieldEntry?.state
          },
        })

        api.setFieldErrors(addr, errors)
        if (errors.length > 0) allValid = false
      }

      return allValid
    }
  }

  const clearErrors = (address?: Path): void => {
    useStore.getState().clearFieldErrors(address)
  }

  const submit = async (onSubmit?: (values: T) => Promise<void> | void): Promise<void> => {
    const api = useStore.getState()
    const isValid = await validate()

    if (!isValid) {
      return
    }

    api.setSubmitting(true)
    api.incrementSubmitCount()

    if (onSubmit) {
      try {
        await onSubmit(getSubmitValues())
      } catch (e) {
        console.error('Submit error:', e)
        throw e
      }
    }

    api.setSubmitting(false)
  }

  // Create form instance that also implements ZustandStore interface
  // This allows useStore(form, selector) to work
  const formInstance = {
    // Value operations
    getValues,
    getSubmitValues,
    setValues,
    getFieldValue,
    setFieldValue,
    resetValues,

    // Field state operations
    getFieldState,
    setFieldState,

    // Validation
    validate,
    clearErrors,

    // Submission
    submit,

    // Store access - make compatible with Zustand's useStore
    getState: getStore,
    getStore, // Alias for getState (FormInstance API)
    subscribe,

    // Batch
    batch,
  } as FormInstance<T>

  return formInstance
}
