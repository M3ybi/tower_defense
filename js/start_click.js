// js/start_click.js
(function () {
  "use strict";

  const COUNTDOWN_VALUES = [3, 2, 1];
  const COUNTDOWN_DELAY_MS = 800;
  const FONT_URL = "https://cdn.aframe.io/fonts/Exo2Bold.fnt";
  const SCENE_CONTAINER_ID = "scena";
  const REMOVE = ["#start", "#text1", "#text2", "#text3", "#text4", "#prestartText"];

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
      showCountdown();
      startAfterCountdown();
    }
  });
})();
