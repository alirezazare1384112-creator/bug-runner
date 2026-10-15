window.BR = window.BR || {};

BR.Environments = (function () {
  var C = BR.CONFIG.COLORS;

  function seeded(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function tileLoop(ctx, offset, tileW, w, fn) {
    var start = Math.floor(offset / tileW) - 1;
    var end = Math.ceil((offset + w) / tileW) + 1;
    for (var i = start; i <= end; i++) {
      fn(i, i * tileW - offset);
    }
  }

  function drawSky(ctx, top, bottom, w, h) {
    // Cache gradients per (top,bottom) pair to avoid recreating every frame.
    // Gradient creation is expensive; only do it once per unique color combo.
    if (!drawSky._cache) drawSky._cache = {};
    var key = top + '|' + bottom + '|' + h;
    var g = drawSky._cache[key];
    if (!g) {
      g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, top);
      g.addColorStop(1, bottom);
      drawSky._cache[key] = g;
      // Cap cache size to prevent memory leak
      var keys = Object.keys(drawSky._cache);
      if (keys.length > 16) delete drawSky._cache[keys[0]];
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  var ENV_DEFS = [
    {
      id: 'code-city',
      name: 'CODE CITY',
      sky: ['#0B1030', '#1B2456'],
      accent: C.blue,
      accent2: C.purple,
      ground: { fill: '#0C1130', edge: C.blue, line: 'rgba(71,123,255,0.35)' },
      layers: [
        {
          speed: 0.06, tileW: 900,
          draw: function (ctx, ox, w, h, gy) {
            ctx.save();
            for (var i = 0; i < 6; i++) {
              var x = ((i * 240 - ox * 0.06) % (w + 300) + w + 300) % (w + 300) - 150;
              var y = 50 + seeded(i * 7) * 130;
              var r = 18 + seeded(i * 3) * 46;
              ctx.strokeStyle = 'rgba(152,101,255,0.12)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(x, y, r, 0, Math.PI * 2);
              ctx.stroke();
              ctx.strokeStyle = 'rgba(71,123,255,0.08)';
              ctx.beginPath();
              ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.restore();
          }
        },
        {
          speed: 0.22, tileW: 340,
          draw: function (ctx, ox, w, h, gy) {
            tileLoop(ctx, ox, 340, w, function (i, x) {
              var seed = i * 13.7;
              var bw = 70 + seeded(seed) * 110;
              var bh = 130 + seeded(seed + 1) * 170;
              var by = gy - bh;
              ctx.fillStyle = 'rgba(14,20,52,0.95)';
              ctx.fillRect(x + 12, by, bw, bh);
              ctx.strokeStyle = 'rgba(71,123,255,0.25)';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(x + 12, by, bw, bh);
              // Windows — deterministic per tile index i and window position
              // within the tile, so they don't flicker as the tile scrolls.
              // col/row are relative to the building, not absolute screen pos.
              var col = 0, row = 0;
              for (var wy = by + 14; wy < gy - 18; wy += 24) {
                col = 0;
                for (var wx = x + 22; wx < x + 12 + bw - 14; wx += 20) {
                  // Use tile index + relative col/row for stable window state.
                  var r = seeded(i * 7.3 + col * 1.7 + row * 3.1 + 100);
                  if (r > 0.55) {
                    ctx.fillStyle = r > 0.85 ? 'rgba(255,209,102,0.75)' : 'rgba(66,232,224,0.45)';
                    ctx.fillRect(wx, wy, 8, 11);
                  }
                  col++;
                }
                row++;
              }
            });
          }
        },
        {
          speed: 0.5, tileW: 260,
          draw: function (ctx, ox, w, h, gy) {
            tileLoop(ctx, ox, 260, w, function (i, x) {
              var seed = i * 5.3;
              var mh = 34 + seeded(seed) * 54;
              var bottom = gy - 26;
              ctx.fillStyle = 'rgba(10,14,38,0.75)';
              ctx.fillRect(x + 20, bottom - mh, 44, mh);
              ctx.strokeStyle = 'rgba(152,101,255,0.2)';
              ctx.strokeRect(x + 20, bottom - mh, 44, mh);
              if (seeded(seed + 2) > 0.6) {
                ctx.fillStyle = 'rgba(71,123,255,0.5)';
                ctx.fillRect(x + 38, bottom - mh - 14, 5, 14);
                ctx.fillRect(x + 35, bottom - mh - 17, 11, 4);
              }
              ctx.strokeStyle = 'rgba(66,232,224,0.25)';
              ctx.beginPath();
              ctx.moveTo(x, gy - 6);
              ctx.lineTo(x + 260, gy - 6);
              ctx.stroke();
            });
          }
        }
      ]
    },
    {
      id: 'neon-network',
      name: 'NEON NETWORK',
      sky: ['#071426', '#0E2B4A'],
      accent: C.teal,
      accent2: C.blue,
      ground: { fill: '#08182C', edge: C.teal, line: 'rgba(66,232,224,0.35)' },
      layers: [
        {
          speed: 0.08, tileW: 800,
          draw: function (ctx, ox, w, h, gy) {
            for (var i = 0; i < 14; i++) {
              var x = ((i * 97 - ox * 0.08) % (w + 80) + w + 80) % (w + 80) - 40;
              var y = 40 + seeded(i * 3.1) * (gy - 120);
              var pulse = 0.5 + 0.5 * Math.sin(performance.now() / 900 + i * 2);
              ctx.fillStyle = 'rgba(66,232,224,' + (0.25 + pulse * 0.3) + ')';
              ctx.beginPath();
              ctx.arc(x, y, 2.5 + pulse * 2, 0, Math.PI * 2);
              ctx.fill();
              if (i > 0) {
                var px = ((i - 1) * 97 - ox * 0.08) % (w + 80);
                ctx.strokeStyle = 'rgba(71,123,255,0.1)';
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(px, 40 + seeded((i - 1) * 3.1) * (gy - 120));
                ctx.stroke();
              }
            }
          }
        },
        {
          speed: 0.3, tileW: 300,
          draw: function (ctx, ox, w, h, gy) {
            tileLoop(ctx, ox, 300, w, function (i, x) {
              var seed = i * 9.1;
              var cx = x + 40 + seeded(seed) * 200;
              var cy = gy - 60 - seeded(seed + 1) * 160;
              var r = 10 + seeded(seed + 2) * 16;
              ctx.strokeStyle = 'rgba(66,232,224,0.3)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
              ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
              ctx.stroke();
              ctx.strokeStyle = 'rgba(71,123,255,0.35)';
              ctx.beginPath();
              ctx.arc(cx, cy, r, 0, Math.PI * 2);
              ctx.stroke();
              ctx.fillStyle = 'rgba(66,232,224,0.15)';
              ctx.beginPath();
              ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = 'rgba(152,101,255,0.22)';
              ctx.beginPath();
              ctx.moveTo(x, gy - 30 - seeded(seed + 3) * 40);
              ctx.lineTo(x + 300, gy - 30 - seeded(seed + 4) * 40);
              ctx.stroke();
            });
          }
        },
        {
          speed: 0.62, tileW: 220,
          draw: function (ctx, ox, w, h, gy, dt, dataStream) {
            tileLoop(ctx, ox, 220, w, function (i, x) {
              ctx.strokeStyle = 'rgba(66,232,224,0.28)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(x + 10, gy - 26);
              ctx.lineTo(x + 60, gy - 26);
              ctx.lineTo(x + 60, gy - 8);
              ctx.lineTo(x + 150, gy - 8);
              ctx.stroke();
              var t = (performance.now() / 14 + i * 77) % 160;
              var dx = x + 10 + Math.min(t, 140);
              ctx.fillStyle = 'rgba(66,232,224,0.9)';
              ctx.fillRect(dx, gy - 28, 5, 4);
            });
          }
        }
      ]
    },
    {
      id: 'server-room',
      name: 'SERVER ROOM',
      sky: ['#120E2E', '#241748'],
      accent: C.purple,
      accent2: C.blue,
      ground: { fill: '#141033', edge: C.purple, line: 'rgba(152,101,255,0.35)' },
      layers: [
        {
          speed: 0.1, tileW: 700,
          draw: function (ctx, ox, w, h, gy) {
            var g = ctx.createLinearGradient(0, 0, 0, gy);
            g.addColorStop(0, 'rgba(152,101,255,0.08)');
            g.addColorStop(1, 'rgba(152,101,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, gy);
            ctx.strokeStyle = 'rgba(71,123,255,0.08)';
            for (var x = -((ox * 0.1) % 120); x < w; x += 120) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, gy);
              ctx.stroke();
            }
          }
        },
        {
          speed: 0.28, tileW: 260,
          draw: function (ctx, ox, w, h, gy) {
            tileLoop(ctx, ox, 260, w, function (i, x) {
              var seed = i * 17.3;
              var rh = 150 + seeded(seed) * 90;
              var rx = x + 24, rw = 90, ry = gy - rh;
              ctx.fillStyle = 'rgba(16,12,40,0.97)';
              ctx.fillRect(rx, ry, rw, rh);
              ctx.strokeStyle = 'rgba(152,101,255,0.35)';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(rx, ry, rw, rh);
              var rowIdx = 0;
              for (var sy = ry + 12; sy < gy - 14; sy += 18) {
                ctx.fillStyle = 'rgba(40,30,80,0.9)';
                ctx.fillRect(rx + 8, sy, rw - 16, 12);
                // Use tile index + relative row for stable LED state.
                var st = seeded(i * 4.1 + rowIdx * 2.7 + 50);
                var lc = st > 0.8 ? 'rgba(255,107,122,0.9)' : st > 0.45 ? 'rgba(66,232,224,0.85)' : 'rgba(71,123,255,0.85)';
                ctx.fillStyle = lc;
                ctx.fillRect(rx + rw - 16, sy + 3, 5, 5);
                ctx.fillRect(rx + rw - 26, sy + 3, 5, 5);
                rowIdx++;
              }
              if (seeded(seed + 5) > 0.5) {
                ctx.strokeStyle = 'rgba(71,123,255,0.2)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(rx + rw, ry + 30);
                ctx.bezierCurveTo(rx + rw + 40, ry + 60, rx + rw + 60, gy - 40, rx + 260, gy - 20);
                ctx.stroke();
              }
            });
          }
        },
        {
          speed: 0.55, tileW: 200,
          draw: function (ctx, ox, w, h, gy) {
            tileLoop(ctx, ox, 200, w, function (i, x) {
              var seed = i * 4.9;
              ctx.strokeStyle = 'rgba(71,123,255,0.3)';
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.moveTo(x, gy - 54);
              ctx.lineTo(x + 46, gy - 54);
              ctx.arcTo(x + 60, gy - 54, x + 60, gy - 40, 12);
              ctx.lineTo(x + 60, gy - 18);
              ctx.stroke();
              var ang = performance.now() / 500 + seed;
              ctx.save();
              ctx.translate(x + 130, gy - 40);
              ctx.rotate(ang);
              ctx.strokeStyle = 'rgba(152,101,255,0.4)';
              ctx.lineWidth = 3;
              for (var b = 0; b < 3; b++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(14, 0);
                ctx.stroke();
                ctx.rotate(Math.PI * 2 / 3);
              }
              ctx.restore();
            });
          }
        }
      ]
    },
    {
      id: 'cyber-circuit',
      name: 'CYBER CIRCUIT',
      sky: ['#0A1A1E', '#0F2E2C'],
      accent: C.teal,
      accent2: C.yellow,
      ground: { fill: '#0B1F22', edge: C.yellow, line: 'rgba(255,209,102,0.3)' },
      layers: [
        {
          speed: 0.09, tileW: 750,
          draw: function (ctx, ox, w, h, gy) {
            ctx.strokeStyle = 'rgba(255,209,102,0.07)';
            ctx.lineWidth = 1;
            var cell = 60;
            var off = (ox * 0.09) % cell;
            for (var x = -off; x < w; x += cell) {
              ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, gy); ctx.stroke();
            }
            for (var y = 0; y < gy; y += cell) {
              ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }
          }
        },
        {
          speed: 0.3, tileW: 280,
          draw: function (ctx, ox, w, h, gy) {
            tileLoop(ctx, ox, 280, w, function (i, x) {
              var seed = i * 21.7;
              var cx = x + 40 + seeded(seed) * 180;
              var cy = gy - 50 - seeded(seed + 1) * 150;
              var s = 12 + seeded(seed + 2) * 12;
              ctx.strokeStyle = 'rgba(66,232,224,0.35)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(cx - s * 3, cy);
              ctx.lineTo(cx - s, cy);
              ctx.moveTo(cx + s, cy);
              ctx.lineTo(cx + s * 3, cy);
              ctx.moveTo(cx, cy - s);
              ctx.lineTo(cx, cy - s * 2.4);
              ctx.stroke();
              ctx.fillStyle = 'rgba(15,46,44,0.95)';
              ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
              ctx.strokeStyle = 'rgba(66,232,224,0.5)';
              ctx.strokeRect(cx - s, cy - s, s * 2, s * 2);
              ctx.fillStyle = 'rgba(255,209,102,0.6)';
              var pins = 4;
              for (var p = 0; p < pins; p++) {
                var px = cx - s + (s * 2 / (pins + 1)) * (p + 1);
                ctx.fillRect(px - 1.5, cy - s - 5, 3, 5);
                ctx.fillRect(px - 1.5, cy + s, 3, 5);
              }
            });
          }
        },
        {
          speed: 0.6, tileW: 240,
          draw: function (ctx, ox, w, h, gy) {
            tileLoop(ctx, ox, 240, w, function (i, x) {
              ctx.strokeStyle = 'rgba(255,209,102,0.35)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(x, gy - 12);
              ctx.lineTo(x + 70, gy - 12);
              ctx.lineTo(x + 70, gy - 30);
              ctx.lineTo(x + 170, gy - 30);
              ctx.stroke();
              var t = (performance.now() / 10 + i * 53) % 200;
              ctx.fillStyle = 'rgba(255,209,102,0.95)';
              var pxx = x + Math.min(t, 170);
              var py = t < 70 ? gy - 12 : gy - 30;
              ctx.beginPath();
              ctx.arc(pxx, py, 3.2, 0, Math.PI * 2);
              ctx.fill();
            });
          }
        }
      ]
    },
    {
      id: 'data-space',
      name: 'DATA SPACE',
      sky: ['#140B2E', '#2A1050'],
      accent: C.purple,
      accent2: C.coral,
      ground: { fill: '#160E33', edge: C.coral, line: 'rgba(255,107,122,0.3)' },
      layers: [
        {
          speed: 0.07, tileW: 850,
          draw: function (ctx, ox, w, h, gy) {
            for (var i = 0; i < 10; i++) {
              var x = ((i * 150 - ox * 0.07) % (w + 200) + w + 200) % (w + 200) - 100;
              var y = 50 + seeded(i * 5.7) * (gy - 160);
              var s = 16 + seeded(i * 2.3) * 30;
              var bob = Math.sin(performance.now() / 1300 + i * 1.7) * 6;
              ctx.save();
              ctx.translate(x, y + bob);
              ctx.rotate(seeded(i * 9.2) * 0.6 + performance.now() / 6000);
              ctx.fillStyle = 'rgba(152,101,255,0.09)';
              ctx.fillRect(-s / 2, -s / 2, s, s);
              ctx.strokeStyle = 'rgba(152,101,255,0.28)';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(-s / 2, -s / 2, s, s);
              ctx.restore();
            }
          }
        },
        {
          speed: 0.26, tileW: 300,
          draw: function (ctx, ox, w, h, gy) {
            tileLoop(ctx, ox, 300, w, function (i, x) {
              var seed = i * 11.9;
              var blocks = 2 + Math.floor(seeded(seed) * 3);
              for (var b = 0; b < blocks; b++) {
                var bx = x + 20 + seeded(seed + b * 3) * 220;
                var by = gy - 40 - seeded(seed + b * 3 + 1) * 170;
                var bw = 20 + seeded(seed + b * 3 + 2) * 30;
                var bob = Math.sin(performance.now() / 1100 + seed + b) * 4;
                ctx.fillStyle = 'rgba(30,16,70,0.9)';
                ctx.fillRect(bx, by + bob, bw, bw * 0.7);
                ctx.strokeStyle = b % 2 ? 'rgba(255,107,122,0.4)' : 'rgba(152,101,255,0.45)';
                ctx.strokeRect(bx, by + bob, bw, bw * 0.7);
                ctx.fillStyle = 'rgba(234,242,255,0.25)';
                for (var d = 0; d < 3; d++) {
                  ctx.fillRect(bx + 4, by + bob + 5 + d * 7, bw - 8, 2);
                }
              }
              ctx.strokeStyle = 'rgba(255,107,122,0.14)';
              ctx.beginPath();
              ctx.moveTo(x, gy - 20 - seeded(seed + 8) * 30);
              ctx.lineTo(x + 300, gy - 20 - seeded(seed + 9) * 30);
              ctx.stroke();
            });
          }
        },
        {
          speed: 0.58, tileW: 200,
          draw: function (ctx, ox, w, h, gy) {
            tileLoop(ctx, ox, 200, w, function (i, x) {
              for (var d = 0; d < 5; d++) {
                var seed = i * 31 + d * 7;
                var px = x + (d * 37) % 200;
                var py = gy - 16 - seeded(seed) * 80;
                var t = (performance.now() / 500 + seed) % 2;
                ctx.fillStyle = 'rgba(152,101,255,' + (0.5 * (1 - t / 2)) + ')';
                ctx.fillRect(px, py, 3, 3);
              }
            });
          }
        }
      ]
    }
  ];

  function get(i) { return ENV_DEFS[i % ENV_DEFS.length]; }
  function count() { return ENV_DEFS.length; }

  function drawGround(ctx, env, scrollX, w, h, gy) {
    var gnd = env.ground;
    var g = ctx.createLinearGradient(0, gy, 0, h);
    g.addColorStop(0, gnd.fill);
    g.addColorStop(1, '#070A18');
    ctx.fillStyle = g;
    ctx.fillRect(0, gy, w, h - gy);

    ctx.fillStyle = gnd.edge;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, gy - 2, w, 3);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = gnd.line;
    ctx.lineWidth = 1;
    var tickGap = 80;
    var off = scrollX % tickGap;
    for (var x = -off; x < w; x += tickGap) {
      ctx.beginPath();
      ctx.moveTo(x, gy + 8);
      ctx.lineTo(x + 30, gy + 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 40, gy + 26);
      ctx.lineTo(x + 90, gy + 26);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(234,242,255,0.04)';
    for (var yy = gy + 40; yy < h; yy += 24) {
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
      ctx.stroke();
    }
  }

  return { get: get, count: count, drawGround: drawGround, drawSky: drawSky };
})();
