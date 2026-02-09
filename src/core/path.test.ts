/**
 * @module core/path.test
 * @description Tests for path utilities
 */

import { describe, it, expect } from 'vitest'
import { get, set, del, has, getAll, matches, joinPath, splitPath, getFieldName, getParentPath, isRelated } from './path'

describe('path utilities', () => {
  const obj = {
    user: {
      name: 'John',
      age: 30,
      address: {
        street: 'Main St',
        city: 'New York',
      },
    },
    'tags.0': 'tag1',
    'tags.1': 'tag2',
    items: [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
    ],
  }

  describe('get', () => {
    it('should get value from simple path', () => {
      expect(get(obj, 'user.name')).toBe('John')
      expect(get(obj, 'user.age')).toBe(30)
    })

    it('should get value from nested path', () => {
      expect(get(obj, 'user.address.street')).toBe('Main St')
      expect(get(obj, 'user.address.city')).toBe('New York')
    })

    it('should return undefined for missing path', () => {
      expect(get(obj, 'user.email')).toBeUndefined()
      expect(get(obj, 'user.address.zip')).toBeUndefined()
    })
  })

  describe('set', () => {
    it('should set value for simple path', () => {
      const newObj = {}
      set(newObj, 'user.name', 'Jane')
      expect(newObj.user.name).toBe('Jane')
    })

    it('should set value for nested path', () => {
      const newObj = {}
      set(newObj, 'user.address.street', 'Second St')
      expect(newObj.user.address.street).toBe('Second St')
    })

    it('should create intermediate objects', () => {
      const newObj = {}
      set(newObj, 'a.b.c.d', 1)
      expect(newObj.a.b.c.d).toBe(1)
    })

    it('should preserve existing values', () => {
      const newObj = { user: { name: 'John' } }
      set(newObj, 'user.age', 30)
      expect(newObj.user.name).toBe('John')
      expect(newObj.user.age).toBe(30)
    })
  })

  describe('del', () => {
    it('should delete value for simple path', () => {
      const newObj = { user: { name: 'John', age: 30 } }
      del(newObj, 'user.age')
      expect(newObj.user.age).toBeUndefined()
      expect(newObj.user.name).toBe('John')
    })

    it('should delete value for nested path', () => {
      const newObj = { user: { address: { street: 'Main St', city: 'NY' } } }
      del(newObj, 'user.address.street')
      expect(newObj.user.address.street).toBeUndefined()
      expect(newObj.user.address.city).toBe('NY')
    })

    it('should not throw for missing path', () => {
      const newObj = {}
      expect(() => del(newObj, 'user.name')).not.toThrow()
    })
  })

  describe('has', () => {
    it('should return true for existing paths', () => {
      expect(has(obj, 'user.name')).toBe(true)
      expect(has(obj, 'user.address.street')).toBe(true)
    })

    it('should return false for missing paths', () => {
      expect(has(obj, 'user.email')).toBe(false)
      expect(has(obj, 'user.address.zip')).toBe(false)
    })

    it('should handle undefined values', () => {
      const objWithUndefined = { user: { email: undefined } }
      expect(has(objWithUndefined, 'user.email')).toBe(false)
    })
  })

  describe('getAll', () => {
    it('should get all values matching prefix', () => {
      const result = getAll(obj, 'tags')
      expect(result).toEqual({ '0': 'tag1', '1': 'tag2' })
    })

    it('should get nested values matching prefix', () => {
      const result = getAll(obj, 'user.address')
      expect(result).toEqual({ street: 'Main St', city: 'New York' })
    })

    it('should return empty object for no matches', () => {
      const result = getAll(obj, 'nonexistent')
      expect(result).toEqual({})
    })
  })

  describe('matches', () => {
    it('should return true for child paths', () => {
      expect(matches('user.name', 'user')).toBe(true)
      expect(matches('user.address.street', 'user')).toBe(true)
    })

    it('should return true for sibling paths', () => {
      expect(matches('user.name', 'user.age')).toBe(true)
      expect(matches('user.name', 'user.address')).toBe(true)
    })

    it('should return false for same path', () => {
      expect(matches('user', 'user')).toBe(false)
      expect(matches('user.name', 'user.name')).toBe(false)
    })

    it('should return false for parent path', () => {
      expect(matches('user', 'user.name')).toBe(false)
    })
  })

  describe('joinPath', () => {
    it('should join path segments', () => {
      expect(joinPath('user', 'name')).toBe('user.name')
      expect(joinPath('user', 'address', 'street')).toBe('user.address.street')
    })

    it('should filter empty segments', () => {
      expect(joinPath('user', '', 'name')).toBe('user.name')
      expect(joinPath('', 'user', 'name')).toBe('user.name')
      expect(joinPath('user', undefined, null, 'name')).toBe('user.name')
    })

    it('should return empty string for no segments', () => {
      expect(joinPath()).toBe('')
      expect(joinPath('', null, undefined)).toBe('')
    })
  })

  describe('splitPath', () => {
    it('should split path into segments', () => {
      expect(splitPath('user.name')).toEqual(['user', 'name'])
      expect(splitPath('user.address.street')).toEqual(['user', 'address', 'street'])
    })

    it('should return array with single element for simple path', () => {
      expect(splitPath('user')).toEqual(['user'])
    })

    it('should return empty array for empty path', () => {
      expect(splitPath('')).toEqual([])
    })
  })

  describe('getFieldName', () => {
    it('should get last segment of path', () => {
      expect(getFieldName('user.name')).toBe('name')
      expect(getFieldName('user.address.street')).toBe('street')
    })

    it('should return simple name for simple path', () => {
      expect(getFieldName('user')).toBe('user')
    })
  })

  describe('getParentPath', () => {
    it('should get parent path', () => {
      expect(getParentPath('user.name')).toBe('user')
      expect(getParentPath('user.address.street')).toBe('user.address')
    })

    it('should return empty string for simple path', () => {
      expect(getParentPath('user')).toBe('')
    })

    it('should return empty string for empty path', () => {
      expect(getParentPath('')).toBe('')
    })
  })

  describe('isRelated', () => {
    it('should return true for same path', () => {
      expect(isRelated('user.name', 'user.name')).toBe(true)
    })

    it('should return true for ancestor/descendant', () => {
      expect(isRelated('user.name', 'user')).toBe(true)
      expect(isRelated('user', 'user.name')).toBe(true)
      expect(isRelated('user.address.street', 'user')).toBe(true)
    })

    it('should return true for sibling paths', () => {
      expect(isRelated('user.name', 'user.age')).toBe(true)
      expect(isRelated('user.name', 'user.address')).toBe(true)
    })

    it('should return false for unrelated paths', () => {
      expect(isRelated('user.name', 'other.name')).toBe(false)
    })
  })
})
