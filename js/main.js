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
  if (birdDelayCounter % 30 === 0) {  // delay so it doesn't spawn a bird on every frame
    birdDelayCounter = 0;
    world.makeBird(stage);
  }
}

function playNote(note) {
  var adsr = T('adsr', 150);
  var synth = T('*', adsr, T('tri', note));

  var timer = T('timeout', 150, function() {
    synth.pause().off();
  });
  adsr.onD = function() { this.table = '~32db'; };
  synth.onplay = function() {
    adsr.bang();
    timer.on();
  };
  synth.play();
}

var semitone = Math.pow(2, 1/12);
function wallTouch(x, y) {
  x = (12*x) | 0; y = (6*y | 0) - 2;
  var steps = y*12 + x;
  var freq = 440*Math.pow(semitone, steps);
  playNote(freq);
}

$(function() {
  $('#debug').on('click', function() { $('#debug-canvas').toggle(); });

  Msg.sub('wall-touch', wallTouch);

  canvas = document.getElementById('demo-canvas');
  debugCanvas = document.getElementById('debug-canvas');
  context = canvas.getContext('2d');
  debugContext = debugCanvas.getContext('2d');
  window.stage = new createjs.Stage(canvas);
  window.stage.snapPixelsEnabled = true;
  createBgGrid(window.stage, 12, 6);

  world = new BirdWorld(false, debugContext);

  visibly.visibilitychange(function(state) {
    world.toggle(state === 'visible');
  });

  createjs.Ticker.setFPS(30);
  createjs.Ticker.useRAF = true;
  createjs.Ticker.addListener(tick);
});
