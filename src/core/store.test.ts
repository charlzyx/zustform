/**
 * @module core/store.test
 * @description Tests for Zustand store
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createFormStore } from './store'

describe('createFormStore', () => {
  let store: ReturnType<typeof createFormStore<any>>

  beforeEach(() => {
    store = createFormStore({
      user: { name: '', email: '' },
      age: 0,
    })
  })

  describe('values', () => {
    it('should set value for simple path', () => {
      const state = store.getState()
      state.setValue('age', 25)

      expect(store.getState().values.age).toBe(25)
    })

    it('should set value for nested path', () => {
      const state = store.getState()
      state.setValue('user.name', 'John')

      expect(store.getState().values.user.name).toBe('John')
    })

    it('should mark field as dirty when value changes', () => {
      const state = store.getState()
      state.setValue('age', 25)

      expect(store.getState().dirty.age).toBe(true)
      expect(store.getState().isDirty).toBe(true)
    })

    it('should clear field error when value changes', () => {
      const state = store.getState()
      state.setFieldError('age', { type: 'required', message: 'Required' })
      state.setValue('age', 25)

      expect(store.getState().errors.age).toBeUndefined()
    })
  })

  describe('errors', () => {
    it('should set field error', () => {
      const state = store.getState()
      state.setFieldError('age', { type: 'required', message: 'Required' })

      expect(store.getState().errors.age).toEqual({ type: 'required', message: 'Required' })
    })

    it('should clear field error', () => {
      const state = store.getState()
      state.setFieldError('age', { type: 'required', message: 'Required' })
      state.clearFieldError('age')

      expect(store.getState().errors.age).toBeUndefined()
    })

    it('should clear all errors', () => {
      const state = store.getState()
      state.setFieldError('age', { type: 'required', message: 'Required' })
      state.setFieldError('user.name', { type: 'min', message: 'Too short' })
      state.clearAllErrors()

      expect(store.getState().errors).toEqual({})
      expect(store.getState().isValid).toBe(true)
    })

    it('should mark form as invalid when error exists', () => {
      const state = store.getState()
      state.setFieldError('age', { type: 'required', message: 'Required' })

      expect(store.getState().isValid).toBe(false)
    })
  })

  describe('touched', () => {
    it('should set field as touched', () => {
      const state = store.getState()
      state.setFieldTouched('user.name', true)

      expect(store.getState().touched['user.name']).toBe(true)
    })
  })

  describe('dirty', () => {
    it('should set field as dirty', () => {
      const state = store.getState()
      state.setFieldDirty('user.name', true)

      expect(store.getState().dirty['user.name']).toBe(true)
      expect(store.getState().isDirty).toBe(true)
    })
  })

  describe('reset', () => {
    it('should reset all state to initial', () => {
      const state = store.getState()
      state.setValue('age', 25)
      state.setFieldError('age', { type: 'required', message: 'Required' })
      state.setFieldTouched('user.name', true)
      state.setFieldDirty('age', true)

      state.reset()

      expect(store.getState().values).toEqual({
        user: { name: '', email: '' },
        age: 0,
      })
      expect(store.getState().errors).toEqual({})
      expect(store.getState().touched).toEqual({})
      expect(store.getState().dirty).toEqual({})
      expect(store.getState().isDirty).toBe(false)
      expect(store.getState().isValid).toBe(true)
    })
  })

  describe('submit', () => {
    it('should call onSubmit with values', async () => {
      const onSubmit = vitest.fn().mockResolvedValue(undefined)
      const state = store.getState()
      state.setValue('age', 25)

      await state.submit(onSubmit)

      expect(onSubmit).toHaveBeenCalledWith({
        user: { name: '', email: '' },
        age: 25,
      })
    })

    it('should increment submit count', async () => {
      const onSubmit = vitest.fn().mockResolvedValue(undefined)
      const state = store.getState()

      await state.submit(onSubmit)
      await state.submit(onSubmit)

      expect(store.getState().submitCount).toBe(2)
    })

    it('should validate before submit', async () => {
      const onSubmit = vitest.fn().mockResolvedValue(undefined)
      const state = store.getState()
      state.setFieldError('age', { type: 'required', message: 'Required' })

      await state.submit(onSubmit)

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('should set submitting state', async () => {
      const onSubmit = vitest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )
      const state = store.getState()

      const promise = state.submit(onSubmit)

      expect(store.getState().isSubmitting).toBe(true)

      await promise

      expect(store.getState().isSubmitting).toBe(false)
    })

    it('should filter transient fields from submit', async () => {
      const onSubmit = vitest.fn().mockResolvedValue(undefined)
      const state = store.getState()
      store.setState((state) => state.transientFields.add('password'))

      state.setValue('password', 'secret123')

      await state.submit(onSubmit)

      expect(onSubmit).toHaveBeenCalledWith(
        expect.not.objectContaining({ password: 'secret123' })
      )
    })
  })
})
