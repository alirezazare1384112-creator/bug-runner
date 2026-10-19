(function () {
  var $ = function (id) { return document.getElementById(id); };

  var canvas = $('game');
  var hud = $('hud');
  var touch = $('touch-controls');
  var ovStart = $('overlay-start');
  var ovPause = $('overlay-pause');
  var ovOver = $('overlay-over');
  var hudScore = $('hud-score');
  var hudDist = $('hud-dist');
  var hudBits = $('hud-bits');
  var hudHp = $('hud-hp');
  var hudEnv = $('hud-env');

  var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  var best = Number(localStorage.getItem('br-best') || 0);
  var lastEnvShown = -1;
  var envLabelTimer = null;

  $('best-score').textContent = 'رکورد: ' + best;

  var fxOpt = localStorage.getItem('br-fx') === '0';
  $('opt-fx').checked = fxOpt;
  BR.Game.setReduced(fxOpt);
  $('opt-fx').addEventListener('change', function () {
    localStorage.setItem('br-fx', this.checked ? '1' : '0');
    BR.Game.setReduced(this.checked);
  });

  BR.Game.init(canvas);
  BR.Game.skipRaf();

  for (var i = 0; i < BR.CONFIG.HP; i++) {
    var pip = document.createElement('div');
    pip.className = 'pip';
    hudHp.appendChild(pip);
  }

  var lastHp = BR.CONFIG.HP;
  function updateHp(hp) {
    var pips = hudHp.children;
    for (var i = 0; i < pips.length; i++) {
      pips[i].classList.toggle('off', i >= hp);
    }
    // Flash the pip that changed (gained or lost).
    if (hp !== lastHp) {
      var changedPip = hp > lastHp ? pips[hp - 1] : pips[lastHp - 1];
      if (changedPip) {
        changedPip.classList.remove('flash');
        void changedPip.offsetWidth; // force reflow
        changedPip.classList.add('flash');
        setTimeout(function() { changedPip.classList.remove('flash'); }, 400);
      }
      lastHp = hp;
    }
  }

  function showEnv(idx) {
    if (idx === lastEnvShown) return;
    lastEnvShown = idx;
    hudEnv.textContent = BR.Environments.get(idx).name;
    hudEnv.classList.add('show');
    if (envLabelTimer) clearTimeout(envLabelTimer);
    envLabelTimer = setTimeout(function () { hudEnv.classList.remove('show'); }, 2400);
  }

  var hudTick = 0;
  BR.Game.onChange(function (st, data) {
    if (st === 'playing') {
      ovStart.classList.add('hidden');
      ovPause.classList.add('hidden');
      ovOver.classList.add('hidden');
      hud.classList.remove('hidden');
      if (isTouch) touch.classList.remove('hidden');
      updateHp(BR.CONFIG.HP);
    } else if (st === 'paused') {
      ovPause.classList.remove('hidden');
    } else if (st === 'over') {
      hud.classList.add('hidden');
      touch.classList.add('hidden');
      ovOver.classList.remove('hidden');
      $('final-score').textContent = data.score;
      $('final-dist').textContent = data.dist + 'm';
      $('final-bits').textContent = data.bits;

      // Compute rank/medal based on score.
      var rankInfo = computeRank(data.score);
      var medalEl = $('over-medal');
      medalEl.className = 'medal ' + rankInfo.medal;
      medalEl.textContent = rankInfo.symbol;
      $('over-rank').textContent = rankInfo.title;
      $('over-rank-desc').textContent = rankInfo.desc;

      // Best ever score (persists in localStorage).
      var bestEver = Number(localStorage.getItem('br-best-ever') || 0);
      var isNewBestEver = data.score > bestEver;
      if (isNewBestEver) {
        bestEver = data.score;
        localStorage.setItem('br-best-ever', String(bestEver));
      }
      $('best-ever').textContent = bestEver;

      var isRecord = data.score > best;
      if (isRecord) {
        best = data.score;
        localStorage.setItem('br-best', String(best));
        $('best-score').textContent = 'رکورد: ' + best;
        $('new-record').classList.remove('hidden');
        $('over-title').textContent = 'رکورد جدید!';
        BR.Sfx.record();
      } else {
        $('new-record').classList.add('hidden');
        $('over-title').textContent = 'بازی تمام شد';
      }
    } else if (st === 'menu') {
      ovStart.classList.remove('hidden');
      ovPause.classList.add('hidden');
      ovOver.classList.add('hidden');
      hud.classList.add('hidden');
      touch.classList.add('hidden');
    }
  });

  setInterval(function () {
    if (BR.Game.getState() !== 'playing') return;
    var s = BR.Game.getStats();
    hudScore.textContent = s.score;
    hudDist.textContent = s.dist + 'm';
    hudBits.textContent = s.bits;
    updateHp(s.hp);
  }, 120);

  $('btn-start').addEventListener('click', function () {
    BR.Sfx.unlock();
    lastEnvShown = -1;
    BR.Game.start();
  });
  $('btn-retry').addEventListener('click', function () {
    lastEnvShown = -1;
    BR.Game.start();
  });
  $('btn-menu').addEventListener('click', function () { BR.Game.toMenu(); });
  $('btn-pause').addEventListener('click', function () { BR.Game.pause(); });
  $('btn-resume').addEventListener('click', function () { BR.Game.resume(); });
  $('btn-quit').addEventListener('click', function () { BR.Game.toMenu(); });

  function doJump() {
    if (BR.Game.getState() === 'playing') BR.Game.jump();
  }

  function doReleaseJump() {
    if (BR.Game.getState() === 'playing') BR.Game.releaseJump();
  }

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      if (e.repeat) return; // ignore key auto-repeat
      e.preventDefault();
      if (BR.Game.getState() === 'menu') { $('btn-start').click(); return; }
      if (BR.Game.getState() === 'over') { $('btn-retry').click(); return; }
      if (BR.Game.getState() === 'paused') { BR.Game.resume(); return; }
      doJump();
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (BR.Game.getState() === 'playing') BR.Game.pause();
      else if (BR.Game.getState() === 'paused') BR.Game.resume();
    }
  });

  // Key up — release jump for variable jump height (short hop vs full jump).
  window.addEventListener('keyup', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      doReleaseJump();
    }
  });

  canvas.addEventListener('pointerdown', function (e) {
    if (BR.Game.getState() === 'playing') {
      e.preventDefault();
      doJump();
    }
  });
  canvas.addEventListener('pointerup', function (e) {
    if (BR.Game.getState() === 'playing') doReleaseJump();
  });

  $('btn-jump').addEventListener('pointerdown', function (e) {
    e.preventDefault();
    e.stopPropagation();
    doJump();
  });
  $('btn-jump').addEventListener('pointerup', function (e) {
    e.preventDefault();
    e.stopPropagation();
    doReleaseJump();
  });
  $('btn-jump').addEventListener('pointerleave', function (e) {
    if (BR.Game.getState() === 'playing') doReleaseJump();
  });

  var envWatcher = setInterval(function () {
    if (BR.Game.getState() !== 'playing') return;
    showEnv(Math.floor(BR.Game.getStats().dist / BR.CONFIG.ENV_CHANGE_DIST) % BR.Environments.count());
  }, 400);

  if (new URLSearchParams(location.search).get('play') === '1') {
    $('btn-start').click();
    var qp = new URLSearchParams(location.search);
    var tt = Number(qp.get('t') || 0);
    if (tt > 0) {
      var noBot = qp.get('nobot') === '1';
      var res = BR.Game.debugPlay(tt, noBot);
      window.__brDebug = res;
      setTimeout(function () { console.log('BR_DEBUG ' + res); }, 0);
    }
    if (qp.get('pause') === '1') {
      setTimeout(function () { BR.Game.pause(); console.log('PAUSED ' + BR.Game.getState()); }, 400);
    }
    if (qp.get('probe') === '1') {
      setTimeout(function () {
        var els = document.querySelectorAll('.hud-chip, #hud-hp, #hud');
        var out = [];
        for (var i = 0; i < els.length; i++) {
          var r = els[i].getBoundingClientRect();
          out.push('[' + (els[i].id || els[i].className) + ' "' + els[i].textContent.trim() + '" x=' + Math.round(r.x) + ' w=' + Math.round(r.width) + ']');
        }
        console.log('PROBE ' + out.join(' ') + ' vw=' + window.innerWidth);
      }, 600);
    }
  }

  window.addEventListener('beforeunload', function () {
    clearInterval(envWatcher);
  });

  // ---- Rank/Medal computation ----
  // Returns { medal, symbol, title, desc } based on score thresholds.
  // Tiers: bronze < 500, silver < 2000, gold < 5000, platinum < 12000, diamond >= 12000.
  function computeRank(score) {
    if (score >= 12000) {
      return { medal: 'diamond', symbol: '◆', title: ' Debugger Master', desc: 'حرفه‌ای واقعی!' };
    } else if (score >= 5000) {
      return { medal: 'platinum', symbol: '★', title: 'Senior Dev', desc: 'بزرگ شدی!' };
    } else if (score >= 2000) {
      return { medal: 'gold', symbol: '★', title: 'Mid Dev', desc: 'آفرین!' };
    } else if (score >= 500) {
      return { medal: 'silver', symbol: '★', title: 'Junior Dev', desc: 'خوب بود!' };
    } else {
      return { medal: 'bronze', symbol: '★', title: 'Intern', desc: 'دوباره تلاش کن!' };
    }
  }
})();
