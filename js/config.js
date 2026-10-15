window.BR = window.BR || {};

BR.CONFIG = {
  W: 960,
  H: 540,

  GROUND_Y: 440,

  // Physics — tuned for forgiving runner feel.
  // Jump height ~ 220px (clears all obstacles, max stack-overflow 150px).
  // Total air time ~ 0.85s (responsive controls, ample window).
  GRAVITY: 2000,
  JUMP_VEL: -940,
  DOUBLE_JUMP_VEL: -820,
  MAX_FALL: 1300,

  // Speed — gentler ramp so player has time to react.
  BASE_SPEED: 320,
  MAX_SPEED: 620,
  SPEED_RAMP: 8,

  HP: 3,
  IFRAME_TIME: 1.5,

  // Obstacle spawn — wider gaps so single jump can always clear.
  // Min gap (1.3s) guarantees enough time to land a jump + react before next.
  SPAWN_START: 2.6,
  SPAWN_MIN: 1.3,
  SPAWN_DECAY: 0.008,

  ITEM_SPAWN_EVERY: 3.4,
  XP_SPAWN_EVERY: 26,

  PARTICLE_CAP: 240,

  ENV_CHANGE_DIST: 800,
  ENV_FADE_TIME: 2.2,  // longer crossfade (was 1.6) — less jarring "portal" feel

  PLAYER_W: 44,
  PLAYER_H: 54,

  COLORS: {
    navy: '#10152B',
    blue: '#477BFF',
    teal: '#42E8E0',
    purple: '#9865FF',
    coral: '#FF6B7A',
    yellow: '#FFD166',
    ink: '#EAF2FF'
  }
};
