let level, username;
let episodes_count,
  cur_level,
  episode_duration,
  number_of_targets,
  number_of_distractors;
let tar_diff = 1,
  dis_diff = 1;

function toGame() {
  let username = document.getElementById("username").value;
  let level = document.getElementById("select_level").value;
  localStorage.setItem("username", username);
  localStorage.setItem("level", level);
  console.log(level);
  window.open("tower_defense.html");
}

var e = document.getElementById("select_level");
cur_level = e.options[e.selectedIndex].text;
if (cur_level <= 10) {
  episodes_count = 26;
  episode_duration = 15;
}
if (cur_level > 10 && cur_level <= 20) {
  episodes_count = 32;
  episode_duration = 12;
}
if (cur_level > 20) {
  episodes_count = 36;
  episode_duration = 10;
}
if (cur_level <= 2) {
}
if (
  cur_level == 3 &&
  cur_level == 4 &&
  cur_level == 5 &&
  cur_level == 11 &&
  cur_level == 12 &&
  cur_level == 21
) {
}
if(cur_level == 6,7,8,9,13,14,17,22,23,26)
//
//
document.getElementById("ep_count").value = episodes_count;
document.getElementById("ep_dur").value = episode_duration;
document.getElementById("tar_diff").value = tar_diff;
document.getElementById("dis_diff").value = dis_diff;
//
document.getElementById("select_level").onchange = function() {
  cur_level = e.options[e.selectedIndex].text;
  if (cur_level <= 10) {
    episodes_count = 26;
    episode_duration = 15;
  }

  if (cur_level > 10 && cur_level <= 20) {
    episodes_count = 32;
    episode_duration = 12;
  }
  if (cur_level > 20) {
    episodes_count = 36;
    episode_duration = 10;
  }
  document.getElementById("ep_count").value = episodes_count;
  document.getElementById("ep_dur").value = episode_duration;
};
