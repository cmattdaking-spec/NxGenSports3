import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const rawBase44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

const SCOPE_CACHE_TTL_MS = 30_000;
let cachedUser = null;
let cachedAt = 0;
let pendingUserRequest = null;

async function getCurrentUser() {
  const now = Date.now();
  if (cachedUser && now - cachedAt < SCOPE_CACHE_TTL_MS) {
    return cachedUser;
  }

  if (pendingUserRequest) {
    return pendingUserRequest;
  }

  pendingUserRequest = rawBase44.auth.me()
    .then((user) => {
      cachedUser = user || null;
      cachedAt = Date.now();
      return cachedUser;
    })
    .catch(() => null)
    .finally(() => {
      pendingUserRequest = null;
    });

  return pendingUserRequest;
}

// Entities that only super admins may read. Non-super-admins receive an empty
// array for any list/filter call on these entities (client-side RLS enforcement
// to complement the server-side rule in the corresponding edge function).
//
// To add a new super-admin-only entity, add its name (exactly as used in
// `base44.entities.<EntityName>`) to this set. The applyScope function will
// return [] for all list/filter calls from non-super-admin users, while
// super admins receive the full unfiltered result set.
const SUPER_ADMIN_ONLY_ENTITIES = new Set(['MasterTeams']);

function applyScope(records, user, entityName) {
  if (!Array.isArray(records)) return records;
  if (!user || user.role === 'super_admin') return records;

  // Block non-super-admins from seeing super-admin-only entities entirely.
  // RLS rule: super_admin role has an exception; all others get no records.
  if (entityName && SUPER_ADMIN_ONLY_ENTITIES.has(entityName)) return [];

  const teamId = user.team_id || null;
  const schoolId = user.school_id || null;

  // RLS rule: User.TeamID must match Data.TeamID (or Data.SchoolID).
  return records.filter((record) => {
    if (!record || typeof record !== 'object') return false;

    const hasTeamKey = Object.prototype.hasOwnProperty.call(record, 'team_id');
    const hasSchoolKey = Object.prototype.hasOwnProperty.call(record, 'school_id');

    if (!hasTeamKey && !hasSchoolKey) return true;

    if (hasTeamKey && teamId && record.team_id !== teamId) return false;
    if (hasTeamKey && !teamId) return false;

    if (hasSchoolKey && schoolId && record.school_id !== schoolId) return false;
    if (hasSchoolKey && !schoolId) return false;

    return true;
  });
}

function wrapEntity(entityApi, entityName) {
  return new Proxy(entityApi, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);
      if (typeof original !== 'function' || (prop !== 'list' && prop !== 'filter')) {
        return original;
      }

      return async (...args) => {
        const result = await original.apply(target, args);
        if (!Array.isArray(result)) return result;
        const user = await getCurrentUser();
        return applyScope(result, user, entityName);
      };
    }
  });
}

const scopedEntities = new Proxy(rawBase44.entities, {
  get(target, prop, receiver) {
    const entityApi = Reflect.get(target, prop, receiver);
    if (!entityApi || typeof entityApi !== 'object') {
      return entityApi;
    }
    return wrapEntity(entityApi, prop);
  }
});

// Client with centralized read scoping so each role sees only its school/team records.
// Use a proxy instead of object spread so SDK getters like asServiceRole are not eagerly evaluated.
export const base44 = new Proxy(rawBase44, {
  get(target, prop, receiver) {
    if (prop === 'entities') {
      return scopedEntities;
    }
    return Reflect.get(target, prop, receiver);
  }
});
