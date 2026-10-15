window.BR = window.BR || {};

BR.Player = (function () {
  var CFG = BR.CONFIG;
  var C = CFG.COLORS;

  var MANIFEST = {
    'byte-idle': 'assets/characters/byte/idle.png',
    'byte-run-0': 'assets/characters/byte/run_0.png',
    'byte-run-1': 'assets/characters/byte/run_1.png',
    'byte-run-2': 'assets/characters/byte/run_2.png',
    'byte-run-3': 'assets/characters/byte/run_3.png',
    'byte-jump': 'assets/characters/byte/jump.png',
    'byte-fall': 'assets/characters/byte/fall.png',
    'byte-hurt': 'assets/characters/byte/hurt.png'
  };

  function init() {
    BR.Assets.loadManifest(MANIFEST);
  }

  function create() {
    return {
      x: 150,
      y: CFG.GROUND_Y - CFG.PLAYER_H,
      w: CFG.PLAYER_W,
      h: CFG.PLAYER_H,
      vy: 0,
      onGround: true,
      jumps: 0,
      hp: CFG.HP,
      iframe: 0,
      alive: true,
      state: 'run',
      prevState: 'run',
      stateBlend: 1, // 0..1, smoothly transitions between prevState and state
      runFrame: 0,
      runTimer: 0,
      squash: 0,
      tilt: 0,
      tiltTarget: 0,
      _deathTime: 0
    };
  }

  function jump(p) {
    if (!p.alive) return false;
    if (p.onGround) {
      // Single jump — apply velocity directly for responsive feel.
      p.vy = CFG.JUMP_VEL;
      p.onGround = false;
      p.jumps = 1;
      p.squash = -0.18; // gentle stretch upward
      return 'single';
    } else if (p.jumps < 2) {
      // Double jump — slightly weaker but refreshes upward velocity.
      p.vy = CFG.DOUBLE_JUMP_VEL;
      p.jumps = 2;
      p.squash = -0.15;
      return 'double';
    }
    return false;
  }

  function update(p, dt) {
    if (!p.alive) return;
    p.vy += CFG.GRAVITY * dt;
    if (p.vy > CFG.MAX_FALL) p.vy = CFG.MAX_FALL;
    p.y += p.vy * dt;

    var groundTop = CFG.GROUND_Y - p.h;
    if (p.y >= groundTop) {
      if (!p.onGround && p.vy > 150) {
        // Landing — gentle squash only if we fell meaningfully.
        p.squash = 0.22;
        BR.Particles.burst(p.x + p.w / 2, CFG.GROUND_Y - 2, 'rgba(234,242,255,0.7)', 5, 90, 0.3, 2, 300);
      }
      p.y = groundTop;
      p.vy = 0;
      p.onGround = true;
      p.jumps = 0;
    }

    if (p.iframe > 0) p.iframe -= dt;
    // Smoothly return squash to 0 (avoid wobble).
    p.squash += (0 - p.squash) * Math.min(1, dt * 8);

    // Animation state machine — faster run cycle when going faster.
    if (p.onGround) {
      // Track state transitions for smooth blending.
      if (p.state !== 'run') { p.prevState = p.state; p.stateBlend = 0; }
      p.state = 'run';
      // Run cycle speed scales with game speed for visual feedback.
      var speedFactor = (window.BR && BR.Game ? BR.Game.getStats().dist : 0);
      var cycleSpeed = Math.max(0.05, 0.09 - speedFactor * 0.000005);
      p.runTimer += dt;
      if (p.runTimer > cycleSpeed) { p.runTimer = 0; p.runFrame = (p.runFrame + 1) % 4; }
      // Dust particles occasionally when running fast.
      if (window.BR && BR.Game && Math.random() < dt * 4 && BR.Game.getState && BR.Game.getState() === 'playing') {
        BR.Particles.burst(p.x + p.w / 2 - 5, CFG.GROUND_Y - 2, 'rgba(180,200,230,0.4)', 1, 60, 0.2, 1, 200);
      }
      // Tilt forward when running.
      p.tiltTarget = 0.05;
    } else {
      // State transition: 'jump' when rising, 'fall' when descending.
      var newState = (p.vy < 80) ? 'jump' : 'fall';
      if (newState !== p.state) { p.prevState = p.state; p.stateBlend = 0; p.state = newState; }
      // Tilt back when jumping, forward when falling.
      p.tiltTarget = (p.state === 'jump') ? -0.04 : 0.08;
    }
    // Smoothly blend tilt and state for fluid transitions.
    p.tilt += (p.tiltTarget - p.tilt) * Math.min(1, dt * 12);
    p.stateBlend = Math.min(1, p.stateBlend + dt * 8);
  }

  function hurt(p) {
    if (p.iframe > 0 || !p.alive) return false;
    p.hp--;
    p.iframe = CFG.IFRAME_TIME;
    p.squash = 0.4;
    if (p.hp <= 0) {
      p.alive = false;
      return 'dead';
    }
    return 'hit';
  }

  function hitbox(p) {
    // Forgiving hitbox: smaller than visual sprite so player can scrape obstacles.
    // Inset 12px left/right and 10px top, 6px bottom (feet stay active for landing).
    return { x: p.x + 12, y: p.y + 10, w: p.w - 24, h: p.h - 16 };
  }

  function draw(p, ctx, time) {
    // If dead, still draw the hurt sprite for the death visual (fading out).
    if (!p.alive) {
      // Fade out over 1 second after death.
      if (!p._deathTime) p._deathTime = time;
      var deathAge = time - p._deathTime;
      if (deathAge > 1.2) return; // fully faded out
      var deathAlpha = Math.max(0, 1 - deathAge / 1.2);
      ctx.save();
      ctx.globalAlpha = deathAlpha;
      var hurtSprite = BR.Assets.get('byte-hurt');
      if (hurtSprite) {
        var cx = p.x + p.w / 2;
        var by = p.y + p.h;
        ctx.translate(cx, by);
        ctx.rotate(p.tilt);
        var sw = hurtSprite.width, sh = hurtSprite.height;
        var sAspect = sw / sh;
        var targetW = p.w + 16, targetH = p.h + 16;
        var tAspect = targetW / targetH;
        var dw, dh;
        if (sAspect > tAspect) { dw = targetW; dh = targetW / sAspect; }
        else { dh = targetH; dw = targetH * sAspect; }
        ctx.drawImage(hurtSprite, -dw / 2, -dh, dw, dh);
      }
      ctx.restore();
      return;
    }
    // Iframe flicker — but make it less aggressive (every 3rd frame skip instead of 2nd)
    if (p.iframe > 0 && Math.floor(time * 12) % 3 === 0) return;

    var sprite = null;
    if (p.state === 'run') {
      sprite = BR.Assets.get('byte-run-' + p.runFrame) || BR.Assets.get('byte-idle');
    } else {
      sprite = BR.Assets.get('byte-' + p.state);
    }

    ctx.save();
    // Anchor: bottom-center of player's hitbox.
    var cx = p.x + p.w / 2;
    var by = p.y + p.h;
    ctx.translate(cx, by);

    // Use smoothed tilt value (already lerped in update).
    ctx.rotate(p.tilt);

    var sq = p.squash;
    ctx.scale(1 + sq * 0.5, 1 - sq * 0.6);

    if (sprite) {
      var sw = sprite.width;
      var sh = sprite.height;
      var sAspect = sw / sh;
      var targetW = p.w + 16;
      var targetH = p.h + 16;
      var tAspect = targetW / targetH;
      var dw, dh;
      if (sAspect > tAspect) {
        dw = targetW;
        dh = targetW / sAspect;
      } else {
        dh = targetH;
        dw = targetH * sAspect;
      }
      ctx.drawImage(sprite, -dw / 2, -dh, dw, dh);
    } else {
      drawPlaceholder(ctx, p, time);
    }

    ctx.restore();
  }

  function drawPlaceholder(ctx, p, time) {
    var w = p.w, h = p.h;
    var bob = p.onGround ? Math.sin(time * 18) * 1.5 : 0;

    ctx.translate(0, bob);

    ctx.fillStyle = 'rgba(71,123,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 2, w * 0.55, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    var g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, '#5B8CFF');
    g.addColorStop(1, '#3A5FCC');
    ctx.fillStyle = g;
    ctx.strokeStyle = C.teal;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h + 4, w, h - 8, 10);
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#0C1130';
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 7, -h + 12, w - 14, 16, 6);
    ctx.fill();
    ctx.fillStyle = C.teal;
    ctx.shadowColor = C.teal;
    ctx.shadowBlur = 8;
    var blink = Math.sin(time * 2.2) > -0.92 ? 1 : 0.15;
    ctx.beginPath();
    ctx.ellipse(-6, -h + 20, 3.4, 4 * blink, 0, 0, Math.PI * 2);
    ctx.ellipse(6, -h + 20, 3.4, 4 * blink, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    var legA = p.onGround ? Math.sin(time * 18) * 6 : -4;
    var legB = p.onGround ? Math.sin(time * 18 + Math.PI) * 6 : 4;
    ctx.strokeStyle = '#3A5FCC';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -6); ctx.lineTo(-8 + legA, 0);
    ctx.moveTo(8, -6); ctx.lineTo(8 + legB, 0);
    ctx.stroke();

    ctx.strokeStyle = C.teal;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 4, -h * 0.6);
    ctx.lineTo(w / 2 + 6, -h * 0.6);
    ctx.stroke();
  }

  function shadow(p, ctx) {
    var air = (CFG.GROUND_Y - (p.y + p.h)) / 160;
    var scale = 1 - Math.min(0.6, air * 0.6);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, CFG.GROUND_Y + 4, p.w * 0.45 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  return { init: init, create: create, jump: jump, update: update, hurt: hurt, hitbox: hitbox, draw: draw, shadow: shadow, MANIFEST: MANIFEST };
})();
