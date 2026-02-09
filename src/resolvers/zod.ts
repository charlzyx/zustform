/**
 * @module resolvers/zod
 * @description Zod schema resolver for ZustForm validation
 */

import type { z } from 'zod'
import type {
  ValidationRule,
  ValidatorContext,
  Path,
} from '../core/types'

/**
 * Zod resolver error format
 */
export interface ZodFieldError {
  path: string[]
  message: string
  code: z.ZodIssue['code']
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
 * const schema = z.object({
 *   username: z.string().min(3).max(20),
 *   email: z.string().email(),
 *   age: z.number().min(18),
 * })
 *
 * const rules = zodResolver(schema)
 * // Returns: { username: [...], email: [...], age: [...] }
 * ```
 */
export function zodResolver<T extends z.ZodTypeAny>(
  schema: T
): Record<string, ValidationRule[]> {
  const rules: Record<string, ValidationRule[]> = {}

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape
    for (const [key, value] of Object.entries(shape)) {
      rules[key] = zodTypeToRules(value as z.ZodTypeAny, key)
    }
  }

  return rules
}

/**
 * Convert a Zod type to ValidationRule array
 */
function zodTypeToRules(zodType: z.ZodTypeAny, path: string): ValidationRule[] {
  const rules: ValidationRule[] = []

  // Process the Zod type to extract validation rules
  const processType = (type: z.ZodTypeAny): void => {
    // Check for ZodEffects (refined schemas, transformed, etc.)
    if (type instanceof z.ZodEffects) {
      processType(type._def.schema)
      return
    }

    // Check for ZodOptional or ZodNullable
    if (type instanceof z.ZodOptional || type instanceof z.ZodNullable) {
      processType(type.unwrap())
      return
    }

    // Check for ZodDefault
    if (type instanceof z.ZodDefault) {
      processType(type._def.innerType)
      return
    }

    // Check for ZodString
    if (type instanceof z.ZodString) {
      rules.push({ type: 'string' })

      // Check for min length
      const minLength = (type as any).minLength
      if (minLength !== undefined && minLength !== null) {
        rules.push({ min: minLength.value, message: minLength.message })
      }

      // Check for max length
      const maxLength = (type as any).maxLength
      if (maxLength !== undefined && maxLength !== null) {
        rules.push({ max: maxLength.value, message: maxLength.message })
      }

      // Check for exact length
      const exactLength = (type as any).length
      if (exactLength !== undefined && exactLength !== null) {
        rules.push({ len: exactLength.value, message: exactLength.message })
      }

      // Check for email
      if ((type as any).dataType === 'email') {
        rules.push({ type: 'email' })
      }

      // Check for url
      if ((type as any).dataType === 'url') {
        rules.push({ type: 'url' })
      }

      // Check for regex pattern
      const regex = (type as any).regex
      if (regex) {
        rules.push({ pattern: regex.regex, message: regex.message })
      }
    }

    // Check for ZodNumber
    if (type instanceof z.ZodNumber) {
      rules.push({ type: 'number' })

      // Check for min value
      const minValue = (type as any).minValue
      if (minValue !== undefined && minValue !== null) {
        rules.push({ min: minValue.value, message: minValue.message })
      }

      // Check for max value
      const maxValue = (type as any).maxValue
      if (maxValue !== undefined && maxValue !== null) {
        rules.push({ max: maxValue.value, message: maxValue.message })
      }
    }

    // Check for ZodBoolean
    if (type instanceof z.ZodBoolean) {
      // No specific rules needed for boolean
    }

    // Check for required (no optional/nullable wrapper)
    // This is implicitly handled - if there's no optional wrapper, it's required
    const isOptional =
      type instanceof z.ZodOptional ||
      type instanceof z.ZodNullable ||
      type instanceof z.ZodDefault

    if (!isOptional) {
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
 * const schema = z.object({
 *   username: z.string().min(3),
 *   email: z.string().email(),
 * })
 *
 * // In your form options:
 * const form = createForm({
 *   initialValues: { username: '', email: '' },
 *   validator: zodValidator(schema),
 * })
 * ```
 */
export function zodValidator<T extends z.ZodTypeAny>(
  schema: T,
  options?: {
    // Whether to use the Zod error messages (default: true)
    useZodMessages?: boolean
    // Custom error formatter
    formatError?: (error: z.ZodError) => Record<string, string[]>
  }
): (values: unknown) => Promise<Record<string, string[]>> {
  return async (values: unknown) => {
    try {
      await schema.parseAsync(values)
      return {}
    } catch (error) {
      if (error instanceof z.ZodError) {
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
 * const emailSchema = z.string().email('Invalid email format')
 *
 * // In your field options:
 * useField('email', {
 *   rules: [zodFieldValidator(emailSchema)],
 * })
 * ```
 */
export function zodFieldValidator<T extends z.ZodTypeAny>(
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
        if (error instanceof z.ZodError) {
          const message = options?.message || error.errors[0]?.message || 'Validation failed'
          return message
        }
        throw error
      }
    },
  }
}
