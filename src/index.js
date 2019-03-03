import initWebScene from './PoolScene'

document.body.style.margin = "0";

const playButton = document.getElementById("playButton");

playButton.addEventListener('click', (event) => {
  const audio = event.target.children[0];
  if (audio.paused) {
    audio.play();
    event.target.classList.add("playing");
  } else {
    audio.pause();
    event.target.classList.remove("playing");
  }
})

initWebScene();
