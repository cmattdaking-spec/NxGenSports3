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

function applyScope(records, user) {
  if (!Array.isArray(records)) return records;
  if (!user || user.role === 'super_admin') return records;

  const teamId = user.team_id || null;
  const schoolId = user.school_id || null;

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

function wrapEntity(entityApi) {
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
        return applyScope(result, user);
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
    return wrapEntity(entityApi);
  }
});

// Client with centralized read scoping so each role sees only its school/team records.
export const base44 = {
  ...rawBase44,
  entities: scopedEntities
};
