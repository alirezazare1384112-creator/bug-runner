window.BR = window.BR || {};

BR.Obstacles = (function () {
  var C = BR.CONFIG.COLORS;

  var TYPES = [
    {
      id: 'syntax-bug', w: 46, h: 40, unlock: 0,
      box: { x: 6, y: 6, w: 34, h: 30 },
      draw: function (ctx, x, y, t) {
        var wob = Math.sin(t * 8) * 2;
        ctx.save();
        ctx.translate(x + 23, y + 20 + wob);
        ctx.fillStyle = '#3A1020';
        ctx.strokeStyle = C.coral;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 17, 13, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-10, -10); ctx.lineTo(-15, -18);
        ctx.moveTo(10, -10); ctx.lineTo(15, -18);
        ctx.stroke();
        ctx.fillStyle = C.coral;
        ctx.beginPath(); ctx.arc(-6, -2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(6, -2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,107,122,0.6)';
        ctx.beginPath();
        for (var i = 0; i < 3; i++) {
          ctx.moveTo(-14 + i * 10, 13);
          ctx.lineTo(-17 + i * 10, 19);
        }
        ctx.stroke();
        ctx.restore();
      }
    },
    {
      id: 'null-pointer', w: 34, h: 56, unlock: 0,
      box: { x: 5, y: 4, w: 24, h: 48 },
      draw: function (ctx, x, y, t) {
        var float = Math.sin(t * 3) * 3;
        ctx.save();
        ctx.translate(x + 17, y + 28 + float);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = 'rgba(20,14,50,0.9)';
        ctx.strokeStyle = C.purple;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-12, -20);
        ctx.lineTo(12, -20);
        ctx.lineTo(14, 16);
        ctx.lineTo(7, 10);
        ctx.lineTo(0, 18);
        ctx.lineTo(-7, 10);
        ctx.lineTo(-14, 16);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.coral;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('null', 0, -4);
        ctx.restore();
      }
    },
    {
      id: 'memory-leak', w: 38, h: 52, unlock: 400,
      box: { x: 5, y: 5, w: 28, h: 42 },
      draw: function (ctx, x, y, t) {
        ctx.save();
        ctx.translate(x + 19, y + 26);
        ctx.fillStyle = '#1E1440';
        ctx.strokeStyle = C.blue;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-13, -20, 26, 34, 5);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(71,123,255,0.35)';
        ctx.fillRect(-10, -6, 20, 17);
        ctx.fillStyle = C.blue;
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MEM', 0, -10);
        for (var d = 0; d < 3; d++) {
          var dy = ((t * 40 + d * 12) % 22);
          ctx.fillStyle = 'rgba(71,123,255,' + (0.7 - dy / 40) + ')';
          ctx.beginPath();
          ctx.arc(-6 + d * 6, 16 + dy, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    },
    {
      id: 'firewall', w: 60, h: 64, unlock: 900,
      box: { x: 5, y: 10, w: 50, h: 52 },
      draw: function (ctx, x, y, t) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = 'rgba(40,16,20,0.95)';
        ctx.strokeStyle = C.coral;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(4, 30, 52, 32, 4);
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,107,122,0.5)';
        for (var r = 0; r < 3; r++) {
          ctx.beginPath();
          ctx.moveTo(10, 38 + r * 9);
          ctx.lineTo(50, 38 + r * 9);
          ctx.stroke();
        }
        for (var f = 0; f < 5; f++) {
          var fx = 10 + f * 10;
          var fh = 14 + Math.sin(t * 10 + f * 1.4) * 7;
          var g = ctx.createLinearGradient(0, 30 - fh, 0, 30);
          g.addColorStop(0, 'rgba(255,209,102,0.95)');
          g.addColorStop(1, 'rgba(255,107,122,0.15)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(fx - 4, 30);
          ctx.quadraticCurveTo(fx, 30 - fh, fx + 4, 30);
          ctx.fill();
        }
        ctx.restore();
      }
    },
    {
      id: 'broken-code', w: 52, h: 48, unlock: 1500,
      box: { x: 6, y: 6, w: 40, h: 36 },
      draw: function (ctx, x, y, t) {
        ctx.save();
        ctx.translate(x + 26, y + 24);
        ctx.rotate(Math.sin(t * 2) * 0.04);
        ctx.font = 'bold 40px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(10,16,40,0.9)';
        ctx.fillText('{ }', 0, 0);
        ctx.strokeStyle = C.teal;
        ctx.lineWidth = 2.5;
        ctx.strokeText('{ }', 0, 0);
        ctx.strokeStyle = C.coral;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-14, -10);
        ctx.lineTo(-4, -2);
        ctx.lineTo(-12, 4);
        ctx.moveTo(8, -8);
        ctx.lineTo(2, 2);
        ctx.lineTo(12, 10);
        ctx.stroke();
        ctx.restore();
      }
    },
    {
      id: 'server-failure', w: 76, h: 70, unlock: 2300,
      box: { x: 6, y: 8, w: 64, h: 58 },
      draw: function (ctx, x, y, t) {
        ctx.save();
        ctx.translate(x + 38, y + 35);
        ctx.rotate(0.06 + Math.sin(t * 5) * 0.02);
        ctx.fillStyle = 'rgba(22,14,50,0.97)';
        ctx.strokeStyle = C.purple;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-30, -30, 60, 60, 5);
        ctx.fill(); ctx.stroke();
        for (var s = 0; s < 4; s++) {
          var sy = -22 + s * 13;
          ctx.fillStyle = 'rgba(50,30,100,0.8)';
          ctx.fillRect(-24, sy, 48, 10);
          var blink = Math.sin(t * 12 + s * 2.2) > 0;
          ctx.fillStyle = blink ? C.coral : 'rgba(255,107,122,0.25)';
          ctx.fillRect(16, sy + 3, 4, 4);
          ctx.fillStyle = 'rgba(71,123,255,0.7)';
          ctx.fillRect(22, sy + 3, 4, 4);
        }
        ctx.strokeStyle = C.coral;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-8, -36);
        ctx.lineTo(-14, -44);
        ctx.moveTo(8, -36);
        ctx.lineTo(16, -46);
        ctx.stroke();
        ctx.fillStyle = C.yellow;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.5 + Math.sin(t * 10) * 0.4;
        ctx.fillText('ERR', 0, -40);
        ctx.restore();
      }
    },
    {
      id: 'stack-overflow', w: 44, h: 86, unlock: 3200,
      box: { x: 4, y: 6, w: 36, h: 76 },
      draw: function (ctx, x, y, t) {
        ctx.save();
        ctx.translate(x + 22, y);
        var lean = Math.sin(t * 3) * 0.03;
        for (var b = 0; b < 4; b++) {
          var by = 84 - b * 20;
          ctx.save();
          ctx.translate(lean * b * 6, by);
          ctx.rotate(lean * b * 0.5);
          ctx.fillStyle = 'rgba(24,14,60,0.97)';
          ctx.strokeStyle = b === 3 ? C.coral : C.blue;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-17, -17, 34, 17, 3);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = 'rgba(71,123,255,0.5)';
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('{' + b + '}', 0, -5);
          ctx.restore();
        }
        ctx.fillStyle = C.coral;
        ctx.globalAlpha = 0.4 + Math.sin(t * 8) * 0.3;
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('>>', 0, -6);
        ctx.restore();
      }
    }
  ];

  function pick(dist) {
    var pool = [];
    for (var i = 0; i < TYPES.length; i++) {
      if (dist >= TYPES[i].unlock) pool.push(TYPES[i]);
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function drawSprite(ctx, type, x, y, t, sprite) {
    if (sprite) {
      ctx.drawImage(sprite, x, y + type.h - sprite.height, sprite.width, sprite.height);
      return;
    }
    type.draw(ctx, x, y, t);
  }

  return { TYPES: TYPES, pick: pick, drawSprite: drawSprite };
})();
