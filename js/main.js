// Setup hashchange events and link interception.
$(document).on('click', '[href^="#"]', function(e) {
  e.preventDefault();
  $.bbq.pushState($(this).attr('href'), 0);
});

// demo vars
var canvas, context, debugCanvas, debugContext, world;
var birdDelayCounter = 0; // counter for delaying creation of birds

function tick(dt, paused) {
  if (visibly.hidden()) return;

  world.update();
  stage.update();

  birdDelayCounter++;
  if (birdDelayCounter % 10 === 0) {  // delay so it doesn't spawn a bird on every frame
    birdDelayCounter = 0;
    world.makeBird(stage);
  }
}

$(function() {
  $('#debug').on('click', function() { $('#debug-canvas').toggle(); });

  canvas = document.getElementById('demo-canvas');
  debugCanvas = document.getElementById('debug-canvas');
  context = canvas.getContext('2d');
  debugContext = debugCanvas.getContext('2d');
  window.stage = new createjs.Stage(canvas);
  window.stage.snapPixelsEnabled = true;

  world = new BirdWorld(null, debugContext);

  visibly.visibilitychange(function(state) {
    world.toggle(state === 'visible');
  });

  createjs.Ticker.setFPS(30);
  createjs.Ticker.useRAF = true;
  createjs.Ticker.addListener(tick);
});
