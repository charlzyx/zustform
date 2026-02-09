/**
 * @module core/validation.test
 * @description Tests for validation utilities
 */

import { describe, it, expect, vi } from 'vitest'
import { validateField, shouldValidate, isFormValid } from './validation'
import type { ValidationRule, ValidatorContext, FieldState } from './types'

describe('validation', () => {
  const mockContext: ValidatorContext = {
    getFieldValue: vi.fn((path: string) => {
      if (path === 'other') return 'otherValue'
      return undefined
    }),
    getFieldState: vi.fn((path: string) => {
      return {
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
    }),
  }

  describe('validateField', () => {
    it('should return empty array for valid value', async () => {
      const rules: ValidationRule[] = []
      const result = await validateField('test', rules, mockContext)
      expect(result).toEqual([])
    })

    it('should validate required rule', async () => {
      const rules: ValidationRule[] = [{ required: true }]
      const result = await validateField('', rules, mockContext)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('required')
    })

    it('should pass required rule with value', async () => {
      const rules: ValidationRule[] = [{ required: true }]
      const result = await validateField('test', rules, mockContext)
      expect(result).toEqual([])
    })

    it('should validate min length', async () => {
      const rules: ValidationRule[] = [{ min: 3 }]
      const result = await validateField('ab', rules, mockContext)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('at least 3')
    })

    it('should pass min length', async () => {
      const rules: ValidationRule[] = [{ min: 3 }]
      const result = await validateField('abc', rules, mockContext)
      expect(result).toEqual([])
    })

    it('should validate max length', async () => {
      const rules: ValidationRule[] = [{ max: 3 }]
      const result = await validateField('abcd', rules, mockContext)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('at most 3')
    })

    it('should pass max length', async () => {
      const rules: ValidationRule[] = [{ max: 3 }]
      const result = await validateField('abc', rules, mockContext)
      expect(result).toEqual([])
    })

    it('should validate exact length', async () => {
      const rules: ValidationRule[] = [{ len: 3 }]
      const result = await validateField('ab', rules, mockContext)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('exactly 3')
    })

    it('should pass exact length', async () => {
      const rules: ValidationRule[] = [{ len: 3 }]
      const result = await validateField('abc', rules, mockContext)
      expect(result).toEqual([])
    })

    it('should validate pattern', async () => {
      const rules: ValidationRule[] = [{ pattern: /^\d+$/, message: 'Must be numeric' }]
      const result = await validateField('abc', rules, mockContext)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe('Must be numeric')
    })

    it('should pass pattern', async () => {
      const rules: ValidationRule[] = [{ pattern: /^\d+$/, message: 'Must be numeric' }]
      const result = await validateField('123', rules, mockContext)
      expect(result).toEqual([])
    })

    it('should validate email type', async () => {
      const rules: ValidationRule[] = [{ type: 'email' }]
      const result = await validateField('invalid', rules, mockContext)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('email')
    })

    it('should pass valid email', async () => {
      const rules: ValidationRule[] = [{ type: 'email' }]
      const result = await validateField('test@example.com', rules, mockContext)
      expect(result).toEqual([])
    })

    it('should validate url type', async () => {
      const rules: ValidationRule[] = [{ type: 'url' }]
      const result = await validateField('invalid', rules, mockContext)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('URL')
    })

    it('should pass valid url', async () => {
      const rules: ValidationRule[] = [{ type: 'url' }]
      const result = await validateField('https://example.com', rules, mockContext)
      expect(result).toEqual([])
    })

    it('should validate string type', async () => {
      const rules: ValidationRule[] = [{ type: 'string' }]
      const result = await validateField(123 as unknown as string, rules, mockContext)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('string')
    })

    it('should validate number type', async () => {
      const rules: ValidationRule[] = [{ type: 'number' }]
      const result = await validateField('abc' as unknown as number, rules, mockContext)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('number')
    })

    it('should use custom message', async () => {
      const rules: ValidationRule[] = [
        { required: true, message: 'Custom required message' }
      ]
      const result = await validateField('', rules, mockContext)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe('Custom required message')
    })

    it('should run custom validator', async () => {
      const rules: ValidationRule[] = [
        {
          validator: (value) => {
            if (value === 'forbidden') {
              return 'This value is not allowed'
            }
          }
        }
      ]
      const result = await validateField('forbidden', rules, mockContext)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe('This value is not allowed')
    })

    it('should pass custom validator', async () => {
      const rules: ValidationRule[] = [
        {
          validator: (value) => {
            if (value === 'forbidden') {
              return 'This value is not allowed'
            }
          }
        }
      ]
      const result = await validateField('allowed', rules, mockContext)
      expect(result).toEqual([])
    })

    it('should run async custom validator', async () => {
      const rules: ValidationRule[] = [
        {
          validator: async (value) => {
            await new Promise(resolve => setTimeout(resolve, 10))
            if (value === 'taken') {
              return 'This value is already taken'
            }
          }
        }
      ]
      const result = await validateField('taken', rules, mockContext)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe('This value is already taken')
    })

    it('should pass async custom validator', async () => {
      const rules: ValidationRule[] = [
        {
          validator: async (value) => {
            await new Promise(resolve => setTimeout(resolve, 10))
            if (value === 'taken') {
              return 'This value is already taken'
            }
          }
        }
      ]
      const result = await validateField('available', rules, mockContext)
      expect(result).toEqual([])
    })

    it('should skip validation for empty non-required values', async () => {
      const rules: ValidationRule[] = [{ min: 3 }]
      const result = await validateField('', rules, mockContext)
      expect(result).toEqual([])
    })

    it('should validate all rules', async () => {
      const rules: ValidationRule[] = [
        { required: true, message: 'Required' },
        { min: 3, message: 'Too short' },
      ]
      const result = await validateField('', rules, mockContext)
      expect(result).toHaveLength(2)
    })

    it('should handle custom validator throwing error', async () => {
      const rules: ValidationRule[] = [
        {
          validator: () => {
            throw new Error('Validation error')
          }
        }
      ]
      const result = await validateField('test', rules, mockContext)
      expect(result).toHaveLength(1)
      expect(result[0]).toBe('Validation error')
    })
  })

  describe('shouldValidate', () => {
    it('should return true when trigger is undefined', () => {
      expect(shouldValidate(undefined, 'change')).toBe(true)
      expect(shouldValidate(undefined, 'blur')).toBe(true)
      expect(shouldValidate(undefined, 'submit')).toBe(true)
    })

    it('should match single trigger', () => {
      expect(shouldValidate('change', 'change')).toBe(true)
      expect(shouldValidate('blur', 'blur')).toBe(true)
      expect(shouldValidate('submit', 'submit')).toBe(true)
    })

    it('should not mismatch single trigger', () => {
      expect(shouldValidate('change', 'blur')).toBe(false)
      expect(shouldValidate('blur', 'submit')).toBe(false)
      expect(shouldValidate('submit', 'change')).toBe(false)
    })

    it('should match array trigger', () => {
      expect(shouldValidate(['change', 'blur'], 'change')).toBe(true)
      expect(shouldValidate(['change', 'blur'], 'blur')).toBe(true)
      expect(shouldValidate(['blur', 'submit'], 'submit')).toBe(true)
    })

    it('should not mismatch array trigger', () => {
      expect(shouldValidate(['change', 'blur'], 'submit')).toBe(false)
      expect(shouldValidate(['blur'], 'change')).toBe(false)
    })
  })

  describe('isFormValid', () => {
    it('should return true for empty fields', () => {
      expect(isFormValid({})).toBe(true)
    })

    it('should return true when all fields have no errors', () => {
      const fields: Record<string, FieldState> = {
        field1: {
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
        field2: {
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
      }
      expect(isFormValid(fields)).toBe(true)
    })

    it('should return false when any field has errors', () => {
      const fields: Record<string, FieldState> = {
        field1: {
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
        field2: {
          touched: false,
          active: false,
          dirty: false,
          visible: true,
          disabled: false,
          readOnly: false,
          validating: false,
          errors: ['Error message'],
          warnings: [],
        },
      }
      expect(isFormValid(fields)).toBe(false)
    })

    it('should ignore void fields with errors', () => {
      const fields: Record<string, FieldState> = {
        field1: {
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
        voidField: {
          touched: false,
          active: false,
          dirty: false,
          visible: true,
          disabled: false,
          readOnly: false,
          validating: false,
          errors: ['This should be ignored'],
          warnings: [],
        },
      }
      // Void fields should not affect form validity
      expect(isFormValid(fields)).toBe(true)
    })
  })
})
