// js/scene_build.js
(function () {
  "use strict";

  const FONT_URL = "https://cdn.aframe.io/fonts/Exo2Bold.fnt";

  const RING_CLASS = "ring";
  const WRAP_CLASS = "enemy-wrap";

  const Z_POSITION = -20;
  const Z_STAGGER_STEP = 0.08;

  const MARKER_HIDE_DELAY_MS = 2500;

  const BASE_SPAWN = { xMin: -7.5, xMax: 7.5, yMin: 0.3, yMax: 4.2 };
  let SPAWN = { ...BASE_SPAWN };

  const WIGGLE = { ampMin: 0.15, ampMax: 0.33, durMin: 900, durMax: 1400 };

  const MIN_SPAWN_DIST = 1.15;
  const MAX_SPAWN_ATTEMPTS = 140;

  const HUD_REFRESH_MS = 100;

  const scenaEl = document.getElementById("scena");
  const scena2El = document.getElementById("scena2");
  const scena3El = document.getElementById("scena3");
  const hudCloseEl = document.getElementById("hudCloseBtn");

  const getNumber = (key, defaultValue = 0) => {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) ? value : defaultValue;
  };

  const getString = (key, defaultValue = "") => {
    const value = localStorage.getItem(key);
    return value !== null ? value : defaultValue;
  };

  const getBool = (key, defaultValue = false) => {
    const v = localStorage.getItem(key);
    if (v === null) return defaultValue;
    return v === "1" || v === "true" || v === "yes";
  };

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const randomFloat = (min, max) => min + Math.random() * (max - min);
  const randomInt = (min, maxExclusive) => {
    if (maxExclusive <= min) return min;
    return Math.floor(Math.random() * (maxExclusive - min) + min);
  };

  const dist2 = (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  };

  function setNodeText(node, value) {
    if (node) node.textContent = String(value);
  }

  function computeSpawnBounds() {
    const vw = Math.min(window.innerWidth || 9999, window.screen?.width || 9999);
    const vh = Math.min(window.innerHeight || 9999, window.screen?.height || 9999);
    const aspect = vw / Math.max(1, vh);

    // Portrait phones get tighter X bounds so targets stay on-screen.
    const xScale = clamp(aspect / 1.6, 0.65, 1.0);
    const yScale = clamp(vh / 720, 0.75, 1.0);

    const scaleRange = (min, max, s) => {
      const c = (min + max) * 0.5;
      const h = (max - min) * 0.5 * s;
      return { min: c - h, max: c + h };
    };

    const xr = scaleRange(BASE_SPAWN.xMin, BASE_SPAWN.xMax, xScale);
    const yr = scaleRange(BASE_SPAWN.yMin, BASE_SPAWN.yMax, yScale);

    return { xMin: xr.min, xMax: xr.max, yMin: yr.min, yMax: yr.max };
  }

  function refreshSpawnBounds() {
    SPAWN = computeSpawnBounds();
  }

  refreshSpawnBounds();
  window.addEventListener("resize", () => refreshSpawnBounds());

  const username = getString("username", "Player");
  const levelNum = clamp(Number(getString("level", "1")) || 1, 1, 30);

  const baseDistractors = getNumber("number_of_distractors", 0);
  const baseTargets = getNumber("number_of_targets", 0);

  const totalEpisodes = Math.max(getNumber("episode_count", 1), 1);
  const episodeDuration = clamp(getNumber("episode_duration", 10000), 2000, 60000);

  const tarDiff = clamp(getNumber("tar_diff", 0), 0, 20);
  const disDiff = clamp(getNumber("dis_diff", 0), 0, 20);

  const enableWaveSummary = getBool("enable_wave_summary", false);
  const penalizeGreenHits = getBool("penalize_green_hits", true);

  const speedBoost = Math.min(0.18, Math.max(0, (levelNum - 1) * 0.006));
  const difficulty = {
    speedMultiplier: 1 + speedBoost,
    hpMultiplier: Math.max(1, Math.ceil(levelNum / 10)),
    evasiveChance: Math.min(0.06 + (levelNum - 1) * 0.004, 0.18)
  };

  const maxTar = baseTargets + tarDiff + 1;
  const minTar = Math.max(0, baseTargets - tarDiff);
  const maxDis = baseDistractors + disDiff + 1;
  const minDis = Math.max(0, baseDistractors - disDiff);

  const effectiveDur = Math.max(
    1900,
    Math.floor(episodeDuration / Math.max(1.0, difficulty.speedMultiplier))
  );
  const episodeDurationFull = effectiveDur + MARKER_HIDE_DELAY_MS;

  // -------------------------------
  // HUD toggle (SPACE + mobile tap)
  // -------------------------------
  let hudVisible = false;

  const hudEl = document.getElementById("hudOverlay");
  const hudHintEl = document.getElementById("hudHint");
  const hudBtnEl = document.getElementById("hudToggleBtn");
  const hudNodes = {
    player: document.getElementById("hudPlayer"),
    level: document.getElementById("hudLevel"),
    wave: document.getElementById("hudWave"),
    waveTotal: document.getElementById("hudWaveTotal"),
    score: document.getElementById("hudScore"),
    shots: document.getElementById("hudShots"),
    accuracy: document.getElementById("hudAcc"),
    redHits: document.getElementById("hudRedHits"),
    greenHits: document.getElementById("hudGreenHits"),
    streak: document.getElementById("hudStreak"),
    spawnR: document.getElementById("hudSpawnR"),
    spawnG: document.getElementById("hudSpawnG")
  };

  function updateHudVisibility() {
    if (!hudEl) return;

    hudEl.classList.toggle("hud--hidden", !hudVisible);
    if (hudBtnEl) {
      hudBtnEl.classList.toggle("hidden", hudVisible);
      hudBtnEl.textContent = hudVisible ? "HIDE SCORE" : "SCORE";
    }
    if (hudHintEl) hudHintEl.classList.toggle("hidden", hudVisible);
  }

  hudVisible = false;
  updateHudVisibility();

  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space") return;
    e.preventDefault();
    hudVisible = !hudVisible;
    updateHudVisibility();
  });

  if (hudBtnEl) {
    hudBtnEl.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      hudVisible = !hudVisible;
      updateHudVisibility();
    });
  }

  if (hudCloseEl) {
    hudCloseEl.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      hudVisible = false;
      updateHudVisibility();
    });
  }

  window.gameState = {
    username,
    level: levelNum,
    totalEpisodes,
    episodeDuration,
    difficulty,
    score: { total: 0, redHits: 0, greenHits: 0, streak: 0, shots: 0 },
    wave: { index: 0, redSpawned: 0, greenSpawned: 0, waveScoreDelta: 0 },
    flags: {
      penalizeGreenHits,
      isActive: false
    },
    // ✅ NEW: run tracking (filled on start)
    run: {
      runId: null,
      startedAtIso: null,
      finishedAtIso: null,
      verified: false,
      accepted: null
    },
    // ✅ NEW: telemetry (created fresh each start)
    telemetry: null
  };

  if (typeof window.score_episode_red !== "number") window.score_episode_red = 0;
  if (typeof window.score_episode_green !== "number") window.score_episode_green = 0;

  let redTargetTotal = 0;
  let greenTargetTotal = 0;
  let currentEpisode = 0;

  function refreshHUD() {
    const gs = window.gameState;
    if (!gs || !gs.score) return;

    const waveDisplay = Math.min(currentEpisode + 1, totalEpisodes);

    const shots = Number(gs.score.shots) || 0;
    const bullets = Number(gs.score._rawShots) || 0;
    const redHits = Number(gs.score.redHits) || 0;

    const denom = Math.max(1, bullets);
    const accPct = Math.round((redHits / denom) * 100);
    const accPctClamped = Math.max(0, Math.min(100, accPct));

    setNodeText(hudNodes.player, username);

    setNodeText(hudNodes.level, `Level ${levelNum}`);
    setNodeText(hudNodes.wave, waveDisplay);
    setNodeText(hudNodes.waveTotal, totalEpisodes);

    setNodeText(hudNodes.score, gs.score.total);
    setNodeText(hudNodes.shots, shots);
    setNodeText(hudNodes.accuracy, `${accPctClamped}%`);

    setNodeText(hudNodes.redHits, gs.score.redHits);
    setNodeText(hudNodes.greenHits, gs.score.greenHits);
    setNodeText(hudNodes.streak, gs.score.streak);

    setNodeText(hudNodes.spawnR, gs.wave.redSpawned);
    setNodeText(hudNodes.spawnG, gs.wave.greenSpawned);
  }

  refreshHUD();

  function hideMarkers() {
    const rings = document.getElementsByClassName(RING_CLASS);
    if (!rings || !rings.length) return;
    setTimeout(() => {
      for (let i = 0; i < rings.length; i += 1) {
        rings[i].setAttribute("visible", "false");
      }
    }, MARKER_HIDE_DELAY_MS);
  }

  function pickEnemyProfile(isRed) {
    if (isRed) {
      const roll = Math.random();
      if (roll < Math.min(0.16 + levelNum * 0.003, 0.26)) {
        return { type: "scout", hp: 1 * difficulty.hpMultiplier, speedMul: 1.08, scale: 0.26 };
      }
      if (roll < 0.08) {
        return { type: "tank", hp: 2 * difficulty.hpMultiplier, speedMul: 0.95, scale: 0.32 };
      }
      return { type: "standard", hp: 1 * difficulty.hpMultiplier, speedMul: 1.0, scale: 0.28 };
    }

    const roll = Math.random();
    if (roll < Math.min(0.08 + levelNum * 0.0025, 0.16)) {
      return { type: "decoy", hp: 1 * difficulty.hpMultiplier, speedMul: 1.05, scale: 0.28 };
    }
    return { type: "standard", hp: 1 * difficulty.hpMultiplier, speedMul: 1.0, scale: 0.28 };
  }

  function pickSpawnPoint(existing) {
    for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS; attempt += 1) {
      const p = { x: randomFloat(SPAWN.xMin, SPAWN.xMax), y: randomFloat(SPAWN.yMin, SPAWN.yMax) };

      let ok = true;
      for (let i = 0; i < existing.length; i += 1) {
        if (dist2(p, existing[i]) < MIN_SPAWN_DIST * MIN_SPAWN_DIST) {
          ok = false;
          break;
        }
      }
      if (ok) return p;
    }
    return { x: randomFloat(SPAWN.xMin, SPAWN.xMax), y: randomFloat(SPAWN.yMin, SPAWN.yMax) };
  }

  function makeEnemyWrap({ objectId, x, y, z, isRed, hp, speedMul, scale, evasive }) {
    const wrapId = `wrap_${objectId}`;
    const droneId = `drone_${objectId}`;
    const ringId = `ring_${objectId}`;

    const wrap = document.createElement("a-entity");
    wrap.setAttribute("id", wrapId);
    wrap.classList.add(WRAP_CLASS);
    wrap.setAttribute("position", `${x} ${y} ${z}`);

    const dur = Math.max(1700, Math.floor(effectiveDur / Math.max(0.80, speedMul)));
    wrap.setAttribute(
      "animation__z",
      `property: object3D.position.z; to: 2; dur: ${dur}; easing: linear; loop: false`
    );

    if (evasive) {
      const amp = randomFloat(WIGGLE.ampMin, WIGGLE.ampMax);
      const wiggleDur = Math.floor(randomFloat(WIGGLE.durMin, WIGGLE.durMax));

      const xFrom = clamp(x - amp, SPAWN.xMin, SPAWN.xMax);
      const xTo = clamp(x + amp, SPAWN.xMin, SPAWN.xMax);

      wrap.setAttribute(
        "animation__x",
        `property: object3D.position.x; from: ${xFrom}; to: ${xTo}; dir: alternate; dur: ${wiggleDur}; easing: easeInOutSine; loop: true`
      );
    }

    const drone = document.createElement("a-obj-model");
    drone.setAttribute("id", droneId);

    drone.classList.add("shootable");
    drone.classList.add(isRed ? "target-red" : "target-green");

    drone.setAttribute("target", `healthPoints:${Math.max(1, Math.floor(hp))}; static:false`);
    drone.setAttribute("src", `#${window.item_obj}`);
    if (window.item_mtl) drone.setAttribute("mtl", `#${window.item_mtl}`);
    drone.setAttribute("scale", `${scale} ${scale} ${scale}`);
    drone.setAttribute("position", "0 0 0");
    drone.setAttribute("hit-handler", `id:${droneId}`);

    const ring = document.createElement("a-obj-model");
    ring.setAttribute("id", ringId);

    // OPTIONAL: allow shots on the ring to register consistently
    ring.classList.add("shootable");
    ring.classList.add(RING_CLASS);

    ring.setAttribute("src", isRed ? "#marker-red-obj" : "#marker-green-obj");
    ring.setAttribute("mtl", isRed ? "#marker-red-mtl" : "#marker-green-mtl");
    ring.setAttribute("scale", `${scale} ${scale} ${scale}`);
    ring.setAttribute("position", "0 0 0");
    ring.setAttribute("hit-handler", `id:${droneId}`);

    // ✅ NEW: rotate marker continuously (gameplay + practice consistent)
    const spinDur = isRed ? 1350 : 1650; // slight variation looks nicer
    ring.setAttribute(
      "animation__spin",
      `property: rotation; from: 0 0 0; to: 0 360 0; loop: true; dur: ${spinDur}; easing: linear`
    );

    // OPTIONAL: subtle “marker hover” to make it more visible
    ring.setAttribute(
      "animation__bob",
      "property: position; from: 0 0 0; to: 0 0.06 0; dir: alternate; loop: true; dur: 600; easing: easeInOutSine"
    );

    wrap.appendChild(drone);
    wrap.appendChild(ring);

    return { wrap, wrapId };
  }

  // =========================================================
  // PRE-START PRACTICE UI (NO RESPAWN, nicer positions)
  // =========================================================
  function ensurePrestartUI() {
    if (!scena2El) return;

    let preTxt = document.getElementById("prestartText");
    if (!preTxt) {
      preTxt = document.createElement("a-text");
      preTxt.setAttribute("id", "prestartText");
      preTxt.setAttribute("font", FONT_URL);
      preTxt.setAttribute(
        "value",
        "Practice (before PLAY): shoot drones with the RED marker to destroy them"
      );
      preTxt.setAttribute("position", "-6.2 10.2 -15");
      preTxt.setAttribute("scale", "2.6 2.6 1");
      preTxt.setAttribute("color", "white");
      scena2El.appendChild(preTxt);
    }

    let holder = document.getElementById("prestartDrones");
    if (!holder) {
      holder = document.createElement("a-entity");
      holder.setAttribute("id", "prestartDrones");
      scena2El.appendChild(holder);
    }
  }

  // Exposed: immediately remove practice UI (used when PLAY box dies)
  window.clearPrestartPracticeUI = function clearPrestartPracticeUI() {
    const holder = document.getElementById("prestartDrones");
    if (holder) holder.innerHTML = "";

    const txt = document.getElementById("prestartText");
    if (txt && txt.parentNode) txt.parentNode.removeChild(txt);

    // Reset state so it doesn't interfere with later restarts
    window.__prestartPractice = null;
  };

  // Exposed: set "Good..." only when all practice drones are dead
  window.setPrestartPracticeCompleteText = function setPrestartPracticeCompleteText() {
    const txt = document.getElementById("prestartText");
    if (!txt) return;

    txt.setAttribute("value", "Good. In the game, destroy drones with RED markers!");
  };

  function getNicePracticePositions(count) {
    const MAX = Math.max(1, Math.min(Number(count) || 1, 10));
    const Z = -15.0;

    // -------------------------------------------------
    // Viewport-aware scaling
    // -------------------------------------------------
    const vw = Math.min(window.innerWidth || 9999, window.screen?.width || 9999);
    const vh = Math.min(window.innerHeight || 9999, window.screen?.height || 9999);

    // Aspect ratio (portrait phones ~0.55–0.7, desktop ~1.6–2.2)
    const aspect = vw / Math.max(1, vh);

    // Horizontal compression factor
    // portrait -> ~0.75, desktop -> 1.0
    const xScale = Math.max(0.70, Math.min(1.0, aspect / 1.6));

    // Vertical compression factor
    // short screens -> tighter Y
    const yScale = Math.max(0.65, Math.min(1.0, vh / 720));

    // -------------------------------------------------
    // Base bounds (desktop reference)
    // -------------------------------------------------
    const BASE = {
      left: { xMin: -11.0, xMax: -6.5 },
      right: { xMin: 6.5, xMax: 11.0 },
      yMin: 2.0,
      yMax: 6.5
    };

    // Apply scaling around the band centers
    const scaleRange = (min, max, s) => {
      const c = (min + max) * 0.5;
      const h = (max - min) * 0.5 * s;
      return { min: c - h, max: c + h };
    };

    const lx = scaleRange(BASE.left.xMin, BASE.left.xMax, xScale);
    const rx = scaleRange(BASE.right.xMin, BASE.right.xMax, xScale);
    const yR = scaleRange(BASE.yMin, BASE.yMax, yScale);

    // -------------------------------------------------
    // Allowed spawn regions (scaled)
    // -------------------------------------------------
    const REGIONS = [
      { xMin: lx.min, xMax: lx.max, yMin: yR.min, yMax: yR.max }, // LEFT
      { xMin: rx.min, xMax: rx.max, yMin: yR.min, yMax: yR.max } // RIGHT
    ];

    // -------------------------------------------------
    // No-fly zone around PLAY box + text (scaled too)
    // -------------------------------------------------
    const NF_BASE = { xMin: -3.0, xMax: 3.0, yMin: 4.0, yMax: 6.8 };

    const nfx = scaleRange(NF_BASE.xMin, NF_BASE.xMax, xScale * 0.9);
    const nfy = scaleRange(NF_BASE.yMin, NF_BASE.yMax, yScale * 0.9);

    const NO_FLY = {
      xMin: nfx.min,
      xMax: nfx.max,
      yMin: nfy.min,
      yMax: nfy.max
    };

    // -------------------------------------------------
    // Spacing (tighter on small screens)
    // -------------------------------------------------
    const MIN_DIST = Math.max(1.05, 1.4 * Math.min(xScale, yScale));
    const MIN_DIST_SQ = MIN_DIST * MIN_DIST;

    const rand = (min, max) => min + Math.random() * (max - min);

    const inNoFly = (p) =>
      p.x >= NO_FLY.xMin && p.x <= NO_FLY.xMax && p.y >= NO_FLY.yMin && p.y <= NO_FLY.yMax;

    const tooClose = (p, arr) =>
      arr.some((q) => {
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        return dx * dx + dy * dy < MIN_DIST_SQ;
      });

    // -------------------------------------------------
    // Placement
    // -------------------------------------------------
    const result = [];
    const MAX_ATTEMPTS = 160;

    for (let i = 0; i < MAX; i += 1) {
      let placed = false;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];

        const p = {
          x: rand(region.xMin, region.xMax),
          y: rand(region.yMin, region.yMax),
          z: Z
        };

        if (inNoFly(p)) continue;
        if (tooClose(p, result)) continue;

        result.push(p);
        placed = true;
        break;
      }

      // Fallback: stack gently inside region if space is tight
      if (!placed) {
        const r = REGIONS[i % REGIONS.length];
        const fy = r.yMin + ((r.yMax - r.yMin) * ((i + 1) / (MAX + 1)));

        result.push({
          x: (r.xMin + r.xMax) * 0.5,
          y: fy,
          z: Z
        });
      }
    }

    return result;
  }

  // Global: spawn practice drones once (no respawn)
  window.spawnPrestartDrones = function spawnPrestartDrones(count = 3) {
    // Never during gameplay
    if (window.gameState && window.gameState.flags && window.gameState.flags.isActive) return;

    // Ensure drone assets are ready
    if (typeof window.generate_object === "function") window.generate_object();
    if (!window.item_obj) {
      console.warn("Practice drones skipped: item_obj not ready");
      return;
    }

    ensurePrestartUI();

    const holder = document.getElementById("prestartDrones");
    if (!holder) return;

    holder.innerHTML = "";

    const positions = getNicePracticePositions(count);

    // Initialize practice state
    window.__prestartPractice = { total: positions.length, remaining: positions.length };

    for (let i = 0; i < positions.length; i += 1) {
      const p = positions[i];

      const objectId = `pre_${Date.now()}_${i}`;
      const wrapId = `wrap_${objectId}`;
      const droneId = `drone_${objectId}`;
      const ringId = `ring_${objectId}`;

      const wrap = document.createElement("a-entity");
      wrap.setAttribute("id", wrapId);
      wrap.classList.add(WRAP_CLASS, "prestart-only");
      wrap.setAttribute("position", `${p.x} ${p.y} ${p.z}`);

      // Subtle hover + slow yaw
      wrap.setAttribute(
        "animation__hover",
        `property: object3D.position.y; from: ${p.y}; to: ${p.y + 0.28}; dir: alternate; dur: 950; easing: easeInOutSine; loop: true`
      );
      wrap.setAttribute(
        "animation__spin",
        "property: rotation; to: 0 360 0; loop: true; dur: 2100; easing: linear"
      );

      const drone = document.createElement("a-obj-model");
      drone.setAttribute("id", droneId);
      drone.classList.add("shootable", "target-red", "prestart-only");

      // 1 HP so it dies instantly
      drone.setAttribute("target", "healthPoints:1; static:false");

      drone.setAttribute("src", `#${window.item_obj}`);
      if (window.item_mtl) drone.setAttribute("mtl", `#${window.item_mtl}`);

      const scale = 0.34;
      drone.setAttribute("scale", `${scale} ${scale} ${scale}`);
      drone.setAttribute("position", "0 0 0");

      // Mark as practice
      drone.setAttribute("hit-handler", "prestartRed:true");

      const ring = document.createElement("a-obj-model");
      ring.setAttribute("id", ringId);
      ring.classList.add("shootable", RING_CLASS, "prestart-only");

      ring.setAttribute("src", "#marker-red-obj");
      ring.setAttribute("mtl", "#marker-red-mtl");
      ring.setAttribute("scale", `${scale} ${scale} ${scale}`);
      ring.setAttribute("position", "0 0 0");

      // Mark as practice too (ring shots also kill)
      ring.setAttribute("hit-handler", "prestartRed:true");

      wrap.appendChild(drone);
      wrap.appendChild(ring);
      holder.appendChild(wrap);
    }
  };

  // Spawn practice drones on initial load (pre-start)
  window.addEventListener("load", () => {
    setTimeout(() => {
      if (window.gameState && window.gameState.flags && window.gameState.flags.isActive) return;
      window.spawnPrestartDrones(3);
    }, 150);
  });

  // -------------------------------
  // Game wave build
  // -------------------------------
  let wrapsThisWave = [];
  let targetsThisWave = 0;

  function buildEpisodeWave() {
    if (!scenaEl) return;

    scenaEl.innerHTML = "";
    wrapsThisWave = [];
    targetsThisWave = 0;

    const waveTargets = randomInt(minTar, maxTar);
    const waveDistractors = randomInt(minDis, maxDis);

    window.gameState.wave.index = currentEpisode + 1;
    window.gameState.wave.redSpawned = waveTargets;
    window.gameState.wave.greenSpawned = waveDistractors;
    window.gameState.wave.waveScoreDelta = 0;

    redTargetTotal += waveTargets;
    greenTargetTotal += waveDistractors;

    const frag = document.createDocumentFragment();
    const placed = [];

    const totalToSpawn = waveTargets + waveDistractors;

    for (let i = 0; i < totalToSpawn; i += 1) {
      const isRed = i < waveTargets;

      if (typeof window.generate_object === "function") window.generate_object();

      const p = pickSpawnPoint(placed);
      placed.push(p);

      const profile = pickEnemyProfile(isRed);

      const evasive =
        Math.random() <
        (isRed ? difficulty.evasiveChance : Math.min(difficulty.evasiveChance * 0.85, 0.16));

      const z = Z_POSITION - targetsThisWave * Z_STAGGER_STEP;

      const { wrap } = makeEnemyWrap({
        objectId: targetsThisWave,
        x: p.x,
        y: p.y,
        z,
        isRed,
        hp: profile.hp,
        speedMul: profile.speedMul,
        scale: profile.scale,
        evasive
      });

      wrapsThisWave.push(wrap);
      frag.appendChild(wrap);
      targetsThisWave += 1;
    }

    scenaEl.appendChild(frag);
    refreshHUD();
  }

  function deleteTargetsAfterDelay() {
    setTimeout(() => {
      wrapsThisWave.forEach((wrapEl) => {
        if (wrapEl && wrapEl.parentNode) wrapEl.parentNode.removeChild(wrapEl);
      });
    }, effectiveDur + 80);
  }

  function showWaveSummary(cb) {
    if (!enableWaveSummary) {
      cb && cb();
      return;
    }
    if (scena3El) scena3El.innerHTML = "";
    setTimeout(() => {
      if (scena3El) scena3El.innerHTML = "";
      cb && cb();
    }, 300);
  }

  // ✅ NEW: finish run and store server-accepted metrics
  async function finishRunToBackend() {
    const gs = window.gameState;
    if (!gs) return;

    gs.run.finishedAtIso = new Date().toISOString();

    // No runId or no API => skip (offline/unauthed)
    if (!gs.run.runId || !gs.telemetry || !window.GameAPI || typeof window.GameAPI.finishRun !== "function") {
      gs.run.verified = false;
      return;
    }

    try {
      const resp = await window.GameAPI.finishRun({
        runId: gs.run.runId,
        finishedAt: gs.run.finishedAtIso,
        completed: true,
        events: gs.telemetry.events || [],
        flags: { penalizeGreenHits: gs.flags && gs.flags.penalizeGreenHits === true }
      });

      gs.run.accepted = resp && resp.accepted ? resp.accepted : null;
      gs.run.verified = !!gs.run.accepted;

      // Overwrite client values with accepted metrics (authoritative for display)
      if (gs.run.accepted) {
        const a = gs.run.accepted;

        gs.score.total = Number(a.scoreTotal) || 0;
        gs.score.redHits = Number(a.redHits) || 0;
        gs.score.greenHits = Number(a.greenHits) || 0;

        // server computes accuracy from its rules; keep it for UI convenience
        gs.score.accuracyPct = typeof a.accuracyPct === "number" ? a.accuracyPct : gs.score.accuracyPct;

        // shots: backend uses events; keep local _rawShots too, but align visible shots
        gs.score.shots = Number(a.shots) || gs.score.shots;
        gs.score._rawShots = Number(a.shots) || gs.score._rawShots;
      }
    } catch (e) {
      console.warn("finishRun failed:", e);
      gs.run.verified = false;
    }
  }

  // ✅ NEW: show final score (now async so it can wait for backend)
  async function showFinalScoreAsync() {
    if (!scena2El || !scena3El) return;

    // finish backend first (if possible), then render final screen
    await finishRunToBackend();

    refreshHUD();

    const gs = window.gameState;
    const bullets = Number(gs.score._rawShots) || 0;
    const redHits = Number(gs.score.redHits) || 0;

    const denom = Math.max(1, bullets);
    const accuracyPct = Math.max(0, Math.min(100, Math.round((redHits / denom) * 100)));

    scena2El.innerHTML = "";
    scena3El.innerHTML = "";

    const title = document.createElement("a-text");
    title.setAttribute("font", FONT_URL);
    title.setAttribute("value", "Mission Complete");
    title.setAttribute("position", "-2.7 3 -10");
    title.setAttribute("scale", "4 4 1");
    title.setAttribute("color", "white");
    scena2El.appendChild(title);

    const verifiedTag = gs.run && gs.run.verified ? "✔ Verified" : "⚠ Unverified";

    const lines = [
      `Player: ${username} | Level: ${levelNum} | ${verifiedTag}`,
      `Score: ${gs.score.total}`,
      `Targets destroyed: ${gs.score.redHits}/${redTargetTotal}`,
      `Distractors hit: ${gs.score.greenHits}/${greenTargetTotal}`,
      `Shots: ${gs.score.shots} | Accuracy: ${accuracyPct}%`
    ];

    lines.forEach((txt, i) => {
      const el = document.createElement("a-text");
      el.setAttribute("font", FONT_URL);
      el.setAttribute("value", txt);
      el.setAttribute("position", `-6.0 ${1.7 - i * 0.55} -10`);
      el.setAttribute("scale", "2.2 2.2 1");
      el.setAttribute("color", "white");
      scena3El.appendChild(el);
    });

    const key = `level_${levelNum}_bestScore`;
    const prev = Number(localStorage.getItem(key) || "0");
    if (!Number.isFinite(prev) || gs.score.total > prev) {
      localStorage.setItem(key, String(gs.score.total));
    }
  }

  function prepareNextEpisode() {
    buildEpisodeWave();
    hideMarkers();
    deleteTargetsAfterDelay();
  }

  let gameInterval = null;

  function clearGameInterval() {
    if (gameInterval !== null) {
      clearInterval(gameInterval);
      gameInterval = null;
    }
  }

  window.addEventListener("beforeunload", () => clearGameInterval());
  const hudInterval = setInterval(() => refreshHUD(), HUD_REFRESH_MS);
  window.addEventListener("beforeunload", () => clearInterval(hudInterval));

  // =========================================================
  // START
  // =========================================================
  window.start = function startGame() {
    if (totalEpisodes <= 0) return;

    currentEpisode = 0;
    clearGameInterval();

    // DO NOT clear practice UI here anymore.
    // It is cleared immediately when PLAY box dies (hit-handler start branch).

    window.gameState.flags.isActive = true;

    window.gameState.score.total = 0;
    window.gameState.score.redHits = 0;
    window.gameState.score.greenHits = 0;
    window.gameState.score.streak = 0;
    window.gameState.score.shots = 0;
    window.gameState.score._rawShots = 0;

    window.score_episode_red = 0;
    window.score_episode_green = 0;

    redTargetTotal = 0;
    greenTargetTotal = 0;

    // ✅ NEW: initialize telemetry fresh for this run (used by shoot.js pushEvent)
    window.gameState.telemetry = {
      t0: performance.now(),
      events: []
    };

    // ✅ NEW: reset run record
    window.gameState.run.runId = null;
    window.gameState.run.startedAtIso = new Date().toISOString();
    window.gameState.run.finishedAtIso = null;
    window.gameState.run.verified = false;
    window.gameState.run.accepted = null;

    // ✅ NEW: start backend run (non-blocking; game continues even if it fails)
    (async () => {
      try {
        if (!window.GameAPI || typeof window.GameAPI.startRun !== "function") return;

        const resp = await window.GameAPI.startRun({
          level: levelNum,
          episodesTotal: totalEpisodes,
          episodeDurationMs: episodeDuration,
          clientBuild: "td-web"
        });

        if (resp && resp.runId) {
          window.gameState.run.runId = resp.runId;
          window.gameState.run.startedAtIso = resp.startedAt || window.gameState.run.startedAtIso;
        }
      } catch (e) {
        console.warn("startRun failed:", e);
      }
    })();

    refreshHUD();

    prepareNextEpisode();

    gameInterval = setInterval(() => {
      showWaveSummary(() => {
        currentEpisode += 1;

        if (currentEpisode >= totalEpisodes) {
          clearGameInterval();

          window.gameState.flags.isActive = false;

          // ✅ NEW: final score now async (waits for backend finish)
          setTimeout(() => {
            void showFinalScoreAsync();
          }, 350);

          return;
        }

        prepareNextEpisode();
      });
    }, episodeDurationFull);
  };

})();
