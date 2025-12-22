// js/index.js
(function () {
  "use strict";

  const DEFAULT_TAR_DIFF = 1;
  const DEFAULT_DIS_DIFF = 1;

  const getNumberFromInput = (id, fallback = 0) => {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const value = Number(el.value);
    return Number.isFinite(value) ? value : fallback;
  };

  const setInputValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = String(value);
  };

  function computeGameSettingsByLevel(level) {
    let episodesCount;
    let episodeDuration;

    if (level <= 10) {
      episodesCount = 26;
      episodeDuration = 15000;
    } else if (level <= 20) {
      episodesCount = 32;
      episodeDuration = 12000;
    } else {
      episodesCount = 36;
      episodeDuration = 10000;
    }

    const targetSettings = [
      { levels: [1, 2], value: 2 },
      { levels: [3, 4, 5, 11, 12, 21], value: 3 },
      { levels: [6, 7, 8, 9, 13, 14, 17, 22, 23, 26], value: 4 },
      { levels: [10, 15, 16, 18, 19, 20, 24, 25, 27, 28, 29], value: 5 },
      { levels: [30], value: 6 }
    ];

    const distractorSettings = [
      { levels: [1], value: 2 },
      { levels: [2, 3, 4, 6, 11], value: 3 },
      { levels: [5, 7, 8, 10, 12, 13, 15, 21, 22, 24], value: 4 },
      { levels: [9, 14, 16, 17, 18, 23, 25, 26, 27], value: 5 },
      { levels: [19, 28], value: 6 },
      { levels: [20, 29, 30], value: 7 }
    ];

    const getValueForLevel = (settings) => {
      const found = settings.find((s) => s.levels.includes(level));
      return found ? found.value : 2;
    };

    return {
      episodesCount,
      episodeDuration,
      numberOfTargets: getValueForLevel(targetSettings),
      numberOfDistractors: getValueForLevel(distractorSettings),
      tarDiff: DEFAULT_TAR_DIFF,
      disDiff: DEFAULT_DIS_DIFF
    };
  }

  function updateGameSettings(level) {
    const s = computeGameSettingsByLevel(level);
    setInputValue("ep_count", s.episodesCount);
    setInputValue("ep_dur", s.episodeDuration);
    setInputValue("num_of_tar", s.numberOfTargets);
    setInputValue("num_of_dis", s.numberOfDistractors);

    // Keep user's custom values if they already changed them, otherwise set defaults once
    const tarDiffEl = document.getElementById("tar_diff");
    const disDiffEl = document.getElementById("dis_diff");

    if (tarDiffEl && (tarDiffEl.value === "" || !Number.isFinite(Number(tarDiffEl.value)))) {
      setInputValue("tar_diff", s.tarDiff);
    }
    if (disDiffEl && (disDiffEl.value === "" || !Number.isFinite(Number(disDiffEl.value)))) {
      setInputValue("dis_diff", s.disDiff);
    }
  }

  function readFormSettings() {
    const usernameInput = document.getElementById("username");
    const levelSelect = document.getElementById("select_level");

    const username = usernameInput ? usernameInput.value.trim() || "Player" : "Player";
    const level = levelSelect ? Number(levelSelect.value) || 1 : 1;

    const episodesCount = getNumberFromInput("ep_count", 26);
    const episodeDuration = getNumberFromInput("ep_dur", 15000);
    const numberOfTargets = getNumberFromInput("num_of_tar", 2);
    const numberOfDistractors = getNumberFromInput("num_of_dis", 2);
    const tarDiff = getNumberFromInput("tar_diff", DEFAULT_TAR_DIFF);
    const disDiff = getNumberFromInput("dis_diff", DEFAULT_DIS_DIFF);

    const clampInt = (n, min, max) =>
      Math.max(min, Math.min(max, Number.isFinite(n) ? Math.floor(n) : min));

    return {
      username: String(username).slice(0, 24),
      level: clampInt(level, 1, 30),
      episodesCount: clampInt(episodesCount, 1, 999),
      episodeDuration: clampInt(episodeDuration, 2000, 60000),
      numberOfTargets: clampInt(numberOfTargets, 0, 99),
      numberOfDistractors: clampInt(numberOfDistractors, 0, 99),
      tarDiff: clampInt(tarDiff, 0, 20),
      disDiff: clampInt(disDiff, 0, 20)
    };
  }

  function saveSettingsToLocalStorage(settings) {
    // FIX: was referencing usernameInput out of scope
    localStorage.setItem("username", settings.username);
    localStorage.setItem("level", String(settings.level));
    localStorage.setItem("episode_count", String(settings.episodesCount));
    localStorage.setItem("episode_duration", String(settings.episodeDuration));
    localStorage.setItem("number_of_targets", String(settings.numberOfTargets));
    localStorage.setItem("number_of_distractors", String(settings.numberOfDistractors));
    localStorage.setItem("tar_diff", String(settings.tarDiff));
    localStorage.setItem("dis_diff", String(settings.disDiff));

    // REMOVED: enable_wave_summary / penalize_green_hits (per your request)
    localStorage.removeItem("enable_wave_summary");
    localStorage.removeItem("penalize_green_hits");
  }

  function navigateToGame() {
    window.location.href = "tower_defense.html";
  }

  window.toGame = function toGame() {
    const settings = readFormSettings();
    saveSettingsToLocalStorage(settings);
    navigateToGame();
    return false;
  };

  document.addEventListener("DOMContentLoaded", () => {
    const levelSelect = document.getElementById("select_level");
    const formEl = document.getElementById("form");

    // Initialize derived values immediately
    const initialLevel = levelSelect ? Number(levelSelect.value) || 1 : 1;
    updateGameSettings(initialLevel);

    if (levelSelect) {
      levelSelect.addEventListener("change", () => {
        const newLevel = Number(levelSelect.value) || 1;
        updateGameSettings(newLevel);
      });
    }

    if (formEl) {
      formEl.addEventListener("submit", (event) => {
        event.preventDefault();
        window.toGame();
      });
    }
  });
})();
