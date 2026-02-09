/**
 * @module resolvers/zod.test
 * @description Tests for Zod schema resolver
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { zodResolver, zodValidator, zodFieldValidator } from './zod'

describe('zodResolver', () => {
  it('should convert Zod object schema to validation rules', () => {
    const schema = z.object({
      username: z.string().min(3).max(20),
      email: z.string().email(),
      age: z.number().min(18),
    })

    const rules = zodResolver(schema)

    expect(rules.username).toBeDefined()
    expect(rules.email).toBeDefined()
    expect(rules.age).toBeDefined()
  })

  it('should extract string type rules', () => {
    const schema = z.string().min(3).max(20)

    const rules = zodResolver(z.object({ field: schema }))

    expect(rules.field).toContainEqual({ type: 'string' })
    expect(rules.field).toContainEqual({ min: 3 })
    expect(rules.field).toContainEqual({ max: 20 })
  })

  it('should extract email type', () => {
    const schema = z.string().email()

    const rules = zodResolver(z.object({ field: schema }))

    expect(rules.field).toContainEqual({ type: 'email' })
  })

  it('should extract url type', () => {
    const schema = z.string().url()

    const rules = zodResolver(z.object({ field: schema }))

    expect(rules.field).toContainEqual({ type: 'url' })
  })

  it('should extract number type rules', () => {
    const schema = z.number().min(10).max(100)

    const rules = zodResolver(z.object({ field: schema }))

    expect(rules.field).toContainEqual({ type: 'number' })
    expect(rules.field).toContainEqual({ min: 10 })
    expect(rules.field).toContainEqual({ max: 100 })
  })

  it('should handle optional fields', () => {
    const schema = z.string().optional()

    const rules = zodResolver(z.object({ field: schema }))

    // Optional fields should not have required rule
    const hasRequired = rules.field.some((r) => r.required === true)
    expect(hasRequired).toBe(false)
  })

  it('should handle nullable fields', () => {
    const schema = z.string().nullable()

    const rules = zodResolver(z.object({ field: schema }))

    // Nullable fields should not have required rule
    const hasRequired = rules.field.some((r) => r.required === true)
    expect(hasRequired).toBe(false)
  })

  it('should handle default values', () => {
    const schema = z.string().default('default')

    const rules = zodResolver(z.object({ field: schema }))

    // Fields with defaults should not have required rule
    const hasRequired = rules.field.some((r) => r.required === true)
    expect(hasRequired).toBe(false)
  })
})

describe('zodValidator', () => {
  it('should validate values against schema', async () => {
    const schema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
    })

    const validator = zodValidator(schema)

    const validValues = { username: 'John', email: 'john@example.com' }
    const validErrors = await validator(validValues)

    expect(validErrors).toEqual({})

    const invalidValues = { username: 'ab', email: 'invalid' }
    const invalidErrors = await validator(invalidValues)

    expect(invalidErrors.username).toBeDefined()
    expect(invalidErrors.email).toBeDefined()
  })

  it('should return formatted errors', async () => {
    const schema = z.object({
      username: z.string().min(3, 'Username must be at least 3 characters'),
    })

    const validator = zodValidator(schema)

    const errors = await validator({ username: 'ab' })

    expect(errors.username).toContain('Username must be at least 3 characters')
  })

  it('should use custom error formatter', async () => {
    const schema = z.object({
      username: z.string().min(3),
    })

    const customFormatter = vi.fn(() => ({
      custom: ['Custom error message'],
    }))

    const validator = zodValidator(schema, {
      formatError: customFormatter,
    })

    const errors = await validator({ username: 'ab' })

    expect(customFormatter).toHaveBeenCalled()
    expect(errors).toEqual({ custom: ['Custom error message'] })
  })
})

describe('zodFieldValidator', () => {
  it('should validate single field', async () => {
    const schema = z.string().min(3, 'Too short')
    const validator = zodFieldValidator(schema)

    const error = await validator.validator?.('ab')

    expect(error).toBe('Too short')
  })

  it('should pass validation for valid value', async () => {
    const schema = z.string().min(3)
    const validator = zodFieldValidator(schema)

    const error = await validator.validator?.('abc')

    expect(error).toBeUndefined()
  })

  it('should use custom message', async () => {
    const schema = z.string().min(3)
    const validator = zodFieldValidator(schema, {
      message: 'Custom error message',
    })

    const error = await validator.validator?.('ab')

    expect(error).toBe('Custom error message')
  })

  it('should validate email', async () => {
    const schema = z.string().email()
    const validator = zodFieldValidator(schema)

    const error = await validator.validator?.('invalid-email')

    expect(error).toBeDefined()
    expect(error).toContain('email')
  })

  it('should validate number', async () => {
    const schema = z.number().min(18)
    const validator = zodFieldValidator(schema)

    const error = await validator.validator?.(10)

    expect(error).toBeDefined()
  })

  it('should validate with custom refinement', async () => {
    const schema = z
      .string()
      .refine((val) => val === 'allowed', 'This value is not allowed')
    const validator = zodFieldValidator(schema)

    const error = await validator.validator?.('forbidden')

    expect(error).toBe('This value is not allowed')
  })

  it('should handle async refinements', async () => {
    const schema = z
      .string()
      .refine(
        async (val) => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return val !== 'taken'
        },
        { message: 'This value is already taken' }
      )
    const validator = zodFieldValidator(schema)

    const error = await validator.validator?.('taken')

    expect(error).toBe('This value is already taken')
  })
})
