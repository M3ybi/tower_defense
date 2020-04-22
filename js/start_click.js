AFRAME.registerComponent("cursor-listener", {
  init: function() {
    this.el.addEventListener("click", function(evt) {
      console.log("I was clicked at:");
      start();
    });
  }
});
