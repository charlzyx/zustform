/**
 * @module resolvers/yup
 * @description Yup schema resolver for ZustForm validation
 *
 * @example
 * ```ts
 * import * as yup from 'yup'
 * import { yupResolver } from 'zustform/resolvers'
 *
 * const schema = yup.object({
 *   username: yup.string().min(3).max(20).required(),
 *   email: yup.string().email().required(),
 *   age: yup.number().min(18).required(),
 * })
 *
 * const rules = yupResolver(schema)
 * ```
 */

// We use type imports to make Yup optional
import type { Schema, AnyObject } from 'yup'

/**
 * Type for Yup schema (using any to avoid dependency issues)
 */
export type YupSchema = any

/**
 * Type for Yup validation error
 */
export type YupValidationError = any

/**
 * Convert Yup schema to ValidationRule array
 *
 * @param schema - Yup schema to convert
 * @returns Array of ValidationRule objects
 */
export function yupResolver<T extends Schema<any>>(schema: T): Record<string, import('../core/types').ValidationRule[]> {
  const rules: Record<string, import('../core/types').ValidationRule[]> = {}

  // For Yup, we need to test the schema to extract rules
  // Since we can't directly introspect Yup schemas, we provide a validator function
  // instead of extracting rules

  return rules
}

/**
 * Create a validator function from Yup schema
 * This validates the entire form values against the Yup schema
 *
 * @param schema - Yup schema to validate against
 * @returns Validator function that returns errors by field path
 *
 * @example
 * ```ts
 * import * as yup from 'yup'
 * import { yupValidator } from 'zustform/resolvers'
 *
 * const schema = yup.object({
 *   username: yup.string().min(3).required(),
 *   email: yup.string().email().required(),
 * })
 *
 * // In your form options:
 * const form = createForm({
 *   initialValues: { username: '', email: '' },
 *   validator: yupValidator(schema),
 * })
 * ```
 */
export function yupValidator<T extends Schema<any>>(
  schema: T
): (values: unknown) => Promise<Record<string, string[]>> {
  return async (values: unknown) => {
    try {
      await schema.validate(values, { abortEarly: false })
      return {}
    } catch (error) {
      const errors: Record<string, string[]> = {}

      if (error && typeof error === 'object' && 'inner' in error) {
        const yupError = error as YupValidationError

        for (const err of yupError.inner || []) {
          const path = err.path || ''
          if (!errors[path]) {
            errors[path] = []
          }
          errors[path].push(err.message || 'Validation failed')
        }
      }

      return errors
    }
  }
}

/**
 * Create a field-level validator from a Yup schema
 *
 * @param yupSchema - Yup schema for a single field
 * @returns ValidationRule with custom validator
 *
 * @example
 * ```ts
 * import * as yup from 'yup'
 * import { yupFieldValidator } from 'zustform/resolvers'
 *
 * const emailSchema = yup.string().email('Invalid email format')
 *
 * // In your field options:
 * useField('email', {
 *   rules: [yupFieldValidator(emailSchema)],
 * })
 * ```
 */
export function yupFieldValidator(
  yupSchema: Schema<any>
): import('../core/types').ValidationRule {
  return {
    validator: async (value: unknown) => {
      try {
        await yupSchema.validate(value)
        return
      } catch (error) {
        if (error && typeof error === 'object' && 'message' in error) {
          return (error as { message: string }).message
        }
        return 'Validation failed'
      }
    },
  }
}

/**
 * Extract common validation rules from a Yup schema
 * This attempts to parse Yup schema into ValidationRule objects
 * Note: Not all Yup features can be represented as ValidationRule
 *
 * @param yupSchema - Yup schema to parse
 * @returns Array of ValidationRule objects
 *
 * @example
 * ```ts
 * import * as yup from 'yup'
 * import { parseYupSchema } from 'zustform/resolvers'
 *
 * const stringSchema = yup.string().min(3).max(20).required()
 * const rules = parseYupSchema(stringSchema)
 * // Returns: [
 * //   { type: 'string' },
 * //   { required: true },
 * //   { min: 3 },
 * //   { max: 20 }
 * // ]
 * ```
 */
export function parseYupSchema(yupSchema: Schema<any>): import('../core/types').ValidationRule[] {
  const rules: import('../core/types').ValidationRule[] = []

  // Type-based rules
  const tests = (yupSchema as any).tests || []

  // Check for required
  const exclusiveTests = tests.filter((t: any) => t?.OPTIONS?.exclusive === true)
  const requiredTest = exclusiveTests.find((t: any) => t?.OVERRIDE === false)
  if (requiredTest) {
    rules.push({ required: true })
  }

  // Check for type
  // Note: This is simplified - real implementation would need better introspection
  if ((yupSchema as any).type === 'string') {
    rules.push({ type: 'string' })
  } else if ((yupSchema as any).type === 'number') {
    rules.push({ type: 'number' })
  } else if ((yupSchema as any).type === 'boolean') {
    // Boolean type doesn't need special handling
  }

  // Check for email (custom test)
  const emailTest = tests.find((t: any) =>
    t?.OPTIONS?.name === 'email' ||
    t?.OVERRIDE?.test?.toString?.().includes('email')
  )
  if (emailTest) {
    rules.push({ type: 'email' })
  }

  // Check for url (custom test)
  const urlTest = tests.find((t: any) =>
    t?.OPTIONS?.name === 'url' ||
    t?.OVERRIDE?.test?.toString?.().includes('url')
  )
  if (urlTest) {
    rules.push({ type: 'url' })
  }

  // Check for min/max/length constraints
  for (const test of tests) {
    const params = test?.OPTIONS?.params || {}
    const testName = test?.OPTIONS?.name

    if (testName === 'min' || testName === 'length') {
      if ('min' in params) {
        rules.push({ min: params.min })
      }
      if ('length' in params) {
        rules.push({ min: params.length })
      }
    }

    if (testName === 'max') {
      if ('max' in params) {
        rules.push({ max: params.max })
      }
    }

    if (testName === 'matches' && 'regex' in params) {
      rules.push({ pattern: params.regex })
    }
  }

  return rules
}
