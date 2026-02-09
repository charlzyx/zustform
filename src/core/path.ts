/**
 * @module core/path
 * @description Utility functions for working with nested paths
 */

/**
 * Get a value from an object using dot notation path
 * @example
 * get({ user: { name: 'John' } }, 'user.name') // 'John'
 */
export function get<T = any>(obj: Record<string, any>, path: string): T {
  return path.split('.').reduce((acc, part) => acc?.[part], obj)
}

/**
 * Set a value in an object using dot notation path
 * @example
 * const obj = {}
 * set(obj, 'user.name', 'John')
 * // obj = { user: { name: 'John' } }
 */
export function set<T>(obj: Record<string, any>, path: string, value: T): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  const target = keys.reduce((acc, key) => {
    if (!acc[key] || typeof acc[key] !== 'object') {
      acc[key] = {}
    }
    return acc[key]
  }, obj)
  target[lastKey] = value
}

/**
 * Delete a value from an object using dot notation path
 * @example
 * const obj = { user: { name: 'John' } }
 * del(obj, 'user.name')
 * // obj = { user: {} }
 */
export function del(obj: Record<string, any>, path: string): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  const target = keys.reduce((acc, key) => acc?.[key], obj)
  if (target && typeof target === 'object' && lastKey in target) {
    delete target[lastKey]
  }
}

/**
 * Check if a path exists in an object using dot notation
 * @example
 * has({ user: { name: 'John' } }, 'user.name') // true
 * has({ user: { name: 'John' } }, 'user.age') // false
 */
export function has(obj: Record<string, any>, path: string): boolean {
  return path.split('.').every((part) => {
    if (!obj || typeof obj !== 'object') return false
    if (!Object.prototype.hasOwnProperty.call(obj, part)) {
      if (typeof obj[part] === 'undefined') return false
    }
    obj = obj[part]
    return true
  })
}

/**
 * Get all values from an object matching a pattern
 * @example
 * getAll({ a: 1, 'b.c': 2, 'b.d': 3 }, 'b') // { c: 2, d: 3 }
 */
export function getAll(obj: Record<string, any>, prefix: string): Record<string, any> {
  const result: Record<string, any> = {}
  const keys = Object.keys(obj)

  for (const key of keys) {
    if (key.startsWith(prefix)) {
      const suffix = key.slice(prefix.length + 1) // +1 to skip the dot
      set(result, suffix, get(obj, key))
    }
  }

  return result
}

/**
 * Check if a path matches a pattern
 * @example
 * matches('user.name', 'user') // true
 * matches('user.address.street', 'user') // true
 * matches('user', 'user') // false
 */
export function matches(path: string, pattern: string): boolean {
  if (path === pattern) return false
  return path.startsWith(pattern + '.')
}

/**
 * Join path segments into a dot notation path
 * @example
 * joinPath('user', 'name') // 'user.name'
 * joinPath('user', '', 'name') // 'user.name'
 */
export function joinPath(...segments: (string | undefined | null)[]): string {
  return segments.filter(Boolean).join('.')
}

/**
 * Split a dot notation path into segments
 * @example
 * splitPath('user.name.first') // ['user', 'name', 'first']
 */
export function splitPath(path: string): string[] {
  return path.split('.')
}

/**
 * Get the last segment of a path (field name)
 * @example
 * getFieldName('user.name') // 'name'
 */
export function getFieldName(path: string): string {
  const segments = splitPath(path)
  return segments[segments.length - 1]
}

/**
 * Get the parent path
 * @example
 * getParentPath('user.name.first') // 'user.name'
 * getParentPath('user') // ''
 */
export function getParentPath(path: string): string {
  const segments = splitPath(path)
  segments.pop()
  return joinPath(...segments)
}

/**
 * Check if two paths are related (one is ancestor of the other)
 * @example
 * isRelated('user.name', 'user') // true
 * isRelated('user.name', 'user.address') // false
 */
export function isRelated(path1: string, path2: string): boolean {
  if (path1 === path2) return true
  return path1.startsWith(path2 + '.') || path2.startsWith(path1 + '.')
}
