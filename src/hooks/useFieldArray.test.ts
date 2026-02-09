/**
 * @module hooks/useFieldArray.test.tsx
 * @description Tests for useFieldArray hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { createElement } from 'react'
import { useFieldArray } from './useFieldArray'
import { FormProvider } from './useFormContext'
import { createForm } from '../core/createForm'

describe('useFieldArray', () => {
  type FormValues = {
    users: Array<{ name: string; email: string }>
  }

  let form: ReturnType<typeof createForm<FormValues>>

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => {
      return createElement(FormProvider, { value: form }, children)
    }
  }

  beforeEach(() => {
    form = createForm<FormValues>({
      initialValues: { users: [] },
    })
  })

  it('should initialize with empty array', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useFieldArray('users'), { wrapper })

    expect(result.current.items).toEqual([])
    expect(result.current.length).toBe(0)
  })

  it('should initialize with existing values', () => {
    form = createForm<FormValues>({
      initialValues: {
        users: [
          { name: 'John', email: 'john@example.com' },
          { name: 'Jane', email: 'jane@example.com' },
        ],
      },
    })

    const wrapper = createWrapper()
    const { result } = renderHook(() => useFieldArray('users'), { wrapper })

    expect(result.current.items).toHaveLength(2)
    expect(result.current.items[0].value).toEqual({ name: 'John', email: 'john@example.com' })
    expect(result.current.items[1].value).toEqual({ name: 'Jane', email: 'jane@example.com' })
  })

  it('should append item', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useFieldArray('users'), { wrapper })

    act(() => {
      result.current.append({ name: 'John', email: 'john@example.com' })
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].value).toEqual({ name: 'John', email: 'john@example.com' })
    expect(form.getFieldValue('users.0')).toEqual({ name: 'John', email: 'john@example.com' })
  })

  it('should prepend item', () => {
    const wrapper = createWrapper()
    form.setFieldValue('users', [{ name: 'Jane', email: 'jane@example.com' }])

    const { result } = renderHook(() => useFieldArray('users'), { wrapper })

    act(() => {
      result.current.prepend({ name: 'John', email: 'john@example.com' })
    })

    expect(result.current.items).toHaveLength(2)
    expect(result.current.items[0].value).toEqual({ name: 'John', email: 'john@example.com' })
    expect(result.current.items[1].value).toEqual({ name: 'Jane', email: 'jane@example.com' })
  })

  it('should insert item at index', () => {
    const wrapper = createWrapper()
    form.setFieldValue('users', [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Charlie', email: 'charlie@example.com' },
    ])

    const { result } = renderHook(() => useFieldArray('users'), { wrapper })

    act(() => {
      result.current.insert(1, { name: 'Bob', email: 'bob@example.com' })
    })

    expect(result.current.items).toHaveLength(3)
    expect(result.current.items[0].value.name).toBe('Alice')
    expect(result.current.items[1].value.name).toBe('Bob')
    expect(result.current.items[2].value.name).toBe('Charlie')
  })

  it('should remove item at index', () => {
    const wrapper = createWrapper()
    form.setFieldValue('users', [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
      { name: 'Charlie', email: 'charlie@example.com' },
    ])

    const { result } = renderHook(() => useFieldArray('users'), { wrapper })

    act(() => {
      result.current.remove(1)
    })

    expect(result.current.items).toHaveLength(2)
    expect(result.current.items[0].value.name).toBe('Alice')
    expect(result.current.items[1].value.name).toBe('Charlie')
  })

  it('should remove all items', () => {
    const wrapper = createWrapper()
    form.setFieldValue('users', [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
    ])

    const { result } = renderHook(() => useFieldArray('users'), { wrapper })

    act(() => {
      result.current.removeAll()
    })

    expect(result.current.items).toHaveLength(0)
  })

  it('should move item from one index to another', () => {
    const wrapper = createWrapper()
    form.setFieldValue('users', [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
      { name: 'Charlie', email: 'charlie@example.com' },
    ])

    const { result } = renderHook(() => useFieldArray('users'), { wrapper })

    act(() => {
      result.current.move(0, 2)
    })

    expect(result.current.items[0].value.name).toBe('Bob')
    expect(result.current.items[1].value.name).toBe('Charlie')
    expect(result.current.items[2].value.name).toBe('Alice')
  })

  it('should swap two items', () => {
    const wrapper = createWrapper()
    form.setFieldValue('users', [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
      { name: 'Charlie', email: 'charlie@example.com' },
    ])

    const { result } = renderHook(() => useFieldArray('users'), { wrapper })

    act(() => {
      result.current.swap(0, 2)
    })

    expect(result.current.items[0].value.name).toBe('Charlie')
    expect(result.current.items[1].value.name).toBe('Bob')
    expect(result.current.items[2].value.name).toBe('Alice')
  })

  it('should replace item at index', () => {
    const wrapper = createWrapper()
    form.setFieldValue('users', [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
    ])

    const { result } = renderHook(() => useFieldArray('users'), { wrapper })

    act(() => {
      result.current.replace(1, { name: 'Charlie', email: 'charlie@example.com' })
    })

    expect(result.current.items[0].value.name).toBe('Alice')
    expect(result.current.items[1].value.name).toBe('Charlie')
  })

  it('should respect max option', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(
      () => useFieldArray('users', { max: 2 }),
      { wrapper }
    )

    act(() => {
      result.current.append({ name: 'Alice', email: 'alice@example.com' })
      result.current.append({ name: 'Bob', email: 'bob@example.com' })
    })

    expect(result.current.items).toHaveLength(2)

    act(() => {
      result.current.append({ name: 'Charlie', email: 'charlie@example.com' })
    })

    // Should not add due to max limit
    expect(result.current.items).toHaveLength(2)
  })

  it('should respect min option on remove', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(
      () =>
        useFieldArray('users', {
          min: 1,
          defaultValue: { name: '', email: '' },
        }),
      { wrapper }
    )

    act(() => {
      result.current.append({ name: 'Alice', email: 'alice@example.com' })
    })

    expect(result.current.items).toHaveLength(1)

    act(() => {
      result.current.remove(0)
    })

    // Should keep minimum item
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].value).toEqual({ name: '', email: '' })
  })

  it('should generate unique keys for items', () => {
    const wrapper = createWrapper()
    const { result } = renderHook(() => useFieldArray('users'), { wrapper })

    act(() => {
      result.current.append({ name: 'Alice', email: 'alice@example.com' })
      result.current.append({ name: 'Bob', email: 'bob@example.com' })
    })

    const keys = result.current.items.map((item) => item.key)
    const uniqueKeys = new Set(keys)

    expect(uniqueKeys.size).toBe(2)
  })
})
