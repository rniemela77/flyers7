export const CONSTANTS = {
  cameraZoom: window.innerWidth * 0.0018,
  
  playerMaxHealth: 100,
  playerSpriteScale: 0.3,
  playerRotationOffset: 230,
  playerMaxRotationSpeed: 0.1,
  playerSpeed: 40,
  
  trailSegmentSize: window.innerWidth * 0.002,
  trailFadeDuration: 1000,
  trailColor: 0x00ffff,
  maxTrailSegments: 48,
  trailSpawnInterval: 16,
  trailOffset: window.innerWidth * 0.02,
  trailRotationOffset: 90,
  
  enemyMaxHealth: 200,
  enemySpeed: 2,
  enemyAttackRange: window.innerWidth * 0.3,
  enemyAttackInterval: 4000,
  enemyAttackDamage: 15,
  
  healthBarWidth: window.innerWidth * 0.05,
  healthBarHeight: window.innerWidth * 0.01,
  healthBarOffset: window.innerWidth * -0.05,
  healthBarBackgroundColor: 0x000000,
  healthBarColor: 0xff0000,
  dashCooldownBarColor: 0xffffff,
  dashCooldownBarOffset: window.innerWidth * 0.015,
  
  joystickRadius: window.innerWidth * 0.03,
  joystickColor: 0x888888,
  acceleration: 0.3,
  deceleration: 0.15,
  maxSpeed: 5,
  joystickSensitivity: 0.015,
  deadzone: 0.05,
  
  dashSpeed: 3000,
  dashVelocity: 3000,
  dashDuration: 100,
  dashCooldown: 800,
  
  squareSize: window.innerWidth * 0.05,
  squareColor: 0xff0000,
  circleRadius: window.innerWidth * 0.025,
  circleColor: 0x0000ff,
  
  // Impact effect settings
  impactEffect: {
    size: { min: 0.2, max: 0.35 },
    duration: 50,
    gap: 50,
    flashes: 2,
    color: 0xffffff,
    radiusMultiplier: 0.8,
    randomOffset: 5
  },
  
  yellowCircleOutlineColor: 0xffff00,
  fillYellowCircleDelay: 3000,
  fillYellowCircleDuration: 500,
  yellowCircleAttackDamage: 45,
  
  whiteAttackDamageMin: 15,
  whiteAttackDamageMax: 25,
  whiteAttackCritChance: 0.2,
  whiteAttackCritMultiplier: 1.5,
  whiteAttackDuration: 200,
  whiteAttackRange: window.innerWidth * 0.3,
  whiteAttackRangeColor: 0xffffff,
  whiteAttackRangeAlpha: 0.1,
  
  purpleCircleRadius: window.innerWidth * 0.175,
  purpleCircleColor: 0x800080,
  purpleTelegraphDuration: 2000,
  purpleAttackDuration: 500,
  purpleAttackCooldown: 4000,
  purpleAttackDamage: 30,
  
  greenAttackDamage: 10,
  greenRotationLerp: 0.02,
  greenLength: window.innerWidth * 0.3,
  greenWidth: window.innerWidth * 0.02,
  greenColor: 0x00ff00,
  greenTelegraphDuration: 1500,
  greenAttackDuration: 500,
  greenAttackCooldown: 3000
};
