// Setup hashchange events and link interception.
$(document).on('click', '[href^="#"]', function(e) {
  e.preventDefault();
  $.bbq.pushState($(this).attr('href'), 0);
});

// demo vars
var canvas, context, debugCanvas, debugContext;
var birdDelayCounter = 0; // counter for delaying creation of birds
var box2d = new Box2d();

$('#debug').on('click', function() { $('#debug-canvas').toggle(); });

function tick(dt, paused) {
  box2d.update();
  stage.update();

  birdDelayCounter++;
  if (birdDelayCounter % 10 === 0) {  // delay so it doesn't spawn a bird on every frame
    birdDelayCounter = 0;
    var birds = new Birds();
    birds.spawn();
  }
}

$(function() {
  canvas = document.getElementById('demo-canvas');
  debugCanvas = document.getElementById('debug-canvas');
  context = canvas.getContext('2d');
  debugContext = debugCanvas.getContext('2d');
  window.stage = new createjs.Stage(canvas);
  window.stage.snapPixelsEnabled = true;

  createjs.Ticker.setFPS(30);
  createjs.Ticker.useRAF = true;
  createjs.Ticker.addListener(tick);

  box2d.setup(debugContext);

  visibly.visibilitychange(function(state) {
    console.log('The current visibility state is:' + state);
  });
});
