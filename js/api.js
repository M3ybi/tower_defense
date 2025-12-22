(function () {
  "use strict";

  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const API_BASE = isLocal
    ? "http://127.0.0.1:8080"                     // local dev
    : "https://your-api-domain.example.com";      // deployed backend

  // ========== CORE API HELPERS ==========

  async function me() {
    const r = await fetch(API_BASE + "/auth/me", {
      method: "GET",
      credentials: "include"
    });
    if (!r.ok) throw new Error("Failed /auth/me");
    return r.json();
  }

  async function register(email, password) {
    const r = await fetch(API_BASE + "/auth/register", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });
    if (!r.ok) throw new Error("Failed /auth/register");
    return r.json();
  }

  async function login(email, password) {
    const r = await fetch(API_BASE + "/auth/login", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });
    if (!r.ok) throw new Error("Failed /auth/login");
    return r.json();
  }

  async function logout() {
    await fetch(API_BASE + "/auth/logout", {
      method: "POST",
      credentials: "include"
    });
  }

  async function startRun(level) {
    const r = await fetch(API_BASE + "/run/start", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ level })
    });
    if (!r.ok) throw new Error("Failed /run/start");
    return r.json();
  }

  async function finishRun(runId, result) {
    const r = await fetch(API_BASE + "/run/finish", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ runId, result })
    });
    if (!r.ok) throw new Error("Failed /run/finish");
    return r.json();
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
      googleStart: API_BASE + "/auth/google/start",
      amazonStart: API_BASE + "/auth/amazon/start"
    }
  };
})();
