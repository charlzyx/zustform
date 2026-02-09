/**
 * @module core/object
 * @description Utility functions for object operations
 */

/**
 * Deep clone an object
 */
export function clone<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Deep merge two objects
 */
export function merge<T extends object>(target: T, source: Partial<T>): T {
  const output = { ...target }
  const isObject = (obj: any): obj is object => obj && typeof obj === 'object' && !Array.isArray(obj)

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = clone(source[key])
        } else {
          output[key] = merge(target[key], source[key])
        }
      } else {
        output[key] = source[key]
      }
    })
  }

  return output
}

/**
 * Check if two objects are shallow equal
 */
export function shallowEqual<T extends object>(objA: T, objB: T): boolean {
  if (Object.is(objA, objB)) return true

  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false
  }

  const keysA = Object.keys(objA) as Array<keyof T>
  const keysB = Object.keys(objB)

  if (keysA.length !== keysB.length) return false

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i]
    if (!Object.prototype.hasOwnProperty.call(objB, key) || !Object.is(objA[key], objB[key])) {
      return false
    }
  }

  return true
}

/**
 * Check if two objects are deep equal
 */
export function deepEqual<T extends object>(objA: T, objB: T): boolean {
  return JSON.stringify(objA) === JSON.stringify(objB)
}

/**
 * Get all keys from a nested object as dot notation paths
 * @example
 * getKeys({ a: { b: { c: 1 }, d: 2 }, e: 3 }) // ['a.b.c', 'a.d', 'e']
 */
export function getKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = []

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const path = prefix ? `${prefix}.${key}` : key
      const value = obj[key]

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        keys.push(...getKeys(value, path))
      } else {
        keys.push(path)
      }
    }
  }

  return keys
}

/**
 * Pick specific keys from an object
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

/**
 * Omit specific keys from an object
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0
}

/**
 * Get array of object values
 */
export function values<T extends object>(obj: T): T[keyof T][] {
  return Object.values(obj) as T[keyof T][]
}

/**
 * Get array of object entries
 */
export function entries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][]
}
