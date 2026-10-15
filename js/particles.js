window.BR = window.BR || {};

BR.Particles = (function () {
  var CAP = BR.CONFIG.PARTICLE_CAP;
  var pool = [];
  var active = 0;
  var reduced = false;

  for (var i = 0; i < CAP; i++) {
    pool.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', grav: 0, kind: 'dot', rot: 0 });
  }

  function spawn(x, y, vx, vy, life, size, color, grav, kind) {
    if (reduced && active > CAP * 0.35) return;
    for (var i = 0; i < CAP; i++) {
      var p = pool[(i + active) % CAP];
      if (!p.alive) {
        p.alive = true;
        p.x = x; p.y = y; p.vx = vx; p.vy = vy;
        p.life = life; p.maxLife = life;
        p.size = size; p.color = color;
        p.grav = grav || 0;
        p.kind = kind || 'dot';
        p.rot = Math.random() * Math.PI * 2;
        active++;
        return p;
      }
    }
    return null;
  }

  function burst(x, y, color, count, speed, life, size, grav) {
    count = reduced ? Math.ceil(count / 3) : count;
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = speed * (0.4 + Math.random() * 0.6);
      spawn(x, y, Math.cos(a) * s, Math.sin(a) * s,
        life * (0.6 + Math.random() * 0.4), size * (0.6 + Math.random() * 0.6), color, grav || 0);
    }
  }

  // Speed trail — particles left behind the player when running fast.
  function trail(x, y, color) {
    if (reduced) return;
    var p = spawn(x, y, -50 - Math.random() * 80, -10 + Math.random() * 20,
                  0.35, 4 + Math.random() * 3, color, 0, 'trail');
    if (p) p.rot = Math.random() * Math.PI * 2;
  }

  function update(dt) {
    for (var i = 0; i < CAP; i++) {
      var p = pool[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; active--; continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += dt * 4;
    }
  }

  function draw(ctx) {
    for (var i = 0; i < CAP; i++) {
      var p = pool[i];
      if (!p.alive) continue;
      var t = p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, Math.min(1, t));
      ctx.fillStyle = p.color;
      if (p.kind === 'spark') {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 0.5);
      } else if (p.kind === 'trail') {
        // Trail particles are squares that shrink and fade.
        var s = p.size * t;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      } else if (p.kind === 'square') {
        var sq = p.size * t;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-sq / 2, -sq / 2, sq, sq);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function clear() {
    for (var i = 0; i < CAP; i++) pool[i].alive = false;
    active = 0;
  }

  return {
    spawn: spawn, burst: burst, trail: trail, update: update, draw: draw, clear: clear,
    setReduced: function (v) { reduced = v; },
    count: function () { return active; }
  };
})();
