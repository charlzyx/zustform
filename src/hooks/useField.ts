/**
 * @module hooks/useField
 * @description Hook for managing individual form fields
 */

import { useEffect, useMemo } from 'react'
import type { FormStore } from '../core/store'
import type { UseFieldReturn, UseFieldOptions, FieldMeta } from '../core/types'
import { get, set, has } from '../core/path'

/**
 * Helper to create prop getters for different input types
 */
function createPropGetters<T>(
  store: FormStore<any>,
  path: string,
  meta: FieldMeta
): UseFieldReturn<T>['propGetters'] {
  return {
    // Text/Radio input props
    getInputProps: (extraProps = {}) => ({
      name: path,
      value: get(store.values, path) as string,
      checked: undefined,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        store.setValue(path, value as any)
        meta.setTouched()
      },
      onBlur: () => meta.setTouched(),
      onFocus: () => meta.setFocus(true),
      ...extraProps,
    }),

    // Checkbox input props
    getCheckboxProps: (extraProps = {}) => ({
      name: path,
      type: 'checkbox',
      value: undefined,
      checked: !!get(store.values, path) as boolean,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked
        store.setValue(path, checked as any)
        meta.setTouched()
      },
      onBlur: () => meta.setTouched(),
      onFocus: () => meta.setFocus(true),
      ...extraProps,
    }),

    // Radio input props (single option)
    getRadioProps: (value: any, extraProps = {}) => ({
      name: path,
      type: 'radio',
      value,
      checked: get(store.values, path) === value,
      onChange: () => {
        store.setValue(path, value as any)
        meta.setTouched()
      },
      onBlur: () => meta.setTouched(),
      onFocus: () => meta.setFocus(true),
      ...extraProps,
    }),

    // Select input props
    getSelectProps: (extraProps = {}) => ({
      name: path,
      value: get(store.values, path),
      checked: undefined,
      onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value
        store.setValue(path, value as any)
        meta.setTouched()
      },
      onBlur: () => meta.setTouched(),
      onFocus: () => meta.setFocus(true),
      ...extraProps,
    }),

    // Multiselect input props
    getMultiselectProps: (extraProps = {}) => ({
      name: path,
      value: undefined,
      checked: undefined,
      multiple: true,
      checked: false,
      options: undefined,
      onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value)
        store.setValue(path, selected as any)
        meta.setTouched()
      },
      onBlur: () => meta.setTouched(),
      onFocus: () => meta.setFocus(true),
      ...extraProps,
    }),

    // File input props
    getFileProps: (extraProps = {}) => ({
      name: path,
      type: 'file',
      value: undefined,
      checked: undefined,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        store.setValue(path, file as any)
        meta.setTouched()
      },
      onBlur: () => meta.setTouched(),
      onFocus: () => meta.setFocus(true),
      ...extraProps,
    }),
  }
}

/**
 * Create field meta object
 */
function createFieldMeta(
  store: FormStore<any>,
  path: string
): FieldMeta {
  return {
    touched: has(store.touched, path) && get(store.touched, path),
    dirty: has(store.dirty, path) && get(store.dirty, path),
    error: get(store.errors, path),
    value: get(store.values, path),
    setTouched: () => store.setFieldTouched(path, true),
    setDirty: () => store.setFieldDirty(path, true),
    setFocus: (focused: boolean) => {
      // Store focus state in a separate mechanism if needed
      // For now, just a placeholder
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
 * const { value, error, touched, getInputProps } = useField('user.name')
 * return <input {...getInputProps()} />
 */
export function useField<T>(
  path: string,
  options: UseFieldOptions = {}
): UseFieldReturn<T> {
  // Get form store from context
  // TODO: Implement context provider
  const store = null as any // Placeholder - will get from context

  const {
    subscribe = false, // Default to no subscription for performance
    mode = 'control', // 'control' | 'controlled' | 'uncontrolled'
    // validation = undefined,
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
    if (subscribe) {
      return {
        value: subscribe.value !== false ? get(store.values, path) : undefined,
        error: subscribe.error !== false ? get(store.errors, path) : undefined,
        touched: subscribe.touched !== false ? get(store.touched, path) : undefined,
        dirty: subscribe.dirty !== false ? get(store.dirty, path) : undefined,
      }
    }

    return {
      value: get(store.values, path),
      error: get(store.errors, path),
      touched: has(store.touched, path) && get(store.touched, path),
      dirty: has(store.dirty, path) && get(store.dirty, path),
    }
  }, [store, path, subscribe])

  const meta = useMemo(
    () => createFieldMeta(store, path),
    [store, path]
  )

  const propGetters = useMemo(
    () => createPropGetters<T>(store, path, meta),
    [store, path, meta]
  )

  // Run validation on value change if enabled
  useEffect(() => {
    if (options.validate && mode === 'controlled') {
      // TODO: Implement validation
    }
  }, [fieldState.value, options.validate, mode, path])

  return {
    // Field state
    value: fieldState.value as T,
    error: fieldState.error,
    touched: fieldState.touched,
    dirty: fieldState.dirty,

    // Field meta
    meta,

    // Prop getters
    propGetters,

    // Helper functions
    setValue: (value: T) => store?.setValue(path, value),
    setError: (error: any) => store?.setFieldError(path, error),
    clearError: () => store?.clearFieldError(path),
    setTouched: () => store?.setFieldTouched(path, true),
    setDirty: () => store?.setFieldDirty(path, true),
  }
}
