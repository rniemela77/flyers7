export const GAME_CONFIG = {
  world: {
    width: 1000,
    height: 1000,
    wallThickness: 50,
    cellSize: 50,
  },
  camera: {
    zoom: 0.8,
    followOffsetY: -window.innerHeight * 0.14,
    smoothFactor: 0.1,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 },
    },
  },
  timers: {
    lineAttack: 500,
    enemySpawn: 8000,
  },
  colors: {
    gridLine: 0x3573C0,
    walls: 0x808080,
  },
};

export const ENEMY_TYPES = {
  PURPLE: 'purple',
  GREEN: 'green',
}; 