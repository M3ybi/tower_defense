document.querySelector("#model").addEventListener("model-loaded", function() {
  console.log("...............");
});
let score_episode_red = 0;
let score_episode_green = 0;
let marker_hide_timer = 3000;
let counter = 0; //default
let distractor_number = localStorage.getItem("number_of_distractors");
let target_number = localStorage.getItem("number_of_targets"); //default
let episodes = localStorage.getItem("episode_count"); //default
let episode_duration = localStorage.getItem("episode_duration"); //default
var ring = document.getElementsByClassName("ring");
let current_level = localStorage.getItem("level");
let tar_diff = parseInt(localStorage.getItem("tar_diff"));
let dis_diff = parseInt(localStorage.getItem("dis_diff"));
let usernameis = localStorage.getItem("username");
let max_tar = parseInt(target_number) + parseInt(tar_diff);
let min_tar = target_number - tar_diff;
let max_dis = parseInt(distractor_number) + parseInt(dis_diff);
let min_dis = distractor_number - dis_diff;
target_number = Math.floor(Math.random() * (max_tar - min_tar) + min_tar);
distractor_number = Math.floor(Math.random() * (max_dis - min_dis) + min_dis);
let marker_red_obj = "marker-red-obj";
let marker_red_mtl = "marker-red-mtl";
let marker_green_obj = "marker-green-obj";
let marker_green_mtl = "marker-green-mtl";
let red_target = target_number;
let green_target = distractor_number;
let targets = distractor_number + target_number;
let episode_duration_full = parseInt(episode_duration) + 3000;

document.getElementById("scena").innerHTML +=
  "<a-text font='https://cdn.aframe.io/fonts/Exo2Bold.fnt' id=text3 text=value:" +
  current_level +
  " position='-6.5 5 -15' scale='5 5 1' color=white ></a-text>";

function start() {
  function marker_hide() {
    if (document.getElementsByClassName("ring") != null) {
      setTimeout(function() {
        for (let i = 0; i < ring.length; i++)
          ring[i].setAttribute("visible", false);
      }, marker_hide_timer);
    }
  }

  function build() {
  
    var object_id = 0;
    var ring_id = 2000;
    var z = -20;
    var t = 0;
    for (let j = 0; j < target_number; j++) {
      generate_object();
      var x = Math.floor(Math.random() * 20 - 15);
      var y = Math.floor(Math.random() * 8 + 1);
      document.getElementById("scena").innerHTML +=
        "<a-obj-model id='" +
        object_id +
        "' class='target-red' target='healthPoints:1; static:false' src=#" +
        item_obj +
        " mtl=#" +
        item_mtl +
        " " +
        "scale='0.28 0.28 0.28' position='" +
        x +
        " " +
        y +
        " " +
        z +
        "' hit-handler='id:" +
        object_id +
        "' animation='property: object3D.position.z; to: 2; dir: alternate; dur: " +
        episode_duration +
        "; loop: false'></a-obj-model>" +
        "<a-obj-model id='" +
        ring_id +
        "' class='ring' src=#" +
        marker_red_obj +
        " mtl=#" +
        marker_red_mtl +
        " scale='0.28 0.28 0.28'" +
        "position='" +
        x +
        " " +
        y +
        " " +
        z +
        "' animation='property: object3D.position.z; to: 2; dir: alternate; dur: " +
        episode_duration +
        "; loop: false'>" +
        "</a-obj-model>";
      t++;
      object_id++;
      ring_id++;
      red_target++;
    }
    for (let i = 0; i < distractor_number; i++) {
      generate_object();
      var x = Math.floor(Math.random() * 20 - 15);
      var y = Math.floor(Math.random() * 8 + 1);
      document.getElementById("scena").innerHTML +=
        "<a-obj-model id='" +
        object_id +
        "' class='target-green' target='healthPoints:1; static:false' src=#" +
        item_obj +
        " mtl=#" +
        item_mtl +
        " " +
        "scale='0.28 0.28 0.28' position='" +
        x +
        " " +
        y +
        " " +
        z +
        "' hit-handler='id:" +
        object_id +
        "' animation='property: object3D.position.z; to: 2; dir: alternate; dur: " +
        episode_duration +
        "; loop: false'></a-obj-model>" +
        "<a-obj-model id='" +
        ring_id +
        "' class='ring' src=#" +
        marker_green_obj +
        " mtl=#" +
        marker_green_mtl +
        " scale='0.28 0.28 0.28'" +
        "position='" +
        x +
        " " +
        y +
        " " +
        z +
        "' animation='property: object3D.position.z; to: 2; dir: alternate; dur: " +
        episode_duration +
        "; loop: false'>" +
        "</a-obj-model>";
      object_id++;
      ring_id++;
      green_target++;
    }
  }

  function delete_target() {
    setTimeout(function() {
      var k = 0;
      var rings_id = 2000;
      for (let i = 0; i < targets; i++) {
        if (document.getElementById(k) != null) {
          document
            .getElementById(k)
            .parentNode.removeChild(document.getElementById(k));
        }

        if (document.getElementById(rings_id) != null) {
          document
            .getElementById(rings_id)
            .parentNode.removeChild(document.getElementById(rings_id));
        }
        rings_id++;
        k++;
      }
    }, episode_duration);
  }

  var myvar = setInterval(function() {
    if (counter >= episodes) {
      clearInterval(myvar);
      setTimeout(function() {
        document.getElementById("scena2").innerHTML =
          "<a-text font='https://cdn.aframe.io/fonts/Exo2Bold.fnt' id=score text=value:Username: " +
          usernameis +
          "  position='-15 2 -15' scale='5 5 1' color=white ></a-text>";
        document.getElementById("scena").innerHTML +=
          "<a-text font='https://cdn.aframe.io/fonts/Exo2Bold.fnt' id=score1 text='value:Targets destroyed/total: " +
          score_episode_red +
          "/" +
          red_target +
          "'  position='-17 0 -15' scale='5 5 1' color=white ></a-text>";
        document.getElementById("scena").innerHTML +=
          "<a-text font='https://cdn.aframe.io/fonts/Exo2Bold.fnt' id=score2 text='value:Distractors destroyed/total: " +
          score_episode_green +
          "/" +
          green_target +
          "'  position='-17 -2 -15' scale='5 5 1' color=white ></a-text>";
      }, episode_duration);
    }
    game();
    delete_target();
    counter++;
    console.log(counter);
  }, episode_duration_full);

  function game() {
    console.log("score_red " + score_episode_red);
    console.log("score_green " + score_episode_green);
    console.log("episode_red " + red_target);
    console.log("episode_green " + green_target);

    build();
    target_number = Math.floor(Math.random() * (max_tar - min_tar) + min_tar);
    distractor_number = Math.floor(
      Math.random() * (max_dis - min_dis) + min_dis
    );
    targets = target_number + distractor_number;
    marker_hide();
  }
  game();
  delete_target();
}
