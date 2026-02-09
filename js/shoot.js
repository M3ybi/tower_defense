// js/shoot.js
(function () {
  "use strict";

  // -----------------------------
  // Helpers
  // -----------------------------
  function ensureLegacyCounters() {
    if (typeof window.score_episode_red !== "number") window.score_episode_red = 0;
    if (typeof window.score_episode_green !== "number") window.score_episode_green = 0;
  }

  function ensureGameState() {
    if (!window.gameState) return null;

    if (!window.gameState.score) {
      window.gameState.score = { total: 0, redHits: 0, greenHits: 0, streak: 0, shots: 0 };
    }
    if (!window.gameState.flags) window.gameState.flags = {};
    if (!window.gameState.wave) {
      window.gameState.wave = { index: 0, redSpawned: 0, greenSpawned: 0, waveScoreDelta: 0 };
    }
    return window.gameState;
  }

  function isGameActive() {
    const gs = ensureGameState();
    return !!(gs && gs.flags && gs.flags.isActive);
  }

  // ✅ NEW: telemetry event writer (expects telemetry to be created by scene_build.js on start)
  function pushEvent(type) {
    const gs = ensureGameState();
    if (!gs || !gs.telemetry) return;

    const t = Math.max(0, Math.floor(performance.now() - gs.telemetry.t0));
    if (gs.telemetry.events.length < 5000) {
      gs.telemetry.events.push({ t, type });
    }
  }

  function recomputeDerivedStats() {
    const gs = ensureGameState();
    if (!gs || !gs.score) return;

    const bullets = Number(gs.score._rawShots) || 0;
    const red = Number(gs.score.redHits) || 0;
    const green = Number(gs.score.greenHits) || 0;
    const hits = red + green;

    const denom = Math.max(1, bullets);
    const pct = (hits / denom) * 100;

    gs.score.accuracyPct = Math.max(0, Math.min(100, pct));
    gs.score.bullets = bullets;
  }

  function applyShot() {
    if (!isGameActive()) return;

    const gs = ensureGameState();
    if (!gs) return;

    const raw = (Number(gs.score._rawShots) || 0) + 1;
    gs.score._rawShots = raw;

    // Normalize super-shooter-kit triple-fire
    gs.score.shots = Math.floor(raw);

    recomputeDerivedStats();

    // ✅ NEW: record shot
    pushEvent("shot");
  }

  function applyHit(isRed, isGreen) {
    if (!isGameActive()) return; // IMPORTANT: ignore hits outside gameplay
    ensureLegacyCounters();

    const gs = ensureGameState();
    if (!gs) return;

    if (isRed) window.score_episode_red += 1;
    if (isGreen) window.score_episode_green += 1;

    const penalizeGreenHits = gs.flags && gs.flags.penalizeGreenHits === true;

    if (isRed) {
      gs.score.redHits = (Number(gs.score.redHits) || 0) + 1;
      gs.score.streak = (Number(gs.score.streak) || 0) + 1;
      gs.score.total = (Number(gs.score.total) || 0) + 1;
      gs.wave.waveScoreDelta = (Number(gs.wave.waveScoreDelta) || 0) + 1;

      // ✅ NEW: record red hit
      pushEvent("hit_red");

      recomputeDerivedStats();
      return;
    }

    if (isGreen) {
      gs.score.greenHits = (Number(gs.score.greenHits) || 0) + 1;
      gs.score.streak = 0;

      if (penalizeGreenHits) {
        const nextTotal = (Number(gs.score.total) || 0) - 1;
        gs.score.total = Math.max(0, nextTotal); // clamp score to >= 0
        gs.wave.waveScoreDelta = (Number(gs.wave.waveScoreDelta) || 0) - 1;
      }

      // ✅ NEW: record green hit
      pushEvent("hit_green");

      recomputeDerivedStats();
    }
  }

  // -----------------------------
  // Shot counter (one per shoot event)
  // -----------------------------
  AFRAME.registerComponent("shot-counter", {
    init() {
      this.onShoot = this.onShoot.bind(this);
      this.el.addEventListener("shoot", this.onShoot);
    },
    remove() {
      this.el.removeEventListener("shoot", this.onShoot);
    },
    onShoot() {
      applyShot();
    }
  });

  // -----------------------------
  // click-to-shoot trigger only
  // -----------------------------
  AFRAME.registerComponent("click-to-shoot", {
    schema: {
      cooldownMs: { type: "number", default: 80 }
    },

    init() {
      this._lastEmitT = 0;

      this._onMouseDown = this._onMouseDown.bind(this);
      this._onTouchStart = this._onTouchStart.bind(this);
      this._bindCanvas = this._bindCanvas.bind(this);

      this._canvas = null;

      if (this.el.sceneEl && this.el.sceneEl.canvas) {
        this._bindCanvas();
      } else if (this.el.sceneEl) {
        this.el.sceneEl.addEventListener("render-target-loaded", this._bindCanvas);
      }
    },

    remove() {
      if (this.el.sceneEl) {
        this.el.sceneEl.removeEventListener("render-target-loaded", this._bindCanvas);
      }
      this._unbindCanvas();
    },

    _bindCanvas() {
      this._unbindCanvas();

      const scene = this.el.sceneEl;
      if (!scene || !scene.canvas) return;

      this._canvas = scene.canvas;

      this._canvas.addEventListener("mousedown", this._onMouseDown, { passive: true });
      this._canvas.addEventListener("touchstart", this._onTouchStart, { passive: false });
    },

    _unbindCanvas() {
      if (!this._canvas) return;

      this._canvas.removeEventListener("mousedown", this._onMouseDown);
      this._canvas.removeEventListener("touchstart", this._onTouchStart);

      this._canvas = null;
    },

    _shouldEmit(now) {
      if (now - this._lastEmitT < this.data.cooldownMs) return false;
      this._lastEmitT = now;
      return true;
    },

    _emitShoot() {
      this.el.emit("shoot");
    },

    _onMouseDown(e) {
      if (e.button !== 0) return;

      const now = performance.now();
      if (!this._shouldEmit(now)) return;

      this._emitShoot();
    },

    _onTouchStart(e) {
      if (e.touches && e.touches.length > 1) return;

      e.preventDefault();

      const now = performance.now();
      if (!this._shouldEmit(now)) return;

      this._emitShoot();
    }
  });

  // -----------------------------
  // Hit handler
  // -----------------------------
  AFRAME.registerComponent("hit-handler", {
    schema: {
      id: { type: "string", default: "" },
      start: { type: "boolean", default: false },
      prestartRed: { type: "boolean", default: false },
      tutorial: { type: "boolean", default: false },
      startTutorial: { type: "boolean", default: false }
    },

    init() {
      ensureLegacyCounters();
      this.onDie = this.onDie.bind(this);
      this.el.addEventListener("die", this.onDie);
    },

    remove() {
      this.el.removeEventListener("die", this.onDie);
    },

    onDie() {
      // Tutorial start box: start tutorial flow (does not auto-run anymore).
      if (this.data.startTutorial === true) {
        if (typeof window.clearPrestartPracticeUI === "function") {
          window.clearPrestartPracticeUI();
        }
        if (typeof window.startTutorialFlow === "function") {
          window.startTutorialFlow();
        }
        if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
        return;
      }

      // START box: trigger start flow and immediately despawn practice drones
      if (this.data.start === true) {
        if (window.__startingGame) return;
        window.__startingGame = true;

        // IMPORTANT: despawn practice drones immediately on PLAY box death
        if (typeof window.clearPrestartPracticeUI === "function") {
          window.clearPrestartPracticeUI();
        }

        const playText = document.querySelector("#text2");
        if (playText) {
          playText.emit("click");
        } else {
          if (typeof window.start === "function") window.start();
        }

        if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
        return;
      }

      // PRE-START PRACTICE DRONES
      if (this.data.prestartRed === true) {
        // Never allow practice behavior during gameplay
        if (typeof isGameActive === "function" && isGameActive()) {
          const wrap = this.el && this.el.closest ? this.el.closest(".enemy-wrap") : null;
          if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
          else if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
          return;
        }

        // Remove entire wrap (drone + ring)
        const wrap = this.el && this.el.closest ? this.el.closest(".enemy-wrap") : null;
        if (wrap && wrap.parentNode) {
          wrap.parentNode.removeChild(wrap);
        } else if (this.el && this.el.parentNode) {
          this.el.parentNode.removeChild(this.el);
        }

        // Decrement remaining practice drones and update text ONLY when all are dead
        if (window.__prestartPractice && typeof window.__prestartPractice.remaining === "number") {
          window.__prestartPractice.remaining = Math.max(0, window.__prestartPractice.remaining - 1);

          if (window.__prestartPractice.remaining === 0) {
            if (typeof window.setPrestartPracticeCompleteText === "function") {
              window.setPrestartPracticeCompleteText();
            }
          }
        }

        return; // IMPORTANT: do not score practice hits
      }

      // TUTORIAL DRONES (not scored, used only for onboarding)
      if (this.data.tutorial === true) {
        // Determine color from either the clicked element OR its wrap contents.
        // Players often shoot the marker ring, so rely on the wrap's drone class too.
        const wrap = this.el && this.el.closest ? this.el.closest(".enemy-wrap") : null;
        const classList = (this.el && this.el.classList) || null;
        let isRed = !!(classList && classList.contains("target-red"));
        let isGreen = !!(classList && classList.contains("target-green"));
        if (!isRed && !isGreen && wrap && wrap.querySelector) {
          isRed = !!wrap.querySelector(".target-red");
          isGreen = !!wrap.querySelector(".target-green");
        }

        // Remove entire wrap (drone + ring)
        if (wrap && wrap.parentNode) {
          wrap.parentNode.removeChild(wrap);
        } else if (this.el && this.el.parentNode) {
          this.el.parentNode.removeChild(this.el);
        }

        if (typeof window.__tutorialOnKill === "function") {
          try {
            window.__tutorialOnKill({ isRed, isGreen });
          } catch (_) {}
        }

        return;
      }

      // Regular gameplay targets
      let targetEl = null;
      if (this.data.id) targetEl = document.getElementById(this.data.id);
      if (!targetEl) targetEl = this.el;

      const classList = (targetEl && targetEl.classList) || this.el.classList;
      const isRed = !!(classList && classList.contains("target-red"));
      const isGreen = !!(classList && classList.contains("target-green"));

      if (typeof applyHit === "function") applyHit(isRed, isGreen);

      // Remove wrap if exists
      const wrap = targetEl && targetEl.closest ? targetEl.closest(".enemy-wrap") : null;
      if (wrap && wrap.parentNode) {
        wrap.parentNode.removeChild(wrap);
      } else {
        if (targetEl && targetEl.parentNode) targetEl.parentNode.removeChild(targetEl);
        if (this.el !== targetEl && this.el.parentNode) this.el.parentNode.removeChild(this.el);
      }
    }
  });

  // -----------------------------
  // Hitscan shooter
  // -----------------------------
  AFRAME.registerComponent("hitscan-shooter", {
    schema: {
      maxDistance: { type: "number", default: 60 }
    },

    init() {
      this._raycaster = new THREE.Raycaster();
      this._origin = new THREE.Vector3();
      this._dir = new THREE.Vector3();

      this.onShoot = this.onShoot.bind(this);
      this.el.addEventListener("shoot", this.onShoot);
    },

    remove() {
      this.el.removeEventListener("shoot", this.onShoot);
    },

    onShoot() {
      const sceneEl = this.el.sceneEl;
      if (!sceneEl || !sceneEl.object3D) return;

      const cam = sceneEl.camera;
      if (!cam) return;

      cam.getWorldPosition(this._origin);
      cam.getWorldDirection(this._dir);

      this._raycaster.set(this._origin, this._dir);
      this._raycaster.far = Math.max(0.1, this.data.maxDistance);

      const hits = this._raycaster.intersectObjects(sceneEl.object3D.children, true);
      if (!hits || hits.length === 0) return;

      const findEntityEl = (obj) => {
        let o = obj;
        while (o) {
          if (o.el) return o.el;
          o = o.parent;
        }
        return null;
      };

      for (const h of hits) {
        const entityEl = findEntityEl(h.object);
        if (!entityEl) continue;
        if (!entityEl.classList || !entityEl.classList.contains("shootable")) continue;

        entityEl.emit("die");
        return;
      }
    }
  });

  // Laser beam unchanged (kept out for brevity, use your existing block if needed)
  // align-to-motion unchanged (kept out for brevity, use your existing block if needed)
})();
