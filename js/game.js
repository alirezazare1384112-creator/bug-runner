window.BR = window.BR || {};

BR.Game = (function () {
  var CFG = BR.CONFIG;
  var canvas, ctx;
  var state = 'menu';
  var player;
  var speed = 0, distance = 0, score = 0, bits = 0;
  var scrollX = 0;
  var obstacles = [], items = [];
  var spawnTimer, itemTimer, xpTimer;
  var envIndex = 0, envPrev = -1, envFade = 0;
  var time = 0, lastTs;
  var rafId = null;
  var shake = 0, flashColor = null, flashAlpha = 0;
  var speedLines = [];
  var godMode = false;
  var reducedFx = false;
  var onStateChange = null;

  function init(cv) {
    canvas = cv;
    ctx = canvas.getContext('2d');
    BR.Player.init();
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && state === 'playing') pause();
    });
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr * w / CFG.W, dpr * h / CFG.H);
    var sx = w / CFG.W, sy = h / CFG.H;
    var s = Math.max(sx, sy);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, (w * dpr - CFG.W * s * dpr) / 2, (h * dpr - CFG.H * s * dpr) / 2);
  }

  function reset() {
    player = BR.Player.create();
    speed = CFG.BASE_SPEED;
    distance = 0;
    score = 0;
    bits = 0;
    scrollX = 0;
    obstacles = [];
    items = [];
    spawnTimer = 1.6;
    itemTimer = CFG.ITEM_SPAWN_EVERY;
    xpTimer = CFG.XP_SPAWN_EVERY;
    envIndex = 0;
    envPrev = -1;
    envFade = 0;
    time = 0;
    shake = 0;
    flashColor = null;
    flashAlpha = 0;
    speedLines = [];
    BR.Particles.clear();
  }

  function start() {
    reset();
    state = 'playing';
    lastTs = 0;
    if (onStateChange) onStateChange(state);
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  function pause() {
    if (state !== 'playing') return;
    state = 'paused';
    if (onStateChange) onStateChange(state);
  }

  function resume() {
    if (state !== 'paused') return;
    state = 'playing';
    lastTs = 0;
    if (onStateChange) onStateChange(state);
  }

  function toMenu() {
    state = 'menu';
    if (onStateChange) onStateChange(state);
  }

  function jump() {
    if (state !== 'playing') return;
    var r = BR.Player.jump(player);
    if (r === 'single') {
      BR.Sfx.jump();
      BR.Particles.burst(player.x + player.w / 2, player.y + player.h, 'rgba(66,232,224,0.8)', 6, 140, 0.35, 2.5, 500);
    } else if (r === 'double') {
      BR.Sfx.dblJump();
      BR.Particles.burst(player.x + player.w / 2, player.y + player.h, 'rgba(152,101,255,0.9)', 10, 170, 0.4, 3, 200);
    }
  }

  function update(dt) {
    time += dt;
    speed = Math.min(CFG.MAX_SPEED, speed + CFG.SPEED_RAMP * dt);
    var dx = speed * dt;
    scrollX += dx;
    distance += dx / 10;
    score = Math.floor(distance) + bits * 10;

    var newEnv = Math.floor(distance / CFG.ENV_CHANGE_DIST) % BR.Environments.count();
    if (newEnv !== envIndex) {
      envPrev = envIndex;
      envIndex = newEnv;
      envFade = CFG.ENV_FADE_TIME;
      BR.Sfx.env();
      flashColor = BR.Environments.get(envIndex).accent;
      flashAlpha = 0.22;
    }
    if (envFade > 0) envFade = Math.max(0, envFade - dt);
    if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - dt * 0.8);
    if (shake > 0) shake = Math.max(0, shake - dt * 3);

    BR.Player.update(player, dt);
    if (!player.alive) { gameOver(); return; }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      if (spawnObstacle()) {
        var gap = Math.max(CFG.SPAWN_MIN, CFG.SPAWN_START - distance * CFG.SPAWN_DECAY);
        spawnTimer = gap * (0.85 + Math.random() * 0.3) * (CFG.BASE_SPEED / speed);
      } else {
        spawnTimer = 0.3;
      }
    }

    itemTimer -= dt;
    if (itemTimer <= 0) {
      if (!obstacleNearSpawn(260)) {
        var arc = BR.Items.makeArc(CFG.W + 60, CFG.GROUND_Y, 3 + Math.floor(Math.random() * 3));
        items = items.concat(arc);
        itemTimer = CFG.ITEM_SPAWN_EVERY * (0.7 + Math.random() * 0.6);
      } else {
        itemTimer = 0.4;
      }
    }

    xpTimer -= dt;
    if (xpTimer <= 0) {
      if (!obstacleNearSpawn(120)) {
        items = items.concat(BR.Items.makeSolo(CFG.W + 80, CFG.GROUND_Y, BR.Items.TYPES.xp));
        xpTimer = CFG.XP_SPAWN_EVERY * (0.8 + Math.random() * 0.5);
      } else {
        xpTimer = 0.5;
      }
    }

    var i;
    for (i = obstacles.length - 1; i >= 0; i--) {
      var o = obstacles[i];
      o.x -= dx;
      o.t += dt;
      if (o.x + o.type.w < -40) { obstacles.splice(i, 1); continue; }
      if (o.breakable && player.alive) {
        var pb = BR.Player.hitbox(pbv());
        var ob = { x: o.x + o.type.box.x, y: o.y + o.type.box.y, w: o.type.box.w, h: o.type.box.h };
        if (aabb(pb, ob) && player.vy > 100) {
          obstacles.splice(i, 1);
          BR.Particles.burst(o.x + o.type.w / 2, o.y + o.type.h / 2, BR.Environments.get(envIndex).accent, 16, 220, 0.5, 3, 500);
          score += 25;
          BR.Sfx.breakOb();
          continue;
        }
      }
    }

    for (i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      it.x -= dx;
      if (it.x + it.type.w < -30) { items.splice(i, 1); continue; }
      var pb2 = BR.Player.hitbox(player);
      var ib = { x: it.x + it.type.box.x, y: it.y + it.type.box.y, w: it.type.box.w, h: it.type.box.h };
      if (aabb(pb2, ib)) {
        items.splice(i, 1);
        bits += it.type.kind === 'bit' ? 1 : it.type.kind === 'byte' ? 5 : 0;
        score += it.type.score;
        var col = it.type.kind === 'xp' ? '#FFD166' : it.type.kind === 'fragment' ? '#FFD166' : it.type.kind === 'byte' ? '#42E8E0' : '#477BFF';
        BR.Particles.burst(it.x + it.type.w / 2, it.y + it.type.h / 2, col, it.type.kind === 'bit' ? 6 : 12, 160, 0.45, 2.5, 0);
        if (it.type.kind === 'xp' || it.type.kind === 'fragment') BR.Sfx.bigCollect(); else BR.Sfx.collect();
        if (it.type.kind === 'xp' && player.hp < CFG.HP) {
          player.hp++;
          BR.Particles.burst(player.x + player.w / 2, player.y, '#FF6B7A', 10, 130, 0.5, 3, -80);
        }
      }
    }

    checkCollisions();
    BR.Particles.update(dt);

    if (speed > CFG.MAX_SPEED * 0.72 && !reducedFx) {
      if (Math.random() < dt * 14) {
        speedLines.push({
          x: CFG.W + 10,
          y: 60 + Math.random() * (CFG.GROUND_Y - 100),
          len: 60 + Math.random() * 90,
          life: 0.5
        });
      }
    }
    for (i = speedLines.length - 1; i >= 0; i--) {
      var sl = speedLines[i];
      sl.x -= speed * 1.6 * dt;
      sl.life -= dt;
      if (sl.life <= 0 || sl.x < -sl.len) speedLines.splice(i, 1);
    }
  }

  function pbv() { return player; }

  function obstacleNearSpawn(span) {
    var limit = CFG.W + span;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o.x < limit && o.x + o.type.w > CFG.W - 40) return true;
    }
    return false;
  }

  function spotFree(x, w) {
    var pad = 70;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (x < o.x + o.type.w + pad && x + w + pad > o.x) return false;
    }
    return true;
  }

  function spawnObstacle() {
    var type = BR.Obstacles.pick(distance);
    var x = CFG.W + 40;
    if (!spotFree(x, type.w)) return false;
    obstacles.push({
      type: type,
      x: x,
      y: CFG.GROUND_Y - type.h,
      t: Math.random() * 5,
      breakable: type.id === 'syntax-bug' || type.id === 'broken-code'
    });
    if (Math.random() < 0.22 && type.h < 60) {
      var t2 = BR.Obstacles.pick(distance);
      var x2 = x + type.w + 170 + Math.random() * 140;
      if (t2 !== type && t2.h <= 56 && spotFree(x2, t2.w)) {
        obstacles.push({
          type: t2, x: x2,
          y: CFG.GROUND_Y - t2.h, t: 0,
          breakable: t2.id === 'syntax-bug' || t2.id === 'broken-code'
        });
      }
    }
    return true;
  }

  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function checkCollisions() {
    if (player.iframe > 0 || !player.alive || godMode) return;
    var pb = BR.Player.hitbox(player);
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      var ob = { x: o.x + o.type.box.x, y: o.y + o.type.box.y, w: o.type.box.w, h: o.type.box.h };
      if (aabb(pb, ob)) {
        var r = BR.Player.hurt(player);
        BR.Particles.burst(player.x + player.w / 2, player.y + player.h / 2, '#FF6B7A', 18, 240, 0.55, 3.2, 400);
        shake = reducedFx ? 0.2 : 0.7;
        flashColor = '#FF6B7A';
        flashAlpha = 0.25;
        BR.Sfx.hit();
        if (r === 'dead') { gameOver(); }
        return;
      }
    }
  }

  function gameOver() {
    if (state === 'over') return;
    state = 'over';
    BR.Particles.burst(player.x + player.w / 2, player.y + player.h / 2, '#FF6B7A', 30, 300, 0.8, 4, 500);
    BR.Sfx.over();
    if (onStateChange) onStateChange(state, {
      score: score,
      dist: Math.floor(distance),
      bits: bits
    });
  }

  function loop(ts) {
    rafId = requestAnimationFrame(loop);
    if (!lastTs) lastTs = ts;
    var dt = Math.min(0.033, (ts - lastTs) / 1000);
    lastTs = ts;

    if (state === 'playing') update(dt);
    else if (state === 'over') {
      BR.Particles.update(dt);
      time += dt;
    } else if (state === 'menu') {
      time += dt;
      scrollX += 90 * dt;
    }

    render();
  }

  function render() {
    var env = BR.Environments.get(envIndex);
    var gy = CFG.GROUND_Y;
    var W = CFG.W, H = CFG.H;

    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake * 10, (Math.random() - 0.5) * shake * 8);
    }

    var skyTop = env.sky[0], skyBot = env.sky[1];
    if (envFade > 0 && envPrev >= 0) {
      var prevEnv = BR.Environments.get(envPrev);
      var k = envFade / CFG.ENV_FADE_TIME;
      drawSkyPair(prevEnv, env, k);
    } else {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, skyTop);
      g.addColorStop(1, skyBot);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    drawLayers(env, 1);

    if (envFade > 0 && envPrev >= 0) {
      var k2 = 1 - envFade / CFG.ENV_FADE_TIME;
      ctx.save();
      ctx.globalAlpha = k2;
      drawLayers(BR.Environments.get(envPrev), 0.4);
      ctx.restore();
    }

    BR.Environments.drawGround(ctx, env, scrollX, W, H, gy);

    var i;
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      it.type.draw(ctx, it.x, it.y, time + it.t0);
    }

    if (player) {
      BR.Player.shadow(player, ctx);
    }

    for (i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      BR.Obstacles.drawSprite(ctx, o.type, o.x, o.y, o.t, BR.Assets.get('ob-' + o.type.id));
    }

    if (player && (state === 'playing' || state === 'paused' || state === 'over')) {
      BR.Player.draw(player, ctx, time);
    } else {
      drawMenuRunner();
    }

    if (speedLines.length) {
      ctx.strokeStyle = 'rgba(234,242,255,0.14)';
      ctx.lineWidth = 2;
      for (i = 0; i < speedLines.length; i++) {
        var sl = speedLines[i];
        ctx.globalAlpha = Math.min(1, sl.life * 2);
        ctx.beginPath();
        ctx.moveTo(sl.x, sl.y);
        ctx.lineTo(sl.x + sl.len, sl.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    BR.Particles.draw(ctx);

    if (flashAlpha > 0 && flashColor) {
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    ctx.restore();
  }

  function drawSkyPair(a, b, k) {
    var g = ctx.createLinearGradient(0, 0, 0, CFG.H);
    g.addColorStop(0, a.sky[0]);
    g.addColorStop(1, a.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CFG.W, CFG.H);
    ctx.globalAlpha = 1 - k;
    var g2 = ctx.createLinearGradient(0, 0, 0, CFG.H);
    g2.addColorStop(0, b.sky[0]);
    g2.addColorStop(1, b.sky[1]);
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, CFG.W, CFG.H);
    ctx.globalAlpha = 1;
  }

  function drawLayers(env, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    for (var li = 0; li < env.layers.length; li++) {
      var layer = env.layers[li];
      layer.draw(ctx, scrollX * layer.speed, CFG.W, CFG.H, CFG.GROUND_Y);
    }
    ctx.restore();
  }

  function drawMenuRunner() {
    var px = 150;
    var py = CFG.GROUND_Y - CFG.PLAYER_H + Math.sin(time * 3) * 4;
    var fake = { x: px, y: py, w: CFG.PLAYER_W, h: CFG.PLAYER_H, onGround: true, vy: 0, alive: true, iframe: 0, squash: 0, state: 'run' };
    BR.Player.shadow(fake, ctx);
    BR.Player.draw(fake, ctx, time);
  }

  function setReduced(v) { reducedFx = v; BR.Particles.setReduced(v); }
  function getState() { return state; }
  function getStats() { return { score: score, dist: Math.floor(distance), bits: bits }; }
  function onChange(fn) { onStateChange = fn; }
  function skipRaf() { if (!rafId) rafId = requestAnimationFrame(loop); }

  function debugPlay(seconds, noBot) {
    if (state !== 'playing') return 'not-playing';
    godMode = !noBot;
    var steps = Math.floor(seconds * 60);
    for (var i = 0; i < steps && state === 'playing'; i++) {
      if (!noBot && player.onGround) {
        for (var j = 0; j < obstacles.length; j++) {
          var o = obstacles[j];
          var gap = o.x - (player.x + player.w);
          if (gap > 0 && gap < 200) { jump(); break; }
        }
      }
      update(1 / 60);
    }
    godMode = false;
    return state + ':' + JSON.stringify(getStats());
  }

  return {
    init: init, start: start, pause: pause, resume: resume, toMenu: toMenu,
    jump: jump, getState: getState, getStats: getStats, onChange: onChange,
    setReduced: setReduced, skipRaf: skipRaf, debugPlay: debugPlay
  };
})();
