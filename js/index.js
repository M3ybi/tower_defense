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
  let episode_count = document.getElementById("ep_count").value;
  let episode_duration = document.getElementById("ep_dur").value;
  let tar_diff = document.getElementById("tar_diff").value;
  let dis_diff = document.getElementById("dis_diff").value;
  let number_of_targets = document.getElementById("num_of_tar").value;
  let number_of_distractors = document.getElementById("num_of_dis").value;
  localStorage.setItem("username", username);
  localStorage.setItem("level", level);
  localStorage.setItem("episode_count", episode_count);
  localStorage.setItem("episode_duration", episode_duration);
  localStorage.setItem("tar_diff", tar_diff);
  localStorage.setItem("dis_diff", dis_diff);
  localStorage.setItem("number_of_targets", number_of_targets);
  localStorage.setItem("number_of_distractors", number_of_distractors);

  console.log(
    level,
    username,
    episode_count,
    episode_duration,
    tar_diff,
    dis_diff,
    number_of_targets,
    number_of_distractors
  );
  window.open("tower_defense.html");
}

var e = document.getElementById("select_level");
cur_level = e.options[e.selectedIndex].text;
if (cur_level <= 10) {
  episodes_count = 26;
  episode_duration = 15000;
}
if (cur_level > 10 && cur_level <= 20) {
  episodes_count = 32;
  episode_duration = 12000;
}
if (cur_level > 20) {
  episodes_count = 36;
  episode_duration = 10000;
}
if (cur_level <= 2) {
  number_of_targets = 2;
}
if (
  cur_level == 3 ||
  cur_level == 4 ||
  cur_level == 5 ||
  cur_level == 11 ||
  cur_level == 12 ||
  cur_level == 21
) {
  number_of_targets = 3;
}
if (
  cur_level == 6 ||
  cur_level == 7 ||
  cur_level == 8 ||
  cur_level == 9 ||
  cur_level == 13 ||
  cur_level == 14 ||
  cur_level == 17 ||
  cur_level == 22 ||
  cur_level == 23 ||
  cur_level == 26
) {
  number_of_targets = 4;
}
if (
  cur_level == 10 ||
  cur_level == 15 ||
  cur_level == 16 ||
  cur_level == 18 ||
  cur_level == 19 ||
  cur_level == 20 ||
  cur_level == 24 ||
  cur_level == 25 ||
  cur_level == 27 ||
  cur_level == 28 ||
  cur_level == 29
) {
  number_of_targets = 5;
}
if (cur_level == 30) {
  number_of_targets = 6;
}
//
//
if (cur_level == 1) {
  number_of_distractors = 2;
}
if (
  cur_level == 2 ||
  cur_level == 3 ||
  cur_level == 4 ||
  cur_level == 6 ||
  cur_level == 11
) {
  number_of_distractors = 3;
}
if (
  cur_level == 5 ||
  cur_level == 7 ||
  cur_level == 8 ||
  cur_level == 10 ||
  cur_level == 12 ||
  cur_level == 13 ||
  cur_level == 15 ||
  cur_level == 21 ||
  cur_level == 22 ||
  cur_level == 24
) {
  number_of_distractors = 4;
}
if (
  cur_level == 9 ||
  cur_level == 14 ||
  cur_level == 16 ||
  cur_level == 17 ||
  cur_level == 18 ||
  cur_level == 23 ||
  cur_level == 25 ||
  cur_level == 26 ||
  cur_level == 27
) {
  number_of_distractors = 5;
}
if (cur_level == 19 || cur_level == 28) {
  number_of_distractors = 6;
}
if (cur_level == 20 || cur_level == 29) {
  number_of_distractors = 7;
}
document.getElementById("ep_count").value = episodes_count;
document.getElementById("ep_dur").value = episode_duration;
document.getElementById("tar_diff").value = tar_diff;
document.getElementById("dis_diff").value = dis_diff;
document.getElementById("num_of_tar").value = number_of_targets;
document.getElementById("num_of_dis").value = number_of_distractors;

//
document.getElementById("select_level").onchange = function() {
  cur_level = e.options[e.selectedIndex].text;
  if (cur_level <= 10) {
    episodes_count = 26;
    episode_duration = 15000;
  }

  if (cur_level > 10 && cur_level <= 20) {
    episodes_count = 32;
    episode_duration = 12000;
  }
  if (cur_level > 20) {
    episodes_count = 36;
    episode_duration = 10000;
  }
  if (cur_level <= 2) {
    number_of_targets = 2;
  }
  if (
    cur_level == 3 ||
    cur_level == 4 ||
    cur_level == 5 ||
    cur_level == 11 ||
    cur_level == 12 ||
    cur_level == 21
  ) {
    number_of_targets = 3;
  }
  if (
    cur_level == 6 ||
    cur_level == 7 ||
    cur_level == 8 ||
    cur_level == 9 ||
    cur_level == 13 ||
    cur_level == 14 ||
    cur_level == 17 ||
    cur_level == 22 ||
    cur_level == 23 ||
    cur_level == 26
  ) {
    number_of_targets = 4;
  }
  if (
    cur_level == 10 ||
    cur_level == 15 ||
    cur_level == 16 ||
    cur_level == 18 ||
    cur_level == 19 ||
    cur_level == 20 ||
    cur_level == 24 ||
    cur_level == 25 ||
    cur_level == 27 ||
    cur_level == 28 ||
    cur_level == 29 ||
    cur_level == 30
  ) {
    number_of_targets = 5;
  }
  if (cur_level == 30) {
    number_of_targets = 6;
  }
  if (cur_level == 1) {
    number_of_distractors = 2;
  }
  if (
    cur_level == 2 ||
    cur_level == 3 ||
    cur_level == 4 ||
    cur_level == 6 ||
    cur_level == 11
  ) {
    number_of_distractors = 3;
  }
  if (
    cur_level == 5 ||
    cur_level == 7 ||
    cur_level == 8 ||
    cur_level == 10 ||
    cur_level == 12 ||
    cur_level == 13 ||
    cur_level == 15 ||
    cur_level == 21 ||
    cur_level == 22 ||
    cur_level == 24
  ) {
    number_of_distractors = 4;
  }
  if (
    cur_level == 9 ||
    cur_level == 14 ||
    cur_level == 16 ||
    cur_level == 17 ||
    cur_level == 18 ||
    cur_level == 23 ||
    cur_level == 25 ||
    cur_level == 26 ||
    cur_level == 27
  ) {
    number_of_distractors = 5;
  }
  if (cur_level == 19 || cur_level == 28) {
    number_of_distractors = 6;
  }
  if (cur_level == 20 || cur_level == 29 || cur_level == 30) {
    number_of_distractors = 7;
  }
  document.getElementById("ep_count").value = episodes_count;
  document.getElementById("ep_dur").value = episode_duration;
  document.getElementById("num_of_tar").value = number_of_targets;
  document.getElementById("num_of_dis").value = number_of_distractors;
  document.getElementById("tar_diff").value = tar_diff;
  document.getElementById("dis_diff").value = dis_diff;
};
