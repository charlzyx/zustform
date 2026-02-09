/**
 * @module core/object.test
 * @description Tests for object utilities
 */

import { describe, it, expect } from 'vitest'
import {
  clone,
  merge,
  shallowEqual,
  deepEqual,
  getKeys,
  pick,
  omit,
  isEmpty,
  values,
  entries,
} from './object'

describe('object utilities', () => {
  const obj = {
    a: 1,
    b: 2,
    c: {
      d: 3,
      e: {
        f: 4,
      },
    },
  }

  describe('clone', () => {
    it('should deep clone object', () => {
      const cloned = clone(obj)
      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
      expect(cloned.c).not.toBe(obj.c)
    })

    it('should not modify original when clone is modified', () => {
      const cloned = clone(obj)
      ;(cloned as any).g = 5
      expect(obj.g).toBeUndefined()
    })
  })

  describe('merge', () => {
    it('should merge two objects', () => {
      const result = merge({ a: 1, b: 2 }, { b: 3, c: 4 })
      expect(result).toEqual({ a: 1, b: 3, c: 4 })
    })

    it('should deep merge nested objects', () => {
      const result = merge({ a: { b: 1 } }, { a: { c: 2 } })
      expect(result).toEqual({ a: { b: 1, c: 2 } })
    })

    it('should not modify original objects', () => {
      const source = { b: 2 }
      merge({ a: 1 }, source)
      expect(source.b).toBe(2)
    })
  })

  describe('shallowEqual', () => {
    it('should return true for equal objects', () => {
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    })

    it('should return false for different objects', () => {
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
    })

    it('should return true for same object reference', () => {
      const obj = { a: 1 }
      expect(shallowEqual(obj, obj)).toBe(true)
    })

    it('should return false for different types', () => {
      expect(shallowEqual({ a: 1 }, 'a')).toBe(false)
      expect(shallowEqual({ a: 1 }, null)).toBe(false)
    })

    it('should compare by value, not reference', () => {
      expect(shallowEqual({ a: 1 }, { a: 1 })).toBe(true)
      expect(shallowEqual({ a: {} }, { a: {} })).toBe(false)
    })
  })

  describe('deepEqual', () => {
    it('should return true for equal nested objects', () => {
      const obj1 = { a: { b: { c: 1 } } }
      const obj2 = { a: { b: { c: 1 } } }
      expect(deepEqual(obj1, obj2)).toBe(true)
    })

    it('should return false for different nested objects', () => {
      const obj1 = { a: { b: { c: 1 } } }
      const obj2 = { a: { b: { c: 2 } } }
      expect(deepEqual(obj1, obj2)).toBe(false)
    })

    it('should handle arrays', () => {
      const obj1 = { a: [1, 2, 3] }
      const obj2 = { a: [1, 2, 3] }
      const obj3 = { a: [1, 2, 4] }
      expect(deepEqual(obj1, obj2)).toBe(true)
      expect(deepEqual(obj1, obj3)).toBe(false)
    })
  })

  describe('getKeys', () => {
    it('should get all keys as dot notation', () => {
      const result = getKeys(obj)
      expect(result).toEqual(['a', 'b', 'c.d', 'c.e.f'])
    })

    it('should get keys with prefix', () => {
      const result = getKeys(obj, 'c')
      expect(result).toEqual(['d', 'e.f'])
    })

    it('should handle empty object', () => {
      expect(getKeys({})).toEqual([])
    })

    it('should not include array indices', () => {
      const objWithArray = { items: [{ a: 1 }, { a: 2 }] }
      const result = getKeys(objWithArray)
      expect(result).toEqual(['items'])
    })
  })

  describe('pick', () => {
    it('should pick specific keys', () => {
      const result = pick(obj, ['a', 'b'] as const)
      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('should not include non-existent keys', () => {
      const result = pick(obj, ['a', 'x'] as const)
      expect(result).toEqual({ a: 1 })
    })

    it('should have correct types', () => {
      const result = pick(obj, ['a'] as const)
      // Type should be { a: number }
      expect(result.a).toBe(1)
    })
  })

  describe('omit', () => {
    it('should omit specific keys', () => {
      const result = omit(obj, ['a', 'b'] as const)
      expect(result.c).toEqual({ d: 3, e: { f: 4 } })
    })

    it('should keep other keys', () => {
      const result = omit(obj, ['a'] as const)
      expect(result).toEqual({
        b: 2,
        c: { d: 3, e: { f: 4 } },
      })
    })

    it('should not modify original object', () => {
      omit(obj, ['a'] as const)
      expect(obj.a).toBe(1)
    })
  })

  describe('isEmpty', () => {
    it('should return true for empty object', () => {
      expect(isEmpty({})).toBe(true)
    })

    it('should return false for non-empty object', () => {
      expect(isEmpty({ a: 1 })).toBe(false)
    })

    it('should return true for object with no own properties', () => {
      const obj = Object.create(null)
      expect(isEmpty(obj)).toBe(true)
    })
  })

  describe('values', () => {
    it('should get all values', () => {
      const result = values(obj)
      expect(result).toContain(1)
      expect(result).toContain(2)
      expect(result).toContain(obj.c)
    })

    it('should return array', () => {
      expect(Array.isArray(values({}))).toBe(true)
    })
  })

  describe('entries', () => {
    it('should get all entries', () => {
      const result = entries(obj)
      expect(result).toContainEqual(['a', 1] as const)
      expect(result).toContainEqual(['b', 2] as const)
    })

    it('should return array of tuples', () => {
      const result = entries({ a: 1 })
      expect(result).toEqual([['a', 1]])
    })
  })
})
