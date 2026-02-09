/**
 * @module core/array
 * @description Utility functions for array operations in forms
 */

/**
 * Move an item from one index to another
 */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to) return arr

  const result = [...arr]
  const [removed] = result.splice(from, 1)
  result.splice(to, 0, removed)

  return result
}

/**
 * Insert an item at a specific index
 */
export function insertItem<T>(arr: T[], index: number, item: T): T[] {
  const result = [...arr]
  result.splice(index, 0, item)
  return result
}

/**
 * Remove an item at a specific index
 */
export function removeItem<T>(arr: T[], index: number): T[] {
  if (index < 0 || index >= arr.length) return arr

  const result = [...arr]
  result.splice(index, 1)
  return result
}

/**
 * Swap two items at specific indices
 */
export function swapItems<T>(arr: T[], from: number, to: number): T[] {
  if (from === to) return arr

  const result = [...arr]
  const temp = result[from]
  result[from] = result[to]
  result[to] = temp

  return result
}

/**
 * Update an item at a specific index
 */
export function updateItem<T>(arr: T[], index: number, updater: (item: T, index: number) => T): T[] {
  if (index < 0 || index >= arr.length) return arr

  const result = [...arr]
  result[index] = updater(result[index], index)

  return result
}

/**
 * Move an item up by one position
 */
export function moveItemUp<T>(arr: T[], index: number): T[] {
  if (index <= 0) return arr
  return moveItem(arr, index, index - 1)
}

/**
 * Move an item down by one position
 */
export function moveItemDown<T>(arr: T[], index: number): T[] {
  if (index >= arr.length - 1) return arr
  return moveItem(arr, index, index + 1)
}

/**
 * Prepend an item to the array
 */
export function prependItem<T>(arr: T[], item: T): T[] {
  return [item, ...arr]
}

/**
 * Append an item to the array
 */
export function appendItem<T>(arr: T[], item: T): T[] {
  return [...arr, item]
}

/**
 * Find the index of an item by a predicate
 */
export function findIndex<T>(arr: T[], predicate: (item: T, index: number) => boolean): number {
  return arr.findIndex(predicate)
}

/**
 * Remove an item by predicate
 */
export function removeItemBy<T>(arr: T[], predicate: (item: T, index: number) => boolean): T[] {
  const index = arr.findIndex(predicate)
  if (index === -1) return arr
  return removeItem(arr, index)
}

/**
 * Map an array with index included
 */
export function mapWithIndex<T, U>(arr: T[], fn: (item: T, index: number) => U): U[] {
  return arr.map(fn)
}

/**
 * Check if an array is empty
 */
export function isEmpty<T>(arr: T[]): boolean {
  return arr.length === 0
}

/**
 * Get the first item or default value
 */
export function first<T>(arr: T[], defaultValue: T): T {
  return arr.length > 0 ? arr[0] : defaultValue
}

/**
 * Get the last item or default value
 */
export function last<T>(arr: T[], defaultValue: T): T {
  return arr.length > 0 ? arr[arr.length - 1] : defaultValue
}

/**
 * Create an array of a specific length
 */
export function createArray<T>(length: number, fn: (index: number) => T): T[] {
  return Array.from({ length }, (_, i) => fn(i))
}

/**
 * Group array items by a key
 */
export function groupBy<T, K extends string>(arr: T[], keyFn: (item: T) => K): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const key = keyFn(item)
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(item)
    return acc
  }, {} as Record<K, T[]>)
}
