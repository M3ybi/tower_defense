let episodes_count,
  cur_level,
  episode_duration,
  number_of_targets,
  number_of_distractors;
let tar_diff, dis_diff = 1;
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
if(cur_level <= 30){
  number_of_distractors = 7;
  number_of_targets = 6;
  if(cur_level == 29 && cur_level == 25){
    number_of_targets = 5;
  }
  if(cur_level == 28){
    number_of_distractors = 6;
  }
  if(cur_level == 27){
    number_of_distractors = 5;
  }
  if(cur_level == 26){
    number_of_targets = 4;
  }
  if(cur_level == 24){
    number_of_distractors = 4;
  }
}
if(cur_level )
//
//
document.getElementById("ep_count").value = episodes_count;
document.getElementById("ep_dur").value = episode_duration;
//
document.getElementById("select_level").onchange = function() {
  cur_level = e.options[e.selectedIndex].text;
  if (cur_level <= 10) {
    episodes_count = 26;
    episode_duration = 15;
    document.getElementById("ep_count").value = episodes_count;
    document.getElementById("ep_dur").value = episode_duration;
  }

  if (cur_level > 10 && cur_level <= 20) {
    episodes_count = 32;
    episode_duration = 12;
    document.getElementById("ep_count").value = episodes_count;
    document.getElementById("ep_dur").value = episode_duration;
  }
  if (cur_level > 20) {
    episodes_count = 36;
    episode_duration = 10;
    document.getElementById("ep_count").value = episodes_count;
    document.getElementById("ep_dur").value = episode_duration;
  }
};
