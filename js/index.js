// Declare necessary variables
let level, username;
let episodes_count, episode_duration, number_of_targets, number_of_distractors;
let tar_diff = 1, dis_diff = 1;

function toGame() {
  // Get input values
  username = document.getElementById("username").value;
  level = document.getElementById("select_level").value;
  episodes_count = document.getElementById("ep_count").value;
  episode_duration = document.getElementById("ep_dur").value;
  tar_diff = document.getElementById("tar_diff").value;
  dis_diff = document.getElementById("dis_diff").value;
  number_of_targets = document.getElementById("num_of_tar").value;
  number_of_distractors = document.getElementById("num_of_dis").value;

  // Save values to localStorage
  const settings = { username, level, episodes_count, episode_duration, tar_diff, dis_diff, number_of_targets, number_of_distractors };
  for (const key in settings) {
    localStorage.setItem(key, settings[key]);
  }

  console.log(settings);
  window.open("tower_defense.html");
}

function updateGameSettings(level) {
  // Set episode count and duration based on level
  if (level <= 10) {
    episodes_count = 26;
    episode_duration = 15000;
  } else if (level <= 20) {
    episodes_count = 32;
    episode_duration = 12000;
  } else {
    episodes_count = 36;
    episode_duration = 10000;
  }

  // Define target and distractor values based on level ranges
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

  // Helper function to get value based on level
  const getValueForLevel = (settings) => settings.find(setting => setting.levels.includes(level))?.value;

  number_of_targets = getValueForLevel(targetSettings);
  number_of_distractors = getValueForLevel(distractorSettings);

  // Update DOM elements with new settings
  document.getElementById("ep_count").value = episodes_count;
  document.getElementById("ep_dur").value = episode_duration;
  document.getElementById("tar_diff").value = tar_diff;
  document.getElementById("dis_diff").value = dis_diff;
  document.getElementById("num_of_tar").value = number_of_targets;
  document.getElementById("num_of_dis").value = number_of_distractors;
}

// Initial setup
document.addEventListener("DOMContentLoaded", () => {
  const selectLevelElement = document.getElementById("select_level");
  const initialLevel = parseInt(selectLevelElement.options[selectLevelElement.selectedIndex].text);
  updateGameSettings(initialLevel);

  // Add event listener for level change
  selectLevelElement.addEventListener("change", () => {
    const newLevel = parseInt(selectLevelElement.options[selectLevelElement.selectedIndex].text);
    updateGameSettings(newLevel);
  });
});
