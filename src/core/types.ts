/**
 * @module core/types
 * @description Core type definitions for ZustForm
 */

import type { ReactNode } from 'react'

/**
 * Dot-notation path for accessing nested values
 * @example "user.name" | "items.0.title" | "address"
 */
export type Path = string

/**
 * Validation trigger types
 */
export type ValidateTrigger = 'change' | 'blur' | 'submit'

/**
 * Built-in validation rule types
 */
export type ValidationRuleType = 'string' | 'number' | 'email' | 'url' | 'pattern'

/**
 * Context provided to custom validators
 */
export interface ValidatorContext {
  /** Get a field's value by path */
  getFieldValue: (path: Path) => unknown
  /** Get a field's state by address */
  getFieldState: (address: Path) => FieldState | undefined
}

/**
 * Built-in validation rule
 */
export interface ValidationRule {
  /** Type of the value */
  type?: ValidationRuleType
  /** Whether the field is required */
  required?: boolean
  /** Regular expression pattern */
  pattern?: RegExp
  /** Minimum value/length */
  min?: number
  /** Maximum value/length */
  max?: number
  /** Exact length */
  len?: number
  /** Error message */
  message?: string
  /** Custom validator function */
  validator?: (value: unknown, context: ValidatorContext) => string | void | Promise<string | void>
  /** When to trigger validation */
  trigger?: ValidateTrigger
}

/**
 * State of a single field
 */
export interface FieldState {
  /** Whether the field has been touched */
  touched: boolean
  /** Whether the field is currently focused */
  active: boolean
  /** Whether the field value has changed from initial */
  dirty: boolean
  /** Whether the field is visible */
  visible: boolean
  /** Whether the field is disabled */
  disabled: boolean
  /** Whether the field is read-only */
  readOnly: boolean
  /** Whether the field is currently validating */
  validating: boolean
  /** Validation errors */
  errors: string[]
  /** Validation warnings */
  warnings: string[]
}

/**
 * Field entry stored in the form state
 */
export interface FieldEntry {
  /** Full UI tree path (includes VoidField segments) */
  address: string
  /** Data path (excludes VoidField segments, null for void fields) */
  path: string | null
  /** Whether this is a void field (layout only, no data) */
  isVoid: boolean
  /** Whether this field should be filtered on submit */
  transient: boolean
  /** Current field state */
  state: FieldState
  /** Validation rules */
  rules: ValidationRule[]
  /** Default value */
  defaultValue?: unknown
  /** Validation trigger(s) */
  validateTrigger?: ValidateTrigger | ValidateTrigger[]
  /** Whether to preserve value on unmount */
  preserveValue?: boolean
  /** Whether the field is mounted */
  mounted: boolean
  /** Decorator label (for FormItem integration) */
  label?: ReactNode
  /** Decorator description (for FormItem integration) */
  description?: ReactNode
}

/**
 * Form meta state
 */
export interface FormMeta {
  /** Whether the form is currently submitting */
  submitting: boolean
  /** Number of times the form has been submitted */
  submitCount: number
  /** Whether any field is currently validating */
  validating: boolean
  /** Whether any field value has changed */
  dirty: boolean
  /** Whether the form has valid values */
  valid: boolean
}

/**
 * Form state structure
 */
export interface FormState<T = any> {
  /** Current form values */
  values: T
  /** Initial form values */
  initialValues: T
  /** Fields indexed by address */
  fields: Record<string, FieldEntry>
  /** Form-level metadata */
  meta: FormMeta
}

/**
 * Form instance options
 */
export interface FormOptions<T = any> {
  /** Initial form values */
  initialValues: T
  /** Default validation trigger for all fields */
  validateTrigger?: ValidateTrigger | ValidateTrigger[]
  /** Stop validation on first error */
  validateFirst?: boolean
  /** Whether to validate on submit */
  validateOnSubmit?: boolean
}

/**
 * Form instance API
 */
export interface FormInstance<T = any> {
  // === Value operations ===

  /** Get all form values */
  getValues(): T
  /** Get values for submit (filters transient fields) */
  getSubmitValues(): T
  /** Set multiple form values */
  setValues(values: Partial<T>): void
  /** Get a single field value by path */
  getFieldValue(path: Path): unknown
  /** Set a single field value by path */
  setFieldValue(path: Path, value: unknown): void
  /** Reset all values to initial */
  resetValues(): void

  // === Field state operations ===

  /** Get a field's state by address */
  getFieldState(address: Path): FieldState | undefined
  /** Set a field's state by address */
  setFieldState(address: Path, state: Partial<FieldState>): void

  // === Validation ===

  /** Validate a specific field or the entire form */
  validate(address?: Path): Promise<boolean>
  /** Clear errors for a field or the entire form */
  clearErrors(address?: Path): void

  // === Submission ===

  /** Submit the form */
  submit(onSubmit?: (values: T) => Promise<void> | void): Promise<void>

  // === Store access ===

  /** Get the raw store state */
  getStore(): FormState<T>
  /** Subscribe to store changes */
  subscribe(listener: () => void): () => void
}

/**
 * Props for decorator components (like FormItem)
 */
export interface DecoratorProps {
  /** Field label */
  label?: ReactNode
  /** Field description */
  description?: ReactNode
  /** Whether the field is required */
  required?: boolean
  /** Validation errors */
  errors?: string[]
  /** Validation warnings */
  warnings?: string[]
  /** Whether currently validating */
  validating?: boolean
  /** Whether the field is disabled */
  disabled?: boolean
  /** Child elements (actual input control) */
  children: ReactNode
}

/**
 * Decorator configuration for a field
 */
export interface DecoratorConfig {
  /** Decorator component (e.g., FormItem) */
  component?: React.ComponentType<DecoratorProps>
  /** Additional props for the decorator */
  props?: Record<string, unknown>
}

/**
 * Options for useField hook
 */
export interface UseFieldOptions<T = any> {
  /** Default value for the field */
  defaultValue?: T
  /** Validation rules */
  rules?: ValidationRule[]
  /** Paths this field depends on (for re-validation) */
  dependencies?: Path[]
  /** When to trigger validation */
  validateTrigger?: ValidateTrigger | ValidateTrigger[]
  /** Whether to preserve value on unmount */
  preserveValue?: boolean
  /** Whether to filter this field on submit */
  transient?: boolean
  /** Decorator label */
  label?: ReactNode
  /** Decorator description */
  description?: ReactNode
  /** Decorator configuration */
  decorator?: DecoratorConfig
}

/**
 * Return value of useField hook
 */
export interface UseFieldReturn<T = any> {
  /** Field name (path) */
  name: string
  /** UI tree path (address) */
  address: string
  /** Data path */
  path: string

  // === Value operations ===

  /** Current field value */
  value: T
  /** Change handler */
  onChange: (value: T) => void
  /** Blur handler */
  onBlur: () => void
  /** Focus handler */
  onFocus: () => void

  // === State ===

  /** Field state */
  state: {
    touched: boolean
    active: boolean
    dirty: boolean
    validating: boolean
    errors: string[]
    warnings: string[]
  }

  // === State operations ===

  /** Set errors */
  setError: (errors: string | string[]) => void
  /** Clear errors */
  clearError: () => void
  /** Validate the field */
  validate: () => Promise<boolean>
  /** Reset the field to initial value */
  reset: () => void

  // === Control properties ===

  /** Whether the field is disabled */
  disabled: boolean
  /** Whether the field is read-only */
  readOnly: boolean
  /** Whether the field is visible */
  visible: boolean
  /** Set disabled state */
  setDisabled: (disabled: boolean) => void
  /** Set visible state */
  setVisible: (visible: boolean) => void

  // === Decorator ===

  /** Decorator label */
  label?: ReactNode
  /** Decorator description */
  description?: ReactNode

  // === Prop getters (Headless core) ===

  /** Get props for input elements */
  getInputProps: () => {
    value: T
    onChange: (e: any) => void
    onBlur: () => void
    onFocus: () => void
    disabled: boolean
    readOnly: boolean
  }

  /** Get props for checkbox elements */
  getCheckboxProps: () => {
    checked: boolean
    onChange: (e: any) => void
    disabled: boolean
  }

  /** Get props for select elements */
  getSelectProps: () => {
    value: T
    onChange: (value: T) => void
    disabled: boolean
  }

  /** Get props for decorator components */
  getDecoratorProps: () => DecoratorProps
}
