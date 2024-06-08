document.querySelector("#model").addEventListener("model-loaded", () => console.log("..............."));

let builded = 0, first = 0, score_episode_red = 0, score_episode_green = 0, marker_hide_timer = 3000, counter = 0;
let distractor_number = +localStorage.getItem("number_of_distractors");
let target_number = +localStorage.getItem("number_of_targets");
let episodes = +localStorage.getItem("episode_count") - 1;
let episode_duration = +localStorage.getItem("episode_duration");
let ring = document.getElementsByClassName("ring");
let current_level = localStorage.getItem("level");
let tar_diff = +localStorage.getItem("tar_diff"), dis_diff = +localStorage.getItem("dis_diff");
let usernameis = localStorage.getItem("username");
let max_tar = target_number + tar_diff, min_tar = target_number - tar_diff;
let max_dis = distractor_number + dis_diff, min_dis = distractor_number - dis_diff;
target_number = Math.floor(Math.random() * (max_tar - min_tar) + min_tar);
distractor_number = Math.floor(Math.random() * (max_dis - min_dis) + min_dis);
let marker_red_obj = "marker-red-obj", marker_red_mtl = "marker-red-mtl";
let marker_green_obj = "marker-green-obj", marker_green_mtl = "marker-green-mtl";
let red_target = target_number, green_target = distractor_number;
let targets = distractor_number + target_number;
let episode_duration_full = episode_duration + 3000;

document.body.onkeyup = e => {
  if (e.keyCode === 32) {
    document.getElementById("scena3").innerHTML += `<a-text font='https://cdn.aframe.io/fonts/Exo2Bold.fnt' id=score1 text='value:Current episode/total: ${counter + 1}/${episodes + 1}' position='-1.6 0 -5' scale='1 1 1' color=white ></a-text>`;
    setTimeout(() => document.getElementById("scena3").innerHTML = "<a-text font='https://cdn.aframe.io/fonts/Exo2Bold.fnt' id=text5 text=value: position='-0.5 15 -15' scale='5 5 1' color=white ></a-text>", 3000);
  }
};
document.getElementById("scena").innerHTML += `<a-text font='https://cdn.aframe.io/fonts/Exo2Bold.fnt' id=text3 text=value:${current_level} position='-6.5 5 -15' scale='5 5 1' color=white ></a-text>`;

const start = () => {
  const marker_hide = () => ring && setTimeout(() => [...ring].forEach(r => r.setAttribute("visible", false)), marker_hide_timer);

  const build = () => {
    builded++;
    let object_id = 0, ring_id = 2000, z = -20;
    for (let j = 0; j < target_number; j++) {
      generate_object();
      let x = Math.floor(Math.random() * 15 - 5), y = Math.floor(Math.random() * 4);
      document.getElementById("scena").innerHTML += `<a-obj-model id='${object_id}' class='target-red' target='healthPoints:1; static:false' src=#${item_obj} mtl=#${item_mtl} scale='0.28 0.28 0.28' position='${x} ${y} ${z}' hit-handler='id:${object_id}' animation='property: object3D.position.z; to: 2; dir: alternate; dur: ${episode_duration}; loop: false'></a-obj-model><a-obj-model id='${ring_id}' class='ring' src=#${marker_red_obj} mtl=#${marker_red_mtl} scale='0.28 0.28 0.28' position='${x} ${y} ${z}' animation='property: object3D.position.z; to: 2; dir: alternate; dur: ${episode_duration}; loop: false'></a-obj-model>`;
      object_id++; ring_id++; if (first) red_target++;
    }
    for (let i = 0; i < distractor_number; i++) {
      generate_object();
      let x = Math.floor(Math.random() * 20 - 15), y = Math.floor(Math.random() * 8 + 1);
      document.getElementById("scena").innerHTML += `<a-obj-model id='${object_id}' class='target-green' target='healthPoints:1; static:false' src=#${item_obj} mtl=#${item_mtl} scale='0.28 0.28 0.28' position='${x} ${y} ${z}' hit-handler='id:${object_id}' animation='property: object3D.position.z; to: 2; dir: alternate; dur: ${episode_duration}; loop: false'></a-obj-model><a-obj-model id='${ring_id}' class='ring' src=#${marker_green_obj} mtl=#${marker_green_mtl} scale='0.28 0.28 0.28' position='${x} ${y} ${z}' animation='property: object3D.position.z; to: 2; dir: alternate; dur: ${episode_duration}; loop: false'></a-obj-model>`;
      object_id++; ring_id++; if (first) green_target++;
    }
  };

  const delete_target = () => setTimeout(() => {
    let k = 0, rings_id = 2000;
    for (let i = 0; i < targets; i++) {
      document.getElementById(k)?.remove();
      document.getElementById(rings_id)?.remove();
      rings_id++; k++;
    }
  }, episode_duration);

  let myGame = setInterval(() => {
    if (counter >= episodes) {
      clearInterval(myGame);
      setTimeout(() => {
        document.getElementById("scena2").innerHTML += `<a-text font='https://cdn.aframe.io/fonts/Exo2Bold.fnt' id=score text='value:Username: ${usernameis}'position='-15 2 -15' scale='5 5 1' color=white ></a-text>`;
        document.getElementById("scena").innerHTML += `<a-text font='https://cdn.aframe.io/fonts/Exo2Bold.fnt' id=score1 text='value:Targets destroyed/total: ${score_episode_red}/${red_target}' position='-17 0 -15' scale='5 5 1' color=white ></a-text>`;
        document.getElementById("scena").innerHTML += `<a-text font='https://cdn.aframe.io/fonts/Exo2Bold.fnt' id=score2 text='value:Distractors destroyed/total: ${score_episode_green}/${green_target}' position='-17 -2 -15' scale='5 5 1' color=white ></a-text>`;
      }, episode_duration);
    }
    game(); delete_target(); counter++; console.log(counter);
  }, episode_duration_full);

  const game = () => {
    build(); first = 1;
    target_number = Math.floor(Math.random() * (max_tar - min_tar) + min_tar);
    distractor_number = Math.floor(Math.random() * (max_dis - min_dis) + min_dis);
    targets = target_number + distractor_number;
    marker_hide();
  };
  game(); delete_target();
}
