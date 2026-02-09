/**
 * @module core/path.test
 * @description Tests for path utilities
 */

import { describe, it, expect } from 'vitest'
import {
  parsePath,
  getPath,
  setPath,
  deletePath,
  hasPath,
  getPathParent,
  appendPath,
  isPathEqual,
  normalizePath,
  isDescendant,
  isAncestor,
  getLeaf,
  segmentsToPath,
  isArrayIndex,
  traversePaths,
  deepClone,
  deepEqual,
} from './path'

describe('path utilities', () => {
  describe('parsePath', () => {
    it('should parse a simple path', () => {
      expect(parsePath('user.name')).toEqual(['user', 'name'])
    })

    it('should parse an array index path', () => {
      expect(parsePath('items.0.title')).toEqual(['items', '0', 'title'])
    })

    it('should handle empty string', () => {
      expect(parsePath('')).toEqual([])
    })

    it('should handle single segment', () => {
      expect(parsePath('user')).toEqual(['user'])
    })
  })

  describe('getPath', () => {
    const obj = {
      user: {
        name: 'John',
        address: {
          city: 'NYC',
          country: 'USA',
        },
      },
      items: [
        { id: 1, title: 'First' },
        { id: 2, title: 'Second' },
      ],
    }

    it('should get a simple path value', () => {
      expect(getPath(obj, 'user.name')).toBe('John')
    })

    it('should get a nested path value', () => {
      expect(getPath(obj, 'user.address.city')).toBe('NYC')
    })

    it('should get an array item', () => {
      expect(getPath(obj, 'items.0')).toEqual({ id: 1, title: 'First' })
    })

    it('should get a nested array item property', () => {
      expect(getPath(obj, 'items.0.title')).toBe('First')
    })

    it('should return undefined for missing path', () => {
      expect(getPath(obj, 'user.missing')).toBeUndefined()
    })

    it('should return the object for empty path', () => {
      expect(getPath(obj, '')).toEqual(obj)
    })

    it('should handle null object', () => {
      expect(getPath(null, 'user.name')).toBeUndefined()
    })
  })

  describe('setPath', () => {
    it('should set a simple path value', () => {
      const obj: Record<string, unknown> = {}
      setPath(obj, 'name', 'John')
      expect(obj.name).toBe('John')
    })

    it('should set a nested path value', () => {
      const obj: Record<string, unknown> = {}
      setPath(obj, 'user.name', 'John')
      expect(obj.user?.name).toBe('John')
    })

    it('should set an array item', () => {
      const obj: Record<string, unknown> = {}
      setPath(obj, 'items.0', 'First')
      expect(Array.isArray(obj.items)).toBe(true)
      expect(obj.items?.[0]).toBe('First')
    })

    it('should overwrite existing values', () => {
      const obj = { user: { name: 'Jane' } }
      setPath(obj, 'user.name', 'John')
      expect(obj.user.name).toBe('John')
    })

    it('should return the modified object', () => {
      const obj = {}
      const result = setPath(obj, 'name', 'John')
      expect(result).toBe(obj)
    })
  })

  describe('deletePath', () => {
    it('should delete a simple path value', () => {
      const obj = { name: 'John', age: 30 }
      const result = deletePath(obj, 'name')
      expect(result).toBe(true)
      expect(obj.name).toBeUndefined()
      expect(obj.age).toBe(30)
    })

    it('should delete a nested path value', () => {
      const obj = { user: { name: 'John', age: 30 } }
      const result = deletePath(obj, 'user.name')
      expect(result).toBe(true)
      expect(obj.user.name).toBeUndefined()
      expect(obj.user.age).toBe(30)
    })

    it('should return false for missing path', () => {
      const obj = { name: 'John' }
      const result = deletePath(obj, 'missing')
      expect(result).toBe(false)
    })

    it('should return false for empty path', () => {
      const obj = { name: 'John' }
      const result = deletePath(obj, '')
      expect(result).toBe(false)
    })
  })

  describe('hasPath', () => {
    const obj = { user: { name: 'John' } }

    it('should return true for existing path', () => {
      expect(hasPath(obj, 'user.name')).toBe(true)
    })

    it('should return false for missing path', () => {
      expect(hasPath(obj, 'user.missing')).toBe(false)
    })
  })

  describe('getPathParent', () => {
    it('should get parent path', () => {
      expect(getPathParent('user.name')).toBe('user')
    })

    it('should get parent path for deeply nested', () => {
      expect(getPathParent('user.address.city')).toBe('user.address')
    })

    it('should return empty string for single segment', () => {
      expect(getPathParent('user')).toBe('')
    })

    it('should return empty string for empty path', () => {
      expect(getPathParent('')).toBe('')
    })
  })

  describe('appendPath', () => {
    it('should append segment to path', () => {
      expect(appendPath('user', 'name')).toBe('user.name')
    })

    it('should append to nested path', () => {
      expect(appendPath('user.address', 'city')).toBe('user.address.city')
    })

    it('should handle empty base path', () => {
      expect(appendPath('', 'user')).toBe('user')
    })
  })

  describe('isPathEqual', () => {
    it('should return true for equal paths', () => {
      expect(isPathEqual('user.name', 'user.name')).toBe(true)
    })

    it('should return false for different paths', () => {
      expect(isPathEqual('user.name', 'user.address')).toBe(false)
    })

    it('should normalize paths before comparing', () => {
      expect(isPathEqual('user.name', '.user.name.')).toBe(true)
    })
  })

  describe('normalizePath', () => {
    it('should normalize path', () => {
      expect(normalizePath('user.name')).toBe('user.name')
    })

    it('should remove extra dots', () => {
      expect(normalizePath('.user.name.')).toBe('user.name')
    })

    it('should handle empty string', () => {
      expect(normalizePath('')).toBe('')
    })

    it('should remove empty segments', () => {
      expect(normalizePath('user..name')).toBe('user.name')
    })
  })

  describe('isDescendant', () => {
    it('should return true for descendant', () => {
      expect(isDescendant('user.address.city', 'user')).toBe(true)
    })

    it('should return true for direct child', () => {
      expect(isDescendant('user.name', 'user')).toBe(true)
    })

    it('should return false for same path', () => {
      expect(isDescendant('user.name', 'user.name')).toBe(false)
    })

    it('should return false for unrelated paths', () => {
      expect(isDescendant('user.name', 'user.address')).toBe(false)
    })

    it('should return true for empty ancestor', () => {
      expect(isDescendant('user.name', '')).toBe(true)
    })
  })

  describe('isAncestor', () => {
    it('should return true for ancestor', () => {
      expect(isAncestor('user', 'user.address.city')).toBe(true)
    })

    it('should return false for same path', () => {
      expect(isAncestor('user.name', 'user.name')).toBe(false)
    })
  })

  describe('getLeaf', () => {
    it('should get leaf segment', () => {
      expect(getLeaf('user.name')).toBe('name')
    })

    it('should get leaf from nested path', () => {
      expect(getLeaf('user.address.city')).toBe('city')
    })

    it('should return same for single segment', () => {
      expect(getLeaf('user')).toBe('user')
    })

    it('should return empty for empty path', () => {
      expect(getLeaf('')).toBe('')
    })
  })

  describe('segmentsToPath', () => {
    it('should convert segments to path', () => {
      expect(segmentsToPath(['user', 'name'])).toBe('user.name')
    })

    it('should handle array index', () => {
      expect(segmentsToPath(['items', '0', 'title'])).toBe('items.0.title')
    })

    it('should filter empty segments', () => {
      expect(segmentsToPath(['user', '', 'name'])).toBe('user.name')
    })
  })

  describe('isArrayIndex', () => {
    it('should return true for numeric strings', () => {
      expect(isArrayIndex('0')).toBe(true)
      expect(isArrayIndex('42')).toBe(true)
      expect(isArrayIndex('123')).toBe(true)
    })

    it('should return false for negative numbers', () => {
      expect(isArrayIndex('-1')).toBe(false)
    })

    it('should return false for non-numeric', () => {
      expect(isArrayIndex('abc')).toBe(false)
      expect(isArrayIndex('0abc')).toBe(false)
      expect(isArrayIndex('abc0')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isArrayIndex('')).toBe(false)
    })
  })

  describe('traversePaths', () => {
    const obj = {
      user: {
        name: 'John',
        age: 30,
        address: {
          city: 'NYC',
          country: 'USA',
        },
      },
      items: [
        { id: 1, title: 'First' },
        { id: 2, title: 'Second' },
      ],
    }

    it('should traverse all paths in object', () => {
      const paths = Array.from(traversePaths(obj))
      expect(paths).toContain('user.name')
      expect(paths).toContain('user.age')
      expect(paths).toContain('user.address.city')
      expect(paths).toContain('user.address.country')
      expect(paths).toContain('items.0.id')
      expect(paths).toContain('items.0.title')
      expect(paths).toContain('items.1.id')
      expect(paths).toContain('items.1.title')
    })

    it('should handle nested objects', () => {
      const nested = { a: { b: { c: 1 } } }
      const paths = Array.from(traversePaths(nested))
      expect(paths).toContain('a.b.c')
    })

    it('should handle arrays', () => {
      const arr = [1, 2, 3]
      const paths = Array.from(traversePaths(arr))
      expect(paths).toContain('0')
      expect(paths).toContain('1')
      expect(paths).toContain('2')
    })
  })

  describe('deepClone', () => {
    it('should clone primitives', () => {
      expect(deepClone('string')).toBe('string')
      expect(deepClone(123)).toBe(123)
      expect(deepClone(true)).toBe(true)
      expect(deepClone(null)).toBe(null)
      expect(deepClone(undefined)).toBe(undefined)
    })

    it('should clone arrays', () => {
      const arr = [1, 2, 3]
      const cloned = deepClone(arr)
      expect(cloned).toEqual(arr)
      expect(cloned).not.toBe(arr)
    })

    it('should clone nested arrays', () => {
      const arr = [[1, 2], [3, 4]]
      const cloned = deepClone(arr)
      expect(cloned).toEqual(arr)
      expect(cloned).not.toBe(arr)
      expect(cloned[0]).not.toBe(arr[0])
    })

    it('should clone objects', () => {
      const obj = { a: 1, b: 2 }
      const cloned = deepClone(obj)
      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
    })

    it('should clone nested objects', () => {
      const obj = { a: { b: { c: 1 } } }
      const cloned = deepClone(obj)
      expect(cloned).toEqual(obj)
      expect(cloned).not.toBe(obj)
      expect(cloned.a).not.toBe(obj.a)
    })

    it('should clone Date objects', () => {
      const date = new Date('2024-01-01')
      const cloned = deepClone(date)
      expect(cloned).toEqual(date)
      expect(cloned).not.toBe(date)
    })
  })

  describe('deepEqual', () => {
    it('should return true for equal primitives', () => {
      expect(deepEqual('string', 'string')).toBe(true)
      expect(deepEqual(123, 123)).toBe(true)
      expect(deepEqual(true, true)).toBe(true)
      expect(deepEqual(null, null)).toBe(true)
      expect(deepEqual(undefined, undefined)).toBe(true)
    })

    it('should return false for unequal primitives', () => {
      expect(deepEqual('string', 'other')).toBe(false)
      expect(deepEqual(123, 456)).toBe(false)
      expect(deepEqual(true, false)).toBe(false)
      expect(deepEqual(null, undefined)).toBe(false)
    })

    it('should return true for equal arrays', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
    })

    it('should return false for unequal arrays', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false)
      expect(deepEqual([1, 2, 3], [1, 2])).toBe(false)
    })

    it('should return true for equal nested arrays', () => {
      expect(deepEqual([[1, 2], [3, 4]], [[1, 2], [3, 4]])).toBe(true)
    })

    it('should return true for equal objects', () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    })

    it('should return false for unequal objects', () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
      expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false)
    })

    it('should return true for equal nested objects', () => {
      expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true)
    })

    it('should return false for different types', () => {
      expect(deepEqual([1, 2, 3], { '0': 1, '1': 2, '2': 3 })).toBe(false)
    })
  })
})
