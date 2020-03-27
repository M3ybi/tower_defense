let episodes_count,
  episode_duration,
  number_of_targets,
  number_of_distractors;
let tar_diff, dis_diff;
var e = document.getElementById("select_level");
var level = e.options[e.selectedIndex].text;
console.log(level);
console.log(e);
document.getElementById("select_level").onchange = function() {
  level = e.options[e.selectedIndex].text;
  if (level <= 10) {
    episodes_count = 26;
    document.getElementById("ep_count").value = episodes_count;
  }
};
