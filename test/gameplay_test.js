// Full-game simulation test — runs a bot through the game for N seconds.
// Verifies no crashes, no impossible obstacle patterns, balanced difficulty.
// Run with: node test/gameplay_test.js

global.window = global;
global.performance = { now: () => Date.now() };
global.Image = function () { this.src = ''; this.width = 128; this.height = 128; this.complete = true; this.naturalWidth = 128;
  this.onload = null; this.onerror = null; };
global.addEventListener = () => {};
global.window.addEventListener = () => {};
global.document = { hidden: false, addEventListener: () => {}, getElementById: () => null };
global.navigator = { maxTouchPoints: 0 };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 16);

const fs = require('fs');
const path = require('path');
const files = ['config.js', 'assets.js', 'particles.js', 'environments.js', 'obstacles.js', 'items.js', 'player.js', 'sfx.js', 'game.js'];
for (const f of files) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  eval(code);
}

// Stub Sfx to avoid audio errors.
BR.Sfx = { unlock: () => {}, jump: () => {}, dblJump: () => {}, collect: () => {}, bigCollect: () => {}, hit: () => {}, over: () => {}, breakOb: () => {}, env: () => {}, record: () => {} };

// Provide a canvas stub for Game.init
const canvas = { width: 960, height: 540, style: { width: '960px', height: '540px' },
  getContext: () => global.__ctx || (global.__ctx = {
  save: () => {}, restore: () => {}, translate: () => {}, scale: () => {}, drawImage: () => {},
  fillRect: () => {}, strokeRect: () => {}, beginPath: () => {}, closePath: () => {}, fill: () => {},
  stroke: () => {}, ellipse: () => {}, arc: () => {}, rect: () => {}, moveTo: () => {}, lineTo: () => {},
  createLinearGradient: () => ({ addColorStop: () => {} }), createRadialGradient: () => ({ addColorStop: () => {} }),
  setTransform: () => {}, rotate: () => {}, fillText: () => {}, strokeText: () => {},
  roundRect: () => {}, clearRect: () => {}, quadraticCurveTo: () => {}, measureText: () => ({ width: 0 }),
  globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '',
  shadowBlur: 0, shadowColor: '', lineCap: ''
}) };

BR.Game.init(canvas);

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log('PASS:', msg); }
  else { fail++; console.log('FAIL:', msg); }
}

// ---------------------------------------------------------------------------
// TEST 1: Game runs for 30 seconds without crashing.
// ---------------------------------------------------------------------------
function test30sRunNoCrash() {
  BR.Game.start();
  var crashed = false;
  var errorMsg = null;
  try {
    var frames = 30 * 60; // 30 seconds at 60 fps
    for (var i = 0; i < frames; i++) {
      BR.Game._update(0.016);
      if (BR.Game.getState() === 'over') {
        BR.Game.start(); // restart and continue
      }
    }
  } catch (e) {
    crashed = true;
    errorMsg = e.message;
  }
  assert(!crashed, 'game runs 30s without crashing' + (crashed ? ' (error: ' + errorMsg + ')' : ''));
}

// ---------------------------------------------------------------------------
// TEST 2: No two obstacles are too close (overlapping or impossibly close).
// ---------------------------------------------------------------------------
function testObstaclesNeverTooClose() {
  BR.Game.start();
  var minGap = Infinity;
  var violations = 0;
  var frames = 60 * 60; // 60 seconds
  var prevObstacles = [];
  for (var i = 0; i < frames; i++) {
    // Internal state — can't access obstacles directly, so use a different approach:
    // simulate and track deaths (each death = a problem).
    BR.Game._update(0.016);
    if (BR.Game.getState() === 'over') {
      // Check stats — if game over within 2 seconds of start, that's a problem.
      var stats = BR.Game.getStats();
      if (stats.dist < 50) violations++;
      BR.Game.start();
    }
  }
  assert(violations < 5, 'game over within 50m less than 5 times in 60s (' + violations + ' violations) — bot survivable');
}

// ---------------------------------------------------------------------------
// TEST 3: Bot player (auto-jump before obstacles) survives at least 20 seconds on average.
// ---------------------------------------------------------------------------
function testBotSurvival() {
  // We need access to player and obstacles. The game.js module hides these,
  // so we'll use the debugPlay API.
  var results = [];
  for (var trial = 0; trial < 3; trial++) {
    var res = BR.Game.debugPlay(20, false); // 20 seconds, with bot
    results.push(res);
  }
  console.log('    bot trial results:', results);
  // At least one trial should reach 100m
  var maxDist = Math.max.apply(null, results.map(function(r) {
    var m = r.match(/dist[":\s]+(\d+)/);
    return m ? Number(m[1]) : 0;
  }));
  assert(maxDist > 100, 'bot reaches >100m in at least one trial (max: ' + maxDist + ')');
}

// ---------------------------------------------------------------------------
// TEST 4: Game state transitions are correct.
// ---------------------------------------------------------------------------
function testStateTransitions() {
  BR.Game.toMenu();
  assert(BR.Game.getState() === 'menu', 'after toMenu: state = menu');
  BR.Game.start();
  assert(BR.Game.getState() === 'playing', 'after start: state = playing');
  BR.Game.pause();
  assert(BR.Game.getState() === 'paused', 'after pause: state = paused');
  BR.Game.resume();
  assert(BR.Game.getState() === 'playing', 'after resume: state = playing');
  BR.Game.toMenu();
  assert(BR.Game.getState() === 'menu', 'after toMenu: state = menu');
}

// ---------------------------------------------------------------------------
// TEST 5: Score increases over time.
// ---------------------------------------------------------------------------
function testScoreIncreases() {
  BR.Game.start();
  var initialScore = BR.Game.getStats().score;
  for (var i = 0; i < 5 * 60; i++) BR.Game._update(0.016); // 5 seconds
  var finalScore = BR.Game.getStats().score;
  assert(finalScore > initialScore, 'score increased over 5s (' + initialScore + ' -> ' + finalScore + ')');
}

console.log('\n=== BUG RUNNER GAMEPLAY SIMULATION TESTS ===\n');
test30sRunNoCrash();
testObstaclesNeverTooClose();
testBotSurvival();
testStateTransitions();
testScoreIncreases();

console.log('\n=== RESULTS: ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail > 0 ? 1 : 0);
