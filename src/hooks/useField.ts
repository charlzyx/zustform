/**
 * @module hooks/useField
 * @description Hook to manage a single form field with precise subscription
 */

import { useRef, useMemo, useCallback } from 'react'
import { useStore } from 'zustand'
import type {
  FormInstance,
  FormState,
  UseFieldOptions,
  UseFieldReturn,
  FieldState,
  DecoratorProps,
  Path,
  ValidationRule,
  ValidateTrigger,
  FieldEntry,
} from '../core/types'
import { useFormContext } from './useFormContext'
import { shouldValidate } from '../core/validation'
import type { createFormStore } from '../core/store'

/**
 * Get the path for a field entry
 */
function getFieldPath(entry: FieldEntry): string {
  return entry.path || entry.address
}

/**
 * Field state selector - only subscribes to field-specific state
 */
function fieldStateSelector(state: FormState, address: string): FieldState {
  return state.fields[address]?.state || {
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
 * Field value selector - only subscribes to field value
 */
function fieldValueSelector(state: FormState, address: string): unknown {
  const entry = state.fields[address]
  if (!entry || entry.isVoid) return undefined
  const path = entry.path || address
  return getNestedValue(state.values, path)
}

/**
 * Get nested value by dot-notation path
 */
function getNestedValue(obj: any, path: string): any {
  if (!path) return obj
  if (obj == null) return undefined

  const parts = path.split('.')
  let current: any = obj

  for (const part of parts) {
    if (current == null || current === undefined) return undefined
    current = current[part]
  }

  return current
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
): UseFieldReturn {
  const form = useFormContext()

  // Determine field address (for now, name = address)
  const address = name

  // Use selectors for precise subscription
  const useStore = useStore(form.getStore())

  // Get field-specific state
  const state = useStore(fieldStateSelector as (state: FormState) => FieldState)

  // Get field value
  const value = useStore(fieldValueSelector as (state: FormState) => T)

  // Validation context
  const validationContext = useMemo(() => ({
    getFieldValue: (path: string) => {
      const entry = form.getStore().fields[path]
      if (!entry || entry.isVoid) return undefined
      return getNestedValue(form.getStore().values, entry.path || path)
    },
    getFieldState: (path: string) => {
      const store = form.getStore()
      return store.fields[path]?.state
    },
  }), [form, address])

  // Determine validate trigger
  const validateTrigger: ValidateTrigger | ValidateTrigger[] = 
    options.validateTrigger || form.getStore().meta.validateTrigger || 'change'

  // Field entry for registration
  const fieldEntry: FieldEntry = useMemo((): FieldEntry => ({
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
  }), [
    address,
    options.transient,
    options.rules,
    options.validateTrigger,
    options.preserveValue,
    options.defaultValue,
    options.label,
    options.description,
    name,
  ])

  // Validate field function
  const validateField = useCallback(async (): Promise => {
    await form.validate(address)
    return state.errors.length === 0
  }, [form, address])

  // Set error function
  const setError = useCallback((errors: string | string[]) => {
    const errorsArray = Array.isArray(errors) ? errors : [errors]
    form.batch(() => {
      form.setFieldState(address, { errors: errorsArray })
    })
  }, [form, address])

  // Clear error function
  const clearError = useCallback(() => {
    form.setFieldState(address, { errors: [] })
  }, [form, address])

  // Reset field function
  const reset = useCallback(() => {
    const form = useFormContext()
    const entry = form.getStore().fields[address]
    if (entry && entry.defaultValue !== undefined) {
      form.setFieldValue(address, entry.defaultValue)
    }
    form.setFieldState(address, {
      touched: false,
      dirty: false,
      errors: [],
    })
  }, [form, address])

  // Set disabled state
  const setDisabled = useCallback((disabled: boolean) => {
    form.setFieldState(address, { disabled })
  }, [form, address])

  // Set visible state
  const setVisible = useCallback((visible: boolean) => {
    form.setFieldState(address, { visible })
  }, [form, address])

  // Change handler
  const onChange = useCallback((newValue: T) => {
    const store = form.getStore()
    const shouldValidate = shouldValidate(validateTrigger, 'change')
    const prevValue = store.values
    
    // Set value
    form.setFieldValue(address, newValue)
    
    // Validate on change if needed
    if (shouldValidate && options.rules && options.rules.length > 0) {
      validateField().catch(() => {})
    }
  }, [form, address, options.rules, validateTrigger])

  // Blur handler
  const onBlur = useCallback(() => {
    const shouldValidate = shouldValidate(validateTrigger, 'blur')
    
    form.setFieldState(address, { active: false })
    
    if (shouldValidate && options.rules && options.rules.length > 0) {
      validateField().catch(() => {})
    }
  }, [form, address, options.rules, validateTrigger])

  // Focus handler
  const onFocus = useCallback(() => {
    form.setFieldState(address, { active: true })
  }, [address])

  // Input props getter
  const getInputProps = useCallback(() => ({
    value,
    onChange: (e: any) => {
      const newValue = 'target' in e ? e.target.value : e
      onChange(newValue as T)
    },
    onBlur,
    onFocus,
    disabled: state.disabled,
    readOnly: state.readOnly,
  }), [value, onChange, onBlur, onFocus, state.disabled, state.readOnly])

  // Checkbox props getter
  const getCheckboxProps = useCallback(() => ({
    checked: value as unknown === true,
    onChange: (e: any) => {
      const checked = 'target' in e ? e.target.checked : e
      onChange(checked as T)
    },
    disabled: state.disabled,
    readOnly: state.readOnly,
  }), [value, state.disabled, state.readOnly])

  // Select props getter
  const getSelectProps = useCallback(() => ({
    value,
    onChange,
    disabled: state.disabled,
    readOnly: state.readOnly,
  }), [value, onChange, state.disabled, state.readOnly])

  // Decorator props getter
  const getDecoratorProps = useCallback((): DecoratorProps => ({
    label: options.label,
    description: options.description,
    required: options.rules?.some(r => r.required) || false,
    errors: state.errors,
    warnings: state.warnings,
    validating: state.validating,
    disabled: state.disabled,
    children: undefined, // Will be set by Field component
  }), [
    state.errors,
    state.warnings,
    state.validating,
    state.disabled,
    options.label,
    options.description,
    options.rules,
  ])

  // Register field on mount
  // We'll use a ref to track if this is the first registration
  const isRegistered = useRef(false)

  // Mount effect
  /* useIsomorphicLayoutEffect(() => {
    if (!isRegistered.current) {
      const store = form.getStore()
      const entry = store.fields[address]
      
      if (!entry || !entry.mounted) {
        form.batch(() => {
          // Register field
          store.registerField(address, fieldEntry)
          
          // Set default value
          if (options.defaultValue !== undefined) {
            const currentValue = getNestedValue(store.values, address)
            if (currentValue === undefined) {
              store.setFieldValue(address, options.defaultValue)
            }
          }
        })
        
        isRegistered.current = true
      }
    }
    
    return () => {
      // Cleanup on unmount
      const store = form.getStore()
      const entry = store.fields[address]
      
      if (entry && options.preserveValue !== true) {
        // Only unregister if not preserving value
        form.batch(() => {
          store.unregisterField(address)
        })
      } else if (!entry || !entry.mounted) {
        // Cleanup just in case
        form.batch(() => {
          store.unregisterField(address)
        })
      }
    }
  }, [form, address, options.preserveValue])

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
    state,
    
    // State operations
    setError,
    clearError,
    validate: validateField,
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

/**
 * Import all hooks from a single entry point
 */
export * from './useFormContext'
export * from './useFormState'
export * from './useFormValues'
export * from './useField'
