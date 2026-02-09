/**
 * @module resolvers/zod
 * @description Zod schema resolver for ZustForm validation
 */

import * as zod from 'zod'
import type {
  ValidationRule,
  ValidatorContext,
  Path,
} from '../core/types'

// Re-export z for type usage
export type { z } from 'zod'

/**
 * Zod resolver error format
 */
export interface ZodFieldError {
  path: string[]
  message: string
  code: zod.ZodIssue['code']
}

/**
 * Convert Zod schema to ValidationRule array
 * This extracts common validation rules from Zod schemas for use with ZustForm
 *
 * @param schema - Zod schema to convert
 * @returns Array of ValidationRule objects
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import { zodResolver } from 'zustform/resolvers'
 *
 * const schema = zod.object({
 *   username: zod.string().min(3).max(20),
 *   email: zod.string().email(),
 *   age: zod.number().min(18),
 * })
 *
 * const rules = zodResolver(schema)
 * // Returns: { username: [...], email: [...], age: [...] }
 * ```
 */
export function zodResolver<T extends zod.ZodTypeAny>(
  schema: T
): Record<string, ValidationRule[]> {
  const rules: Record<string, ValidationRule[]> = {}

  if (schema instanceof zod.ZodObject) {
    const shape = schema.shape
    for (const [key, value] of Object.entries(shape)) {
      rules[key] = zodTypeToRules(value as zod.ZodTypeAny, key)
    }
  }

  return rules
}

/**
 * Convert a Zod type to ValidationRule array
 */
function zodTypeToRules(zodType: zod.ZodTypeAny, path: string): ValidationRule[] {
  const rules: ValidationRule[] = []
  let hasDefault = false
  let isOptional = false
  let isNullable = false

  // Process the Zod type to extract validation rules
  const processType = (type: zod.ZodTypeAny): void => {
    // Check for ZodEffects (refined schemas, transformed, etc.)
    if (type instanceof zod.ZodEffects) {
      processType(type._def.schema)
      return
    }

    // Check for ZodOptional or ZodNullable
    if (type instanceof zod.ZodOptional) {
      isOptional = true
      processType(type.unwrap())
      return
    }

    if (type instanceof zod.ZodNullable) {
      isNullable = true
      processType(type.unwrap())
      return
    }

    // Check for ZodDefault
    if (type instanceof zod.ZodDefault) {
      hasDefault = true
      processType(type._def.innerType)
      return
    }

    // Check for ZodString
    if (type instanceof zod.ZodString) {
      // Check for email/url refinements
      const checks = (type as any)._def.checks || []
      const hasEmail = checks.some((c: any) => c.kind === 'email')
      const hasURL = checks.some((c: any) => c.kind === 'url')

      if (hasEmail) {
        rules.push({ type: 'email' })
      } else if (hasURL) {
        rules.push({ type: 'url' })
      } else {
        rules.push({ type: 'string' })
      }

      // Check for regex pattern
      const regexCheck = checks.find((c: any) => c.kind === 'regex')
      if (regexCheck) {
        rules.push({ pattern: regexCheck.regex, message: 'Pattern validation failed' })
      }

      // Check for min length
      const minLength = checks.find((c: any) => c.kind === 'min')
      if (minLength) {
        rules.push({ min: minLength.value, message: minLength.message })
      }

      // Check for max length
      const maxLength = checks.find((c: any) => c.kind === 'max')
      if (maxLength) {
        rules.push({ max: maxLength.value, message: maxLength.message })
      }
    }

    // Check for ZodNumber
    if (type instanceof zod.ZodNumber) {
      rules.push({ type: 'number' })

      // Check for min/max value (stored in checks in Zod v3)
      const checks = (type as any)._def.checks || []
      const minCheck = checks.find((c: any) => c.kind === 'min')
      const maxCheck = checks.find((c: any) => c.kind === 'max')

      if (minCheck) {
        rules.push({ min: minCheck.value, message: minCheck.message })
      }
      if (maxCheck) {
        rules.push({ max: maxCheck.value, message: maxCheck.message })
      }
    }

    // Check for ZodBoolean
    if (type instanceof zod.ZodBoolean) {
      // No specific rules needed for boolean
    }

    // Check for required (no optional/nullable/default wrapper)
    if (!isOptional && !isNullable && !hasDefault) {
      // Add required rule at the beginning
      const hasRequired = rules.some((r) => r.required === true)
      if (!hasRequired) {
        rules.unshift({ required: true })
      }
    }
  }

  processType(zodType)

  return rules
}

/**
 * Create a validator function from Zod schema
 * This validates the entire form values against the Zod schema
 *
 * @param schema - Zod schema to validate against
 * @returns Validator function
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import { zodValidator } from 'zustform/resolvers'
 *
 * const schema = zod.object({
 *   username: zod.string().min(3),
 *   email: zod.string().email(),
 * })
 *
 * // In your form options:
 * const form = createForm({
 *   initialValues: { username: '', email: '' },
 *   validator: zodValidator(schema),
 * })
 * ```
 */
export function zodValidator<T extends zod.ZodTypeAny>(
  schema: T,
  options?: {
    // Whether to use the Zod error messages (default: true)
    useZodMessages?: boolean
    // Custom error formatter
    formatError?: (error: zod.ZodError) => Record<string, string[]>
  }
): (values: unknown) => Promise<Record<string, string[]>> {
  return async (values: unknown) => {
    try {
      await schema.parseAsync(values)
      return {}
    } catch (error) {
      if (error instanceof zod.ZodError) {
        if (options?.formatError) {
          return options.formatError(error)
        }

        // Default error formatting
        const errors: Record<string, string[]> = {}

        for (const issue of error.issues) {
          const path = issue.path.join('.')
          if (!errors[path]) {
            errors[path] = []
          }
          errors[path].push(issue.message)
        }

        return errors
      }
      throw error
    }
  }
}

/**
 * Create a field-level validator from a Zod schema
 *
 * @param schema - Zod schema for a single field
 * @returns ValidationRule with custom validator
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import { zodFieldValidator } from 'zustform/resolvers'
 *
 * const emailSchema = zod.string().email('Invalid email format')
 *
 * // In your field options:
 * useField('email', {
 *   rules: [zodFieldValidator(emailSchema)],
 * })
 * ```
 */
export function zodFieldValidator<T extends zod.ZodTypeAny>(
  schema: T,
  options?: {
    message?: string
  }
): ValidationRule {
  return {
    validator: async (value: unknown) => {
      try {
        await schema.parseAsync(value)
        return
      } catch (error) {
        if (error instanceof zod.ZodError) {
          const message = options?.message || error.errors[0]?.message || 'Validation failed'
          return message
        }
        throw error
      }
    },
  }
}
