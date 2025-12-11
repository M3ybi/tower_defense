// js/start_click.js
(function () {
  const COUNTDOWN_VALUES = [3, 2, 1];
  const COUNTDOWN_DELAY_MS = 1000;
  const FONT_URL = "https://cdn.aframe.io/fonts/Exo2Bold.fnt";
  const SCENE_CONTAINER_ID = "scena";
  const ELEMENT_SELECTORS_TO_REMOVE = ["#start", "#text1", "#text2", "#text3", "#text4"];

  function removeElements(selectors) {
    selectors.forEach((selector) => {
      const el = document.querySelector(selector);
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  }

  function showCountdown() {
    const container = document.getElementById(SCENE_CONTAINER_ID);
    if (!container) {
      console.warn("Missing #scena container for countdown.");
      return;
    }

    COUNTDOWN_VALUES.forEach((value, index) => {
      const scale = 5 + index;
      const delay = COUNTDOWN_DELAY_MS * (index + 1);

      setTimeout(() => {
        container.innerHTML =
          `<a-text font="${FONT_URL}" id="text5" ` +
          `text="value:${value}" ` +
          `position="-0.5 3 -15" ` +
          `scale="${scale} ${scale} 1" ` +
          `color="white"></a-text>`;
      }, delay);
    });
  }

  function clearCountdownAndStart() {
    const totalDelay = COUNTDOWN_DELAY_MS * (COUNTDOWN_VALUES.length + 1);

    setTimeout(() => {
      const countdownText = document.getElementById("text5");
      if (countdownText && countdownText.parentNode) {
        countdownText.parentNode.removeChild(countdownText);
      }

      if (typeof window.start === "function") {
        window.start();
      } else {
        console.warn("start() function is not defined yet.");
      }
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
      removeElements(ELEMENT_SELECTORS_TO_REMOVE);
      showCountdown();
      clearCountdownAndStart();
    }
  });
})();
