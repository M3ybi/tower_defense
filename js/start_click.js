AFRAME.registerComponent("cursor-listener", {
  init: function() {
    this.el.addEventListener("click", function(evt) {
      console.log("I was clicked at:");
      document
        .querySelector("#start")
        .parentNode.removeChild(document.querySelector("#start"));
      document
        .querySelector("#text1")
        .parentNode.removeChild(document.querySelector("#text1"));
      document
        .querySelector("#text2")
        .parentNode.removeChild(document.querySelector("#text2"));

      start();
    });
  }
});
