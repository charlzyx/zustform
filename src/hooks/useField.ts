/**
 * @module hooks/useField
 * @description Hook to manage a single form field with precise subscription
 */

import { useRef, useMemo, useCallback, useEffect } from 'react'
import { useStore } from 'zustand'
import type {
  FormInstance,
  FormState,
  UseFieldOptions,
  UseFieldReturn,
  FieldState,
  DecoratorProps,
  Path,
  FieldEntry,
} from '../core/types'
import { useFormContext } from './useFormContext'
import { shouldValidate } from '../core/validation'
import { getPath } from '../core/path'

/**
 * Get the path for a field entry
 */
function getFieldPath(entry: FieldEntry): string {
  return entry.path || entry.address
}

/**
 * Hook to manage a single form field
 * @param name - Field name (path)
 * @param options - Field configuration options
 * @returns Field control object
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const field = useField('username', {
 *     label: 'Username',
 *     rules: [
 *       { required: true, message: 'Please enter username' },
 *       { min: 3, max: 20 }
 *     ]
 *   })
 *
 *   return (
 *     <div>
 *       <label>{field.label}</label>
 *       <input {...field.getInputProps()} />
 *       {field.state.errors[0] && <span className="error">{field.state.errors[0]}</span>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useField<T = any>(
  name: string,
  options: UseFieldOptions<T> = {}
): UseFieldReturn<T> {
  const form = useFormContext<FormInstance>()

  // Determine field address (for now, name = address)
  const address = name

  // Get the store's getState method
  const getStore = useCallback(() => form.getStore(), [form])

  // Create selectors for precise subscription
  const fieldValueSelector = useCallback(
    (state: FormState): T => {
      const entry = state.fields[address]
      if (!entry || entry.isVoid) return undefined as T
      const fieldPath = getFieldPath(entry)
      return getPath(state.values, fieldPath) as T
    },
    [address]
  )

  const fieldStateSelector = useCallback(
    (state: FormState): FieldState => {
      return (
        state.fields[address]?.state || {
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
      )
    },
    [address]
  )

  const fieldMetaSelector = useCallback(
    (state: FormState) => ({
      required: options.rules?.some((r) => r.required) || false,
    }),
    [options.rules]
  )

  // Subscribe to specific slices of state
  const value = useStore(form, fieldValueSelector)
  const state = useStore(form, fieldStateSelector)
  const meta = useStore(form, fieldMetaSelector)

  // Determine validate trigger
  const validateTrigger =
    options.validateTrigger ||
    getStore().meta.validateTrigger ||
    'change'

  // Field entry for registration
  const fieldEntry: FieldEntry = useMemo(
    (): FieldEntry => ({
      address,
      path: address,
      isVoid: false,
      transient: options.transient || false,
      rules: options.rules || [],
      validateTrigger,
      preserveValue: options.preserveValue || false,
      mounted: false,
      label: options.label,
      description: options.description,
      defaultValue: options.defaultValue,
      state: {
        touched: false,
        active: false,
        dirty: false,
        visible: true,
        disabled: false,
        readOnly: false,
        validating: false,
        errors: [],
        warnings: [],
      },
    }),
    [
      address,
      options.transient,
      options.rules,
      validateTrigger,
      options.preserveValue,
      options.defaultValue,
      options.label,
      options.description,
    ]
  )

  // Validate field function
  const validate = useCallback(async (): Promise<boolean> => {
    await form.validate(address)
    const currentState = getStore()
    return currentState.fields[address]?.state.errors.length === 0 || true
  }, [form, address, getStore])

  // Set error function
  const setError = useCallback(
    (errors: string | string[]) => {
      const errorsArray = Array.isArray(errors) ? errors : [errors]
      form.setFieldState(address, { errors: errorsArray })
    },
    [form, address]
  )

  // Clear error function
  const clearError = useCallback(() => {
    form.setFieldState(address, { errors: [] })
  }, [form, address])

  // Reset field function
  const reset = useCallback(() => {
    const entry = getStore().fields[address]
    if (entry && entry.defaultValue !== undefined) {
      form.setFieldValue(address, entry.defaultValue)
    }
    form.setFieldState(address, {
      touched: false,
      dirty: false,
      errors: [],
    })
  }, [form, address, getStore])

  // Set disabled state
  const setDisabled = useCallback(
    (disabled: boolean) => {
      form.setFieldState(address, { disabled })
    },
    [form, address]
  )

  // Set visible state
  const setVisible = useCallback(
    (visible: boolean) => {
      form.setFieldState(address, { visible })
    },
    [form, address]
  )

  // Change handler
  const onChange = useCallback(
    (newValue: T) => {
      // Set value
      form.setFieldValue(address, newValue)

      // Validate on change if needed
      if (shouldValidate(validateTrigger, 'change') && options.rules && options.rules.length > 0) {
        validate().catch(() => {})
      }
    },
    [form, address, options.rules, validateTrigger, validate]
  )

  // Blur handler
  const onBlur = useCallback(() => {
    form.setFieldState(address, { active: false, touched: true })

    if (shouldValidate(validateTrigger, 'blur') && options.rules && options.rules.length > 0) {
      validate().catch(() => {})
    }
  }, [form, address, options.rules, validateTrigger, validate])

  // Focus handler
  const onFocus = useCallback(() => {
    form.setFieldState(address, { active: true })
  }, [form, address])

  // Input props getter
  const getInputProps = useCallback(() => {
    return {
      value,
      onChange: (e: any) => {
        const newValue = e && typeof e === 'object' && 'target' in e ? e.target.value : e
        onChange(newValue as T)
      },
      onBlur,
      onFocus,
      disabled: state.disabled,
      readOnly: state.readOnly,
    }
  }, [value, onChange, onBlur, onFocus, state.disabled, state.readOnly])

  // Checkbox props getter
  const getCheckboxProps = useCallback(() => {
    return {
      checked: value as unknown === true,
      onChange: (e: any) => {
        const checked = e && typeof e === 'object' && 'target' in e ? e.target.checked : e
        onChange(checked as T)
      },
      disabled: state.disabled,
      readOnly: state.readOnly,
    }
  }, [value, state.disabled, state.readOnly, onChange])

  // Select props getter
  const getSelectProps = useCallback(() => {
    return {
      value,
      onChange,
      disabled: state.disabled,
      readOnly: state.readOnly,
    }
  }, [value, onChange, state.disabled, state.readOnly])

  // Decorator props getter
  const getDecoratorProps = useCallback((): DecoratorProps => {
    return {
      label: options.label,
      description: options.description,
      required: meta.required,
      errors: state.errors,
      warnings: state.warnings,
      validating: state.validating,
      disabled: state.disabled,
      children: undefined, // Will be set by Field component
    }
  }, [state.errors, state.warnings, state.validating, state.disabled, options.label, options.description, meta.required])

  // Register field on mount
  useEffect(
    () => {
      const store = getStore()
      const entry = store.fields[address]

      // Register field with the store
      store.registerField(address, fieldEntry)

      return () => {
        // Cleanup on unmount
        if (options.preserveValue !== true) {
          store.unregisterField(address)
        } else {
          store.setFieldMounted(address, false)
        }
      }
    },
    // Only run on mount/unmount - dependencies are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Expose the full field API
  return {
    name,
    address,
    path: address,

    // Value operations
    value,
    onChange,
    onBlur,
    onFocus,

    // State
    state: {
      touched: state.touched,
      active: state.active,
      dirty: state.dirty,
      validating: state.validating,
      errors: state.errors,
      warnings: state.warnings,
      disabled: state.disabled,
      readOnly: state.readOnly,
      visible: state.visible,
    },

    // State operations
    setError,
    clearError,
    validate,
    reset,

    // Control properties
    disabled: state.disabled,
    readOnly: state.readOnly,
    visible: state.visible,
    setDisabled,
    setVisible,

    // Decorator
    label: options.label,
    description: options.description,

    // Prop getters (Headless core)
    getInputProps,
    getCheckboxProps,
    getSelectProps,
    getDecoratorProps,
  }
}
