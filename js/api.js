(function () {
  "use strict";

  // Use same-origin API so this works in local and deployed environments
  // without changing hardcoded hostnames.
  const API_BASE = window.location.origin;
  const JSON_HEADERS = { "Content-Type": "application/json" };

  function buildUrl(path) {
    return API_BASE + path;
  }

  async function requestJson(path, options = {}) {
    const response = await fetch(buildUrl(path), {
      credentials: "include",
      ...options
    });

    if (!response.ok) {
      throw new Error(`Failed ${path}`);
    }
    return response.json();
  }

  async function me() {
    return requestJson("/auth/me", {
      method: "GET"
    });
  }

  async function register(email, password) {
    return requestJson("/auth/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email, password })
    });
  }

  async function login(email, password) {
    return requestJson("/auth/login", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email, password })
    });
  }

  async function logout() {
    await requestJson("/auth/logout", {
      method: "POST"
    });
  }

  async function startRun(payload) {
    return requestJson("/api/run/start", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload || {})
    });
  }

  async function finishRun(payload) {
    return requestJson("/api/run/finish", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload || {})
    });
  }

  // ========== FINAL EXPORTED OBJECT ==========

  window.GameAPI = {
    baseUrl: API_BASE,

    me,
    register,
    login,
    logout,
    startRun,
    finishRun,

    oauth: {
      googleStart: buildUrl("/auth/google/start"),
      amazonStart: buildUrl("/auth/amazon/start")
    }
  };
})();
