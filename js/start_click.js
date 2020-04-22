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
      document
        .querySelector("#text3")
        .parentNode.removeChild(document.querySelector("#text3"));
      document
        .querySelector("#text4")
        .parentNode.removeChild(document.querySelector("#text4"));
     
      setTimeout(function() {
        document.getElementById("scena").innerHTML =
          "<a-text id=text5 text=value:3  position='-0.5 3 -15' scale='5 5 1' color=white ></a-text>";
      }, 1000);
      setTimeout(function() {
        document.getElementById("scena").innerHTML =
          "<a-text id=text5 text=value:2  position='-0.5 3 -15' scale='6 6 1' color=white ></a-text>";
      }, 2000);
      setTimeout(function() {
        document.getElementById("scena").innerHTML =
          "<a-text id=text5 text=value:1  position='-0.5 3 -15' scale='7 7 1' color=white ></a-text>";
      }, 3000);
      setTimeout(function() {
        document
          .querySelector("#text5")
          .parentNode.removeChild(document.querySelector("#text5"));
        start();
      }, 4000);
    });
  }
});
