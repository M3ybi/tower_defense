AFRAME.registerComponent("cursor-listener", {
  init: function() {
    this.el.addEventListener("click", onCursorClick);
  }
});

function onCursorClick(evt) {
  console.log("I was clicked at:");

  // Elements to be removed
  const elementsToRemove = ["#start", "#text1", "#text2", "#text3", "#text4"];
  
  // Remove specified elements
  elementsToRemove.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      element.parentNode.removeChild(element);
    }
  });

  // Countdown values and delays
  const countdownValues = [3, 2, 1];
  const delay = 1000;

  // Display countdown
  countdownValues.forEach((value, index) => {
    setTimeout(() => {
      document.getElementById("scena").innerHTML =
        `<a-text font='https://cdn.aframe.io/fonts/Exo2Bold.fnt' id='text5' text='value:${value}' position='-0.5 3 -15' scale='${5 + index} ${5 + index} 1' color='white'></a-text>`;
    }, delay * (index + 1));
  });

  // Remove countdown and start the game
  setTimeout(() => {
    const text5 = document.querySelector("#text5");
    if (text5) {
      text5.parentNode.removeChild(text5);
    }
    start();
  }, delay * (countdownValues.length + 1));
}
