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
      stateBlend: 1,
      runFrame: 0,
      runTimer: 0,
      squash: 0,
      squashTarget: 0,
      tilt: 0,
      tiltTarget: 0,
      // Jump animation phases: 'anticipate' | 'rise' | 'apex' | 'fall' | 'land'
      jumpPhase: '',
      jumpPhaseTimer: 0,
      _deathTime: 0,
      // Afterimage trail — stores recent positions for motion blur effect.
      trail: []
    };
  }

  function jump(p) {
    if (!p.alive) return false;
    if (p.onGround || p.jumpPhase === 'anticipate') {
      // Single jump — with anticipation: brief crouch before launching.
      // The actual velocity is applied after a short delay (handled in update).
      p.jumpPhase = 'anticipate';
      p.jumpPhaseTimer = 0.08; // 80ms anticipation crouch
      p.squashTarget = 0.25; // squash down (compress) for anticipation
      p.jumps = 1;
      p._pendingJumpVel = CFG.JUMP_VEL;
      return 'single';
    } else if (p.jumps < 2) {
      // Double jump — instant, with flip stretch and burst.
      p.vy = CFG.DOUBLE_JUMP_VEL;
      p.jumps = 2;
      p.squashTarget = -0.28; // strong stretch upward for double jump
      p.jumpPhase = 'rise';
      return 'double';
    }
    return false;
  }

  function update(p, dt) {
    if (!p.alive) return;

    // Update trail — record recent positions for afterimage effect.
    // Only record when player is moving (in air) for nice motion blur.
    if (!p.onGround && Math.abs(p.vy) > 50) {
      p.trail.push({ x: p.x, y: p.y, age: 0, state: p.state, runFrame: p.runFrame });
      if (p.trail.length > 4) p.trail.shift();
    } else {
      // Clear trail quickly when on ground.
      if (p.trail.length > 0) p.trail.shift();
    }
    // Age trail entries.
    for (var ti = 0; ti < p.trail.length; ti++) {
      p.trail[ti].age += dt;
    }
    // Remove old entries.
    p.trail = p.trail.filter(function(t) { return t.age < 0.25; });

    // --- Jump phase machine for realistic animation ---
    if (p.jumpPhase === 'anticipate') {
      // Hold position during anticipation crouch.
      p.jumpPhaseTimer -= dt;
      if (p.jumpPhaseTimer <= 0) {
        // Launch!
        p.vy = p._pendingJumpVel || CFG.JUMP_VEL;
        p._pendingJumpVel = 0;
        p.squashTarget = -0.22; // stretch upward on launch
        p.jumpPhase = 'rise';
        p.jumpPhaseTimer = 0;
        p.onGround = false; // now airborne
      } else {
        // Stay on ground during anticipation.
        p.vy = 0;
      }
    } else {
      // Normal physics.
      p.vy += CFG.GRAVITY * dt;
      if (p.vy > CFG.MAX_FALL) p.vy = CFG.MAX_FALL;
    }
    p.y += p.vy * dt;

    var groundTop = CFG.GROUND_Y - p.h;
    if (p.y >= groundTop && p.jumpPhase !== 'anticipate') {
      var wasInAir = !p.onGround;
      if (wasInAir && p.vy > 100) {
        // Landing — strong squash based on impact velocity.
        var impactStrength = Math.min(0.5, p.vy / 2000);
        p.squashTarget = 0.25 + impactStrength * 0.25;
        // Landing dust — more particles for harder landings.
        var dustCount = Math.min(12, 4 + Math.floor(p.vy / 100));
        BR.Particles.burst(p.x + p.w / 2, CFG.GROUND_Y - 2, 'rgba(234,242,255,0.7)', dustCount, 90 + p.vy * 0.1, 0.3, 2, 300);
        p.jumpPhase = 'land';
        p.jumpPhaseTimer = 0.12; // brief landing recovery
      }
      p.y = groundTop;
      p.vy = 0;
      p.onGround = true;
      if (p.jumpPhase !== 'land' && p.jumpPhase !== 'anticipate') {
        p.jumps = 0;
        p.jumpPhase = '';
      }
    }

    // Landing recovery — return to run after a brief pause.
    if (p.jumpPhase === 'land') {
      p.jumpPhaseTimer -= dt;
      if (p.jumpPhaseTimer <= 0) {
        p.jumpPhase = '';
        p.squashTarget = 0;
        p.jumps = 0;
      }
    }

    if (p.iframe > 0) p.iframe -= dt;

    // Smoothly lerp squash toward target (organic motion, no snap).
    p.squash += (p.squashTarget - p.squash) * Math.min(1, dt * 14);
    // After reaching target, decay target back to 0 (so squash returns to neutral).
    if (Math.abs(p.squash - p.squashTarget) < 0.02 && p.squashTarget !== 0) {
      if (p.jumpPhase !== 'anticipate' && p.jumpPhase !== 'land') {
        p.squashTarget = 0;
      }
    }

    // --- Animation state machine ---
    if (p.onGround) {
      if (p.iframe > 0) {
        if (p.state !== 'hurt') { p.prevState = p.state; p.stateBlend = 0; }
        p.state = 'hurt';
        p.tiltTarget = -0.08;
      } else {
        if (p.state !== 'run' && p.jumpPhase !== 'anticipate' && p.jumpPhase !== 'land') {
          p.prevState = p.state; p.stateBlend = 0;
        }
        p.state = 'run';
        var speedFactor = (window.BR && BR.Game ? BR.Game.getStats().dist : 0);
        var cycleSpeed = Math.max(0.05, 0.09 - speedFactor * 0.000005);
        // Pause run cycle during anticipation/landing for cleaner animation.
        if (p.jumpPhase === '') {
          p.runTimer += dt;
          if (p.runTimer > cycleSpeed) { p.runTimer = 0; p.runFrame = (p.runFrame + 1) % 4; }
        }
        if (window.BR && BR.Game && Math.random() < dt * 4 && BR.Game.getState && BR.Game.getState() === 'playing' && p.jumpPhase === '') {
          BR.Particles.burst(p.x + p.w / 2 - 5, CFG.GROUND_Y - 2, 'rgba(180,200,230,0.4)', 1, 60, 0.2, 1, 200);
        }
        p.tiltTarget = 0.05;
      }
    } else {
      // In air — determine phase based on velocity.
      var newState;
      if (p.vy < -100) {
        newState = 'jump'; // rising
        p.jumpPhase = 'rise';
        // Stretch while rising fast.
        p.squashTarget = Math.max(-0.3, p.vy / 3000);
      } else if (p.vy < 100) {
        newState = 'jump'; // near apex
        p.jumpPhase = 'apex';
        // Near apex — return to neutral (slight squash for hang time feel).
        p.squashTarget = 0.05;
      } else {
        newState = 'fall'; // descending
        p.jumpPhase = 'fall';
        // Mild stretch downward while falling.
        p.squashTarget = Math.min(0.15, p.vy / 5000);
      }
      // Tilt based on velocity — lean back when rising, forward when falling.
      // This makes the tilt feel dynamic, not just state-based.
      p.tiltTarget = Math.max(-0.15, Math.min(0.15, p.vy / 6000));
      if (p.iframe > 0) {
        newState = 'hurt';
        p.tiltTarget = -0.08;
      }
      if (newState !== p.state) { p.prevState = p.state; p.stateBlend = 0; p.state = newState; }
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
      // Fade out over 2 seconds after death — gives time for knockback bounce.
      if (!p._deathTime) p._deathTime = time;
      var deathAge = time - p._deathTime;
      if (deathAge > 2.0) return; // fully faded out
      var deathAlpha = Math.max(0, 1 - deathAge / 2.0);
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

    // Draw afterimage trail first (behind player).
    if (p.trail.length > 0) {
      ctx.save();
      for (var tri = 0; tri < p.trail.length; tri++) {
        var t = p.trail[tri];
        var alpha = (1 - t.age / 0.25) * 0.6; // increased from 0.35 to 0.6
        if (alpha <= 0.05) continue;
        ctx.globalAlpha = alpha;
        // Tint trail sprites cyan for glow effect.
        ctx.globalCompositeOperation = 'lighter';
        var trailSprite = BR.Assets.get('byte-' + t.state) || BR.Assets.get('byte-idle');
        if (trailSprite) {
          var tcx = t.x + p.w / 2 - cx;
          var tby = t.y + p.h - by;
          ctx.save();
          ctx.translate(tcx, tby);
          var sw = trailSprite.width, sh = trailSprite.height;
          var sAspect = sw / sh;
          var targetW = p.w + 16, targetH = p.h + 16;
          var tAspect = targetW / targetH;
          var dw, dh;
          if (sAspect > tAspect) { dw = targetW; dh = targetW / sAspect; }
          else { dh = targetH; dw = targetH * sAspect; }
          ctx.drawImage(trailSprite, -dw / 2, -dh, dw, dh);
          ctx.restore();
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Soft glow halo behind player (gives weight and visibility).
    if (!p.iframe || Math.floor(time * 12) % 3 !== 0) {
      var glowRadius = p.h * 1.1;
      var glowAlpha = 0.3;
      // Pulse glow based on state.
      if (p.state === 'jump' || p.state === 'fall') glowAlpha = 0.4;
      if (p.state === 'hurt') glowAlpha = 0.5;
      var grad = ctx.createRadialGradient(0, -p.h / 2, 0, 0, -p.h / 2, glowRadius);
      grad.addColorStop(0, 'rgba(66, 232, 224, ' + glowAlpha + ')');
      grad.addColorStop(0.4, 'rgba(71, 123, 255, ' + (glowAlpha * 0.6) + ')');
      grad.addColorStop(0.8, 'rgba(152, 101, 255, ' + (glowAlpha * 0.2) + ')');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = grad;
      ctx.fillRect(-glowRadius, -p.h - 20, glowRadius * 2, p.h + 40);
      ctx.globalCompositeOperation = 'source-over';
    }

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
