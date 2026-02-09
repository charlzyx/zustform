/**
 * @module hooks/useField
 * @description Hook for managing individual form fields
 */

import { useMemo, useCallback } from 'react'
import type { FormStore } from '../core/store'
import type { UseFieldReturn, UseFieldOptions, FieldMeta } from '../core/types'
import { get } from '../core/path'

/**
 * Helper to create component props (universal for all input types)
 */
function createComponentProps<T>(
  store: FormStore<any>,
  path: string,
  meta: FieldMeta
): UseFieldReturn<T>['getComponentProps'] {
  return useCallback(
    (extraProps = {}) => {
      const value = get(store.values, path)

      return {
        // Standard form props
        name: path,
        value,
        onChange: (e: React.ChangeEvent<any>) => {
          // Handle different input types
          let nextValue: any

          if (e?.target) {
            // Standard DOM event
            const target = e.target

            // Handle checkbox
            if (target.type === 'checkbox') {
              nextValue = target.checked
            }
            // Handle radio
            else if (target.type === 'radio') {
              nextValue = target.value
            }
            // Handle select multiple
            else if (target.multiple) {
              const options = target.selectedOptions || []
              nextValue = Array.from(options).map((opt: any) => opt.value)
            }
            // Handle file
            else if (target.type === 'file') {
              nextValue = target.files?.[0] || null
            }
            // Handle text inputs
            else {
              nextValue = target.value
            }
          } else {
            // Custom value (e.g., for custom components)
            nextValue = e
          }

          store.setValue(path, nextValue)
          meta.setTouched()
          meta.setDirty()
        },
        onBlur: () => meta.setTouched(),
        onFocus: () => meta.setFocus(true),

        // Merge with extra props (extraProps can override defaults)
        ...extraProps,
      }
    },
    [store, path, meta]
  )
}

/**
 * Helper to create decorator props (for wrapper/form item components)
 *
 * These props are typically used by form wrapper components
 * like Ant Design Form.Item, Material UI FormControl, etc.
 */
function createDecoratorProps<T>(
  store: FormStore<any>,
  path: string,
  meta: FieldMeta
): UseFieldReturn<T>['getDecoratorProps'] {
  return useMemo(
    () => ({
      // Field state (for validation display)
      error: meta.error,
      touched: meta.touched,
      dirty: meta.dirty,
      isValid: !meta.error,
      isInvalid: !!meta.error,
      isValidating: false, // TODO: Get from field-level validating state

      // Helper methods
      setError: meta.setError,
      clearError: meta.clearError,
      setTouched: meta.setTouched,
      setDirty: meta.setDirty,

      // Value access
      value: meta.value,
    }),
    [meta]
  )
}

/**
 * Create field meta object
 */
function createFieldMeta(
  store: FormStore<any>,
  path: string
): FieldMeta {
  return {
    touched: store.touched[path] || false,
    dirty: store.dirty[path] || false,
    error: store.errors[path],
    value: store.values[path],
    setTouched: () => store.setFieldTouched(path, true),
    setDirty: () => store.setFieldDirty(path, true),
    setFocus: (focused: boolean) => {
      // Optional: Store focus state if needed
    },
    setValue: (value: any) => store.setValue(path, value),
    setError: (error: any) => store.setFieldError(path, error),
    clearError: () => store.clearFieldError(path),
  }
}

/**
 * Hook for managing a single form field with precise subscription
 *
 * @param path - Dot notation path to the field value
 * @param options - Field options
 *
 * @example
 * // Basic usage with native inputs
 * const { getComponentProps, error } = useField('username')
 * return <input {...getComponentProps()} />
 *
 * @example
 * // With decorator (Ant Design style)
 * const { getComponentProps, getDecoratorProps } = useField('username')
 * return (
 *   <Form.Item {...getDecoratorProps()}>
 *     <Input {...getComponentProps()} />
 *   </Form.Item>
 * )
 *
 * @example
 * // With custom value format
 * const { getComponentProps } = useField('age', {
 *   format: (value) => value ? Number(value) : ''
 * })
 * return <input type="number" {...getComponentProps()} />
 */
export function useField<T>(
  path: string,
  options: UseFieldOptions<T> = {}
): UseFieldReturn<T> {
  // Get form store from context
  // TODO: Implement context provider
  const store = null as any // Placeholder - will get from context

  const {
    subscribe = false, // Default to no subscription for performance
    validateOn = 'onBlur', // 'onBlur' | 'onChange' | 'onSubmit'
    validation,
  } = options

  // Subscribe to specific field state based on subscription mode
  const fieldState = useMemo(() => {
    if (!store) {
      return {
        value: undefined,
        error: undefined,
        touched: false,
        dirty: false,
      }
    }

    // Only subscribe to what's needed
    const values = store.values
    const errors = store.errors
    const touched = store.touched
    const dirty = store.dirty

    if (subscribe) {
      return {
        value: subscribe.value !== false ? values[path] : undefined,
        error: subscribe.error !== false ? errors[path] : undefined,
        touched: subscribe.touched !== false ? (touched[path] || false) : undefined,
        dirty: subscribe.dirty !== false ? (dirty[path] || false) : undefined,
      }
    }

    return {
      value: values[path],
      error: errors[path],
      touched: touched[path] || false,
      dirty: dirty[path] || false,
    }
  }, [store, path, subscribe])

  // Format value if formatter provided
  const displayValue = useMemo(() => {
    if (options.format && fieldState.value !== undefined) {
      return options.format(fieldState.value)
    }
    return fieldState.value
  }, [fieldState.value, options.format])

  const meta = useMemo(
    () => createFieldMeta(store, path),
    [store, path]
  )

  // Create component props with formatted value
  const getComponentProps = useMemo(
    () => ({
      name: path,
      value: displayValue,
      onChange: (e: React.ChangeEvent<any>) => {
        let nextValue: any

        // Parse value if parser provided
        if (e?.target) {
          const target = e.target

          if (target.type === 'checkbox') {
            nextValue = target.checked
          } else if (target.type === 'radio') {
            nextValue = target.value
          } else if (target.multiple) {
            const options = target.selectedOptions || []
            nextValue = Array.from(options).map((opt: any) => opt.value)
          } else if (target.type === 'file') {
            nextValue = target.files?.[0] || null
          } else {
            nextValue = options.parser ? options.parser(target.value) : target.value
          }
        } else {
          nextValue = e
        }

        store.setValue(path, nextValue as any)
        meta.setTouched()
        meta.setDirty()

        // Trigger validation based on validateOn mode
        if (validateOn === 'onChange' && validation) {
          // TODO: Run validation
        }
      },
      onBlur: () => {
        meta.setTouched()

        // Trigger validation on blur if configured
        if (validateOn === 'onBlur' && validation) {
          // TODO: Run validation
        }
      },
      onFocus: () => {
        meta.setFocus(true)
      },
    }),
    [store, path, displayValue, meta, validateOn, validation, options.parser]
  )

  // Create decorator props
  const getDecoratorProps = useMemo(
    () => ({
      error: meta.error,
      touched: meta.touched,
      dirty: meta.dirty,
      isValid: !meta.error,
      isInvalid: !!meta.error,
      setError: meta.setError,
      clearError: meta.clearError,
      setTouched: meta.setTouched,
      setDirty: meta.setDirty,
      value: meta.value,
    }),
    [meta]
  )

  return {
    // Field state
    value: fieldState.value as T,
    error: fieldState.error,
    touched: fieldState.touched,
    dirty: fieldState.dirty,

    // Field meta
    meta,

    // Prop getters
    getComponentProps,
    getDecoratorProps,

    // Helper functions (backward compatibility)
    setValue: (value: T) => store?.setValue(path, value),
    setError: (error: any) => store?.setFieldError(path, error),
    clearError: () => store?.clearFieldError(path),
    setTouched: () => store?.setFieldTouched(path, true),
    setDirty: () => store?.setFieldDirty(path, true),
  }
}
