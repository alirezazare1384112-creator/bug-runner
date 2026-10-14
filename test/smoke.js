global.window = global;
global.performance = { now: () => Date.now() };
global.Image = function () { this.src = ''; };
global.document = { hidden: false, addEventListener: () => {}, getElementById: () => null };
global.navigator = { maxTouchPoints: 0 };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 16);

const fs = require('fs');
const path = require('path');
const files = ['config.js', 'assets.js', 'particles.js', 'environments.js', 'obstacles.js', 'items.js', 'player.js', 'sfx.js'];
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

assert(BR.Environments.count() === 5, 'five environments defined');
for (let i = 0; i < 5; i++) {
  const env = BR.Environments.get(i);
  assert(env.layers.length >= 3, env.id + ' has >=3 parallax layers');
  assert(typeof env.sky[0] === 'string' && typeof env.ground.edge === 'string', env.id + ' has sky+ground colors');
}

assert(BR.Obstacles.TYPES.length === 7, 'seven obstacle types');
for (const t of BR.Obstacles.TYPES) {
  assert(t.box.x + t.box.w <= t.w && t.box.y + t.box.h <= t.h, t.id + ' hitbox inside bounds');
  assert(typeof t.draw === 'function', t.id + ' has draw');
}
const early = BR.Obstacles.pick(0);
assert(early.unlock === 0, 'early obstacle available at dist 0');
const late = BR.Obstacles.pick(5000);
assert(!!late, 'late obstacle pick works');

for (const k of Object.keys(BR.Items.TYPES)) {
  const t = BR.Items.TYPES[k];
  assert(t.box.x + t.box.w <= t.w, 'item ' + k + ' hitbox inside bounds');
}
const arc = BR.Items.makeArc(100, CFG.GROUND_Y, 5);
assert(arc.length === 5 && arc.every(i => i.y < CFG.GROUND_Y), 'item arc above ground');

for (let i = 0; i < 300; i++) BR.Particles.spawn(Math.random() * 100, 0, 0, 0, 1, 2, '#fff', 0);
assert(BR.Particles.count() <= CFG.PARTICLE_CAP, 'particle cap enforced (' + BR.Particles.count() + ')');
BR.Particles.update(0.5);
assert(BR.Particles.count() < 300, 'expired particles recycled');
BR.Particles.clear();
assert(BR.Particles.count() === 0, 'particles cleared');

const p = BR.Player.create();
assert(p.hp === CFG.HP && p.alive, 'player created full hp');
assert(BR.Player.jump(p) === 'single', 'single jump from ground');
BR.Player.update(p, 0.016);
assert(!p.onGround, 'player airborne after jump');
assert(BR.Player.jump(p) === 'double', 'double jump allowed');
for (let i = 0; i < 200; i++) BR.Player.update(p, 0.016);
assert(p.onGround, 'player lands after gravity');
const hb = BR.Player.hitbox(p);
assert(hb.w < p.w && hb.h < p.h, 'hitbox smaller than sprite');
assert(BR.Player.hurt(p) === 'hit', 'first hurt = hit');
assert(p.iframe > 0, 'iframe active after hurt');
assert(BR.Player.hurt(p) === false, 'iframe protects during invulnerability');
p.iframe = 0;
assert(BR.Player.hurt(p) === 'hit', 'second hurt after iframes');
p.iframe = 0;
assert(BR.Player.hurt(p) === 'dead', 'third hurt = dead');
assert(!p.alive, 'player dead');

const env0 = BR.Environments.get(0);
const env4 = BR.Environments.get(4);
assert(env0.id !== env4.id, 'environments distinct');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
