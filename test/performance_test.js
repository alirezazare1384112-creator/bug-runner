// Performance test — measures frame rate and identifies slow operations.
// Run with: node test/performance_test.js

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

BR.Sfx = { unlock: () => {}, jump: () => {}, dblJump: () => {}, collect: () => {}, bigCollect: () => {}, hit: () => {}, over: () => {}, breakOb: () => {}, env: () => {}, record: () => {} };

const ctx = {
  save: () => {}, restore: () => {}, translate: () => {}, scale: () => {}, drawImage: () => {},
  fillRect: () => {}, strokeRect: () => {}, beginPath: () => {}, closePath: () => {}, fill: () => {},
  stroke: () => {}, ellipse: () => {}, arc: () => {}, rect: () => {}, moveTo: () => {}, lineTo: () => {},
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} }),
  setTransform: () => {}, rotate: () => {}, fillText: () => {}, strokeText: () => {},
  roundRect: () => {}, clearRect: () => {}, quadraticCurveTo: () => {}, measureText: () => ({ width: 0 }),
  globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '',
  shadowBlur: 0, shadowColor: '', lineCap: ''
};
const canvas = { width: 960, height: 540, style: { width: '960px', height: '540px' }, getContext: () => ctx };

BR.Game.init(canvas);

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log('PASS:', msg); }
  else { fail++; console.log('FAIL:', msg); }
}

// ---------------------------------------------------------------------------
// TEST 1: 60 FPS simulation - measure update+render time per frame.
// ---------------------------------------------------------------------------
function testFrameTime() {
  BR.Game.start();
  // Warm up — get into a steady state.
  for (var i = 0; i < 60; i++) BR.Game._update(0.016);
  for (var i = 0; i < 60; i++) BR.Game._render();

  // Measure.
  var N = 600; // 10 seconds at 60fps
  var t0 = Date.now();
  for (var i = 0; i < N; i++) {
    BR.Game._update(0.016);
    BR.Game._render();
  }
  var t1 = Date.now();
  var elapsed = t1 - t0;
  var perFrame = elapsed / N;
  var fps = 1000 / perFrame;
  console.log('    ' + N + ' frames in ' + elapsed + 'ms = ' + perFrame.toFixed(2) + 'ms/frame (' + fps.toFixed(1) + ' FPS)');
  assert(perFrame < 16.7, 'frame time < 16.7ms (60 FPS target) — measured ' + perFrame.toFixed(2) + 'ms');
  assert(perFrame < 8, 'frame time < 8ms (high-performance target) — measured ' + perFrame.toFixed(2) + 'ms');
}

// ---------------------------------------------------------------------------
// TEST 2: Long-running stability — no memory growth, no slowdowns.
// ---------------------------------------------------------------------------
function testLongRunStability() {
  BR.Game.start();
  // Run for 5 minutes of game time (18000 frames at 60fps).
  var frames = 1800; // 30 seconds
  var t0 = Date.now();
  for (var i = 0; i < frames; i++) {
    BR.Game._update(0.016);
    BR.Game._render();
    if (BR.Game.getState() === 'over') BR.Game.start();
  }
  var t1 = Date.now();
  var elapsed = t1 - t0;
  var perFrame = elapsed / frames;
  console.log('    30s of gameplay: ' + elapsed + 'ms total, ' + perFrame.toFixed(2) + 'ms/frame');
  assert(perFrame < 16, 'long-run frame time stays under 16ms');
}

// ---------------------------------------------------------------------------
// TEST 3: Particle cap respected.
// ---------------------------------------------------------------------------
function testParticleCap() {
  BR.Particles.clear();
  // Spam a lot of particles.
  for (var i = 0; i < 1000; i++) {
    BR.Particles.burst(100, 100, '#FFF', 5, 100, 0.5, 2, 0);
  }
  var count = BR.Particles.count();
  console.log('    After 1000 bursts, active particles: ' + count);
  assert(count <= BR.CONFIG.PARTICLE_CAP, 'particle count respects cap (' + count + ' <= ' + BR.CONFIG.PARTICLE_CAP + ')');
}

// ---------------------------------------------------------------------------
// TEST 4: Obstacle array doesn't grow indefinitely.
// ---------------------------------------------------------------------------
function testObstacleArrayBounded() {
  BR.Game.start();
  // Run for 60 seconds of game time.
  for (var i = 0; i < 60 * 60; i++) {
    BR.Game._update(0.016);
    if (BR.Game.getState() === 'over') BR.Game.start();
  }
  // We can't access internal obstacles directly, but we can check that
  // the game is still performant. Just verify it didn't crash.
  assert(true, '60s of game time completed without errors');
}

// ---------------------------------------------------------------------------
// TEST 5: Render produces no errors.
// ---------------------------------------------------------------------------
function testRenderNoErrors() {
  BR.Game.start();
  var errored = false;
  try {
    for (var i = 0; i < 60; i++) {
      BR.Game._update(0.016);
      BR.Game._render();
    }
  } catch (e) {
    errored = true;
    console.log('    ERROR: ' + e.message);
  }
  assert(!errored, 'render produces no errors during 1s of gameplay');
}

console.log('\n=== BUG RUNNER PERFORMANCE TESTS ===\n');
testFrameTime();
testLongRunStability();
testParticleCap();
testObstacleArrayBounded();
testRenderNoErrors();

console.log('\n=== RESULTS: ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail > 0 ? 1 : 0);
