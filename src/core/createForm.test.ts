/**
 * @module core/createForm.test
 * @description Tests for createForm factory
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createForm } from './createForm'
import type { FormOptions } from './types'

describe('createForm', () => {
  type FormValues = {
    username: string
    email: string
    age: number
    address?: {
      city: string
      country: string
    }
  }

  let form: ReturnType<typeof createForm<FormValues>>

  beforeEach(() => {
    const options: FormOptions<FormValues> = {
      initialValues: {
        username: '',
        email: '',
        age: 0,
      },
    }
    form = createForm<FormValues>(options)
  })

  describe('value operations', () => {
    it('should get all values', () => {
      const values = form.getValues()
      expect(values).toEqual({
        username: '',
        email: '',
        age: 0,
      })
    })

    it('should set multiple values', () => {
      form.setValues({ username: 'John', email: 'john@example.com' })

      expect(form.getValues().username).toBe('John')
      expect(form.getValues().email).toBe('john@example.com')
    })

    it('should get field value', () => {
      form.setFieldValue('username', 'John')

      expect(form.getFieldValue('username')).toBe('John')
    })

    it('should get nested field value', () => {
      form.setFieldValue('address.city', 'NYC')

      expect(form.getFieldValue('address.city')).toBe('NYC')
    })

    it('should return undefined for missing path', () => {
      expect(form.getFieldValue('missing')).toBeUndefined()
      expect(form.getFieldValue('address.missing')).toBeUndefined()
    })

    it('should set field value', () => {
      form.setFieldValue('username', 'John')

      expect(form.getValues().username).toBe('John')
    })

    it('should set nested field value', () => {
      form.setFieldValue('address.city', 'NYC')

      expect(form.getValues().address?.city).toBe('NYC')
    })

    it('should reset values to initial', () => {
      // Register field first
      const store = form.getStore()
      store.registerField('username', {
        address: 'username',
        path: 'username',
        isVoid: false,
        transient: false,
        rules: [],
        mounted: true,
        state: {
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
      })

      form.setValues({ username: 'John', email: 'john@example.com' })
      form.setFieldState('username', { touched: true })

      form.resetValues()

      expect(form.getValues()).toEqual({
        username: '',
        email: '',
        age: 0,
      })
      expect(form.getFieldState('username')?.touched).toBe(false)
    })

    it('should get submit values (excluding transient fields)', () => {
      // Register a transient field
      const store = form.getStore()
      store.registerField('passwordConfirm', {
        address: 'passwordConfirm',
        path: 'passwordConfirm',
        isVoid: false,
        transient: true,
        rules: [],
        mounted: true,
        state: {
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
      })
      form.setFieldValue('username', 'John')
      form.setFieldValue('passwordConfirm', 'secret123')

      const submitValues = form.getSubmitValues()

      expect(submitValues.username).toBe('John')
      expect(submitValues).not.toHaveProperty('passwordConfirm')
    })
  })

  describe('field state operations', () => {
    beforeEach(() => {
      const store = form.getStore()
      store.registerField('username', {
        address: 'username',
        path: 'username',
        isVoid: false,
        transient: false,
        rules: [],
        mounted: true,
        state: {
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
      })
    })

    it('should get field state', () => {
      const state = form.getFieldState('username')

      expect(state).toBeDefined()
      expect(state?.touched).toBe(false)
      expect(state?.active).toBe(false)
    })

    it('should return undefined for missing field', () => {
      const state = form.getFieldState('missing')
      expect(state).toBeUndefined()
    })

    it('should set field state', () => {
      form.setFieldState('username', {
        touched: true,
        disabled: true,
      })

      const state = form.getFieldState('username')
      expect(state?.touched).toBe(true)
      expect(state?.disabled).toBe(true)
    })
  })

  describe('validation', () => {
    beforeEach(() => {
      const store = form.getStore()
      store.registerField('username', {
        address: 'username',
        path: 'username',
        isVoid: false,
        transient: false,
        rules: [
          { required: true, message: 'Username is required' },
          { min: 3, message: 'Username must be at least 3 characters' },
        ],
        mounted: true,
        state: {
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
      })
    })

    it('should validate specific field', async () => {
      form.setFieldValue('username', 'ab')

      const isValid = await form.validate('username')

      expect(isValid).toBe(false)
      expect(form.getFieldState('username')?.errors).toContain('Username must be at least 3 characters')
    })

    it('should pass validation for valid value', async () => {
      form.setFieldValue('username', 'John')

      const isValid = await form.validate('username')

      expect(isValid).toBe(true)
      expect(form.getFieldState('username')?.errors).toEqual([])
    })

    it('should validate all fields', async () => {
      const store = form.getStore()
      store.registerField('email', {
        address: 'email',
        path: 'email',
        isVoid: false,
        transient: false,
        rules: [
          { required: true, message: 'Email is required' },
          { type: 'email', message: 'Invalid email format' },
        ],
        mounted: true,
        state: {
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
      })

      form.setFieldValue('username', 'Jo')
      form.setFieldValue('email', 'invalid')

      const isValid = await form.validate()

      expect(isValid).toBe(false)
      expect(form.getFieldState('username')?.errors.length).toBeGreaterThan(0)
      expect(form.getFieldState('email')?.errors.length).toBeGreaterThan(0)
    })

    it('should clear field errors', () => {
      form.setFieldState('username', { errors: ['Error 1', 'Error 2'] })

      form.clearErrors('username')

      expect(form.getFieldState('username')?.errors).toEqual([])
    })

    it('should clear all errors', () => {
      form.setFieldState('username', { errors: ['Error'] })
      form.setFieldState('email', { errors: ['Email Error'] })

      form.clearErrors()

      expect(form.getFieldState('username')?.errors).toEqual([])
      expect(form.getFieldState('email')?.errors).toEqual([])
    })
  })

  describe('submission', () => {
    beforeEach(() => {
      const store = form.getStore()
      store.registerField('username', {
        address: 'username',
        path: 'username',
        isVoid: false,
        transient: false,
        rules: [{ required: true, message: 'Required' }],
        mounted: true,
        state: {
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
      })
    })

    it('should validate on submit', async () => {
      form.setFieldValue('username', '')

      await form.submit()

      expect(form.getFieldState('username')?.errors).toContain('Required')
    })

    it('should call onSubmit with values when valid', async () => {
      const onSubmit = vi.fn()
      form.setFieldValue('username', 'John')

      await form.submit(onSubmit)

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'John' })
      )
    })

    it('should set submitting state', async () => {
      const onSubmit = vi.fn(async () => {
        expect(form.getStore().meta.submitting).toBe(true)
      })

      await form.submit(onSubmit)

      expect(form.getStore().meta.submitting).toBe(false)
    })

    it('should increment submit count', async () => {
      await form.submit()
      await form.submit()

      expect(form.getStore().meta.submitCount).toBe(2)
    })

    it('should not call onSubmit when invalid', async () => {
      const onSubmit = vi.fn()
      form.setFieldValue('username', '')

      await form.submit(onSubmit)

      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('store access', () => {
    it('should get store state', () => {
      const state = form.getStore()

      expect(state.values).toBeDefined()
      expect(state.meta).toBeDefined()
      expect(state.fields).toBeDefined()
    })

    it('should subscribe to changes', () => {
      const listener = vi.fn()
      const unsubscribe = form.subscribe(listener)

      form.setFieldValue('username', 'John')

      expect(listener).toHaveBeenCalled()

      unsubscribe()
    })

    it('should unsubscribe from changes', () => {
      const listener = vi.fn()
      const unsubscribe = form.subscribe(listener)

      unsubscribe()
      form.setFieldValue('username', 'John')

      expect(listener).not.toHaveBeenCalled()
    })
  })
})
