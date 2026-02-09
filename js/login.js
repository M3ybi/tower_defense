// js/login.js
(function () {
  "use strict";

  const entryScreen = document.getElementById("entryScreen");
  const setupScreen = document.getElementById("setupScreen");

  const usernameInput = document.getElementById("username");
  const btnSaveUsername = document.getElementById("btnSaveUsername");
  const usernameSaveStatus = document.getElementById("usernameSaveStatus");
  const setupContentSection = document.getElementById("setupContentSection");
  const leaderboardContentSection = document.getElementById("leaderboardContentSection");
  const btnShowSetupSection = document.getElementById("btnShowSetupSection");
  const btnShowLeaderboardSection = document.getElementById("btnShowLeaderboardSection");

  const authStatusText = document.getElementById("authStatusText");
  const leaderboardRows = document.getElementById("leaderboardRows");
  const leaderboardEmpty = document.getElementById("leaderboardEmpty");
  const leaderboardStatus = document.getElementById("leaderboardStatus");
  const leaderboardSearch = document.getElementById("leaderboardSearch");
  const btnSortLevel = document.getElementById("btnSortLevel");
  const btnRefreshLeaderboard = document.getElementById("btnRefreshLeaderboard");

  const btnGuest = document.getElementById("btnEntryGuest");
  const btnAuth = document.getElementById("btnEntryAuth");

  const authModal = document.getElementById("authModal");
  const authBackdrop = document.getElementById("authBackdrop");
  const authClose = document.getElementById("authClose");
  const btnLogout = document.getElementById("btnLogout");
  const btnGoogleAuth = document.getElementById("btnGoogleAuth");
  const btnAmazonAuth = document.getElementById("btnAmazonAuth");

  const MODE_LOGGED_OUT = "logged_out";
  const MODE_GUEST = "guest";
  const MODE_AUTHED = "authed";

  let sessionMode = MODE_LOGGED_OUT;
  let authedUserId = null;
  let leaderboardRawRows = [];
  let leaderboardCurrentUserRank = null;
  let levelSortDir = "desc";
  let searchQuery = "";

  function getApi() {
    return window.GameAPI || null;
  }

  function setStatus(text) {
    if (authStatusText) authStatusText.textContent = String(text || "");
  }

  function setUsernameSaveStatus(text) {
    if (usernameSaveStatus) usernameSaveStatus.textContent = String(text || "");
  }

  function showSetup() {
    if (entryScreen) entryScreen.classList.add("hidden");
    if (setupScreen) setupScreen.classList.remove("hidden");
    switchToSection("setup");
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

  function returnToEntry() {
    entryScreen?.classList.remove("hidden");
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
  }

  function randomGuestName() {
    return `guest${Math.floor(10000 + Math.random() * 90000)}`;
  }

  function setGuestState(guestName) {
    sessionMode = MODE_GUEST;
    authedUserId = null;

    const name = sanitizeDisplayName(guestName);

    if (btnLogout) btnLogout.classList.add("hidden");

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

  function getFilteredAndSortedRows(rows) {
    let out = Array.isArray(rows) ? [...rows] : [];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      out = out.filter((row) =>
        String(row.displayName || "")
          .toLowerCase()
          .includes(q)
      );
    }

    out.sort((a, b) => {
      const lA = Number(a.level) || 0;
      const lB = Number(b.level) || 0;
      if (lA !== lB) return levelSortDir === "asc" ? lA - lB : lB - lA;

      const rankA = Number(a.rank) || 0;
      const rankB = Number(b.rank) || 0;
      return rankA - rankB;
    });

    return out;
  }

  function maybeAppendCurrentUserRow(filteredRows) {
    if (!leaderboardCurrentUserRank || !authedUserId) return null;

    const meId = Number(leaderboardCurrentUserRank.userId) || 0;
    if (!meId || meId !== authedUserId) return null;

    const alreadyVisible = filteredRows.some((row) => Number(row.userId) === meId);
    if (alreadyVisible) return null;

    if (searchQuery) {
      const meName = String(leaderboardCurrentUserRank.displayName || "").toLowerCase();
      if (!meName.includes(searchQuery.toLowerCase())) return null;
    }

    return leaderboardCurrentUserRank;
  }

  function renderLeaderboardRows() {
    if (!leaderboardRows || !leaderboardEmpty) return;

    const visibleRows = getFilteredAndSortedRows(leaderboardRawRows);
    leaderboardRows.innerHTML = "";

    const currentUserId = authedUserId || 0;
    let currentUserShownInList = false;

    if (!visibleRows.length) {
      leaderboardEmpty.textContent = searchQuery
        ? "No players match this search."
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
      scoreTd.textContent = String(score);
      tr.appendChild(scoreTd);

      const levelTd = document.createElement("td");
      levelTd.textContent = String(level);
      tr.appendChild(levelTd);

      const accTd = document.createElement("td");
      accTd.textContent = accuracy;
      tr.appendChild(accTd);

      leaderboardRows.appendChild(tr);
    });

    const extraMeRow = maybeAppendCurrentUserRow(visibleRows);
    if (extraMeRow && !currentUserShownInList) {
      const spacer = document.createElement("tr");
      spacer.classList.add("leaderboard-row--spacer");
      spacer.innerHTML = '<td colspan="5">...</td>';
      leaderboardRows.appendChild(spacer);

      const meTr = document.createElement("tr");
      meTr.classList.add("leaderboard-row--me");

      const rankTd = document.createElement("td");
      rankTd.textContent = `#${Number(extraMeRow.rank) || 0}`;
      meTr.appendChild(rankTd);

      const playerTd = document.createElement("td");
      playerTd.textContent = sanitizeDisplayName(extraMeRow.displayName || "Player");
      meTr.appendChild(playerTd);

      const scoreTd = document.createElement("td");
      scoreTd.textContent = String(Number(extraMeRow.scoreTotal) || 0);
      meTr.appendChild(scoreTd);

      const levelTd = document.createElement("td");
      levelTd.textContent = String(Number(extraMeRow.level) || 1);
      meTr.appendChild(levelTd);

      const accTd = document.createElement("td");
      accTd.textContent = formatAccuracy(Number(extraMeRow.accuracyPct));
      meTr.appendChild(accTd);

      leaderboardRows.appendChild(meTr);
    }
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
      leaderboardCurrentUserRank =
        response && response.currentUserRank ? response.currentUserRank : null;

      renderLeaderboardRows();

      if (leaderboardCurrentUserRank && Number(leaderboardCurrentUserRank.rank) > 0) {
        setLeaderboardStatus(`Updated just now. Your rank: #${leaderboardCurrentUserRank.rank}.`);
      } else {
        setLeaderboardStatus(
          leaderboardRawRows.length ? "Updated just now." : "No scores to show yet."
        );
      }
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
    } catch {
      setUsernameSaveStatus("Save failed. Try again.");
    }
  }

  function applySortButtonLabel() {
    if (!btnSortLevel) return;
    btnSortLevel.textContent = `Level: ${levelSortDir === "asc" ? "Asc" : "Desc"}`;
  }

  // =========================
  // GUEST FLOW
  // =========================
  if (btnGuest) {
    btnGuest.addEventListener("click", () => {
      const guestName = randomGuestName();
      setGuestState(guestName);
      showSetup();
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
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
    });
  }

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
    showSetup();
  };

  async function tryResumeSession() {
    const api = getApi();
    if (!api || typeof api.me !== "function") return;

    try {
      const r = await api.me();
      const user = r && r.user ? r.user : null;

      if (user && (user.id || user.email)) {
        setAuthedState(user);
        showSetup();
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
  applySortButtonLabel();
  void tryResumeSession();

  if (btnGoogleAuth) {
    btnGoogleAuth.addEventListener("click", () => {
      const api = getApi();
      redirectToOAuth(api?.oauth?.googleStart);
    });
  }

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

  if (btnSortLevel) {
    btnSortLevel.addEventListener("click", () => {
      levelSortDir = levelSortDir === "asc" ? "desc" : "asc";
      applySortButtonLabel();
      renderLeaderboardRows();
    });
  }

  if (leaderboardSearch) {
    leaderboardSearch.addEventListener("input", () => {
      searchQuery = String(leaderboardSearch.value || "").trim();
      renderLeaderboardRows();
    });
  }

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
