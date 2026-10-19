window.BR = window.BR || {};

BR.Game = (function () {
  var CFG = BR.CONFIG;
  var canvas, ctx;
  var state = 'menu';
  var player;
  var speed = 0, distance = 0, score = 0, bits = 0;
  var scrollX = 0;
  var obstacles = [], items = [];
  var spawnTimer, itemTimer, xpTimer, heartTimer;
  var envIndex = 0, envPrev = -1, envFade = 0;
  var time = 0, lastTs;
  var rafId = null;
  var shake = 0, flashColor = null, flashAlpha = 0;
  var speedLines = [];
  var popTexts = []; // floating score/text indicators
  var godMode = false;
  var reducedFx = false;
  var onStateChange = null;
  // Input buffer: if player presses jump slightly before landing, queue it.
  var jumpBuffered = 0; // seconds remaining where buffered jump is valid
  var lastMilestone = 0; // track distance milestones for celebration

  function init(cv) {
    canvas = cv;
    ctx = canvas.getContext('2d');
    BR.Player.init();
    BR.Obstacles.init();
    BR.Items.init();
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
    heartTimer = CFG.HEART_SPAWN_EVERY;
    envIndex = 0;
    envPrev = -1;
    envFade = 0;
    time = 0;
    shake = 0;
    flashColor = null;
    flashAlpha = 0;
    speedLines = [];
    popTexts = [];
    jumpBuffered = 0;
    lastMilestone = 0;
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
      jumpBuffered = 0;
    } else if (r === 'double') {
      BR.Sfx.dblJump();
      BR.Particles.burst(player.x + player.w / 2, player.y + player.h, 'rgba(152,101,255,0.9)', 10, 170, 0.4, 3, 200);
      jumpBuffered = 0;
    } else {
      // Jump input was not consumed (player not in a jumpable state yet,
      // e.g. still falling). Buffer the input for 0.12s so if the player
      // lands shortly after, the jump fires immediately on landing.
      jumpBuffered = 0.12;
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
      // Gentle flash — not a sudden "portal" burst. Reduced from 0.22 to 0.08.
      flashColor = BR.Environments.get(envIndex).accent;
      flashAlpha = 0.08;
    }
    if (envFade > 0) envFade = Math.max(0, envFade - dt);
    if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - dt * 0.5);  // slower fade (was 0.8)
    if (shake > 0) shake = Math.max(0, shake - dt * 3);

    BR.Player.update(player, dt);
    if (!player.alive) { gameOver(); return; }

    // Speed trail — particles trail behind player when going fast.
    if (speed > CFG.BASE_SPEED * 1.3 && !reducedFx) {
      var trailColor = BR.Environments.get(envIndex).accent;
      if (Math.random() < dt * 18) {
        BR.Particles.trail(player.x + 4, player.y + player.h / 2 + (Math.random() - 0.5) * 10, trailColor);
      }
    }

    // Consume buffered jump if player is now on the ground (just landed).
    if (jumpBuffered > 0) {
      jumpBuffered -= dt;
      if (player.onGround && jumpBuffered > 0) {
        var r = BR.Player.jump(player);
        if (r === 'single') {
          BR.Sfx.jump();
          BR.Particles.burst(player.x + player.w / 2, player.y + player.h, 'rgba(66,232,224,0.8)', 6, 140, 0.35, 2.5, 500);
          jumpBuffered = 0;
        } else if (r === 'double') {
          BR.Sfx.dblJump();
          BR.Particles.burst(player.x + player.w / 2, player.y + player.h, 'rgba(152,101,255,0.9)', 10, 170, 0.4, 3, 200);
          jumpBuffered = 0;
        }
      }
      if (jumpBuffered < 0) jumpBuffered = 0;
    }

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

    // Heart spawns — rare healing item. Only spawn if player HP < max.
    heartTimer -= dt;
    if (heartTimer <= 0) {
      if (player.hp < CFG.HP && !obstacleNearSpawn(140)) {
        items = items.concat(BR.Items.makeSolo(CFG.W + 80, CFG.GROUND_Y, BR.Items.TYPES.heart));
        heartTimer = CFG.HEART_SPAWN_EVERY * (0.7 + Math.random() * 0.6);
      } else {
        heartTimer = 2.0; // retry soon if conditions not met
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
          BR.Particles.burst(o.x + o.type.w / 2, o.y + o.type.h / 2, '#FFD166', 6, 180, 0.4, 2.5, 400);
          score += 25;
          addPopText(o.x + o.type.w / 2, o.y, '+25', '#FFD166');
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
        var col = it.type.kind === 'xp' ? '#FFD166' : it.type.kind === 'fragment' ? '#FFD166' : it.type.kind === 'byte' ? '#42E8E0' : it.type.kind === 'heart' ? '#FF6B7A' : '#477BFF';
        BR.Particles.burst(it.x + it.type.w / 2, it.y + it.type.h / 2, col, it.type.kind === 'bit' ? 6 : 14, 160, 0.45, 2.5, 0);
        // Pop text showing the score gained.
        var popText = '+' + it.type.score;
        if (it.type.kind === 'heart') popText = '+HP';
        addPopText(it.x + it.type.w / 2, it.y, popText, col);
        // Big items (xp, heart) get extra juice: flash + shake.
        if (it.type.kind === 'xp' || it.type.kind === 'heart') {
          flashColor = col;
          flashAlpha = 0.12;
          shake = Math.max(shake, 0.15);
        }
        if (it.type.kind === 'xp' || it.type.kind === 'fragment') BR.Sfx.bigCollect();
        else if (it.type.kind === 'heart') BR.Sfx.bigCollect();
        else BR.Sfx.collect();
        // XP core heals +1 HP.
        if (it.type.kind === 'xp' && player.hp < CFG.HP) {
          player.hp++;
          BR.Particles.burst(player.x + player.w / 2, player.y, '#FF6B7A', 10, 130, 0.5, 3, -80);
        }
        // Heart item heals +1 HP (up to max).
        if (it.type.kind === 'heart' && player.hp < CFG.HP) {
          player.hp++;
          // Big healing burst — pink hearts flying up from player.
          BR.Particles.burst(player.x + player.w / 2, player.y, '#FF6B7A', 16, 150, 0.7, 3.5, -120);
          BR.Particles.burst(player.x + player.w / 2, player.y, '#FFB8C5', 8, 100, 0.5, 2.5, -80);
          flashColor = '#FF6B7A';
          flashAlpha = 0.15;
        }
      }
    }

    checkCollisions();
    BR.Particles.update(dt);
    updatePopTexts(dt);

    // Distance milestones — celebrate every 500m.
    var currentMilestone = Math.floor(distance / 500);
    if (currentMilestone > lastMilestone && currentMilestone > 0) {
      lastMilestone = currentMilestone;
      addPopText(CFG.W / 2, CFG.H / 2, currentMilestone * 500 + 'm!', '#42E8E0');
      BR.Particles.burst(player.x + player.w / 2, player.y + player.h / 2, '#42E8E0', 12, 200, 0.6, 3, 0);
      flashColor = '#42E8E0';
      flashAlpha = 0.1;
    }

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

  // Pop text — floating score indicators that rise and fade.
  function addPopText(x, y, text, color) {
    popTexts.push({
      x: x, y: y, text: text, color: color || '#FFD166',
      life: 0.9, maxLife: 0.9, vy: -60
    });
  }

  function updatePopTexts(dt) {
    for (var i = popTexts.length - 1; i >= 0; i--) {
      var p = popTexts[i];
      p.life -= dt;
      p.y += p.vy * dt;
      p.vy += 30 * dt; // slight gravity to slow the rise
      if (p.life <= 0) popTexts.splice(i, 1);
    }
  }

  function drawPopTexts(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < popTexts.length; i++) {
      var p = popTexts[i];
      var t = p.life / p.maxLife;
      ctx.globalAlpha = Math.min(1, t * 1.5);
      ctx.font = 'bold 16px "Segoe UI", Tahoma, sans-serif';
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillText(p.text, p.x, p.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function obstacleNearSpawn(span) {
    var limit = CFG.W + span;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o.x < limit && o.x + o.type.w > CFG.W - 40) return true;
    }
    return false;
  }

  function spotFree(x, w) {
    // Dynamic padding scales with current speed so faster game = wider gaps.
    var pad = Math.max(70, speed * 0.45);
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (x < o.x + o.type.w + pad && x + w + pad > o.x) return false;
    }
    return true;
  }

  function spawnObstacle() {
    var type = BR.Obstacles.pick(distance);
    var x = CFG.W + 60; // spawn slightly off-screen for smoother entry
    if (!spotFree(x, type.w)) return false;
    obstacles.push({
      type: type,
      x: x,
      y: CFG.GROUND_Y - type.h,
      t: Math.random() * 5,
      breakable: type.id === 'syntax-bug' || type.id === 'broken-code'
    });
    // Sometimes spawn a second obstacle, but only if it's far enough away
    // that the player can land from the first jump before needing to jump again.
    // Calculate min spacing based on jump air time (~0.85s) and current speed.
    var jumpDistance = speed * 0.85; // px the player travels during one jump
    var minSecondGap = Math.max(220, jumpDistance + 80);
    if (Math.random() < 0.18 && type.h < 80) {
      var t2 = BR.Obstacles.pick(distance);
      var x2 = x + type.w + minSecondGap + Math.random() * 140;
      // Pick only shorter/simpler obstacles for second slot.
      if (t2 !== type && t2.h <= 100 && spotFree(x2, t2.w)) {
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
    var pRight = pb.x + pb.w;
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (o.x + o.type.w < pb.x - 20 || o.x > pRight + 20) continue;
      var ob = { x: o.x + o.type.box.x, y: o.y + o.type.box.y, w: o.type.box.w, h: o.type.box.h };
      if (aabb(pb, ob)) {
        var r = BR.Player.hurt(player);
        // Knockback: bounce player up. Bigger bounce on death (3rd hit).
        player.vy = (r === 'dead') ? -550 : -350;
        player.onGround = false;
        // Particle burst at hit point.
        BR.Particles.burst(player.x + player.w / 2, player.y + player.h / 2, '#FF6B7A', 18, 240, 0.55, 3.2, 400);
        // Add amber "spark" particles for digital damage effect.
        BR.Particles.burst(player.x + player.w / 2, player.y + player.h / 2, '#FFD166', 6, 180, 0.4, 2.5, 300);
        shake = reducedFx ? 0.2 : 0.7;
        flashColor = '#FF6B7A';
        flashAlpha = 0.3;
        BR.Sfx.hit();
        if (r === 'dead') { gameOver(); }
        return;
      }
    }
  }

  function gameOver() {
    if (state === 'over') return;
    state = 'over';
    // Big death explosion — multi-color burst for dramatic effect.
    BR.Particles.burst(player.x + player.w / 2, player.y + player.h / 2, '#FF6B7A', 30, 300, 0.8, 4, 500);
    BR.Particles.burst(player.x + player.w / 2, player.y + player.h / 2, '#FFD166', 12, 250, 0.6, 3, 600);
    BR.Particles.burst(player.x + player.w / 2, player.y + player.h / 2, '#42E8E0', 8, 200, 0.5, 2.5, 700);
    // Force player to hurt state for the death visual.
    player.state = 'hurt';
    player.tiltTarget = -0.3; // dramatic lean back
    // Big camera shake.
    shake = reducedFx ? 0.3 : 1.0;
    flashColor = '#FF6B7A';
    flashAlpha = 0.4;
    BR.Sfx.over();
    // Delay showing the game over overlay so the death animation
    // (knockback bounce + fade) plays first.
    var stats = { score: score, dist: Math.floor(distance), bits: bits };
    if (onStateChange) {
      setTimeout(function () {
        if (onStateChange) onStateChange('over', stats);
      }, 1200);
    }
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
      // Continue applying physics to player during death so the knockback
      // bounce and fall play out naturally.
      if (player) {
        player.vy += CFG.GRAVITY * dt;
        if (player.vy > CFG.MAX_FALL) player.vy = CFG.MAX_FALL;
        player.y += player.vy * dt;
        var groundTop = CFG.GROUND_Y - player.h;
        if (player.y >= groundTop) {
          player.y = groundTop;
          player.vy = 0;
          player.onGround = true;
        }
        // Lerp tilt and squash for smooth animation.
        player.tilt += (player.tiltTarget - player.tilt) * Math.min(1, dt * 8);
        player.squash += (0 - player.squash) * Math.min(1, dt * 8);
      }
      if (shake > 0) shake = Math.max(0, shake - dt * 2);
      if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - dt * 0.6);
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
      // Use cached gradient from Environments.drawSky
      BR.Environments.drawSky(ctx, skyTop, skyBot, W, H);
    }

    drawLayers(env, 1);

    // Ambient floating particles for atmosphere (depth/parallax feel).
    if (!reducedFx) {
      BR.Environments.drawAmbient(ctx, scrollX, W, H, gy, env.accent);
    }

    if (envFade > 0 && envPrev >= 0) {
      var k2 = 1 - envFade / CFG.ENV_FADE_TIME;
      ctx.save();
      ctx.globalAlpha = k2;
      drawLayers(BR.Environments.get(envPrev), 0.4);
      ctx.restore();
    }

    BR.Environments.drawGround(ctx, env, scrollX, W, H, gy);

    // Ground glow line — a bright neon stripe on the ground edge for energy feel.
    var gradGround = ctx.createLinearGradient(0, gy - 4, 0, gy + 4);
    gradGround.addColorStop(0, 'rgba(0,0,0,0)');
    gradGround.addColorStop(0.5, env.accent);
    gradGround.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = gradGround;
    ctx.fillRect(0, gy - 4, W, 8);
    ctx.globalAlpha = 1;

    var i;
    // Cache sprite references per obstacle/item to avoid hash lookups every frame.
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it._sprite) it._sprite = BR.Assets.get('item-' + it.type.id);
      BR.Items.drawSprite(ctx, it.type, it.x, it.y, time + it.t0, it._sprite);
    }

    if (player) {
      BR.Player.shadow(player, ctx);
    }

    for (i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (!o._sprite) o._sprite = BR.Assets.get('ob-' + o.type.id);
      BR.Obstacles.drawSprite(ctx, o.type, o.x, o.y, o.t, o._sprite);
    }

    if (player && (state === 'playing' || state === 'paused' || state === 'over')) {
      BR.Player.draw(player, ctx, time);
    } else {
      drawMenuRunner();
    }

    if (speedLines.length) {
      ctx.strokeStyle = 'rgba(234,242,255,0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (i = 0; i < speedLines.length; i++) {
        var sl = speedLines[i];
        ctx.globalAlpha = Math.min(1, sl.life * 2);
        ctx.moveTo(sl.x, sl.y);
        ctx.lineTo(sl.x + sl.len, sl.y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    BR.Particles.draw(ctx);

    // Draw pop texts on top of everything.
    drawPopTexts(ctx);

    if (flashAlpha > 0 && flashColor) {
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // Vignette — cached gradient (only created once).
    if (!render._vg) {
      render._vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.85);
      render._vg.addColorStop(0, 'rgba(0,0,0,0)');
      render._vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    }
    ctx.fillStyle = render._vg;
    ctx.fillRect(0, 0, W, H);

    // Speed edge glow — when going fast, add a subtle accent glow on screen edges.
    if (speed > CFG.MAX_SPEED * 0.6 && !reducedFx) {
      var speedIntensity = Math.min(1, (speed - CFG.MAX_SPEED * 0.6) / (CFG.MAX_SPEED * 0.4));
      var accentColor = BR.Environments.get(envIndex).accent;
      // Parse accent color to rgba.
      var edgeAlpha = 0.12 * speedIntensity;
      ctx.fillStyle = accentColor;
      ctx.globalAlpha = edgeAlpha;
      // Top edge gradient
      var topG = ctx.createLinearGradient(0, 0, 0, 60);
      topG.addColorStop(0, accentColor);
      topG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = topG;
      ctx.fillRect(0, 0, W, 60);
      // Bottom edge gradient
      var botG = ctx.createLinearGradient(0, H - 60, 0, H);
      botG.addColorStop(0, 'rgba(0,0,0,0)');
      botG.addColorStop(1, accentColor);
      ctx.fillStyle = botG;
      ctx.fillRect(0, H - 60, W, 60);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawSkyPair(a, b, k) {
    // Cache both gradients per color pair to avoid recreating every frame.
    if (!drawSkyPair._cache) drawSkyPair._cache = {};
    var keyA = a.sky[0] + '|' + a.sky[1];
    var keyB = b.sky[0] + '|' + b.sky[1];
    if (!drawSkyPair._cache[keyA]) {
      var ga = ctx.createLinearGradient(0, 0, 0, CFG.H);
      ga.addColorStop(0, a.sky[0]);
      ga.addColorStop(1, a.sky[1]);
      drawSkyPair._cache[keyA] = ga;
    }
    if (!drawSkyPair._cache[keyB]) {
      var gb = ctx.createLinearGradient(0, 0, 0, CFG.H);
      gb.addColorStop(0, b.sky[0]);
      gb.addColorStop(1, b.sky[1]);
      drawSkyPair._cache[keyB] = gb;
    }
    ctx.fillStyle = drawSkyPair._cache[keyA];
    ctx.fillRect(0, 0, CFG.W, CFG.H);
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = drawSkyPair._cache[keyB];
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
    // Create a fake player with all required fields for proper animation.
    if (!drawMenuRunner._fake) {
      drawMenuRunner._fake = {
        x: px, y: py, w: CFG.PLAYER_W, h: CFG.PLAYER_H,
        onGround: true, vy: 0, alive: true, iframe: 0, squash: 0, squashTarget: 0,
        tilt: 0, tiltTarget: 0, state: 'run', prevState: 'run', stateBlend: 1,
        runFrame: 0, runTimer: 0, jumpPhase: '', hp: CFG.HP, jumps: 0,
        _deathTime: 0
      };
    }
    var fake = drawMenuRunner._fake;
    fake.x = px;
    fake.y = py;
    // Animate run cycle.
    fake.runTimer += 0.016;
    if (fake.runTimer > 0.09) { fake.runTimer = 0; fake.runFrame = (fake.runFrame + 1) % 4; }
    // Subtle breathing squash.
    fake.squashTarget = Math.sin(time * 3) * 0.04;
    fake.squash += (fake.squashTarget - fake.squash) * 0.1;
    fake.tiltTarget = 0.03;
    fake.tilt += (fake.tiltTarget - fake.tilt) * 0.1;
    BR.Player.shadow(fake, ctx);
    BR.Player.draw(fake, ctx, time);
  }

  function setReduced(v) { reducedFx = v; BR.Particles.setReduced(v); }
  function getState() { return state; }
  function getStats() { return { score: score, dist: Math.floor(distance), bits: bits, hp: player ? player.hp : 0 }; }
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

  function releaseJump() {
    if (state !== 'playing') return;
    BR.Player.releaseJump(player);
  }

  return {
    init: init, start: start, pause: pause, resume: resume, toMenu: toMenu,
    jump: jump, releaseJump: releaseJump, getState: getState, getStats: getStats, onChange: onChange,
    setReduced: setReduced, skipRaf: skipRaf, debugPlay: debugPlay,
    // Exposed for testing — not part of public API
    _update: update, _render: render, _reset: reset, _player: function() { return player; }
  };
})();
