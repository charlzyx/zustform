/**
 * @module hooks/useVoidField
 * @description Hook for void fields (layout-only fields that don't store data)
 */

import { useMemo, useCallback, useEffect } from 'react'
import { useStore } from 'zustand'
import type {
  FormInstance,
  FormState,
  FieldState,
  FieldEntry,
} from '../core/types'
import { useFormContext } from './useFormContext'

/**
 * Options for useVoidField hook
 */
export interface UseVoidFieldOptions {
  /** Whether the field is disabled */
  disabled?: boolean
  /** Whether the field is read-only */
  readOnly?: boolean
  /** Whether the field is visible */
  visible?: boolean
  /** Decorator label */
  label?: React.ReactNode
  /** Decorator description */
  description?: React.ReactNode
}

/**
 * Return value of useVoidField hook
 */
export interface UseVoidFieldReturn {
  /** Field address (UI tree path) */
  address: string

  // === State ===

  /** Field state */
  state: {
    touched: boolean
    active: boolean
    dirty: boolean
    visible: boolean
    disabled: boolean
    readOnly: boolean
  }

  // === State operations ===

  /** Set disabled state */
  setDisabled: (disabled: boolean) => void
  /** Set visible state */
  setVisible: (visible: boolean) => void

  // === Decorator ===

  /** Decorator label */
  label?: React.ReactNode
  /** Decorator description */
  description?: React.ReactNode
}

/**
 * Hook for void fields (layout-only fields that don't store data)
 * Void fields are useful for:
 * - Form sections/grouping
 * - Layout components
 * - Decorators that don't map to data
 *
 * @param address - Field address (UI tree path)
 * @param options - Field configuration options
 * @returns Void field control object
 *
 * @example
 * ```tsx
 * function FormSection() {
 *   const voidField = useVoidField('user_info', {
 *     label: 'User Information',
 *   })
 *
 *   return (
 *     <fieldset disabled={voidField.state.disabled}>
 *       <legend>{voidField.label}</legend>
 *       {/* Field contents go here *\/}
 *     </fieldset>
 *   )
 * }
 * ```
 */
export function useVoidField(
  address: string,
  options: UseVoidFieldOptions = {}
): UseVoidFieldReturn {
  const form = useFormContext<FormInstance>()

  // Get the store's getState method
  const getStore = useCallback(() => form.getStore(), [form])

  // Create selectors for precise subscription
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

  // Subscribe to field state
  const state = useStore(form, fieldStateSelector)

  // Field entry for registration
  const fieldEntry: FieldEntry = useMemo(
    (): FieldEntry => ({
      address,
      path: null, // Void fields don't have a data path
      isVoid: true,
      transient: false,
      rules: [],
      mounted: false,
      state: {
        touched: false,
        active: false,
        dirty: false,
        visible: options.visible !== false,
        disabled: options.disabled || false,
        readOnly: options.readOnly || false,
        validating: false,
        errors: [],
        warnings: [],
      },
    }),
    [address, options.disabled, options.readOnly, options.visible]
  )

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

  // Register field on mount
  useEffect(
    () => {
      const store = getStore()

      // Register void field with the store
      store.registerField(address, fieldEntry)

      return () => {
        // Cleanup on unmount
        store.unregisterField(address)
      }
    },
    // Only run on mount/unmount - dependencies are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Expose the void field API
  return {
    address,

    // State
    state: {
      touched: state.touched,
      active: state.active,
      dirty: state.dirty,
      visible: state.visible,
      disabled: state.disabled,
      readOnly: state.readOnly,
    },

    // State operations
    setDisabled,
    setVisible,

    // Decorator
    label: options.label,
    description: options.description,
  }
}
