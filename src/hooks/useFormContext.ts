/**
 * @module hooks/useFormContext
 * @description Hook to access form instance through React Context
 */

import { useContext, useEffect } from 'react'
import { createContext } from 'react'
import type { FormInstance } from '../core/types'

/**
 * Form Context for accessing the form instance
 */
const FormContext = createContext<FormInstance | null>(null)

/**
 * Hook to access form instance
 * @throws {Error} If used outside of FormProvider
 * 
 * @example
 * ```tsx
 * function MyForm() {
 *   const form = useFormContext()
 *   return <form onSubmit={(e) => { e.preventDefault(); form.submit() }}>...</form>
 * }
 * ```
 */
export function useFormContext<T>(): FormInstance {
  const context = useContext(FormContext)
  
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider')
  }
  
  return context
}

/**
 * Context Provider component
 */
export const FormProvider = FormContext.Provider
