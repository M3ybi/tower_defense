// js/login.js
(function () {
  "use strict";

  const entryScreen = document.getElementById("entryScreen");
  const setupScreen = document.getElementById("setupScreen");

  const usernameInput = document.getElementById("username");
  const emailGroup = document.getElementById("emailGroup");
  const emailInput = document.getElementById("userEmail");

  const authStatusText = document.getElementById("authStatusText");

  const btnGuest = document.getElementById("btnEntryGuest");
  const btnAuth = document.getElementById("btnEntryAuth");

  const authModal = document.getElementById("authModal");
  const authBackdrop = document.getElementById("authBackdrop");
  const authClose = document.getElementById("authClose");
const btnLogout = document.getElementById("btnLogout");

  function setStatus(text) {
    if (authStatusText) authStatusText.textContent = String(text || "");
  }

  function showSetup() {
    if (entryScreen) entryScreen.classList.add("hidden");
    if (setupScreen) setupScreen.classList.remove("hidden");
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

function setLoggedOutState() {
  if (usernameInput) {
    usernameInput.value = "";
    usernameInput.readOnly = false;
  }
  if (emailInput) emailInput.value = "";
  if (emailGroup) emailGroup.classList.add("hidden");

  localStorage.removeItem("username");
  localStorage.removeItem("user_email");

  setStatus("Not signed in");

  if (btnLogout) btnLogout.classList.add("hidden");
}


  function randomGuestName() {
    return `guest${Math.floor(10000 + Math.random() * 90000)}`;
  }

  function setGuestState(guestName) {
    const name = String(guestName || "guest").slice(0, 24);

    if (btnLogout) btnLogout.classList.add("hidden");

    if (usernameInput) {
      usernameInput.value = name;
      usernameInput.readOnly = true;
    }

    localStorage.setItem("username", name);
    localStorage.removeItem("user_email");

    if (emailInput) emailInput.value = "";
    if (emailGroup) emailGroup.classList.add("hidden");

    setStatus("Guest mode");
  }

  function setAuthedState(user) {
    const email = (user && user.email ? String(user.email) : "").trim();
    const displayName = (user && (user.display_name || user.displayName) ? String(user.display_name || user.displayName) : "").trim();

    const nameFromEmail = email ? email.split("@")[0] : "Player";
    const name = (displayName || nameFromEmail || "Player").slice(0, 24);

    if (usernameInput) {
      usernameInput.value = name;
      usernameInput.readOnly = true;
    }

    if (btnLogout) btnLogout.classList.remove("hidden");

    if (emailGroup && emailInput) {
      if (email) {
        emailInput.value = email;
        emailGroup.classList.remove("hidden");
      } else {
        emailInput.value = "";
        emailGroup.classList.add("hidden");
      }
    }

    localStorage.setItem("username", name);
    if (email) localStorage.setItem("user_email", email);
    else localStorage.removeItem("user_email");

    setStatus(email || "Signed in");
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
      if (window.GameAPI?.logout) {
        await window.GameAPI.logout();
      } else {
        await fetch("/auth/logout", {
          method: "POST",
          credentials: "include"
        });
      }
    } catch (_) {}
    setLoggedOutState();

    // return to entry screen
    entryScreen?.classList.remove("hidden");
    setupScreen?.classList.add("hidden");
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

  // If your modal backdrop exists, clicking outside closes
  if (authBackdrop) {
    authBackdrop.addEventListener("click", (e) => {
      // only close if clicking the backdrop itself
      if (e.target === authBackdrop) closeAuthModal();
    });
  }

  // ESC closes
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAuthModal();
  });

  // =========================
  // Called after successful auth (local or oauth)
  // Your auth modal/controller should call this.
  // =========================
  window.onAuthSuccess = function (user) {
    setAuthedState(user);
    closeAuthModal();
    showSetup();
  };

  // =========================
  // Auto-detect existing session on load (cookie auth)
  // =========================
  async function tryResumeSession() {
    if (!window.GameAPI || typeof window.GameAPI.me !== "function") return;

    try {
      const r = await window.GameAPI.me();
      const user = r && r.user ? r.user : null;

      if (user && (user.id || user.email)) {
        setAuthedState(user);
        showSetup();
        return;
      }
    } catch {
      // Ignore: backend may be offline; user can still choose guest.
    }
  }

  // Start state
  setStatus("Not signed in");
  tryResumeSession();

    // =========================
  // OAuth buttons
  // =========================
  const btnGoogleAuth = document.getElementById("btnGoogleAuth");
  const btnAmazonAuth = document.getElementById("btnAmazonAuth");

  if (btnGoogleAuth) {
    btnGoogleAuth.addEventListener("click", () => {
      if (!window.GameAPI || !window.GameAPI.oauth?.googleStart) return;
      window.location.href = window.GameAPI.oauth.googleStart;
    });
  }

  if (btnAmazonAuth) {
    btnAmazonAuth.addEventListener("click", () => {
      if (!window.GameAPI || !window.GameAPI.oauth?.amazonStart) return;
      window.location.href = window.GameAPI.oauth.amazonStart;
    });
  }

})();
