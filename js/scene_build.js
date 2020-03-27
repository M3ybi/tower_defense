document.querySelector("#model").addEventListener("model-loaded", function() {
  console.log("...............");
});
let score_episode_red = 0;
let score_episode_green = 0;
let marker_hide_timer = 2000;
let targets = 5; //default
let counter = 0; //default
let target_number = 2; //default
let episodes = 26; //default
let episode_duration = 10000; //default
let time_to_destroy_targets = 8000; //default
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

function load_setup() {
  if (current_level === "1") {
    targets = 2;
    target_number = 1;
    episodes = 26;
    time_to_destroy_targets = 18000;
    episode_duration = 19000;
    marker_hide_timer = 3000;
  }
  //next levels
}
console.log(window.localStorage.getItem("level"));

window.onload = function() {
  load_setup();

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
        "' animation='property: object3D.position.z; to: 2; dir: alternate; dur: 8000; loop: false'></a-obj-model>" +
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
        "' animation='property: object3D.position.z; to: 2; dir: alternate; dur: 8000; loop: false'>" +
        "</a-obj-model>";
      t++;
      object_id++;
      ring_id++;
    }

    console.log(targets - t);
    for (let i = 0; i < targets - target_number; i++) {
      console.log("objekt netrafam");
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
        "' animation='property: object3D.position.z; to: 2; dir: alternate; dur: 8000; loop: false'></a-obj-model>" +
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
        "' animation='property: object3D.position.z; to: 2; dir: alternate; dur: 8000; loop: false'>" +
        "</a-obj-model>";
      object_id++;
      ring_id++;
    }
  }

  function delete_target() {
    setTimeout(function() {
      var k = 0;
      var rings_id = 20;
      for (let i = 0; i < targets; i++) {
        if (document.getElementById(k) != null) {
          console.log(document.getElementById(k));
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
    console.log("" + score_episode_red);
    
    build();
    marker_hide();
  }

  game();
  delete_target();
};

AFRAME.registerComponent("click-to-shoot", {
  init: function() {
    document.body.addEventListener("mousedown", () => {
      this.el.emit("shoot");
    });
  }
});

/**
 * Change color when hit.
 */
AFRAME.registerComponent("hit-handler", {
  schema: {
    id: { type: "string" }
  },

  init: function() {
    var el = this.el;
    var element = this.data;
    var object = document.getElementById(el.id);
    el.addEventListener("die", () => {
      if (object.className == "target-red") {
        score_episode_red++;
      }
      if (object.className == "target-green") {
        score_episode_green++;
      }
      el.parentNode.removeChild(el);
    });

    // el.addEventListener('die', () => {
    //     object.parentNode.removeChild(object);
    // });
  }
});
