// js/start_click.js
(function () {
  "use strict";

  const COUNTDOWN_VALUES = [3, 2, 1];
  const COUNTDOWN_DELAY_MS = 800;
  const FONT_URL = "https://cdn.aframe.io/fonts/Exo2Bold.fnt";
  const SCENE_CONTAINER_ID = "scena";
  const REMOVE = ["#start", "#text1", "#text2", "#text3", "#text4", "#prestartText"];
  const TUTORIAL_DONE_KEY = "td_tutorial_done";

  function removeElements(list) {
    list.forEach((sel) => {
      const el = document.querySelector(sel);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function showCountdown() {
    const container = document.getElementById(SCENE_CONTAINER_ID);
    if (!container) return;

    COUNTDOWN_VALUES.forEach((v, i) => {
      setTimeout(() => {
        container.innerHTML = "";
        const t = document.createElement("a-text");
        t.setAttribute("font", FONT_URL);
        t.setAttribute("value", String(v));
        t.setAttribute("position", "-0.6 3 -15");
        t.setAttribute("scale", `${5 + i} ${5 + i} 1`);
        t.setAttribute("color", "white");
        container.appendChild(t);
      }, COUNTDOWN_DELAY_MS * (i + 1));
    });
  }

  function startAfterCountdown() {
    const totalDelay = COUNTDOWN_DELAY_MS * (COUNTDOWN_VALUES.length + 1);

    setTimeout(() => {
      const container = document.getElementById(SCENE_CONTAINER_ID);
      if (container) container.innerHTML = "";

      if (window.AudioFX) window.AudioFX.play("sfxStart");
      if (typeof window.start === "function") window.start();
    }, totalDelay);
  }

  function setTutorialDone() {
    try {
      localStorage.setItem(TUTORIAL_DONE_KEY, "1");
    } catch (_) {}
  }

  function isTutorialDone() {
    try {
      return localStorage.getItem(TUTORIAL_DONE_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function runTutorialThen(cb) {
    if (isTutorialDone()) {
      cb && cb();
      return;
    }

    // Clear practice UI if any is still around.
    if (typeof window.clearPrestartPracticeUI === "function") {
      window.clearPrestartPracticeUI();
    }

    // Simple 2-step tutorial driven by kills (shoot.js calls window.__tutorialOnKill).
    let step = 1;
    let redNeeded = 2;
    let greenMistakes = 0;
    let redRemainingThisStep = redNeeded;

    if (typeof window.__tutorialSpawn === "function") {
      window.__tutorialSpawn(1);
    }

    window.__tutorialOnKill = function onTutorialKill({ isRed, isGreen }) {
      if (step === 1) {
        if (isRed) {
          redRemainingThisStep = Math.max(0, redRemainingThisStep - 1);
        }
        if (redRemainingThisStep === 0) {
          step = 2;
          redRemainingThisStep = 1;
          if (typeof window.__tutorialSpawn === "function") window.__tutorialSpawn(2);
        }
        return;
      }

      // Step 2: one red + one green on screen.
      if (isGreen) {
        greenMistakes += 1;
        if (typeof window.__tutorialSpawn === "function") window.__tutorialSpawn(2);

        // Update message if the UI exists.
        const txt = document.getElementById("tutorialText");
        if (txt) {
          txt.setAttribute(
            "value",
            `Tutorial 2/2: Avoid GREEN. Shoot RED. (Green hit: ${greenMistakes})`
          );
        }
        return;
      }

      if (isRed) {
        // Done.
        setTutorialDone();
        if (typeof window.clearTutorialUI === "function") window.clearTutorialUI();
        window.__tutorialOnKill = null;
        cb && cb();
      }
    };
  }

  AFRAME.registerComponent("cursor-listener", {
    init() {
      this.onClick = this.onClick.bind(this);
      this.el.addEventListener("click", this.onClick);
    },
    remove() {
      this.el.removeEventListener("click", this.onClick);
    },
    onClick() {
      removeElements(REMOVE);
      runTutorialThen(() => {
        showCountdown();
        startAfterCountdown();
      });
    }
  });
})();
