export const CONSTANTS = {
  // Player constants
  playerMaxHealth: 100,
  playerSpriteScale: 0.3,
  playerRotationOffset: 230, // Degrees to adjust player sprite rotation (MUST BE 230!)
  playerMaxRotationSpeed: 0.1, // Maximum rotation speed in radians per frame
  
  // Enemy constants
  enemyMaxHealth: 200,
  enemySpeed: 2,
  enemyAttackRange: 300,
  enemyAttackInterval: 2000,
  enemyAttackDamage: 15,
  
  // UI and HUD
  healthBarWidth: 50,
  healthBarHeight: 10,
  healthBarOffset: 10,
  healthBarBackgroundColor: 0x000000,
  healthBarColor: 0xff0000,
  
  // Movement and controls
  joystickRadius: 30,
  joystickColor: 0x888888,
  acceleration: 0.1,
  deceleration: 0.05,
  maxSpeed: 5,
  
  // Basic shapes (for collision and visuals)
  squareSize: 50,
  squareColor: 0xff0000,
  circleRadius: 25,
  circleColor: 0x0000ff,
  
  // Yellow attack properties
  yellowCircleOutlineColor: 0xffff00,
  fillYellowCircleDelay: 1000,
  fillYellowCircleDuration: 250,
  yellowCircleAttackDamage: 45,
  
  // Line attack properties
  lineAttackDamage: 20,
  lineAttackDuration: 100, // duration in milliseconds
  
  // Purple attack properties
  purpleCircleRadius: 175,
  purpleCircleColor: 0x800080,
  purpleTelegraphDuration: 1000, // 1 second telegraph
  purpleAttackDuration: 250, // Attack lasts 250ms
  purpleAttackCooldown: 2000, // 2 seconds between attacks
  purpleAttackDamage: 30,
  
  // Stick attack properties
  stickAttackDamage: 10,
  stickRotationLerp: 0.02,
  stickLength: 300,
  stickWidth: 20,
  stickColor: 0x00ff00,
  stickTelegraphDuration: 1000,
  stickAttackDuration: 250,
  stickAttackCooldown: 2000,
};
