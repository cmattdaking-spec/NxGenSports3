/**
 * NxGenSports API Client
 * Replaces the Base44 SDK with a standalone FastAPI + MongoDB backend client.
 * Maintains the same interface as base44Client.js so all existing components work unchanged.
 */

const TOKEN_KEY = "nxgen_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch(method, url, body = null) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    removeToken();
    const pathname = window.location.pathname;
    if (!pathname.includes("/Login") && !pathname.includes("/ResetPassword")) {
      window.location.href = "/Login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    let errMsg = "Request failed";
    try {
      const err = await res.json();
      errMsg = err.detail || err.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────
const auth = {
  async me() {
    return apiFetch("GET", "/api/auth/me");
  },

  async login(email, password) {
    const data = await apiFetch("POST", "/api/auth/login", { email, password });
    if (data.access_token) setToken(data.access_token);
    return data;
  },

  async register(userData) {
    const data = await apiFetch("POST", "/api/auth/register", userData);
    if (data.access_token) setToken(data.access_token);
    return data;
  },

  async acceptInvite(invite_token, password, full_name) {
    const data = await apiFetch("POST", "/api/auth/accept-invite", { invite_token, password, full_name });
    if (data.access_token) setToken(data.access_token);
    return data;
  },

  async getInvite(invite_token) {
    return apiFetch("GET", `/api/auth/invite/${invite_token}`);
  },

  async updateMe(data) {
    return apiFetch("PATCH", "/api/auth/me", data);
  },

  async changePassword(currentPassword, newPassword) {
    return apiFetch("POST", "/api/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  logout(returnUrl) {
    removeToken();
    window.location.href = "/Login";
  },

  redirectToLogin(returnUrl) {
    window.location.href = "/Login";
  },
};

// ─── Entity Factory ───────────────────────────────────────────────────────────
function makeEntity(entityName) {
  const base = `/api/entities/${entityName}`;

  return {
    async list(sort = "-created_at", limit = 500, skip = 0, projection) {
      const params = new URLSearchParams();
      if (sort) params.set("sort", sort);
      if (limit) params.set("limit", String(limit));
      if (skip) params.set("skip", String(skip));
      return apiFetch("GET", `${base}?${params.toString()}`);
    },

    async filter(query = {}, sort = "-created_at", limit = 500) {
      return apiFetch("POST", `${base}/filter`, { query, sort, limit });
    },

    async get(id) {
      return apiFetch("GET", `${base}/${id}`);
    },

    async create(data) {
      return apiFetch("POST", base, data);
    },

    async update(id, data) {
      return apiFetch("PATCH", `${base}/${id}`, data);
    },

    async delete(id) {
      return apiFetch("DELETE", `${base}/${id}`);
    },

    // subscribe() — not supported in the standalone backend.
    // Returns a no-op cleanup so useEffect cleanups don't crash.
    // Pages that relied on Base44's real-time subscription will load
    // correctly on mount; live updates are handled by WebSocket/polling.
    subscribe(_callback) {
      return () => {};
    },
  };
}

// ─── Entities Proxy ──────────────────────────────────────────────────────────
const entities = new Proxy({}, {
  get(target, entityName) {
    if (typeof entityName === "string" && entityName !== "then") {
      if (!target[entityName]) {
        target[entityName] = makeEntity(entityName);
      }
      return target[entityName];
    }
    return target[entityName];
  },
});

// ─── Functions ───────────────────────────────────────────────────────────────
const functions = {
  async invoke(functionName, params = {}) {
    const data = await apiFetch("POST", `/api/functions/${functionName}`, params);
    return { data };
  },
};

// ─── LLM Integration ─────────────────────────────────────────────────────────
const integrations = {
  Core: {
    async InvokeLLM({ prompt, response_json_schema } = {}) {
      return apiFetch("POST", "/api/integrations/llm", { prompt, response_json_schema });
    },
    async UploadFile({ file } = {}) {
      const token = getToken();
      const formData = new FormData();
      formData.append("file", file);
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/upload", { method: "POST", headers, body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upload failed");
      }
      return res.json(); // returns { file_url, filename }
    },
  },
};

// ─── Export ──────────────────────────────────────────────────────────────────
export const base44 = {
  auth,
  entities,
  functions,
  integrations,
};

export default base44;
