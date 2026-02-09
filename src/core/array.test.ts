/**
 * @module core/array.test
 * @description Tests for array utilities
 */

import { describe, it, expect } from 'vitest'
import {
  moveItem,
  insertItem,
  removeItem,
  swapItems,
  moveItemUp,
  moveItemDown,
  updateItem,
  prependItem,
  appendItem,
  findIndex,
  removeItemBy,
  mapWithIndex,
  isEmpty,
  first,
  last,
  createArray,
  groupBy,
} from './array'

describe('array utilities', () => {
  const baseArray = [1, 2, 3, 4, 5]
  const objectArray = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
  ]

  describe('moveItem', () => {
    it('should move item to new position', () => {
      const result = moveItem(baseArray, 0, 4)
      expect(result).toEqual([2, 3, 4, 5, 1])
    })

    it('should not modify array if from and to are same', () => {
      const result = moveItem(baseArray, 2, 2)
      expect(result).toEqual(baseArray)
    })

    it('should not modify original array', () => {
      const result = moveItem(baseArray, 0, 4)
      expect(baseArray).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('insertItem', () => {
    it('should insert item at index', () => {
      const result = insertItem(baseArray, 2, 99)
      expect(result).toEqual([1, 2, 99, 3, 4, 5])
    })

    it('should insert at beginning', () => {
      const result = insertItem(baseArray, 0, 99)
      expect(result).toEqual([99, 1, 2, 3, 4, 5])
    })

    it('should insert at end', () => {
      const result = insertItem(baseArray, 5, 99)
      expect(result).toEqual([1, 2, 3, 4, 5, 99])
    })
  })

  describe('removeItem', () => {
    it('should remove item at index', () => {
      const result = removeItem(baseArray, 2)
      expect(result).toEqual([1, 2, 4, 5])
    })

    it('should remove first item', () => {
      const result = removeItem(baseArray, 0)
      expect(result).toEqual([2, 3, 4, 5])
    })

    it('should remove last item', () => {
      const result = removeItem(baseArray, 4)
      expect(result).toEqual([1, 2, 3, 4])
    })

    it('should return same array if index out of bounds', () => {
      const result = removeItem(baseArray, 10)
      expect(result).toEqual(baseArray)
    })
  })

  describe('swapItems', () => {
    it('should swap two items', () => {
      const result = swapItems(baseArray, 0, 4)
      expect(result).toEqual([5, 2, 3, 4, 1])
    })

    it('should not modify if indices are same', () => {
      const result = swapItems(baseArray, 2, 2)
      expect(result).toEqual(baseArray)
    })
  })

  describe('updateItem', () => {
    it('should update item at index', () => {
      const result = updateItem(baseArray, 2, (item, index) => item * 10)
      expect(result).toEqual([1, 2, 30, 4, 5])
    })

    it('should provide index to updater', () => {
      const result = updateItem(baseArray, 2, (item, index) => index)
      expect(result[2]).toBe(2)
    })

    it('should return same array if index out of bounds', () => {
      const result = updateItem(baseArray, 10, () => 999)
      expect(result).toEqual(baseArray)
    })
  })

  describe('moveItemUp', () => {
    it('should move item up by one', () => {
      const result = moveItemUp(baseArray, 3)
      expect(result).toEqual([1, 2, 4, 3, 5])
    })

    it('should not move if already at top', () => {
      const result = moveItemUp(baseArray, 0)
      expect(result).toEqual(baseArray)
    })
  })

  describe('moveItemDown', () => {
    it('should move item down by one', () => {
      const result = moveItemDown(baseArray, 1)
      expect(result).toEqual([1, 3, 2, 4, 5])
    })

    it('should not move if already at bottom', () => {
      const result = moveItemDown(baseArray, 4)
      expect(result).toEqual(baseArray)
    })
  })

  describe('prependItem', () => {
    it('should add item to beginning', () => {
      const result = prependItem(baseArray, 99)
      expect(result).toEqual([99, 1, 2, 3, 4, 5])
    })

    it('should not modify original array', () => {
      const result = prependItem(baseArray, 99)
      expect(baseArray).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('appendItem', () => {
    it('should add item to end', () => {
      const result = appendItem(baseArray, 99)
      expect(result).toEqual([1, 2, 3, 4, 5, 99])
    })

    it('should not modify original array', () => {
      const result = appendItem(baseArray, 99)
      expect(baseArray).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('findIndex', () => {
    it('should find index matching predicate', () => {
      const index = findIndex(objectArray, (item) => item.id === 2)
      expect(index).toBe(1)
    })

    it('should return -1 if not found', () => {
      const index = findIndex(objectArray, (item) => item.id === 999)
      expect(index).toBe(-1)
    })
  })

  describe('removeItemBy', () => {
    it('should remove item matching predicate', () => {
      const result = removeItemBy(objectArray, (item) => item.id === 2)
      expect(result).toEqual([
        { id: 1, name: 'Item 1' },
        { id: 3, name: 'Item 3' },
      ])
    })

    it('should return same array if not found', () => {
      const result = removeItemBy(objectArray, (item) => item.id === 999)
      expect(result).toEqual(objectArray)
    })

    it('should remove first match if multiple', () => {
      const arr = [1, 2, 1, 3]
      const result = removeItemBy(arr, (item) => item === 1)
      expect(result).toEqual([2, 1, 3])
    })
  })

  describe('mapWithIndex', () => {
    it('should map with index', () => {
      const result = mapWithIndex(baseArray, (item, index) => `${item}-${index}`)
      expect(result).toEqual(['1-0', '2-1', '3-2', '4-3', '5-4'])
    })
  })

  describe('isEmpty', () => {
    it('should return true for empty array', () => {
      expect(isEmpty([])).toBe(true)
    })

    it('should return false for non-empty array', () => {
      expect(isEmpty([1])).toBe(false)
    })
  })

  describe('first', () => {
    it('should return first item', () => {
      expect(first(baseArray, 99)).toBe(1)
    })

    it('should return default for empty array', () => {
      expect(first([], 99)).toBe(99)
    })
  })

  describe('last', () => {
    it('should return last item', () => {
      expect(last(baseArray, 99)).toBe(5)
    })

    it('should return default for empty array', () => {
      expect(last([], 99)).toBe(99)
    })
  })

  describe('createArray', () => {
    it('should create array of specific length', () => {
      const result = createArray(5, (i) => i * 2)
      expect(result).toEqual([0, 2, 4, 6, 8])
    })

    it('should create empty array for zero length', () => {
      const result = createArray(0, () => 1)
      expect(result).toEqual([])
    })
  })

  describe('groupBy', () => {
    const data = [
      { id: 1, category: 'A' },
      { id: 2, category: 'B' },
      { id: 3, category: 'A' },
      { id: 4, category: 'C' },
      { id: 5, category: 'B' },
    ]

    it('should group items by key', () => {
      const result = groupBy(data, (item) => item.category)

      expect(result).toEqual({
        A: [
          { id: 1, category: 'A' },
          { id: 3, category: 'A' },
        ],
        B: [
          { id: 2, category: 'B' },
          { id: 5, category: 'B' },
        ],
        C: [
          { id: 4, category: 'C' },
        ],
      })
    })

    it('should handle empty array', () => {
      const result = groupBy([], () => 'key')
      expect(result).toEqual({})
    })
  })
})
