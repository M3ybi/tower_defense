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
    console.log(object);
    el.addEventListener("die", () => {
      
      if (this.el.parentNode) {
        el.parentNode.removeChild(el);
        if (object.className == "target-green") {
          score_episode_green++;
        }
        if (object.className == "target-red") {
          score_episode_red++;
        }
      }
    });
  }
});