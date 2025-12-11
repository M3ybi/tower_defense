// js/scene_build.js
(function () {
  const FONT_URL = "https://cdn.aframe.io/fonts/Exo2Bold.fnt";
  const RING_CLASS = "ring";
  const RING_START_ID = 2000;
  const Z_POSITION = -20;
  const MARKER_HIDE_DELAY_MS = 3000;

  // -------------------------------
  // Helpers
  // -------------------------------
  const getNumber = (key, defaultValue = 0) => {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) ? value : defaultValue;
  };

  const getString = (key, defaultValue = "") => {
    const value = localStorage.getItem(key);
    return value !== null ? value : defaultValue;
  };

  const randomInRange = (min, max) => {
    if (max <= min) return min;
    return Math.floor(Math.random() * (max - min) + min);
  };

  const addText = (parentEl, { id, value, position, scale = "1 1 1", color = "white" }) => {
    if (!parentEl) return;
    const html =
      `<a-text font="${FONT_URL}" id="${id}" ` +
      `text="value:${value}" ` +
      `position="${position}" ` +
      `scale="${scale}" ` +
      `color="${color}"></a-text>`;
    parentEl.insertAdjacentHTML("beforeend", html);
  };

  // Just to see that assets were loaded
  const modelAssets = document.querySelector("#model");
  if (modelAssets) {
    modelAssets.addEventListener("model-loaded", () => {
      console.log("A-Frame model assets loaded.");
    });
  }

  // -------------------------------
  // Game configuration from localStorage
  // -------------------------------
  const username = getString("username", "Player");
  const currentLevel = getString("level", "1");

  let distractorNumber = getNumber("number_of_distractors", 0);
  let targetNumber = getNumber("number_of_targets", 0);

  const totalEpisodes = Math.max(getNumber("episode_count", 1), 1);
  const episodeDuration = getNumber("episode_duration", 10000);

  const tarDiff = getNumber("tar_diff", 0);
  const disDiff = getNumber("dis_diff", 0);

  // Bounds for random variation per episode
  const maxTar = targetNumber + tarDiff;
  const minTar = Math.max(0, targetNumber - tarDiff);
  const maxDis = distractorNumber + disDiff;
  const minDis = Math.max(0, distractorNumber - disDiff);

  // Initial randomization
  targetNumber = randomInRange(minTar, maxTar);
  distractorNumber = randomInRange(minDis, maxDis);

  let targets = targetNumber + distractorNumber;

  // Global scores used by hit-handler (shoot.js)
  window.score_episode_red = 0;
  window.score_episode_green = 0;

  // Internal state
  let isFirstRound = true;
  let redTargetTotal = targetNumber;
  let greenTargetTotal = distractorNumber;

  // How many episodes have already completed
  let currentEpisode = 0;

  // One full cycle = episode duration + marker hide delay
  const episodeDurationFull = episodeDuration + MARKER_HIDE_DELAY_MS;

  const scenaEl = document.getElementById("scena");
  const scena2El = document.getElementById("scena2");
  const scena3El = document.getElementById("scena3");

  // Show current level label once
  addText(scenaEl, {
    id: "text3",
    value: currentLevel,
    position: "-6.5 5 -15",
    scale: "5 5 1"
  });

  // -------------------------------
  // Spacebar → "Current episode / total"
  // -------------------------------
  document.body.addEventListener("keyup", (event) => {
    const isSpace =
      event.code === "Space" ||
      event.key === " " ||
      event.key === "Spacebar" ||
      event.keyCode === 32;

    if (!isSpace || !scena3El) {
      return;
    }

    const displayEpisode = Math.min(currentEpisode + 1, totalEpisodes);

    addText(scena3El, {
      id: "score1",
      value: `Current episode/total: ${displayEpisode}/${totalEpisodes}`,
      position: "-1.6 0 -5"
    });

    setTimeout(() => {
      if (!scena3El) return;
      scena3El.innerHTML =
        `<a-text font="${FONT_URL}" id="text5" ` +
        `text="value:" position="-0.5 15 -15" ` +
        `scale="5 5 1" color="white"></a-text>`;
    }, 3000);
  });

  // -------------------------------
  // Marker visibility management
  // -------------------------------
  function hideMarkers() {
    const rings = document.getElementsByClassName(RING_CLASS);
    if (!rings || !rings.length) return;

    setTimeout(() => {
      Array.from(rings).forEach((ringEl) => {
        ringEl.setAttribute("visible", "false");
      });
    }, MARKER_HIDE_DELAY_MS);
  }

  // -------------------------------
  // Episode build
  // -------------------------------
  function buildEpisodeWave() {
    if (!scenaEl) {
      console.warn("Missing #scena container for episode wave.");
      return;
    }

    let objectId = 0;

    // RED targets
    for (let i = 0; i < targetNumber; i += 1) {
      if (typeof window.generate_object === "function") {
        window.generate_object();
      }

      const x = Math.floor(Math.random() * 15 - 5);
      const y = Math.floor(Math.random() * 4);

      const droneId = String(objectId);
      const ringId = String(RING_START_ID + objectId);

      const html =
        // Drone
        `<a-obj-model id="${droneId}" ` +
        `class="target-red" ` +
        `target="healthPoints:1; static:false" ` +
        `src="#${window.item_obj}" mtl="#${window.item_mtl}" ` +
        `scale="0.28 0.28 0.28" ` +
        `position="${x} ${y} ${Z_POSITION}" ` +
        `hit-handler="id:${droneId}" ` +
        `animation="property: object3D.position.z; to: 2; dir: alternate; dur: ${episodeDuration}; loop: false">` +
        `</a-obj-model>` +
        // Ring (marker) – shares hit-handler target id
        `<a-obj-model id="${ringId}" ` +
        `class="${RING_CLASS}" ` +
        `src="#marker-red-obj" mtl="#marker-red-mtl" ` +
        `scale="0.28 0.28 0.28" ` +
        `position="${x} ${y} ${Z_POSITION}" ` +
        `hit-handler="id:${droneId}" ` +
        `animation="property: object3D.position.z; to: 2; dir: alternate; dur: ${episodeDuration}; loop: false">` +
        `</a-obj-model>`;

      scenaEl.insertAdjacentHTML("beforeend", html);

      objectId += 1;
      if (!isFirstRound) {
        redTargetTotal += 1;
      }
    }

    // GREEN distractors
    for (let i = 0; i < distractorNumber; i += 1) {
      if (typeof window.generate_object === "function") {
        window.generate_object();
      }

      const x = Math.floor(Math.random() * 20 - 15);
      const y = Math.floor(Math.random() * 8 + 1);

      const droneId = String(objectId);
      const ringId = String(RING_START_ID + objectId);

      const html =
        // Drone
        `<a-obj-model id="${droneId}" ` +
        `class="target-green" ` +
        `target="healthPoints:1; static:false" ` +
        `src="#${window.item_obj}" mtl="#${window.item_mtl}" ` +
        `scale="0.28 0.28 0.28" ` +
        `position="${x} ${y} ${Z_POSITION}" ` +
        `hit-handler="id:${droneId}" ` +
        `animation="property: object3D.position.z; to: 2; dir: alternate; dur: ${episodeDuration}; loop: false">` +
        `</a-obj-model>` +
        // Ring (marker)
        `<a-obj-model id="${ringId}" ` +
        `class="${RING_CLASS}" ` +
        `src="#marker-green-obj" mtl="#marker-green-mtl" ` +
        `scale="0.28 0.28 0.28" ` +
        `position="${x} ${y} ${Z_POSITION}" ` +
        `hit-handler="id:${droneId}" ` +
        `animation="property: object3D.position.z; to: 2; dir: alternate; dur: ${episodeDuration}; loop: false">` +
        `</a-obj-model>`;

      scenaEl.insertAdjacentHTML("beforeend", html);

      objectId += 1;
      if (!isFirstRound) {
        greenTargetTotal += 1;
      }
    }

    // update global "targets" count = total drones in this wave
    targets = objectId;
  }

  // -------------------------------
  // Cleanup of targets & markers
  // -------------------------------
  function deleteTargetsAfterDelay() {
    setTimeout(() => {
      for (let k = 0; k < targets; k += 1) {
        const droneId = String(k);
        const ringId = String(RING_START_ID + k);

        const targetEl = document.getElementById(droneId);
        if (targetEl && targetEl.parentNode) {
          targetEl.parentNode.removeChild(targetEl);
        }

        const ringEl = document.getElementById(ringId);
        if (ringEl && ringEl.parentNode) {
          ringEl.parentNode.removeChild(ringEl);
        }
      }
    }, episodeDuration);
  }

  // -------------------------------
  // Final score
  // -------------------------------
  function showFinalScore() {
    if (!scenaEl || !scena2El) return;

    addText(scena2El, {
      id: "score",
      value: `Username: ${username}`,
      position: "-15 2 -15",
      scale: "5 5 1"
    });

    addText(scenaEl, {
      id: "score1",
      value: `Targets destroyed/total: ${window.score_episode_red}/${redTargetTotal}`,
      position: "-17 0 -15",
      scale: "5 5 1"
    });

    addText(scenaEl, {
      id: "score2",
      value: `Distractors destroyed/total: ${window.score_episode_green}/${greenTargetTotal}`,
      position: "-17 -2 -15",
      scale: "5 5 1"
    });
  }

  // -------------------------------
  // Episode lifecycle
  // -------------------------------
  function prepareNextEpisode() {
    console.log(`Starting episode ${currentEpisode + 1}/${totalEpisodes}`);

    // Build wave
    buildEpisodeWave();
    isFirstRound = false;

    // Randomize counts for NEXT episode
    targetNumber = randomInRange(minTar, maxTar);
    distractorNumber = randomInRange(minDis, maxDis);
    // targets is recomputed inside buildEpisodeWave

    // Hide markers after delay and remove models after episode duration
    hideMarkers();
    deleteTargetsAfterDelay();
  }

  // -------------------------------
  // start() – called from start_click.js
  // -------------------------------
  window.start = function startGame() {
    if (totalEpisodes <= 0) {
      console.warn("No episodes configured; nothing to start.");
      return;
    }

    // Reset episode counter
    currentEpisode = 0;
    isFirstRound = true;

    // Run FIRST episode immediately after countdown
    prepareNextEpisode();

    // Schedule the remaining episodes
    const gameInterval = setInterval(() => {
      currentEpisode += 1; // previous episode just finished

      if (currentEpisode >= totalEpisodes) {
        // All episodes finished
        clearInterval(gameInterval);
        setTimeout(showFinalScore, episodeDuration);
        return;
      }

      // Start next episode
      prepareNextEpisode();
    }, episodeDurationFull);
  };
})();
