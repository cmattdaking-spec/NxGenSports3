/**
 * base44Client.js — re-exports the new standalone API client
 * All components that import from @/api/base44Client continue to work unchanged.
 */
export { base44 } from './apiClient';
export { getToken, setToken, removeToken } from './apiClient';
