// Physics & gameplay tests for Bug Runner
// Run with: node test/physics_test.js

global.window = global;
global.performance = { now: () => Date.now() };
global.Image = function () { this.src = ''; };
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

const CFG = BR.CONFIG;
let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log('PASS:', msg); }
  else { fail++; console.log('FAIL:', msg); }
}

// ---------------------------------------------------------------------------
// TEST 1: Jump height is sufficient to clear the tallest obstacle.
// ---------------------------------------------------------------------------
function testJumpClearsObstacles() {
  // Calculate max jump height using v² = u² + 2as (v=0 at apex)
  var h = (CFG.JUMP_VEL * CFG.JUMP_VEL) / (2 * CFG.GRAVITY);
  var tallest = 0;
  for (var i = 0; i < BR.Obstacles.TYPES.length; i++) {
    var t = BR.Obstacles.TYPES[i];
    if (t.h > tallest) tallest = t.h;
  }
  // Jump should clear tallest obstacle by at least 20px margin.
  assert(h > tallest + 20, 'jump height (' + Math.round(h) + 'px) clears tallest obstacle (' + tallest + 'px) + 20px margin');
  console.log('    jump height: ' + Math.round(h) + 'px, tallest obstacle: ' + tallest + 'px');
}

// ---------------------------------------------------------------------------
// TEST 2: Jump total air time is reasonable (0.6s – 1.2s).
// ---------------------------------------------------------------------------
function testJumpAirTime() {
  var tUp = -CFG.JUMP_VEL / CFG.GRAVITY; // time to apex
  var h = (CFG.JUMP_VEL * CFG.JUMP_VEL) / (2 * CFG.GRAVITY);
  // Time to fall back to start: t = sqrt(2h/g)
  var tDown = Math.sqrt(2 * h / CFG.GRAVITY);
  var tTotal = tUp + tDown;
  assert(tTotal >= 0.6 && tTotal <= 1.2, 'jump air time (' + tTotal.toFixed(2) + 's) is between 0.6s and 1.2s');
  console.log('    air time: ' + tTotal.toFixed(3) + 's (up: ' + tUp.toFixed(3) + 's, down: ' + tDown.toFixed(3) + 's)');
}

// ---------------------------------------------------------------------------
// TEST 3: Obstacle spawn gap is at least the distance player travels during one jump.
//        This guarantees a single jump can clear obstacles and land before next.
// ---------------------------------------------------------------------------
function testObstacleGapVsJump() {
  var tUp = -CFG.JUMP_VEL / CFG.GRAVITY;
  var h = (CFG.JUMP_VEL * CFG.JUMP_VEL) / (2 * CFG.GRAVITY);
  var tDown = Math.sqrt(2 * h / CFG.GRAVITY);
  var tTotal = tUp + tDown;
  // Min gap (in seconds) at max speed
  var minGapSec = CFG.SPAWN_MIN;
  var minDistAtMaxSpeed = CFG.MAX_SPEED * minGapSec;
  var jumpDistAtMaxSpeed = CFG.MAX_SPEED * tTotal;
  console.log('    min spawn gap: ' + minGapSec + 's = ' + minDistAtMaxSpeed + 'px at max speed');
  console.log('    jump distance: ' + jumpDistAtMaxSpeed.toFixed(0) + 'px at max speed');
  // Min gap should be at least 1.5x jump distance (so player has buffer to land + react)
  assert(minDistAtMaxSpeed >= jumpDistAtMaxSpeed * 1.3, 'min obstacle gap (' + minDistAtMaxSpeed + 'px) >= 1.3× jump distance (' + jumpDistAtMaxSpeed.toFixed(0) + 'px)');
}

// ---------------------------------------------------------------------------
// TEST 4: Player hitbox is smaller than visual sprite (forgiving).
// ---------------------------------------------------------------------------
function testForgivingHitbox() {
  var p = BR.Player.create();
  var hb = BR.Player.hitbox(p);
  assert(hb.w < p.w, 'hitbox width (' + hb.w + 'px) < sprite width (' + p.w + 'px)');
  assert(hb.h < p.h, 'hitbox height (' + hb.h + 'px) < sprite height (' + p.h + 'px)');
  assert(hb.x > p.x, 'hitbox x (' + hb.x + ') > sprite x (' + p.x + ') — left margin');
  assert(hb.x + hb.w < p.x + p.w, 'hitbox right edge (' + (hb.x + hb.w) + ') < sprite right edge (' + (p.x + p.w) + ') — right margin');
  console.log('    sprite: ' + p.w + 'x' + p.h + ' @ ' + p.x + ', hitbox: ' + hb.w + 'x' + hb.h + ' @ ' + hb.x);
}

// ---------------------------------------------------------------------------
// TEST 5: Obstacle hitbox is inside its bounds.
// ---------------------------------------------------------------------------
function testObstacleHitboxes() {
  for (var i = 0; i < BR.Obstacles.TYPES.length; i++) {
    var t = BR.Obstacles.TYPES[i];
    var b = t.box;
    assert(b.x >= 0 && b.y >= 0, t.id + ' hitbox origin inside bounds');
    assert(b.x + b.w <= t.w, t.id + ' hitbox right (' + (b.x + b.w) + ') <= obstacle w (' + t.w + ')');
    assert(b.y + b.h <= t.h, t.id + ' hitbox bottom (' + (b.y + b.h) + ') <= obstacle h (' + t.h + ')');
    assert(b.w > 0 && b.h > 0, t.id + ' hitbox has positive w/h');
  }
}

// ---------------------------------------------------------------------------
// TEST 6: Player physics simulation — full jump cycle.
// ---------------------------------------------------------------------------
function testJumpCycleSimulation() {
  var p = BR.Player.create();
  var startY = p.y;
  BR.Player.jump(p);
  assert(p.vy === CFG.JUMP_VEL, 'after jump: vy = JUMP_VEL (' + CFG.JUMP_VEL + ')');
  assert(!p.onGround, 'after jump: not on ground');
  assert(p.jumps === 1, 'after jump: jumps = 1');

  // Simulate physics until landing
  var dt = 0.016;
  var maxY = p.y;
  var frames = 0;
  while (!p.onGround && frames < 200) {
    BR.Player.update(p, dt);
    if (p.y < maxY) maxY = p.y;
    frames++;
  }
  assert(p.onGround, 'player returned to ground after jump (frames: ' + frames + ')');
  assert(Math.abs(p.y - startY) < 1, 'player landed at same y as start (delta: ' + Math.abs(p.y - startY) + 'px)');
  var jumpHeight = startY - maxY;
  assert(jumpHeight > 100, 'jump reached at least 100px height (' + jumpHeight.toFixed(0) + 'px)');
  console.log('    jump height reached: ' + jumpHeight.toFixed(0) + 'px over ' + (frames * 0.016).toFixed(2) + 's');
}

// ---------------------------------------------------------------------------
// TEST 7: Double jump gives extra height.
// ---------------------------------------------------------------------------
function testDoubleJump() {
  var p = BR.Player.create();
  var startY = p.y;
  BR.Player.jump(p); // first jump
  // Simulate a few frames
  for (var i = 0; i < 5; i++) BR.Player.update(p, 0.016);
  var yAfterFirstJump = p.y;
  BR.Player.jump(p); // double jump
  assert(p.jumps === 2, 'double jump sets jumps = 2');
  assert(p.vy === CFG.DOUBLE_JUMP_VEL, 'double jump vy = DOUBLE_JUMP_VEL (' + CFG.DOUBLE_JUMP_VEL + ')');
  // Simulate to apex
  var maxY = p.y;
  for (var j = 0; j < 200 && !p.onGround; j++) {
    BR.Player.update(p, 0.016);
    if (p.y < maxY) maxY = p.y;
  }
  var totalHeight = startY - maxY;
  console.log('    total height after double jump: ' + totalHeight.toFixed(0) + 'px');
  assert(totalHeight > 150, 'double jump reaches at least 150px total height');
}

// ---------------------------------------------------------------------------
// TEST 8: Player can't triple jump.
// ---------------------------------------------------------------------------
function testNoTripleJump() {
  var p = BR.Player.create();
  BR.Player.jump(p); // single
  BR.Player.jump(p); // double
  var r = BR.Player.jump(p); // should fail
  assert(r === false, 'third jump attempt returns false');
}

// ---------------------------------------------------------------------------
// TEST 9: Iframes prevent consecutive damage.
// ---------------------------------------------------------------------------
function testIframes() {
  var p = BR.Player.create();
  var startHp = p.hp;
  var r1 = BR.Player.hurt(p);
  assert(r1 === 'hit', 'first hurt = hit');
  assert(p.hp === startHp - 1, 'hp reduced to ' + p.hp);
  assert(p.iframe > 0, 'iframe active after hurt');
  var r2 = BR.Player.hurt(p);
  assert(r2 === false, 'second hurt during iframe = false');
  assert(p.hp === startHp - 1, 'hp unchanged during iframe');
}

// ---------------------------------------------------------------------------
// TEST 10: Three hits kill the player.
// ---------------------------------------------------------------------------
function testThreeHitsKill() {
  var p = BR.Player.create();
  BR.Player.hurt(p);
  p.iframe = 0;
  BR.Player.hurt(p);
  p.iframe = 0;
  var r = BR.Player.hurt(p);
  assert(r === 'dead', 'third hit = dead');
  assert(!p.alive, 'player not alive after death');
}

// ---------------------------------------------------------------------------
// TEST 11: Difficulty progression — obstacles unlock at increasing distances.
// ---------------------------------------------------------------------------
function testDifficultyProgression() {
  var prevUnlock = -1;
  for (var i = 0; i < BR.Obstacles.TYPES.length; i++) {
    var t = BR.Obstacles.TYPES[i];
    assert(t.unlock >= prevUnlock, t.id + ' unlock (' + t.unlock + ') >= previous (' + prevUnlock + ')');
    prevUnlock = t.unlock;
  }
}

// ---------------------------------------------------------------------------
// TEST 12: All obstacle IDs are unique.
// ---------------------------------------------------------------------------
function testUniqueIds() {
  var ids = {};
  for (var i = 0; i < BR.Obstacles.TYPES.length; i++) {
    var id = BR.Obstacles.TYPES[i].id;
    assert(!ids[id], 'obstacle id "' + id + '" is unique');
    ids[id] = true;
  }
}

// ---------------------------------------------------------------------------
// TEST 13: Speed ramp is gradual (not too fast).
// ---------------------------------------------------------------------------
function testSpeedRampGradual() {
  var timeToMax = (CFG.MAX_SPEED - CFG.BASE_SPEED) / CFG.SPEED_RAMP;
  console.log('    time to reach max speed: ' + timeToMax.toFixed(1) + 's');
  assert(timeToMax >= 30, 'reaches max speed in at least 30s (' + timeToMax.toFixed(1) + 's) — gentle ramp');
  assert(timeToMax <= 120, 'reaches max speed within 120s (' + timeToMax.toFixed(1) + 's) — not too slow');
}

// ---------------------------------------------------------------------------
// TEST 14: Player state transitions are correct.
// ---------------------------------------------------------------------------
function testStateTransitions() {
  var p = BR.Player.create();
  assert(p.state === 'run', 'initial state = run');
  BR.Player.jump(p);
  // Simulate until fall state
  var fellAt = -1;
  for (var i = 0; i < 200 && !p.onGround; i++) {
    BR.Player.update(p, 0.016);
    if (p.state === 'fall' && fellAt < 0) fellAt = i;
  }
  assert(fellAt > 0, 'state transitions to "fall" during descent (frame ' + fellAt + ')');
  assert(p.state === 'run', 'state returns to "run" after landing');
}

// ---------------------------------------------------------------------------
// Run all tests
// ---------------------------------------------------------------------------
console.log('\n=== BUG RUNNER PHYSICS & GAMEPLAY TESTS ===\n');
testJumpClearsObstacles();
testJumpAirTime();
testObstacleGapVsJump();
testForgivingHitbox();
testObstacleHitboxes();
testJumpCycleSimulation();
testDoubleJump();
testNoTripleJump();
testIframes();
testThreeHitsKill();
testDifficultyProgression();
testUniqueIds();
testSpeedRampGradual();
testStateTransitions();

console.log('\n=== RESULTS: ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail > 0 ? 1 : 0);
