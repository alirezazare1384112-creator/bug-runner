window.BR = window.BR || {};

BR.Sfx = (function () {
  var ctx = null;
  var enabled = true;

  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function beep(freq, dur, type, vol, slide) {
    if (!enabled) return;
    var a = ac();
    if (!a) return;
    var o = a.createOscillator();
    var g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), a.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.06, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + dur);
  }

  return {
    unlock: function () { ac(); },
    jump: function () { beep(340, 0.12, 'square', 0.05, 260); },
    dblJump: function () { beep(480, 0.12, 'square', 0.05, 300); },
    collect: function () { beep(880, 0.08, 'sine', 0.06, 240); },
    bigCollect: function () { beep(660, 0.16, 'sine', 0.07, 500); },
    hit: function () { beep(160, 0.22, 'sawtooth', 0.08, -90); },
    breakOb: function () { beep(220, 0.1, 'square', 0.05, -120); },
    env: function () { beep(520, 0.25, 'sine', 0.045, 200); },
    over: function () { beep(200, 0.5, 'sawtooth', 0.07, -140); },
    record: function () {
      beep(660, 0.12, 'sine', 0.06, 120);
      var a = ac();
      if (!a) return;
      setTimeout(function () { beep(880, 0.2, 'sine', 0.06, 200); }, 130);
    }
  };
})();
