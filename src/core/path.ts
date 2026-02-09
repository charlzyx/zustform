/**
 * @module core/path
 * @description Path utilities for dot-notation nested value access
 */

import type { Path } from './types'

/**
 * Parse a dot-notation path into an array of segments
 * @param path - Dot-notation path (e.g., "user.address.city" or "items.0.name")
 * @returns Array of path segments
 *
 * @example
 * ```ts
 * parsePath('user.name')        // => ['user', 'name']
 * parsePath('items.0.title')    // => ['items', '0', 'title']
 * parsePath('')                 // => []
 * ```
 */
export function parsePath(path: Path): string[] {
  if (!path || path === '') return []
  return path.split('.')
}

/**
 * Get a nested value from an object using dot-notation path
 * @param obj - The object to traverse
 * @param path - Dot-notation path
 * @returns The value at the path, or undefined if not found
 *
 * @example
 * ```ts
 * const obj = { user: { name: 'John', address: { city: 'NYC' } } }
 * getPath(obj, 'user.name')              // => 'John'
 * getPath(obj, 'user.address.city')      // => 'NYC'
 * getPath(obj, 'user.missing')           // => undefined
 * ```
 */
export function getPath<T = any>(obj: unknown, path: Path): T | undefined {
  if (!path || path === '') return obj as T
  if (obj == null) return undefined

  const segments = parsePath(path)
  let current: unknown = obj

  for (const segment of segments) {
    if (current == null) return undefined

    if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }

  return current as T
}

/**
 * Set a nested value in an object using dot-notation path
 * Creates intermediate objects/arrays as needed
 * @param obj - The object to modify
 * @param path - Dot-notation path
 * @param value - The value to set
 * @returns The modified object (for chaining)
 *
 * @example
 * ```ts
 * const obj = { user: {} }
 * setPath(obj, 'user.name', 'John')     // obj => { user: { name: 'John' } }
 * setPath(obj, 'items.0.title', 'First') // obj => { user: {}, items: [{ title: 'First' }] }
 * ```
 */
export function setPath(obj: Record<string, unknown>, path: Path, value: unknown): Record<string, unknown> {
  if (!path || path === '') return obj

  const segments = parsePath(path)
  let current: Record<string, unknown> = obj

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]

    if (!(segment in current) || current[segment] == null) {
      // Check if next segment is a number (array index)
      const nextSegment = segments[i + 1]
      const isNextNumeric = /^\d+$/.test(nextSegment)

      current[segment] = isNextNumeric ? [] : {}
    }

    current = current[segment] as Record<string, unknown>

    if (typeof current !== 'object' || current === null) {
      // Path conflict - cannot traverse into primitive
      current[segment] = {}
      current = current[segment] as Record<string, unknown>
    }
  }

  const lastSegment = segments[segments.length - 1]
  current[lastSegment] = value

  return obj
}

/**
 * Delete a nested value from an object using dot-notation path
 * @param obj - The object to modify
 * @param path - Dot-notation path
 * @returns true if the value was deleted, false otherwise
 *
 * @example
 * ```ts
 * const obj = { user: { name: 'John', age: 30 } }
 * deletePath(obj, 'user.name')    // => true, obj => { user: { age: 30 } }
 * deletePath(obj, 'user.missing') // => false
 * ```
 */
export function deletePath(obj: Record<string, unknown>, path: Path): boolean {
  if (!path || path === '') return false

  const segments = parsePath(path)
  let current: unknown = obj

  // Navigate to the parent of the target
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]

    if (current == null || typeof current !== 'object') {
      return false
    }

    current = (current as Record<string, unknown>)[segment]
  }

  if (current == null || typeof current !== 'object') {
    return false
  }

  const lastSegment = segments[segments.length - 1]
  const parent = current as Record<string, unknown>

  if (lastSegment in parent) {
    delete parent[lastSegment]
    return true
  }

  return false
}

/**
 * Check if a path exists in an object
 * @param obj - The object to check
 * @param path - Dot-notation path
 * @returns true if the path exists, false otherwise
 *
 * @example
 * ```ts
 * const obj = { user: { name: 'John' } }
 * hasPath(obj, 'user.name')      // => true
 * hasPath(obj, 'user.missing')   // => false
 * ```
 */
export function hasPath(obj: unknown, path: Path): boolean {
  return getPath(obj, path) !== undefined
}

/**
 * Get the parent path of a given path
 * @param path - Dot-notation path
 * @returns Parent path, or empty string if path is root
 *
 * @example
 * ```ts
 * getPathParent('user.name')        // => 'user'
 * getPathParent('user.address.city') // => 'user.address'
 * getPathParent('user')              // => ''
 * ```
 */
export function getPathParent(path: Path): string {
  if (!path || path === '') return ''

  const segments = parsePath(path)
  if (segments.length <= 1) return ''

  return segments.slice(0, -1).join('.')
}

/**
 * Append a segment to a path
 * @param path - Base path
 * @param segment - Segment to append
 * @returns Combined path
 *
 * @example
 * ```ts
 * appendPath('user', 'name')        // => 'user.name'
 * appendPath('user.address', 'city') // => 'user.address.city'
 * appendPath('', 'user')             // => 'user'
 * ```
 */
export function appendPath(path: Path, segment: string): string {
  if (!path || path === '') return segment
  return `${path}.${segment}`
}

/**
 * Compare two paths for equality
 * @param path1 - First path
 * @param path2 - Second path
 * @returns true if paths are equal, false otherwise
 *
 * @example
 * ```ts
 * isPathEqual('user.name', 'user.name')   // => true
 * isPathEqual('user.name', 'user.address') // => false
 * ```
 */
export function isPathEqual(path1: Path, path2: Path): boolean {
  return normalizePath(path1) === normalizePath(path2)
}

/**
 * Normalize a path string (remove extra dots, trim)
 * @param path - Path to normalize
 * @returns Normalized path
 *
 * @example
 * ```ts
 * normalizePath('user.name')    // => 'user.name'
 * normalizePath('.user.name.')   // => 'user.name'
 * normalizePath('')              // => ''
 * ```
 */
export function normalizePath(path: Path): string {
  if (!path) return ''

  return path
    .split('.')
    .filter(segment => segment !== '')
    .join('.')
}

/**
 * Check if a path is a descendant of another path
 * @param path - The path to check
 * @param ancestor - The potential ancestor path
 * @returns true if path is a descendant of ancestor
 *
 * @example
 * ```ts
 * isDescendant('user.address.city', 'user')      // => true
 * isDescendant('user.address.city', 'user.address') // => true
 * isDescendant('user.name', 'user.address')      // => false
 * ```
 */
export function isDescendant(path: Path, ancestor: Path): boolean {
  const normalizedPath = normalizePath(path)
  const normalizedAncestor = normalizePath(ancestor)

  if (!normalizedAncestor) return true
  if (normalizedPath === normalizedAncestor) return false

  return normalizedPath.startsWith(normalizedAncestor + '.')
}

/**
 * Check if a path is an ancestor of another path
 * @param path - The potential ancestor path
 * @param descendant - The path to check
 * @returns true if path is an ancestor of descendant
 *
 * @example
 * ```ts
 * isAncestor('user', 'user.address.city')     // => true
 * isAncestor('user.address', 'user.address.city') // => true
 * isAncestor('user.name', 'user.address')     // => false
 * ```
 */
export function isAncestor(path: Path, descendant: Path): boolean {
  return isDescendant(descendant, path)
}

/**
 * Get the leaf segment (last part) of a path
 * @param path - Dot-notation path
 * @returns The last segment of the path
 *
 * @example
 * ```ts
 * getLeaf('user.name')        // => 'name'
 * getLeaf('user.address.city') // => 'city'
 * getLeaf('user')              // => 'user'
 * ```
 */
export function getLeaf(path: Path): string {
  if (!path || path === '') return ''

  const segments = parsePath(path)
  return segments[segments.length - 1] || ''
}

/**
 * Convert an array of path segments to a dot-notation path
 * @param segments - Array of path segments
 * @returns Dot-notation path string
 *
 * @example
 * ```ts
 * segmentsToPath(['user', 'name'])       // => 'user.name'
 * segmentsToPath(['items', '0', 'title']) // => 'items.0.title'
 * ```
 */
export function segmentsToPath(segments: string[]): string {
  return segments.filter(s => s !== '').join('.')
}

/**
 * Check if a path segment is an array index (numeric)
 * @param segment - Path segment to check
 * @returns true if the segment represents a numeric array index
 *
 * @example
 * ```ts
 * isArrayIndex('0')    // => true
 * isArrayIndex('42')   // => true
 * isArrayIndex('-1')   // => false
 * isArrayIndex('abc')  // => false
 * ```
 */
export function isArrayIndex(segment: string): boolean {
  return /^\d+$/.test(segment)
}

/**
 * Traverse all paths in an object
 * @param obj - The object to traverse
 * @param prefix - Prefix for paths (used in recursion)
 * @returns Generator that yields all paths in the object
 *
 * @example
 * ```ts
 * const obj = { user: { name: 'John', age: 30 } }
 * Array.from(traversePaths(obj)) // => ['user.name', 'user.age']
 * ```
 */
export function* traversePaths(obj: unknown, prefix = ''): Generator<string> {
  if (obj == null || typeof obj !== 'object') {
    if (prefix !== '') yield prefix
    return
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const path = prefix ? `${prefix}.${i}` : String(i)
      if (obj[i] != null && typeof obj[i] === 'object') {
        yield* traversePaths(obj[i], path)
      } else {
        yield path
      }
    }
  } else {
    for (const key of Object.keys(obj)) {
      const path = prefix ? `${prefix}.${key}` : key
      const value = (obj as Record<string, unknown>)[key]
      if (value != null && typeof value === 'object') {
        yield* traversePaths(value, path)
      } else {
        yield path
      }
    }
  }
}

/**
 * Deep clone an object while handling circular references
 * @param obj - The object to clone
 * @returns A deep clone of the object
 */
export function deepClone<T>(obj: T): T {
  if (obj == null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T
  }

  if (obj instanceof Object) {
    const clonedObj = {} as Record<string, unknown>
    for (const key of Object.keys(obj)) {
      clonedObj[key] = deepClone((obj as Record<string, unknown>)[key])
    }
    return clonedObj as T
  }

  return obj
}

/**
 * Deep equality check for two values
 * @param a - First value
 * @param b - Second value
 * @returns true if values are deeply equal
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  // Strict equality for primitives
  if (a === b) return true

  // Handle null/undefined
  if (a == null || b == null) return a === b

  // Check if both are objects
  if (typeof a !== 'object' || typeof b !== 'object') return false

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  // Handle arrays vs non-arrays
  if (Array.isArray(a) !== Array.isArray(b)) return false

  // Handle plain objects
  const keysA = Object.keys(a as Record<string, unknown>)
  const keysB = Object.keys(b as Record<string, unknown>)

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (!keysB.includes(key)) return false
    if (!deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key]
    )) {
      return false
    }
  }

  return true
}
