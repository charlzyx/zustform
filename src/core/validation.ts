/**
 * @module core/validation
 * @description Validation engine for ZustForm
 */

import type {
  ValidationRule,
  ValidationRuleType,
  ValidatorContext,
  FieldState,
  Path,
} from './types'

/**
 * Validate a single value against rules
 */
export async function validateField(
  value: unknown,
  rules: ValidationRule[],
  context: ValidatorContext
): Promise<string[]> {
  const errors: string[] = []
  
  for (const rule of rules) {
    if (rule.validator) {
      // Custom validator
      try {
        const result = rule.validator(value, context)
        if (result) {
          if (typeof result === 'string') {
            errors.push(result)
          } else if (result instanceof Promise) {
            const awaited = await result
            if (awaited) errors.push(awaited)
          }
        }
      } catch (e) {
        if (e instanceof Error) {
          errors.push(e.message)
        }
      }
    } else {
      // Built-in validators
      const error = validateBuiltinRule(value, rule)
      if (error) {
        errors.push(error)
      }
    }
  }
  
  return errors
}

/**
 * Validate against a built-in rule
 */
function validateBuiltinRule(value: unknown, rule: ValidationRule): string | undefined {
  const { type, required, pattern, min, max, len, message } = rule
  
  // Check required
  if (required && (value == null || value === '' || value === undefined)) {
    return message || 'This field is required'
  }
  
  // Skip validation if empty and not required
  if ((value == null || value === '' || value === undefined) && !required) {
    return undefined
  }
  
  const strValue = String(value)
  
  // Type validation
  if (type === 'string' && typeof value !== 'string') {
    return message || 'This field must be a string'
  }
  if (type === 'number' && typeof value !== 'number') {
    return message || 'This field must be a number'
  }
  if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
    return message || 'This field must be a valid email'
  }
  if (type === 'url' && !/^https?:\/\/.*/.test(String(value))) {
    return message || 'This field must be a valid URL'
  }
  
  // Length validation
  const length = strValue.length
  if (min != null && length < min) {
    return message || `This field must be at least ${min} characters`
  }
  if (max != null && length > max) {
    return message || `This field must be at most ${max} characters`
  }
  if (len != null && length !== len) {
    return message || `This field must be exactly ${len} characters`
  }
  
  // Pattern validation
  if (pattern && !pattern.test(strValue)) {
    return message || 'This field format is invalid'
  }
  
  return undefined
}

/**
 * Run validators based on trigger
 */
export function shouldValidate(
  trigger: ValidateTrigger | ValidateTrigger[] | undefined,
  eventName: 'change' | 'blur' | 'submit'
): boolean {
  if (!trigger) return true
  if (Array.isArray(trigger)) {
    return trigger.includes(eventName)
  }
  return trigger === eventName
}

/**
 * Check if form is valid (all fields have no errors)
 */
export function isFormValid(fields: Record<string, FieldState>): boolean {
  return Object.values(fields).every(field => field.errors.length === 0)
}
