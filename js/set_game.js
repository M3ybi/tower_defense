let episodes_count,
  cur_level,
  episode_duration,
  number_of_targets,
  number_of_distractors;
let tar_diff, dis_diff;
var e = document.getElementById("select_level");
cur_level = e.options[e.selectedIndex].text;
if (cur_level <= 10) {
  episodes_count = 26;
  episode_duration = 15;
  if ((cur_level = 1)) {
    number_of_targets = 2;
    number_of_distractors = 2;
  }
  if ((cur_level = 2)) {
    number_of_targets = 2;
    number_of_distractors = 3;
  }
  if ((cur_level = 3 )) {
    number_of_targets = 3;
  }
  document.getElementById("ep_count").value = episodes_count;
  document.getElementById("ep_dur").value = episode_duration;
}
document.getElementById("select_level").onchange = function() {
  cur_level = e.options[e.selectedIndex].text;
  if (cur_level <= 10) {
    episodes_count = 26;
    episode_duration = 15;
    document.getElementById("ep_count").value = episodes_count;
    document.getElementById("ep_dur").value = episode_duration;
  }
};
