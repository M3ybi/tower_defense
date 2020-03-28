document.querySelector("#model").addEventListener("model-loaded", function() {
  console.log("...............");
});
let score_episode_red = 0;
let score_episode_green = 0;
let marker_hide_timer = 2000;
let counter = 0; //default

let distractor_number = localStorage.getItem("number_of_distractors");
let target_number = localStorage.getItem("number_of_targets"); //default
let episodes = localStorage.getItem("episode_count"); //default
let episode_duration = localStorage.getItem("episode_duration"); //default
let time_to_destroy_targets = episode_duration - 300; //default
var ring = document.getElementsByClassName("ring");
let current_level = localStorage.getItem("level");
let object_red_obj = "#drone-red-obj";
let object_red_mtl = "#drone-red-mtl";
let marker_red_obj = "#marker-red-obj";
let marker_red_mtl = "#marker-red-mtl";
let object_green_obj = "#drone-green-obj";
let object_green_mtl = "#drone-green-mtl";
let marker_green_obj = "#marker-green-obj";
let marker_green_mtl = "#marker-green-mtl";
let red_target = target_number;
let green_target = distractor_number;
let targets = distractor_number + target_number;
console.log(window.localStorage.getItem("level"));
console.log(targets);
window.onload = function() {
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
    var ring_id = 20;
    var z = -20;
    var t = 0;
    for (let j = 0; j < target_number; j++) {
      var x = Math.floor(Math.random() * 20 - 15);
      var y = Math.floor(Math.random() * 8 + 1);
      document.getElementById("scena").innerHTML +=
        "<a-obj-model id='" +
        object_id +
        "' class='target-red' target='healthPoints:1; static:false' src=" +
        object_red_obj +
        " mtl=" +
        object_red_mtl +
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
        "' class='ring' src=" +
        marker_red_obj +
        " mtl=" +
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
      var x = Math.floor(Math.random() * 20 - 15);
      var y = Math.floor(Math.random() * 8 + 1);
      document.getElementById("scena").innerHTML +=
        "<a-obj-model id='" +
        object_id +
        "' class='target-green' target='healthPoints:1; static:false' src=" +
        object_green_obj +
        " mtl=" +
        object_green_mtl +
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
        "' class='ring' src=" +
        marker_green_obj +
        " mtl=" +
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
      var rings_id = 20;
      for (let i = 0; i < targets; i++) {
        if (document.getElementById(k) != null) {
          document
            .getElementById(k)
            .parentNode.removeChild(document.getElementById(k));
        }
        k++;
        document
          .getElementById(rings_id)
          .parentNode.removeChild(document.getElementById(rings_id));
        rings_id++;
      }
    }, time_to_destroy_targets);
  }

  var myvar = setInterval(function() {
    if (counter >= episodes) clearInterval(myvar);
    game();
    delete_target();
    counter++;
    console.log(counter);
  }, episode_duration);

  function game() {
    console.log("score_red " + score_episode_red);
    console.log("score_green " + score_episode_green);
    console.log("episode_red " + red_target);
    console.log("episode_green " + green_target);
    build();
    marker_hide();
  }

  game();
  delete_target();
};
