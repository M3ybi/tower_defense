// js/login.js
(function () {
  "use strict";

  const entryScreen = document.getElementById("entryScreen");
  const gameHubScreen = document.getElementById("gameHubScreen");
  const setupScreen = document.getElementById("setupScreen");

  const usernameInput = document.getElementById("username");
  const btnSaveUsername = document.getElementById("btnSaveUsername");
  const usernameSaveStatus = document.getElementById("usernameSaveStatus");
  const setupContentSection = document.getElementById("setupContentSection");
  const leaderboardContentSection = document.getElementById("leaderboardContentSection");
  const btnShowSetupSection = document.getElementById("btnShowSetupSection");
  const btnShowLeaderboardSection = document.getElementById("btnShowLeaderboardSection");

  const authStatusText = document.getElementById("authStatusText");
  const hubAuthStatusText = document.getElementById("hubAuthStatusText");
  const leaderboardRows = document.getElementById("leaderboardRows");
  const leaderboardEmpty = document.getElementById("leaderboardEmpty");
  const leaderboardStatus = document.getElementById("leaderboardStatus");
  const leaderboardSearchPlayer = document.getElementById("leaderboardSearchPlayer");
  const leaderboardSearchLevel = document.getElementById("leaderboardSearchLevel");
  const btnRefreshLeaderboard = document.getElementById("btnRefreshLeaderboard");
  const leaderboardSortBtns = Array.from(document.querySelectorAll(".th-sort[data-sort]"));

  const btnGuest = document.getElementById("btnEntryGuest");
  const btnAuth = document.getElementById("btnEntryAuth");

  const authModal = document.getElementById("authModal");
  const authBackdrop = document.getElementById("authBackdrop");
  const authClose = document.getElementById("authClose");
  const btnLogout = document.getElementById("btnLogout");
  const btnHubLogout = document.getElementById("btnHubLogout");
  const btnOpenTowerDefense = document.getElementById("btnOpenTowerDefense");
  const btnOpenTaptiles = document.getElementById("btnOpenTaptiles");
  const btnBackToGameHub = document.getElementById("btnBackToGameHub");
  const btnGoogleAuth = document.getElementById("btnGoogleAuth");
  const btnAmazonAuth = document.getElementById("btnAmazonAuth");
  const authTabLogin = document.getElementById("authTabLogin");
  const authTabRegister = document.getElementById("authTabRegister");
  const authLoginForm = document.getElementById("authLoginForm");
  const authRegisterForm = document.getElementById("authRegisterForm");
  const authFormStatus = document.getElementById("authFormStatus");
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const registerDisplayName = document.getElementById("registerDisplayName");
  const registerEmail = document.getElementById("registerEmail");
  const registerPassword = document.getElementById("registerPassword");

  const MODE_LOGGED_OUT = "logged_out";
  const MODE_GUEST = "guest";
  const MODE_AUTHED = "authed";

  let sessionMode = MODE_LOGGED_OUT;
  let authedUserId = null;
  let leaderboardRawRows = [];
  let searchPlayerQuery = "";
  let searchLevelQuery = "";
  let sortKey = "scoreTotal";
  let sortDir = "desc";

  function getApi() {
    return window.GameAPI || null;
  }

  function setStatus(text) {
    if (authStatusText) authStatusText.textContent = String(text || "");
    if (hubAuthStatusText) hubAuthStatusText.textContent = String(text || "");
  }

  function setUsernameSaveStatus(text) {
    if (usernameSaveStatus) usernameSaveStatus.textContent = String(text || "");
  }

  function showSetup() {
    if (entryScreen) entryScreen.classList.add("hidden");
    if (gameHubScreen) gameHubScreen.classList.add("hidden");
    if (setupScreen) setupScreen.classList.remove("hidden");
    switchToSection("setup");
  }

  function showGameHub() {
    if (entryScreen) entryScreen.classList.add("hidden");
    if (setupScreen) setupScreen.classList.add("hidden");
    if (gameHubScreen) gameHubScreen.classList.remove("hidden");
  }

  function openAuthModal() {
    if (authBackdrop) authBackdrop.classList.remove("hidden");
    if (authModal) {
      authModal.classList.remove("hidden");
      authModal.setAttribute("aria-hidden", "false");
    }
  }

  function closeAuthModal() {
    if (authBackdrop) authBackdrop.classList.add("hidden");
    if (authModal) {
      authModal.classList.add("hidden");
      authModal.setAttribute("aria-hidden", "true");
    }
  }

  function setAuthFormStatus(text, isError = false) {
    if (!authFormStatus) return;
    authFormStatus.textContent = String(text || "");
    authFormStatus.classList.toggle("auth-form-status--error", !!isError);
  }

  function setAuthTab(mode) {
    const isRegister = mode === "register";
    authTabLogin?.classList.toggle("auth-tab--active", !isRegister);
    authTabRegister?.classList.toggle("auth-tab--active", isRegister);
    authTabLogin?.setAttribute("aria-selected", !isRegister ? "true" : "false");
    authTabRegister?.setAttribute("aria-selected", isRegister ? "true" : "false");
    authLoginForm?.classList.toggle("hidden", isRegister);
    authRegisterForm?.classList.toggle("hidden", !isRegister);
    setAuthFormStatus("");
  }

  function returnToEntry() {
    entryScreen?.classList.remove("hidden");
    gameHubScreen?.classList.add("hidden");
    setupScreen?.classList.add("hidden");
  }

  function sanitizeDisplayName(raw) {
    const normalized = String(raw || "").trim().replace(/\s+/g, " ");
    return (normalized || "Player").slice(0, 24);
  }

  function switchToSection(section) {
    const showLeaderboard = section === "leaderboard";

    if (setupContentSection) {
      setupContentSection.classList.toggle("hidden", showLeaderboard);
    }
    if (leaderboardContentSection) {
      leaderboardContentSection.classList.toggle("hidden", !showLeaderboard);
    }
    if (btnShowSetupSection) {
      btnShowSetupSection.classList.toggle("is-active", !showLeaderboard);
    }
    if (btnShowLeaderboardSection) {
      btnShowLeaderboardSection.classList.toggle("is-active", showLeaderboard);
    }

    if (showLeaderboard) {
      void refreshLeaderboard();
    }
  }

  function setLoggedOutState() {
    sessionMode = MODE_LOGGED_OUT;
    authedUserId = null;

    if (usernameInput) {
      usernameInput.value = "";
      usernameInput.readOnly = false;
    }

    localStorage.removeItem("username");
    localStorage.removeItem("user_email");

    setStatus("Not signed in");
    setUsernameSaveStatus("");
    if (btnLogout) btnLogout.classList.add("hidden");
    if (btnHubLogout) btnHubLogout.classList.add("hidden");
  }

  function randomGuestName() {
    return `guest${Math.floor(10000 + Math.random() * 90000)}`;
  }

  function setGuestState(guestName) {
    sessionMode = MODE_GUEST;
    authedUserId = null;

    const name = sanitizeDisplayName(guestName);

    if (btnLogout) btnLogout.classList.add("hidden");
    if (btnHubLogout) btnHubLogout.classList.add("hidden");

    if (usernameInput) {
      usernameInput.value = name;
      usernameInput.readOnly = false;
    }

    localStorage.setItem("username", name);
    localStorage.removeItem("user_email");

    setStatus("Guest mode");
    setUsernameSaveStatus("");
    void refreshLeaderboard();
  }

  function setAuthedState(user) {
    sessionMode = MODE_AUTHED;
    authedUserId = user && user.id ? Number(user.id) : null;

    const displayName =
      user && (user.display_name || user.displayName)
        ? String(user.display_name || user.displayName)
        : "";
    const name = sanitizeDisplayName(displayName || "Player");

    if (usernameInput) {
      usernameInput.value = name;
      usernameInput.readOnly = false;
    }

    if (btnLogout) btnLogout.classList.remove("hidden");
    if (btnHubLogout) btnHubLogout.classList.remove("hidden");

    localStorage.setItem("username", name);
    localStorage.removeItem("user_email");

    setStatus(`Signed in as ${name}`);
    setUsernameSaveStatus("");
    void refreshLeaderboard();
  }

  function formatAccuracy(value) {
    if (!Number.isFinite(value)) return "0%";
    return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
  }

  function setLeaderboardStatus(text) {
    if (leaderboardStatus) leaderboardStatus.textContent = String(text || "");
  }

  function normalizeLevelQuery(q) {
    const s = String(q || "").trim();
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    const level = Math.floor(n);
    if (level < 1 || level > 30) return null;
    return level;
  }

  function getComparableValue(row, key) {
    if (!row) return null;
    if (key === "displayName") return String(row.displayName || "");
    if (key === "rank") return Number(row.rank) || 0;
    if (key === "finishedAt") return row.finishedAt ? new Date(row.finishedAt).getTime() : null;

    const v = row[key];
    if (v === null || v === undefined) return null;
    const num = Number(v);
    return Number.isFinite(num) ? num : null;
  }

  function compareValues(a, b, dir, isString) {
    // nulls last
    const aNull = a === null || a === undefined || a === "";
    const bNull = b === null || b === undefined || b === "";
    if (aNull && bNull) return 0;
    if (aNull) return 1;
    if (bNull) return -1;

    if (isString) {
      const aa = String(a).toLowerCase();
      const bb = String(b).toLowerCase();
      if (aa < bb) return dir === "asc" ? -1 : 1;
      if (aa > bb) return dir === "asc" ? 1 : -1;
      return 0;
    }

    const diff = Number(a) - Number(b);
    if (diff === 0) return 0;
    return dir === "asc" ? diff : -diff;
  }

  function getFilteredAndSortedRows(rows) {
    let out = Array.isArray(rows) ? [...rows] : [];

    if (searchPlayerQuery) {
      const q = searchPlayerQuery.toLowerCase();
      out = out.filter((row) => String(row.displayName || "").toLowerCase().includes(q));
    }

    const levelFilter = normalizeLevelQuery(searchLevelQuery);
    if (levelFilter !== null) {
      out = out.filter((row) => Number(row.level) === levelFilter);
    }

    out.sort((a, b) => {
      const isString = sortKey === "displayName";
      const av = getComparableValue(a, sortKey);
      const bv = getComparableValue(b, sortKey);
      const c = compareValues(av, bv, sortDir, isString);
      if (c !== 0) return c;

      // Stable tie-break: keep server rank order.
      const ra = Number(a.rank) || 0;
      const rb = Number(b.rank) || 0;
      return ra - rb;
    });

    return out;
  }

  function updateSortHeaderUI() {
    leaderboardSortBtns.forEach((btn) => {
      const key = btn.getAttribute("data-sort") || "";
      const base = btn.getAttribute("data-label") || btn.textContent || "";
      if (!btn.getAttribute("data-label")) btn.setAttribute("data-label", base.trim());

      const isActive = key === sortKey;
      btn.classList.toggle("is-active", isActive);

      const label = btn.getAttribute("data-label") || base.trim();
      if (!isActive) {
        btn.textContent = label;
        return;
      }

      btn.textContent = `${label} ${sortDir === "asc" ? "▲" : "▼"}`;
    });
  }

  function renderLeaderboardRows() {
    if (!leaderboardRows || !leaderboardEmpty) return;

    const visibleRows = getFilteredAndSortedRows(leaderboardRawRows);
    leaderboardRows.innerHTML = "";

    const currentUserId = authedUserId || 0;
    let currentUserShownInList = false;

    if (!visibleRows.length) {
      const hasSearch = !!searchPlayerQuery || normalizeLevelQuery(searchLevelQuery) !== null;
      leaderboardEmpty.textContent = hasSearch
        ? "No results match your search."
        : "No ranked runs yet.";
      leaderboardEmpty.classList.remove("hidden");
      return;
    }

    leaderboardEmpty.classList.add("hidden");

    visibleRows.forEach((row) => {
      const tr = document.createElement("tr");

      const rank = Number(row.rank) || 0;
      const userId = Number(row.userId) || 0;
      const player = sanitizeDisplayName(row.displayName || "Player");
      const score = Number(row.scoreTotal) || 0;
      const level = Number(row.level) || 1;
      const tarDiff = row.tarDiff === null ? "" : String(Number(row.tarDiff) || 0);
      const disPerWave = row.distractorsPerWave === null ? "" : String(Number(row.distractorsPerWave) || 0);
      const redHits = Number(row.redHits) || 0;
      const greenHits = Number(row.greenHits) || 0;
      const accuracy = formatAccuracy(Number(row.accuracyPct));

      if (currentUserId && userId === currentUserId) {
        tr.classList.add("leaderboard-row--me");
        currentUserShownInList = true;
      }

      const rankTd = document.createElement("td");
      rankTd.textContent = `#${rank}`;
      tr.appendChild(rankTd);

      const playerTd = document.createElement("td");
      playerTd.textContent = player;
      tr.appendChild(playerTd);

      const scoreTd = document.createElement("td");
      const isCustom = row && row.custom === true;
      scoreTd.textContent = isCustom ? `${score}*` : String(score);
      if (isCustom) scoreTd.title = "Custom settings";
      tr.appendChild(scoreTd);

      const levelTd = document.createElement("td");
      levelTd.textContent = String(level);
      tr.appendChild(levelTd);

      const tarDiffTd = document.createElement("td");
      tarDiffTd.textContent = tarDiff;
      tr.appendChild(tarDiffTd);

      const disWaveTd = document.createElement("td");
      disWaveTd.textContent = disPerWave;
      tr.appendChild(disWaveTd);

      const redTd = document.createElement("td");
      redTd.textContent = String(redHits);
      tr.appendChild(redTd);

      const greenTd = document.createElement("td");
      greenTd.textContent = String(greenHits);
      tr.appendChild(greenTd);

      const accTd = document.createElement("td");
      accTd.textContent = accuracy;
      tr.appendChild(accTd);

      leaderboardRows.appendChild(tr);
    });

    // No "your rank" append: leaderboard is now per-level and can contain multiple rows per user.
  }

  async function loadLeaderboardPayload(limit) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 500));
    const api = getApi();

    if (api && typeof api.leaderboard === "function") {
      return api.leaderboard(safeLimit);
    }

    const r = await fetch(`/api/leaderboard?limit=${safeLimit}`, {
      method: "GET",
      credentials: "include"
    });
    if (!r.ok) throw new Error("Failed leaderboard request");
    return r.json();
  }

  async function refreshLeaderboard() {
    setLeaderboardStatus("Loading rankings...");
    try {
      const response = await loadLeaderboardPayload(200);
      leaderboardRawRows =
        response && Array.isArray(response.leaderboard) ? response.leaderboard : [];

      updateSortHeaderUI();
      renderLeaderboardRows();

      setLeaderboardStatus(
        leaderboardRawRows.length ? "Updated just now." : "No scores to show yet."
      );
    } catch {
      setLeaderboardStatus("Could not load rankings right now.");
    }
  }

  async function saveUsername() {
    if (!usernameInput) return;

    const name = sanitizeDisplayName(usernameInput.value);
    usernameInput.value = name;
    setUsernameSaveStatus("Saving...");

    if (sessionMode === MODE_LOGGED_OUT) {
      setUsernameSaveStatus("Choose Guest or Sign in first.");
      return;
    }

    if (sessionMode === MODE_GUEST) {
      localStorage.setItem("username", name);
      setStatus("Guest mode");
      setUsernameSaveStatus("Saved for this browser.");
      return;
    }

    const api = getApi();
    if (!api || typeof api.updateProfile !== "function") {
      setUsernameSaveStatus("Profile API unavailable.");
      return;
    }

    try {
      const response = await api.updateProfile(name);
      const user = response && response.user ? response.user : null;
      const updatedName = sanitizeDisplayName(
        user && (user.display_name || user.displayName) ? user.display_name || user.displayName : name
      );

      if (usernameInput) usernameInput.value = updatedName;
      localStorage.setItem("username", updatedName);
      setStatus(`Signed in as ${updatedName}`);
      setUsernameSaveStatus("Saved.");
      void refreshLeaderboard();
    } catch (e) {
      const message = e && e.message ? String(e.message) : "";
      if (message.toLowerCase().includes("409")) {
        setUsernameSaveStatus("Name is already taken.");
      } else {
        setUsernameSaveStatus("Save failed. Try again.");
      }
    }
  }

  // =========================
  // GUEST FLOW
  // =========================
  if (btnGuest) {
    btnGuest.addEventListener("click", () => {
      const guestName = randomGuestName();
      setGuestState(guestName);
      showGameHub();
    });
  }

  async function logoutAndReturnToEntry() {
      try {
        const api = getApi();
        if (api?.logout) {
          await api.logout();
        } else {
          await fetch("/auth/logout", {
            method: "POST",
            credentials: "include"
          });
        }
      } catch (_) {}
      setLoggedOutState();
      returnToEntry();
      void refreshLeaderboard();
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      void logoutAndReturnToEntry();
    });
  }

  if (btnHubLogout) {
    btnHubLogout.addEventListener("click", () => {
      void logoutAndReturnToEntry();
    });
  }

  if (btnOpenTowerDefense) {
    btnOpenTowerDefense.addEventListener("click", () => {
      showSetup();
    });
  }

  if (btnBackToGameHub) {
    btnBackToGameHub.addEventListener("click", () => {
      showGameHub();
    });
  }

  async function loadGameConfig() {
    const api = getApi();
    if (!api || typeof api.config !== "function") return;
    try {
      const response = await api.config();
      const taptilesUrl = response && response.taptilesUrl ? String(response.taptilesUrl) : "";
      if (taptilesUrl && btnOpenTaptiles) {
        btnOpenTaptiles.setAttribute("href", taptilesUrl);
      }
    } catch {
      // Keep the same-origin default href.
    }
  }

  void loadGameConfig();

  // =========================
  // AUTH FLOW (modal open)
  // =========================
  if (btnAuth) {
    btnAuth.addEventListener("click", () => {
      openAuthModal();
    });
  }

  // Modal close UX
  if (authClose) authClose.addEventListener("click", closeAuthModal);

  if (authBackdrop) {
    authBackdrop.addEventListener("click", (e) => {
      if (e.target === authBackdrop) closeAuthModal();
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAuthModal();
  });

  window.onAuthSuccess = function (user) {
    setAuthedState(user);
    closeAuthModal();
    showGameHub();
  };

  async function submitLocalLogin(event) {
    event.preventDefault();
    const api = getApi();
    if (!api || typeof api.login !== "function") {
      setAuthFormStatus("Login API unavailable.", true);
      return;
    }

    const email = String(loginEmail?.value || "").trim();
    const password = String(loginPassword?.value || "");
    if (!email || !password) {
      setAuthFormStatus("Enter email and password.", true);
      return;
    }

    setAuthFormStatus("Signing in...");
    try {
      const response = await api.login(email, password);
      if (!response || !response.user) throw new Error("Missing user");
      setAuthedState(response.user);
      closeAuthModal();
      showGameHub();
    } catch {
      setAuthFormStatus("Invalid email or password.", true);
    }
  }

  async function submitLocalRegister(event) {
    event.preventDefault();
    const api = getApi();
    if (!api || typeof api.register !== "function") {
      setAuthFormStatus("Registration API unavailable.", true);
      return;
    }

    const displayName = sanitizeDisplayName(registerDisplayName?.value || "");
    const email = String(registerEmail?.value || "").trim();
    const password = String(registerPassword?.value || "");
    if (!displayName || !email || password.length < 10) {
      setAuthFormStatus("Use a player name, valid email, and 10+ character password.", true);
      return;
    }

    setAuthFormStatus("Creating account...");
    try {
      const response = await api.register(email, password, displayName);
      if (!response || !response.user) throw new Error("Missing user");
      setAuthedState(response.user);
      closeAuthModal();
      showGameHub();
    } catch {
      setAuthFormStatus("Could not create account. Email or player name may already exist.", true);
    }
  }

  async function tryResumeSession() {
    const api = getApi();
    if (!api || typeof api.me !== "function") return;

    try {
      const r = await api.me();
      const user = r && r.user ? r.user : null;

      if (user && (user.id || user.email)) {
        setAuthedState(user);
        showGameHub();
      }
    } catch {
      // Ignore: backend may be offline; user can still choose guest.
    }
  }

  function redirectToOAuth(url) {
    if (!url) return;
    window.location.href = url;
  }

  setStatus("Not signed in");
  updateSortHeaderUI();
  void tryResumeSession();

  if (btnGoogleAuth) {
    btnGoogleAuth.addEventListener("click", () => {
      const api = getApi();
      redirectToOAuth(api?.oauth?.googleStart);
    });
  }

  authTabLogin?.addEventListener("click", () => setAuthTab("login"));
  authTabRegister?.addEventListener("click", () => setAuthTab("register"));
  authLoginForm?.addEventListener("submit", (event) => {
    void submitLocalLogin(event);
  });
  authRegisterForm?.addEventListener("submit", (event) => {
    void submitLocalRegister(event);
  });

  if (btnAmazonAuth) {
    btnAmazonAuth.addEventListener("click", () => {
      const api = getApi();
      redirectToOAuth(api?.oauth?.amazonStart);
    });
  }

  if (btnRefreshLeaderboard) {
    btnRefreshLeaderboard.addEventListener("click", () => {
      void refreshLeaderboard();
    });
  }

  if (btnShowSetupSection) {
    btnShowSetupSection.addEventListener("click", () => {
      switchToSection("setup");
    });
  }

  if (btnShowLeaderboardSection) {
    btnShowLeaderboardSection.addEventListener("click", () => {
      switchToSection("leaderboard");
    });
  }

  if (leaderboardSearchPlayer) {
    leaderboardSearchPlayer.addEventListener("input", () => {
      searchPlayerQuery = String(leaderboardSearchPlayer.value || "").trim();
      renderLeaderboardRows();
    });
  }

  if (leaderboardSearchLevel) {
    leaderboardSearchLevel.addEventListener("input", () => {
      searchLevelQuery = String(leaderboardSearchLevel.value || "").trim();
      renderLeaderboardRows();
    });
  }

  localStorage.removeItem("leaderboard_include_custom");

  leaderboardSortBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-sort");
      if (!key) return;

      if (sortKey === key) {
        sortDir = sortDir === "asc" ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDir = key === "displayName" ? "asc" : "desc";
      }

      updateSortHeaderUI();
      renderLeaderboardRows();
    });
  });

  if (btnSaveUsername) {
    btnSaveUsername.addEventListener("click", () => {
      void saveUsername();
    });
  }

  if (usernameInput) {
    usernameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void saveUsername();
      }
    });
  }
})();
