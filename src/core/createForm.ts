/**
 * @module core/createForm
 * @description Factory function to create a form instance
 */

import type {
  FormValues,
  FormInstance,
  CreateFormOptions,
  FormState,
  UseFieldReturn,
} from './types'
import { createFormStore } from './store'

/**
 * Create a form instance
 * @example
 * const form = createForm({
 *   initialValues: { username: '', age: 0 },
 *   onSubmit: async (values) => { await api.post('/user', values) }
 * })
 */
export function createForm<T extends FormValues>(
  options: CreateFormOptions<T>
): FormInstance<T> {
  // Create Zustand store
  const useStore = createFormStore<T>(options.initialValues || ({} as T))

  // Get current store state helper
  const getState = () => useStore.getState()

  return {
    // Access to store
    _store: useStore,

    // Get form state
    get state(): FormState<T> {
      return getState()
    },

    // Values
    get values(): T {
      return getState().values
    },
    setValues: (values) => useStore.getState().setValues(values),
    setValue: (path, value) => useStore.getState().setValue(path, value),

    // Errors
    get errors(): Record<string, any> {
      return getState().errors
    },
    setError: (path, error) => useStore.getState().setFieldError(path, error),
    clearError: (path) => useStore.getState().clearFieldError(path),
    clearErrors: () => useStore.getState().clearAllErrors(),

    // Touched
    get touched(): Record<string, boolean> {
      return getState().touched
    },
    setTouched: (path, touched) => useStore.getState().setFieldTouched(path, touched),

    // Dirty
    get dirty(): Record<string, boolean> {
      return getState().dirty
    },
    setDirty: (path, dirty) => useStore.getState().setFieldDirty(path, touched),

    // Form status
    get isDirty(): boolean {
      return getState().isDirty
    },
    get isValid(): boolean {
      return getState().isValid
    },
    get isValidating(): boolean {
      return getState().isValidating
    },
    get isSubmitting(): boolean {
      return getState().isSubmitting
    },
    get submitCount(): number {
      return getState().submitCount
    },

    // Methods
    validate: () => useStore.getState().validate(),
    submit: (onSubmit) => useStore.getState().submit(onSubmit),
    reset: () => useStore.getState().reset(),

    // Transient fields
    addTransientField: (path) => {
      useStore.setState((state) => state.transientFields.add(path))
    },
    removeTransientField: (path) => {
      useStore.setState((state) => {
        state.transientFields.delete(path)
      })
    },

    // Field hooks (created lazily)
    _fieldHooks: new Map(),

    // Get or create field hook
    useField: <P>(path: string): UseFieldReturn<P> => {
      // TODO: Implement useField hook
      throw new Error('useField hook not implemented yet')
    },
  }
}
