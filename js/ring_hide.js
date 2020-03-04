var ring = document.getElementsByClassName("ring");
function initialSetup() {
  if (document.getElementsByClassName("ring") != null) {
    setTimeout(function () {
      for (let i = 0; i < ring.length; i++)
        ring[i].setAttribute("visible", false);
    }, 2500);
  }
}

AFRAME.registerComponent('cursor-listener', {
  init: function () {
    var ent = this.el;
    console.log(el);
    this.el.addEventListener('mouseenter', function (evt) {
      this.setAttribute('visible', true);
      console.log('I was clicked at: ', evt.detail.intersection.point);
    });
    this.el.addEventListener('mouseleave', function (evt) {
      this.setAttribute('visible', false);
      console.log('I was clicked at: ', evt.detail.intersection.point);
    });
  }
});


