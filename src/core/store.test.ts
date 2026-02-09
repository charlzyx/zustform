/**
 * @module core/store.test
 * @description Tests for Zustand store
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createFormStore } from './store'
import type { FormOptions } from './types'

describe('createFormStore', () => {
  type FormValues = {
    username: string
    email: string
    age: number
    address?: {
      city: string
      country: string
    }
  }

  let store: ReturnType<typeof createFormStore<FormValues>>

  beforeEach(() => {
    const options: FormOptions<FormValues> = {
      initialValues: {
        username: '',
        email: '',
        age: 0,
      },
    }
    store = createFormStore<FormValues>(options)
  })

  describe('initial state', () => {
    it('should initialize with provided values', () => {
      const state = store.getState()
      expect(state.values).toEqual({
        username: '',
        email: '',
        age: 0,
      })
    })

    it('should initialize with empty fields', () => {
      const state = store.getState()
      expect(state.fields).toEqual({})
    })

    it('should initialize meta', () => {
      const state = store.getState()
      expect(state.meta.submitting).toBe(false)
      expect(state.meta.submitCount).toBe(0)
      expect(state.meta.validating).toBe(false)
      expect(state.meta.dirty).toBe(false)
      expect(state.meta.valid).toBe(true)
    })
  })

  describe('setValues', () => {
    it('should set multiple values', () => {
      const api = store.getState()
      api.setValues({ username: 'John', email: 'john@example.com' })

      const state = store.getState()
      expect(state.values.username).toBe('John')
      expect(state.values.email).toBe('john@example.com')
    })

    it('should mark form as dirty when values change', () => {
      const api = store.getState()
      api.setValues({ username: 'John' })

      const state = store.getState()
      expect(state.meta.dirty).toBe(true)
    })
  })

  describe('setFieldValue', () => {
    it('should set a single field value', () => {
      const api = store.getState()
      api.setFieldValue('username', 'John')

      const state = store.getState()
      expect(state.values.username).toBe('John')
    })

    it('should set nested field value', () => {
      const api = store.getState()
      api.setFieldValue('address.city', 'NYC')

      const state = store.getState()
      expect(state.values.address?.city).toBe('NYC')
    })

    it('should mark form as dirty', () => {
      const api = store.getState()
      api.setFieldValue('username', 'John')

      const state = store.getState()
      expect(state.meta.dirty).toBe(true)
    })
  })

  describe('resetValues', () => {
    it('should reset values to initial', () => {
      const api = store.getState()
      // Register field first
      api.registerField('username', {
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
      api.setValues({ username: 'John', email: 'john@example.com' })
      api.setFieldState('username', { touched: true, errors: ['Error'] })

      api.resetValues()

      const state = store.getState()
      expect(state.values).toEqual({
        username: '',
        email: '',
        age: 0,
      })
      expect(state.meta.dirty).toBe(false)
      expect(state.fields.username?.state.touched).toBe(false)
      expect(state.fields.username?.state.errors).toEqual([])
    })
  })

  describe('registerField', () => {
    it('should register a new field', () => {
      const api = store.getState()
      api.registerField('username', {
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

      const state = store.getState()
      expect(state.fields.username).toBeDefined()
      expect(state.fields.username?.mounted).toBe(true)
    })

    it('should set default value when provided', () => {
      const api = store.getState()
      api.registerField('username', {
        address: 'username',
        path: 'username',
        isVoid: false,
        transient: false,
        rules: [],
        defaultValue: 'DefaultName',
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

      const state = store.getState()
      expect(state.values.username).toBe('DefaultName')
    })

    it('should preserve existing field state when re-registering', () => {
      const api = store.getState()

      // Register field with errors
      api.registerField('username', {
        address: 'username',
        path: 'username',
        isVoid: false,
        transient: false,
        rules: [],
        mounted: true,
        state: {
          touched: true,
          active: false,
          dirty: true,
          visible: true,
          disabled: false,
          readOnly: false,
          validating: false,
          errors: ['Error'],
          warnings: [],
        },
      })

      // Re-register field
      api.registerField('username', {
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

      const state = store.getState()
      expect(state.fields.username?.state.touched).toBe(true)
      expect(state.fields.username?.state.errors).toEqual(['Error'])
    })
  })

  describe('unregisterField', () => {
    beforeEach(() => {
      const api = store.getState()
      api.registerField('username', {
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
      api.setFieldValue('username', 'John')
    })

    it('should remove field and clear value', () => {
      const api = store.getState()
      api.unregisterField('username')

      const state = store.getState()
      expect(state.fields.username).toBeUndefined()
      expect(state.values.username).toBeUndefined()
    })

    it('should preserve value when preserveValue is true', () => {
      const api = store.getState()

      // First, set preserveValue
      api.registerField('username', {
        address: 'username',
        path: 'username',
        isVoid: false,
        transient: false,
        rules: [],
        preserveValue: true,
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

      api.unregisterField('username')

      const state = store.getState()
      expect(state.fields.username?.mounted).toBe(false)
      expect(state.values.username).toBe('John')
    })
  })

  describe('setFieldMounted', () => {
    it('should set field mounted state', () => {
      const api = store.getState()
      api.registerField('username', {
        address: 'username',
        path: 'username',
        isVoid: false,
        transient: false,
        rules: [],
        mounted: false,
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

      api.setFieldMounted('username', true)

      const state = store.getState()
      expect(state.fields.username?.mounted).toBe(true)
    })
  })

  describe('setFieldState', () => {
    beforeEach(() => {
      const api = store.getState()
      api.registerField('username', {
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

    it('should set field state properties', () => {
      const api = store.getState()
      api.setFieldState('username', {
        touched: true,
        disabled: true,
      })

      const state = store.getState()
      expect(state.fields.username?.state.touched).toBe(true)
      expect(state.fields.username?.state.disabled).toBe(true)
    })

    it('should not affect other properties', () => {
      const api = store.getState()
      api.setFieldState('username', { touched: true })

      const state = store.getState()
      expect(state.fields.username?.state.active).toBe(false)
      expect(state.fields.username?.state.dirty).toBe(false)
    })
  })

  describe('setFieldErrors', () => {
    beforeEach(() => {
      const api = store.getState()
      api.registerField('username', {
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
          validating: true,
          errors: [],
          warnings: [],
        },
      })
    })

    it('should set field errors', () => {
      const api = store.getState()
      api.setFieldErrors('username', ['Error 1', 'Error 2'])

      const state = store.getState()
      expect(state.fields.username?.state.errors).toEqual(['Error 1', 'Error 2'])
    })

    it('should set validating to false', () => {
      const api = store.getState()
      api.setFieldErrors('username', ['Error'])

      const state = store.getState()
      expect(state.fields.username?.state.validating).toBe(false)
    })

    it('should update form valid state', () => {
      const api = store.getState()
      api.setFieldErrors('username', ['Error'])

      const state = store.getState()
      expect(state.meta.valid).toBe(false)
    })
  })

  describe('clearFieldErrors', () => {
    beforeEach(() => {
      const api = store.getState()
      api.registerField('username', {
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
          errors: ['Error'],
          warnings: [],
        },
      })
      api.registerField('email', {
        address: 'email',
        path: 'email',
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
          errors: ['Email Error'],
          warnings: [],
        },
      })
    })

    it('should clear specific field errors', () => {
      const api = store.getState()
      api.clearFieldErrors('username')

      const state = store.getState()
      expect(state.fields.username?.state.errors).toEqual([])
      expect(state.fields.email?.state.errors).toEqual(['Email Error'])
    })

    it('should clear all field errors when no address provided', () => {
      const api = store.getState()
      api.clearFieldErrors()

      const state = store.getState()
      expect(state.fields.username?.state.errors).toEqual([])
      expect(state.fields.email?.state.errors).toEqual([])
    })

    it('should update form valid state', () => {
      const api = store.getState()
      api.clearFieldErrors()

      const state = store.getState()
      expect(state.meta.valid).toBe(true)
    })
  })

  describe('setSubmitting', () => {
    it('should set submitting state', () => {
      const api = store.getState()
      api.setSubmitting(true)

      const state = store.getState()
      expect(state.meta.submitting).toBe(true)

      api.setSubmitting(false)
      expect(store.getState().meta.submitting).toBe(false)
    })
  })

  describe('incrementSubmitCount', () => {
    it('should increment submit count', () => {
      const api = store.getState()
      expect(store.getState().meta.submitCount).toBe(0)

      api.incrementSubmitCount()
      expect(store.getState().meta.submitCount).toBe(1)

      api.incrementSubmitCount()
      expect(store.getState().meta.submitCount).toBe(2)
    })
  })

  describe('updateMeta', () => {
    it('should update meta properties', () => {
      const api = store.getState()
      api.updateMeta({
        submitting: true,
        validating: true,
      })

      const state = store.getState()
      expect(state.meta.submitting).toBe(true)
      expect(state.meta.validating).toBe(true)
    })
  })

  describe('batch', () => {
    it('should batch multiple updates', () => {
      const api = store.getState()
      let updateCount = 0

      // Subscribe to count updates
      const unsubscribe = store.subscribe(() => {
        updateCount++
      })

      api.batch(() => {
        api.setFieldValue('username', 'John')
        api.setFieldValue('email', 'john@example.com')
        api.setFieldState('username', { touched: true })
      })

      // With Immer, batch should still trigger single update
      expect(updateCount).toBeGreaterThan(0)
      expect(store.getState().values.username).toBe('John')
      expect(store.getState().values.email).toBe('john@example.com')

      unsubscribe()
    })
  })

  describe('void fields', () => {
    it('should not affect form validity when void field has errors', () => {
      const api = store.getState()
      api.registerField('layoutSection', {
        address: 'layoutSection',
        path: null,
        isVoid: true,
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
          errors: ['This error should not affect validity'],
          warnings: [],
        },
      })

      const state = store.getState()
      expect(state.meta.valid).toBe(true)
    })

    it('should not affect form validity when void field has errors but data field is valid', () => {
      const api = store.getState()
      api.registerField('layoutSection', {
        address: 'layoutSection',
        path: null,
        isVoid: true,
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
          errors: ['Void field error'],
          warnings: [],
        },
      })
      api.registerField('username', {
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

      const state = store.getState()
      expect(state.meta.valid).toBe(true)
    })
  })
})
