/**
 * componentUtils.js - Utilities for validating React components
 *
 * Provides helpers to detect invalid components before rendering,
 * preventing "TypeError: Illegal constructor" crashes at runtime.
 */

/**
 * Returns true if `value` is a valid React component (function or class).
 */
export function isValidComponent(value) {
  if (value == null) return false;
  if (typeof value === 'function') return true;
  // Class components have a prototype with render
  if (typeof value === 'object' && typeof value.render === 'function') return true;
  return false;
}

/**
 * Validates every entry in the Pages map and logs warnings for invalid entries.
 * Returns an array of invalid page keys (empty array means all pages are valid).
 */
export function validatePages(Pages) {
  const invalidKeys = [];

  for (const [key, component] of Object.entries(Pages)) {
    if (!isValidComponent(component)) {
      console.error(
        `[componentUtils] Page "${key}" is not a valid React component.`,
        'Received:',
        component
      );
      invalidKeys.push(key);
    }
  }

  if (invalidKeys.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[componentUtils] ✓ All pages validated successfully.');
    }
  } else {
    console.warn(
      `[componentUtils] ⚠ ${invalidKeys.length} invalid page(s) found:`,
      invalidKeys
    );
  }

  return invalidKeys;
}
