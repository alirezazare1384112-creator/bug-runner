window.BR = window.BR || {};

BR.Items = (function () {
  var C = BR.CONFIG.COLORS;

  // PNG asset manifest — auto-loaded at init, falls back to canvas draw if missing
  var MANIFEST = {
    'item-bit': 'assets/items/bit.png',
    'item-byte': 'assets/items/byte-item.png',
    'item-fragment': 'assets/items/fragment.png',
    'item-xp': 'assets/items/xp.png'
  };

  function init() {
    BR.Assets.loadManifest(MANIFEST);
  }

  function drawSprite(ctx, type, x, y, t, sprite) {
    if (sprite) {
      var bob = Math.sin(t * 4 + x * 0.02) * 3;
      // Scale sprite to the item's logical w × h (not native sprite px).
      // Anchor: center, with a gentle bob for "pickable" feel.
      ctx.save();
      ctx.translate(x + type.w / 2, y + type.h / 2 + bob);
      ctx.drawImage(sprite, -type.w / 2, -type.h / 2, type.w, type.h);
      ctx.restore();
      return;
    }
    type.draw(ctx, x, y, t);
  }

  var TYPES = {
    bit: {
      id: 'bit', w: 22, h: 22, score: 10, kind: 'bit',
      box: { x: 3, y: 3, w: 16, h: 16 },
      draw: function (ctx, x, y, t) {
        var bob = Math.sin(t * 4 + x * 0.02) * 3;
        ctx.save();
        ctx.translate(x + 11, y + 11 + bob);
        ctx.rotate(t * 1.5);
        ctx.fillStyle = C.blue;
        ctx.shadowColor = C.blue;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, -8); ctx.lineTo(7, 0); ctx.lineTo(0, 8); ctx.lineTo(-7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(234,242,255,0.85)';
        ctx.beginPath();
        ctx.moveTo(0, -4); ctx.lineTo(3.5, 0); ctx.lineTo(0, 4); ctx.lineTo(-3.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    },
    byte: {
      id: 'byte', w: 28, h: 28, score: 50, kind: 'byte',
      box: { x: 4, y: 4, w: 20, h: 20 },
      draw: function (ctx, x, y, t) {
        var bob = Math.sin(t * 3.2 + x * 0.015) * 4;
        ctx.save();
        ctx.translate(x + 14, y + 14 + bob);
        var pulse = 0.85 + Math.sin(t * 5) * 0.15;
        ctx.scale(pulse, pulse);
        ctx.shadowColor = C.teal;
        ctx.shadowBlur = 14;
        ctx.fillStyle = 'rgba(66,232,224,0.25)';
        ctx.strokeStyle = C.teal;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-10, -10, 20, 20, 4);
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = C.teal;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('B', 0, 1);
        ctx.restore();
      }
    },
    fragment: {
      id: 'fragment', w: 32, h: 26, score: 80, kind: 'fragment',
      box: { x: 3, y: 3, w: 26, h: 20 },
      draw: function (ctx, x, y, t) {
        var bob = Math.sin(t * 3.6 + x * 0.01) * 3;
        ctx.save();
        ctx.translate(x + 16, y + 13 + bob);
        ctx.shadowColor = C.yellow;
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(40,30,10,0.9)';
        ctx.strokeStyle = C.yellow;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-13, -9); ctx.lineTo(8, -9); ctx.lineTo(13, -3);
        ctx.lineTo(13, 9); ctx.lineTo(-13, 9);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = C.yellow;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('</>', 0, 1);
        ctx.restore();
      }
    },
    xp: {
      id: 'xp', w: 34, h: 34, score: 200, kind: 'xp',
      box: { x: 5, y: 5, w: 24, h: 24 },
      draw: function (ctx, x, y, t) {
        var bob = Math.sin(t * 2.5) * 5;
        ctx.save();
        ctx.translate(x + 17, y + 17 + bob);
        ctx.rotate(t * 0.8);
        ctx.shadowColor = C.yellow;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = C.yellow;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (var i = 0; i < 6; i++) {
          var a = (Math.PI * 2 / 6) * i - Math.PI / 2;
          var px = Math.cos(a) * 14, py = Math.sin(a) * 14;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.rotate(-t * 1.6);
        ctx.fillStyle = 'rgba(255,209,102,0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }
  };

  function makeArc(baseX, groundY, count, type) {
    var list = [];
    var t = type || TYPES.bit;
    for (var i = 0; i < count; i++) {
      var frac = i / Math.max(1, count - 1);
      var arcH = Math.sin(frac * Math.PI) * 110;
      list.push({
        type: t,
        x: baseX + i * 44,
        y: groundY - 70 - arcH,
        collected: false,
        t0: Math.random() * 10
      });
    }
    return list;
  }

  function makeSolo(baseX, groundY, type) {
    return [{
      type: type,
      x: baseX,
      y: groundY - 60 - Math.random() * 120,
      collected: false,
      t0: Math.random() * 10
    }];
  }

  return { TYPES: TYPES, makeArc: makeArc, makeSolo: makeSolo, init: init, drawSprite: drawSprite, MANIFEST: MANIFEST };
})();
