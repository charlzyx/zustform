/**
 * @module core/createForm
 * @description Form instance factory
 */

import type { FormState, FormOptions, FormInstance, Path } from './types'
import { createFormStore } from './store'

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
    api.batch(() => {
      fn()
    })
  }

  // Form instance methods
  const getValues = (): T => {
    const state = getStore()
    return state.values
  }

  const getSubmitValues = (): T => {
    const state = getStore()
    const values: Partial = { ...state.values }
    Object.entries(state.fields).forEach(([address, entry]) => {
      if (entry.transient && entry.path) {
        deleteNestedValue(values, entry.path)
      }
    })
    return values as T
  }

  const setValues = (values: Partial): void => {
    useStore.getState().setValues(values)
  }

  const getFieldValue = (path: Path): unknown => {
    const state = getStore()
    if (path == null || path === '') return state.values
    
    const parts = path.split('.')
    let current: any = state.values
    for (const part of parts) {
      if (current == null || current === undefined) return undefined
      if (typeof current === 'object') {
        current = current[part]
      } else if (Array.isArray(current)) {
        const index = parseInt(part, 10)
        if (!isNaN(index) && index < current.length) {
          current = current[index]
        }
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

  const setFieldState = (address: Path, state): void => {
    useStore.getState().setFieldState(address, state)
  }

  const validate = async (address?: Path): Promise => {
    const state = getStore()
    const api = useStore.getState()

    if (address) {
      // Validate specific field
      const entry = state.fields[address]
      if (entry) {
        const value = getFieldValue(entry.path || address)
        import { validateField } from './validation'
        const errors = await validateField(value, entry.rules, {
          getFieldValue,
          getFieldState: (p: Path) => {
            const fieldEntry = state.fields[p]
            return fieldEntry?.state
          },
        })
        
        batch(() => {
          api.setFieldErrors(address, errors)
        })
      }
      return errors.length === 0
    } else {
      // Validate all fields
      let allValid = true
      const fieldsToValidate = Object.entries(state.fields).filter(([_, entry]) => !entry.isVoid)
      
      for (const [addr, entry] of fieldsToValidate) {
        const value = getFieldValue(entry.path || addr)
        import { validateField } from './validation'
        const errors = await validateField(value, entry.rules, {
          getFieldValue,
          getFieldState: (p: Path) => {
            const fieldEntry = state.fields[p]
            return fieldEntry?.state
          },
        })
        
        batch(() => {
          api.setFieldErrors(addr, errors)
          if (errors.length > 0) allValid = false
        })
      }
      
      return allValid
    }
  }

  const clearErrors = (address?: Path): void => {
    useStore.getState().clearFieldErrors(address)
  }

  const submit = async (onSubmit?: (values: T) => Promise => {
    const api = useStore.getState()
    const isValid = await validate()
    
    if (!isValid) {
      return { success: false, errors: 'Please fix validation errors before submitting' }
    }
    
    batch(async () => {
      api.setSubmitting(true)
      api.incrementSubmitCount()
      
      if (onSubmit) {
        try {
          await onSubmit(getSubmitValues())
        } catch (e) {
          console.error('Submit error:', e)
        }
      }
      
      api.setSubmitting(false)
    })
    
    return { success: true }
  }

  const watch = (path: Path | Path[], cb: Function): (() => void) => {
    let prevValue: any
    let prevValues: any = {}

    return subscribe(() => {
      const state = getStore()
      const paths = Array.isArray(path) ? path : [path]
      
      let currentValue: any
      if (paths.length === 1) {
        currentValue = getFieldValue(paths[0])
      } else {
        currentValue = paths.map(p => getFieldValue(p))
      }
      
      // Check if value changed
      if (typeof currentValue === 'object') {
        if (!deepEqual(currentValue, prevValue)) {
          prevValue = currentValue
          cb(currentValue, prevValue)
        }
      } else {
        if (currentValue !== prevValue) {
          prevValue = currentValue
          cb(currentValue, prevValue)
        }
      }
    })
  }

  // Deep equality check for watch
  function deepEqual(a: any, b: any): boolean {
    if (a === b) return true
    if (typeof a !== typeof b) return false
    if (a == null || b == null) return a === b
    if (Array.isArray(a) || Array.isArray(b)) {
      if (a.length !== b.length) return false
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false
      }
      return true
    }
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      if (keysA.length !== keysB.length) return false
      for (const key of keysA) {
        if (!keysB.includes(key)) return false
        if (!deepEqual(a[key], b[key])) return false
      }
      return true
    }
    return a === b
  }

  // Delete nested value helper
  function deleteNestedValue(obj: any, path: string): void {
    if (!path) return
    
    const parts = path.split('.')
    let current: any = obj
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      
      if (current == null) {
        current = obj
      } else if (typeof current === 'object') {
        delete current[part]
      } else if (Array.isArray(current)) {
        const index = parseInt(part, 10)
        if (!isNaN(index)) {
          current.splice(index, 1)
        }
      }
    }
  }

  return {
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

    // Reactivity
    watch,
    batch,

    // Store access
    getStore,
    subscribe,
  }
}
